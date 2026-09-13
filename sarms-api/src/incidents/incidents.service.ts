import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AssetsService } from '../assets/assets.service';
import { ReportIncidentDto, ResolveIncidentDto } from './dto/incident.dto';

/**
 * Section 34. Reporting an incident moves the asset's status to match
 * (LOST/STOLEN/DAMAGED) - it does NOT delete or hide the asset, since the
 * spec is explicit that lost assets must remain in the register with an
 * honest status rather than disappearing from view.
 */
@Injectable()
export class IncidentsService {
  constructor(
    private prisma: PrismaService,
    private assetsService: AssetsService,
  ) {}

  async report(dto: ReportIncidentDto, reportedById: number) {
    const incident = await this.prisma.assetIncident.create({
      data: {
        assetId: dto.assetId,
        type: dto.type,
        reportedById,
        locationRoomId: dto.locationRoomId,
        description: dto.description,
        policeReportNumber: dto.policeReportNumber,
      },
    });

    if (dto.type !== 'DAMAGED') {
      await this.assetsService.transitionStatus(dto.assetId, dto.type, reportedById, `Reported ${dto.type.toLowerCase()}`);
    } else {
      await this.assetsService.transitionStatus(dto.assetId, 'DAMAGED', reportedById, 'Reported damaged');
    }

    return incident;
  }

  findAll() {
    return this.prisma.assetIncident.findMany({
      where: { investigationStatus: { in: ['OPEN', 'INVESTIGATING'] } },
      include: { asset: true, reportedBy: true },
      orderBy: { reportDate: 'desc' },
    });
  }

  async findOne(id: number) {
    const incident = await this.prisma.assetIncident.findUnique({
      where: { id },
      include: { asset: true, reportedBy: true },
    });
    if (!incident) throw new NotFoundException(`Incident ${id} not found`);
    return incident;
  }

  async resolve(id: number, dto: ResolveIncidentDto, actorId: number) {
    const incident = await this.findOne(id);

    await this.prisma.assetIncident.update({
      where: { id },
      data: {
        investigationStatus: 'RESOLVED',
        resolution: dto.resolution,
        recoveredAt: dto.recovered ? new Date() : undefined,
      },
    });

    if (dto.recovered) {
      await this.assetsService.transitionStatus(incident.assetId, 'AVAILABLE', actorId, 'Recovered');
    }

    return this.findOne(id);
  }
}
