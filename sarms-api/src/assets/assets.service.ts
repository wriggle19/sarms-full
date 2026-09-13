import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { NumberSequenceService } from '../common/utils/number-sequence.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { QueryAssetsDto } from './dto/query-assets.dto';
import { isTransitionAllowed } from './asset-status.transitions';

@Injectable()
export class AssetsService {
  constructor(
    private prisma: PrismaService,
    private numberSequence: NumberSequenceService,
  ) {}

  private generateQrToken(): string {
    return randomBytes(16).toString('hex');
  }

  async register(dto: CreateAssetDto, actorId: number) {
    const category = await this.prisma.assetCategory.findUnique({ where: { id: dto.categoryId } });
    if (!category) throw new BadRequestException('Unknown asset category');

    const status = await this.prisma.assetStatus.findUnique({
      where: { code: dto.statusCode ?? 'AVAILABLE' },
    });
    if (!status) throw new BadRequestException('Unknown status code - has AssetStatus been seeded?');

    const condition = await this.prisma.assetCondition.findUnique({
      where: { code: dto.conditionCode ?? 'NEW' },
    });
    if (!condition) throw new BadRequestException('Unknown condition code - has AssetCondition been seeded?');

    // Tag prefix follows the category name's first 3 letters, e.g. LAP, PRO - falls
    // back to "AST" if the category name is unsuitable. Admins can override the
    // generated tag afterwards if the school's numbering convention differs.
    const prefix = category.name.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() || 'AST';
    const assetTag = await this.numberSequence.next(prefix, { yearScoped: false });

    const asset = await this.prisma.asset.create({
      data: {
        assetTag,
        qrToken: this.generateQrToken(),
        name: dto.name,
        categoryId: dto.categoryId,
        manufacturer: dto.manufacturer,
        model: dto.model,
        serialNumber: dto.serialNumber,
        serviceTag: dto.serviceTag,
        acquisitionDate: dto.acquisitionDate,
        vendorId: dto.vendorId,
        purchaseOrderId: dto.purchaseOrderId,
        invoiceNumber: dto.invoiceNumber,
        warrantyStart: dto.warrantyStart,
        warrantyEnd: dto.warrantyEnd,
        originalCost: dto.originalCost,
        currency: dto.currency,
        fundingSource: dto.fundingSource,
        owningDepartmentId: dto.owningDepartmentId,
        responsibleDepartmentId: dto.responsibleDepartmentId,
        currentRoomId: dto.currentRoomId,
        statusId: status.id,
        conditionId: condition.id,
        academicYearId: dto.academicYearId,
        description: dto.description,
        notes: dto.notes,
        createdById: actorId,
      },
    });

    await this.prisma.assetHistory.create({
      data: {
        assetId: asset.id,
        eventType: 'REGISTERED',
        actorId,
        description: `Asset registered as ${assetTag}`,
      },
    });

    return asset;
  }

  async findAll(query: QueryAssetsDto) {
    const page = query.page ?? 1;
    const pageSize = Math.min(query.pageSize ?? 25, 100);

    const where: any = { isDeleted: false };
    if (query.categoryId) where.categoryId = query.categoryId;
    if (query.roomId) where.currentRoomId = query.roomId;
    if (query.departmentId) {
      where.OR = [
        { owningDepartmentId: query.departmentId },
        { responsibleDepartmentId: query.departmentId },
      ];
    }
    if (query.statusCode) where.status = { code: query.statusCode };
    if (query.search) {
      where.OR = [
        ...(where.OR ?? []),
        { name: { contains: query.search, mode: 'insensitive' } },
        { assetTag: { contains: query.search, mode: 'insensitive' } },
        { serialNumber: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.asset.findMany({
        where,
        include: { category: true, status: true, condition: true, currentRoom: true },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.asset.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  async findOne(id: number) {
    const asset = await this.prisma.asset.findUnique({
      where: { id },
      include: {
        category: true,
        status: true,
        condition: true,
        currentRoom: { include: { floor: { include: { building: { include: { campus: true } } } } } },
        owningDepartment: true,
        responsibleDepartment: true,
        vendor: true,
        components: true,
        parentAsset: true,
        assignments: {
          where: { status: 'ACTIVE' },
          include: { custodian: true },
        },
      },
    });
    if (!asset || asset.isDeleted) {
      throw new NotFoundException(`Asset ${id} not found`);
    }
    return asset;
  }

  async findByQrToken(qrToken: string) {
    const asset = await this.prisma.asset.findUnique({ where: { qrToken } });
    if (!asset || asset.isDeleted) {
      throw new NotFoundException('Asset not found for this QR code');
    }
    return this.findOne(asset.id);
  }

  /**
   * The only sanctioned way to change an asset's status. Validates the
   * transition against ASSET_STATUS_TRANSITIONS, writes the history row, and
   * updates the asset row - all in one place so every other module (custody,
   * maintenance, incidents, disposal) calls through here instead of writing
   * statusId directly.
   */
  async transitionStatus(assetId: number, toStatusCode: string, actorId: number, reason?: string) {
    const asset = await this.prisma.asset.findUnique({ where: { id: assetId }, include: { status: true } });
    if (!asset) throw new NotFoundException(`Asset ${assetId} not found`);

    const toStatus = await this.prisma.assetStatus.findUnique({ where: { code: toStatusCode } });
    if (!toStatus) throw new BadRequestException(`Unknown status code: ${toStatusCode}`);

    if (!isTransitionAllowed(asset.status.code, toStatusCode)) {
      throw new ConflictException(
        `Cannot move asset from ${asset.status.code} to ${toStatusCode}`,
      );
    }

    const [updated] = await this.prisma.$transaction([
      this.prisma.asset.update({ where: { id: assetId }, data: { statusId: toStatus.id, updatedById: actorId } }),
      this.prisma.assetHistory.create({
        data: {
          assetId,
          eventType: 'STATUS_CHANGE',
          actorId,
          description: reason ?? `Status changed from ${asset.status.code} to ${toStatusCode}`,
        },
      }),
    ]);

    return updated;
  }

  async softDelete(id: number, actorId: number) {
    await this.findOne(id);
    return this.prisma.asset.update({
      where: { id },
      data: { isDeleted: true, updatedById: actorId },
    });
  }
}
