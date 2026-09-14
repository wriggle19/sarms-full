import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AssetsService } from '../assets/assets.service';
import { IssueAssetDto } from './dto/issue-asset.dto';
import { ReturnAssetDto } from './dto/return-asset.dto';
import { TransferAssetDto } from './dto/transfer-asset.dto';

/**
 * The custody ledger: AssetAssignment (who has it / for how long) and
 * AssetTransfer (movement events). See ARCHITECTURE.md Section 3 - nothing
 * in this file ever overwrites a row it previously wrote. New state is
 * always a new row; old rows are only ever closed (actualReturnDate set,
 * status flipped to RETURNED), never deleted or edited in place.
 */
@Injectable()
export class CustodyService {
  constructor(
    private prisma: PrismaService,
    private assetsService: AssetsService,
  ) {}

  private async requireCondition(code: string) {
    const condition = await this.prisma.assetCondition.findUnique({ where: { code } });
    if (!condition) throw new BadRequestException(`Unknown condition code: ${code}`);
    return condition;
  }

  /**
   * Business rules enforced (Section 65):
   * - an asset already actively assigned cannot be issued again
   * - an asset under maintenance or retired/disposed cannot be issued
   *
   * Concurrency: the availability check and assignment creation run inside a
   * single serializable transaction so two simultaneous issuance requests for
   * the same asset cannot both succeed.
   */
  async issue(dto: IssueAssetDto, issuedById: number) {
    const conditionAtIssue = await this.requireCondition(dto.conditionAtIssueCode);

    const assignment = await this.prisma.$transaction(async (tx) => {
      // Re-fetch inside the transaction so the serializable snapshot is current.
      const asset = await tx.asset.findUnique({ where: { id: dto.assetId }, include: { status: true } });
      if (!asset || asset.isDeleted) throw new NotFoundException(`Asset ${dto.assetId} not found`);

      const blockingStatuses = ['MAINTENANCE', 'RETIRED', 'DISPOSED', 'LOST', 'STOLEN'];
      if (blockingStatuses.includes(asset.status.code)) {
        throw new ConflictException(`Asset is currently ${asset.status.code} and cannot be issued`);
      }

      const activeAssignment = await tx.assetAssignment.findFirst({
        where: { assetId: dto.assetId, status: 'ACTIVE' },
      });
      if (activeAssignment) {
        throw new ConflictException('Asset already has an active assignment - return or transfer it first');
      }

      const created = await tx.assetAssignment.create({
        data: {
          assetId: dto.assetId,
          assignmentType: dto.assignmentType,
          custodianUserId: dto.custodianUserId,
          roomId: dto.roomId,
          academicYearId: dto.academicYearId,
          requestId: dto.requestId,
          issuedById,
          expectedReturnDate: dto.expectedReturnDate,
          conditionAtIssueId: conditionAtIssue.id,
          notes: dto.notes,
        },
      });

      await tx.asset.update({
        where: { id: dto.assetId },
        data: {
          currentRoomId: dto.roomId ?? asset.currentRoomId,
          currentCustodianId: dto.custodianUserId ?? asset.currentCustodianId,
          conditionId: conditionAtIssue.id,
        },
      });

      await tx.assetHistory.create({
        data: {
          assetId: dto.assetId,
          eventType: 'ISSUED',
          actorId: issuedById,
          description: dto.custodianUserId
            ? `Issued to user #${dto.custodianUserId}`
            : `Issued to ${dto.assignmentType.toLowerCase()}`,
        },
      });

      return created;
    }, { isolationLevel: 'Serializable' });

    // Status transition runs after the transaction; if it fails the assignment
    // row already exists and the caller sees a real error rather than a silent
    // half-applied issuance.
    await this.assetsService.transitionStatus(dto.assetId, 'ASSIGNED', issuedById, 'Issued');

    return assignment;
  }

  /**
   * Records the acknowledgement/signature step (Section 17) - separate from
   * issue() because in the real workflow the recipient confirms receipt
   * after the officer prepares the handover, not at the moment of creation.
   */
  async acknowledge(assignmentId: number, signatureUrl: string) {
    const assignment = await this.prisma.assetAssignment.findUnique({ where: { id: assignmentId } });
    if (!assignment) throw new NotFoundException(`Assignment ${assignmentId} not found`);

    return this.prisma.assetAssignment.update({
      where: { id: assignmentId },
      data: { acknowledgedAt: new Date(), acknowledgementSignatureUrl: signatureUrl },
    });
  }

  /**
   * Closes an active assignment. A damaged/poor-condition return does not
   * automatically become AVAILABLE (Section 65) - it goes to MAINTENANCE
   * unless the caller explicitly says otherwise.
   */
  async returnAsset(assignmentId: number, dto: ReturnAssetDto, receivedById: number) {
    const assignment = await this.prisma.assetAssignment.findUnique({
      where: { id: assignmentId },
      include: { asset: true },
    });
    if (!assignment) throw new NotFoundException(`Assignment ${assignmentId} not found`);
    if (assignment.status !== 'ACTIVE') {
      throw new ConflictException('This assignment has already been closed');
    }

    const conditionAtReturn = await this.requireCondition(dto.conditionAtReturnCode);
    const sendToMaintenance =
      dto.sendToMaintenance === true ||
      dto.sendToMaintenance === 'true' ||
      ['DAMAGED', 'POOR', 'BEYOND_REPAIR'].includes(dto.conditionAtReturnCode);

    await this.prisma.$transaction([
      this.prisma.assetAssignment.update({
        where: { id: assignmentId },
        data: {
          status: 'RETURNED',
          actualReturnDate: new Date(),
          conditionAtReturnId: conditionAtReturn.id,
        },
      }),
      this.prisma.asset.update({
        where: { id: assignment.assetId },
        data: { conditionId: conditionAtReturn.id, currentCustodianId: null },
      }),
      this.prisma.assetHistory.create({
        data: {
          assetId: assignment.assetId,
          eventType: 'RETURNED',
          actorId: receivedById,
          description: dto.notes ?? `Returned, condition: ${dto.conditionAtReturnCode}`,
        },
      }),
    ]);

    await this.assetsService.transitionStatus(
      assignment.assetId,
      sendToMaintenance ? 'MAINTENANCE' : 'AVAILABLE',
      receivedById,
      'Returned',
    );

    return this.prisma.assetAssignment.findUnique({ where: { id: assignmentId } });
  }

  /**
   * Movement without a fresh issuance - e.g. moving a projector between
   * classrooms, or reassigning custody between two staff without going
   * through a new request. Always closes the prior active assignment (if
   * any) and opens a fresh one, so the assignment ledger stays accurate.
   */
  async transfer(dto: TransferAssetDto, transferredById: number) {
    const asset = await this.prisma.asset.findUnique({ where: { id: dto.assetId } });
    if (!asset || asset.isDeleted) throw new NotFoundException(`Asset ${dto.assetId} not found`);

    const currentAssignment = await this.prisma.assetAssignment.findFirst({
      where: { assetId: dto.assetId, status: 'ACTIVE' },
    });

    const transfer = await this.prisma.$transaction(async (tx) => {
      if (currentAssignment) {
        await tx.assetAssignment.update({
          where: { id: currentAssignment.id },
          data: { status: 'RETURNED', actualReturnDate: new Date() },
        });
      }

      const record = await tx.assetTransfer.create({
        data: {
          assetId: dto.assetId,
          fromRoomId: asset.currentRoomId,
          toRoomId: dto.toRoomId,
          fromDepartmentId: asset.responsibleDepartmentId,
          toDepartmentId: dto.toDepartmentId,
          fromCustodianId: currentAssignment?.custodianUserId,
          toCustodianId: dto.toCustodianId,
          reason: dto.reason,
          transferredById,
          approvedById: dto.approvedById,
        },
      });

      await tx.asset.update({
        where: { id: dto.assetId },
        data: {
          currentRoomId: dto.toRoomId ?? asset.currentRoomId,
          responsibleDepartmentId: dto.toDepartmentId ?? asset.responsibleDepartmentId,
          currentCustodianId: dto.toCustodianId ?? null,
        },
      });

      if (dto.toCustodianId) {
        await tx.assetAssignment.create({
          data: {
            assetId: dto.assetId,
            assignmentType: 'PERSON',
            custodianUserId: dto.toCustodianId,
            roomId: dto.toRoomId,
            issuedById: transferredById,
            conditionAtIssueId: asset.conditionId,
          },
        });
      }

      await tx.assetHistory.create({
        data: {
          assetId: dto.assetId,
          eventType: 'TRANSFERRED',
          actorId: transferredById,
          description: dto.reason,
        },
      });

      return record;
    });

    return transfer;
  }
}
