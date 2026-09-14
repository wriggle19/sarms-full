import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AssetsService } from '../assets/assets.service';
import { ReportMaintenanceDto, CompleteMaintenanceDto } from './dto/maintenance.dto';

/**
 * Section 28. Reporting an issue moves the asset to MAINTENANCE immediately
 * (via AssetsService.transitionStatus, so the legal-transition graph still
 * applies); completing it moves the asset back to AVAILABLE or RETIRED
 * depending on outcome - never silently back to ASSIGNED, since whoever had
 * it before a repair doesn't automatically get it back without a fresh
 * issuance.
 */
@Injectable()
export class MaintenanceService {
  constructor(
    private prisma: PrismaService,
    private assetsService: AssetsService,
  ) {}

  async report(dto: ReportMaintenanceDto, reportedById: number) {
    const record = await this.prisma.maintenanceRecord.create({
      data: {
        assetId: dto.assetId,
        reportedById,
        issueDescription: dto.issueDescription,
        priority: (dto.priority as any) ?? 'MEDIUM',
        conditionBeforeId: (dto as any).conditionBeforeId,
        technicianName: (dto as any).technicianName,
        technician: (dto as any).technicianName,
        vendorId: (dto as any).vendorId,
      },
    });

    await this.assetsService.transitionStatus(dto.assetId, 'MAINTENANCE', reportedById, 'Sent for maintenance');
    await this.prisma.assetHistory.create({
      data: {
        assetId: dto.assetId,
        eventType: 'MAINTENANCE_REPORTED',
        actorId: reportedById,
        description: dto.issueDescription,
      },
    });

    return record;
  }

  findAll() {
    return this.prisma.maintenanceRecord.findMany({
      where: { status: { in: ['REPORTED', 'IN_PROGRESS'] } },
      include: { asset: true, reportedBy: true },
      orderBy: { reportDate: 'desc' },
    });
  }

  async findOne(id: number) {
    const record = await this.prisma.maintenanceRecord.findUnique({
      where: { id },
      include: { asset: true, reportedBy: true },
    });
    if (!record) throw new NotFoundException(`Maintenance record ${id} not found`);
    return record;
  }

  async complete(id: number, dto: CompleteMaintenanceDto, actorId: number) {
    const record = await this.findOne(id);
    if (record.status === 'COMPLETED') {
      throw new BadRequestException('This maintenance record is already completed');
    }

    const conditionAfter = await this.prisma.assetCondition.findUnique({
      where: { code: dto.conditionAfterCode },
    });
    if (!conditionAfter) throw new BadRequestException(`Unknown condition code: ${dto.conditionAfterCode}`);

    await this.prisma.maintenanceRecord.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        completionDate: new Date(),
        diagnosis: (dto as any).diagnosis,
        repairPerformed: dto.repairPerformed,
        repairNotes: (dto as any).repairNotes,
        partsReplaced: dto.partsReplaced,
        partsCost: (dto as any).partsCost,
        laborCost: (dto as any).laborCost,
        cost: dto.cost ?? ((((dto as any).partsCost ?? 0) + ((dto as any).laborCost ?? 0)) || undefined),
        currency: (dto as any).currency,
        invoiceNumber: (dto as any).invoiceNumber,
        technicianName: (dto as any).technicianName,
        technician: (dto as any).technicianName,
        vendorId: (dto as any).vendorId,
        warrantyClaim: (dto as any).warrantyClaim ?? false,
        conditionAfterId: conditionAfter.id,
      },
    });

    await this.prisma.asset.update({ where: { id: record.assetId }, data: { conditionId: conditionAfter.id } });

    const repaired = dto.repaired !== false;
    await this.assetsService.transitionStatus(
      record.assetId,
      repaired ? 'AVAILABLE' : 'RETIRED',
      actorId,
      repaired ? 'Maintenance completed' : 'Beyond repair - retired',
    );

    return this.findOne(id);
  }
}
