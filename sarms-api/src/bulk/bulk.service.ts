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
 *
 * All mutating methods accept a `preview` flag. When true the method
 * validates each asset and returns what would happen without writing
 * anything to the database.
 */
@Injectable()
export class BulkService {
  constructor(
    private prisma: PrismaService,
    private assetsService: AssetsService,
    private custodyService: CustodyService,
  ) {}

  async transfer(
    dto: { assetIds: number[]; toRoomId?: number; toCustodianId?: number; reason?: string; preview?: boolean },
    actorId: number,
  ) {
    const results: { assetId: number; ok: boolean; preview: boolean; error?: string }[] = [];

    for (const assetId of dto.assetIds) {
      // Preview: validate without writing.
      if (dto.preview) {
        const asset = await this.prisma.asset.findUnique({ where: { id: assetId }, include: { status: true } });
        if (!asset || asset.isDeleted) {
          results.push({ assetId, ok: false, preview: true, error: 'Asset not found' });
        } else {
          results.push({ assetId, ok: true, preview: true });
        }
        continue;
      }

      try {
        await this.custodyService.transfer(
          { assetId, toRoomId: dto.toRoomId, toCustodianId: dto.toCustodianId, reason: dto.reason } as any,
          actorId,
        );
        results.push({ assetId, ok: true, preview: false });
      } catch (e: any) {
        results.push({ assetId, ok: false, preview: false, error: e.message });
      }
    }
    return { preview: dto.preview ?? false, results };
  }

  async changeStatus(
    dto: { assetIds: number[]; statusCode: string; reason?: string; preview?: boolean },
    actorId: number,
  ) {
    const results: { assetId: number; ok: boolean; preview: boolean; fromStatus?: string; error?: string }[] = [];

    for (const assetId of dto.assetIds) {
      const asset = await this.prisma.asset.findUnique({ where: { id: assetId }, include: { status: true } });

      if (dto.preview) {
        if (!asset || asset.isDeleted) {
          results.push({ assetId, ok: false, preview: true, error: 'Asset not found' });
        } else {
          const { isTransitionAllowed } = await import('../assets/asset-status.transitions');
          const allowed = isTransitionAllowed(asset.status.code, dto.statusCode);
          results.push({
            assetId,
            ok: allowed,
            preview: true,
            fromStatus: asset.status.code,
            ...(!allowed ? { error: `Cannot transition from ${asset.status.code} to ${dto.statusCode}` } : {}),
          });
        }
        continue;
      }

      try {
        await this.assetsService.transitionStatus(assetId, dto.statusCode, actorId, dto.reason);
        results.push({ assetId, ok: true, preview: false, fromStatus: asset?.status.code });
      } catch (e: any) {
        results.push({ assetId, ok: false, preview: false, error: e.message });
      }
    }
    return { preview: dto.preview ?? false, results };
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
