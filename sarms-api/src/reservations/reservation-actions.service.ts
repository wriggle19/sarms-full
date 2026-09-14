import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AssetsService } from '../assets/assets.service';
import { ReservationsService } from './reservations.service';

/** Part 2: decide + fulfil (converts APPROVED reservation into a ledger assignment). */
@Injectable()
export class ReservationActionsService {
  constructor(
    private prisma: PrismaService,
    private base: ReservationsService,
    private assetsService: AssetsService,
  ) {}

  async decide(id: number, approverId: number, decision: 'APPROVED' | 'REJECTED' | 'CANCELLED') {
    const row = await (this.prisma as any).assetReservation.findUnique({ where: { id } });
    if (!row) throw new NotFoundException(`Reservation ${id} not found`);
    if (row.status !== 'PENDING' && decision !== 'CANCELLED') {
      throw new BadRequestException(`Reservation is already ${row.status}`);
    }
    return (this.prisma as any).assetReservation.update({
      where: { id }, data: { status: decision as any, approvedById: approverId },
    });
  }

  async fulfill(id: number, actorId: number, dto: { assetId: number; conditionAtIssueCode?: string; expectedReturnDate?: string }) {
    const row = await (this.prisma as any).assetReservation.findUnique({ where: { id } });
    if (!row) throw new NotFoundException(`Reservation ${id} not found`);
    if (row.status !== 'APPROVED') throw new BadRequestException('Only APPROVED reservations can be fulfilled');
    const assetId = dto.assetId ?? row.assetId;
    if (!assetId) throw new BadRequestException('No asset selected for fulfilment');
    const check = await this.base.checkAvailability(assetId, undefined, new Date(row.startDateTime), new Date(row.endDateTime));
    const others = (check.overlappingReservations as any[]).filter((r) => r.id !== id);
    if (others.length > 0 || (check.conflictingAssignments as any[]).length > 0) {
      throw new ForbiddenException('Asset is no longer available for this slot');
    }
    const active = await this.prisma.assetAssignment.findFirst({ where: { assetId, status: 'ACTIVE' } });
    if (active) throw new BadRequestException('Asset already has an active assignment');
    const asset = await this.prisma.asset.findUnique({ where: { id: assetId }, include: { status: true } });
    if (!asset) throw new NotFoundException(`Asset ${assetId} not found`);
    if (asset.status.code !== 'AVAILABLE') {
      await this.assetsService.transitionStatus(assetId, 'ISSUED', actorId, `Reservation #${id} fulfilled`);
    }
    const condition = await this.prisma.assetCondition.findUnique({
      where: { code: dto.conditionAtIssueCode ?? 'GOOD' },
    });
    const assignment = await this.prisma.assetAssignment.create({
      data: {
        assetId, assignmentType: 'PERSON', custodianUserId: row.reservedById, issuedById: actorId,
        expectedReturnDate: dto.expectedReturnDate ? new Date(dto.expectedReturnDate) : new Date(row.endDateTime),
        conditionAtIssueId: condition?.id ?? 1, notes: `Reservation #${id}`,
      },
    });
    await this.prisma.asset.update({ where: { id: assetId }, data: { currentCustodianId: row.reservedById } });
    return (this.prisma as any).assetReservation.update({
      where: { id }, data: { status: 'FULFILLED', issuedAssignmentId: assignment.id },
    });
  }
}
