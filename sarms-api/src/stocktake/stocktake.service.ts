import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStocktakeDto, ScanDto } from './dto/stocktake.dto';

/**
 * Section 36. A stocktake is scoped (room/department/campus/category/all);
 * starting one snapshots every currently-registered asset in scope into
 * StocktakeItem rows with result=PENDING, so the mobile scanner (Section 37)
 * has a fixed expected list to check off against, and anything never
 * scanned by the time the stocktake closes is trivially "missing".
 */
@Injectable()
export class StocktakeService {
  constructor(private prisma: PrismaService) {}

  private async scopedAssetWhere(scopeType: string, scopeId?: number) {
    switch (scopeType) {
      case 'ROOM':
        return { currentRoomId: scopeId, isDeleted: false };
      case 'DEPARTMENT':
        return { responsibleDepartmentId: scopeId, isDeleted: false };
      case 'CATEGORY':
        return { categoryId: scopeId, isDeleted: false };
      case 'BUILDING': {
        const rooms = await this.prisma.room.findMany({ where: { floor: { buildingId: scopeId } } });
        return { currentRoomId: { in: rooms.map((r) => r.id) }, isDeleted: false };
      }
      case 'CAMPUS': {
        const rooms = await this.prisma.room.findMany({ where: { floor: { building: { campusId: scopeId } } } });
        return { currentRoomId: { in: rooms.map((r) => r.id) }, isDeleted: false };
      }
      default:
        return { isDeleted: false };
    }
  }

  async create(dto: CreateStocktakeDto, startedById: number) {
    const stocktake = await this.prisma.stocktake.create({
      data: { name: dto.name, scopeType: dto.scopeType, scopeId: dto.scopeId, startedById, status: 'IN_PROGRESS' },
    });

    const where = await this.scopedAssetWhere(dto.scopeType, dto.scopeId);
    const assets = await this.prisma.asset.findMany({ where });

    await this.prisma.stocktakeItem.createMany({
      data: assets.map((a) => ({
        stocktakeId: stocktake.id,
        assetId: a.id,
        expectedRoomId: a.currentRoomId,
        result: 'PENDING',
      })),
    });

    return this.findOne(stocktake.id);
  }

  findAll() {
    return this.prisma.stocktake.findMany({ orderBy: { startDate: 'desc' } });
  }

  async findOne(id: number) {
    const stocktake = await this.prisma.stocktake.findUnique({
      where: { id },
      include: { items: { include: { asset: true } } },
    });
    if (!stocktake) throw new NotFoundException(`Stocktake ${id} not found`);
    return stocktake;
  }

  /**
   * Powers the mobile scanner screen: one QR scan at a time. Compares the
   * scanned room against the expected room to auto-classify the result -
   * an unregistered QR token or an asset outside this stocktake's expected
   * set are both surfaced rather than silently ignored.
   */
  async scan(stocktakeId: number, dto: ScanDto, scannedById: number) {
    const stocktake = await this.findOne(stocktakeId);
    if (stocktake.status !== 'IN_PROGRESS') {
      throw new BadRequestException('This stocktake is not in progress');
    }

    const asset = await this.prisma.asset.findUnique({ where: { qrToken: dto.qrToken } });
    if (!asset) throw new BadRequestException('No asset found for this QR code');

    const item = stocktake.items.find((i: any) => i.assetId === asset.id);
    if (!item) {
      // Scanned something that wasn't expected in this stocktake's scope at all.
      return this.prisma.stocktakeItem.create({
        data: {
          stocktakeId,
          assetId: asset.id,
          scannedRoomId: dto.scannedRoomId,
          scannedById,
          scannedAt: new Date(),
          result: 'UNREGISTERED',
        },
      });
    }

    const result =
      dto.scannedRoomId && item.expectedRoomId && dto.scannedRoomId !== item.expectedRoomId
        ? 'WRONG_LOCATION'
        : 'VERIFIED';

    return this.prisma.stocktakeItem.update({
      where: { id: item.id },
      data: { scannedRoomId: dto.scannedRoomId, scannedById, scannedAt: new Date(), result },
    });
  }

  /** Anything still PENDING when the stocktake closes becomes MISSING. */
  async close(id: number) {
    await this.findOne(id);
    await this.prisma.stocktakeItem.updateMany({
      where: { stocktakeId: id, result: 'PENDING' },
      data: { result: 'MISSING' },
    });
    return this.prisma.stocktake.update({ where: { id }, data: { status: 'COMPLETED', endDate: new Date() } });
  }
}
