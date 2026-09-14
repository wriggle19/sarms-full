import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AssetsService } from '../assets/assets.service';
import { CustodyService } from '../custody/custody.service';

/**
 * Section 69: controlled bulk operations. Every asset is processed
 * individually through the same services the single-item endpoints use, so
 * all the normal guards (status transition graph, availability checks,
 * history rows, audit logs) still apply per asset. Failures are collected
 * per asset rather than aborting the whole batch.
 */
@Injectable()
export class BulkService {
  constructor(
    private prisma: PrismaService,
    private assetsService: AssetsService,
    private custodyService: CustodyService,
  ) {}

  async transfer(dto: {
    assetIds: number[];
    toRoomId?: number;
    toCustodianId?: number;
    reason?: string;
  }, actorId: number) {
    const results: { assetId: number; ok: boolean; error?: string }[] = [];
    for (const assetId of dto.assetIds) {
      try {
        await this.custodyService.transfer(
          { assetId, toRoomId: dto.toRoomId, toCustodianId: dto.toCustodianId, reason: dto.reason } as any,
          actorId,
        );
        results.push({ assetId, ok: true });
      } catch (e: any) {
        results.push({ assetId, ok: false, error: e.message });
      }
    }
    return results;
  }

  async changeStatus(dto: { assetIds: number[]; statusCode: string; reason?: string }, actorId: number) {
    const results: { assetId: number; ok: boolean; error?: string }[] = [];
    for (const assetId of dto.assetIds) {
      try {
        await this.assetsService.transitionStatus(assetId, dto.statusCode, actorId, dto.reason);
        results.push({ assetId, ok: true });
      } catch (e: any) {
        results.push({ assetId, ok: false, error: e.message });
      }
    }
    return results;
  }

  /** Label data for printable QR/barcode sheets (§69: "Generate QR labels"). */
  async labels(assetIds: number[]) {
    if (!assetIds.length) throw new BadRequestException('assetIds is required');
    return this.prisma.asset.findMany({
      where: { id: { in: assetIds }, isDeleted: false },
      select: { id: true, assetTag: true, qrToken: true, name: true, serialNumber: true, category: { select: { name: true } } },
      orderBy: { assetTag: 'asc' },
    });
  }
}
