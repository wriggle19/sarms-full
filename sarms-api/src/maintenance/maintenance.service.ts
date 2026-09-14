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
        conditionBeforeId: dto.conditionBeforeId,
        technicianName: dto.technicianName,
        vendorId: dto.vendorId,
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
        diagnosis: dto.diagnosis,
        repairPerformed: dto.repairPerformed,
        repairNotes: dto.repairNotes,
        partsReplaced: dto.partsReplaced,
        partsCost: dto.partsCost,
        laborCost: dto.laborCost,
        cost: dto.cost ?? (((dto.partsCost ?? 0) + (dto.laborCost ?? 0)) || undefined),
        currency: dto.currency,
        invoiceNumber: dto.invoiceNumber,
        technicianName: dto.technicianName,
        vendorId: dto.vendorId,
        warrantyClaim: dto.warrantyClaim ?? false,
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

    await this.prisma.assetHistory.create({
      data: {
        assetId: record.assetId,
        eventType: 'MAINTENANCE_COMPLETED',
        actorId,
        description: `Maintenance completed. Condition after: ${dto.conditionAfterCode}. ${dto.repairPerformed ?? ''}`.trim(),
      },
    });

    return this.findOne(id);
  }
}
