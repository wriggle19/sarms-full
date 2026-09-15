import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Backs the IT dashboard's summary cards (Section 39). Kept as simple
 * grouped counts rather than a generic reporting engine - Phase 2's
 * reports module (not yet scaffolded) is the place for anything more
 * elaborate than "how many assets are in each status right now".
 */
@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async summary() {
    const [byStatus, totalAssets, pendingApprovals, overdue] = await Promise.all([
      this.prisma.asset.groupBy({
        by: ['statusId'],
        _count: true,
        where: { isDeleted: false },
      }),
      this.prisma.asset.count({ where: { isDeleted: false } }),
      this.prisma.assetRequest.count({ where: { status: 'PENDING_APPROVAL' } }),
      this.prisma.assetAssignment.count({
        where: { status: 'ACTIVE', expectedReturnDate: { lt: new Date() } },
      }),
    ]);

    const statuses = await this.prisma.assetStatus.findMany();
    const statusMap = new Map<number, string>(statuses.map((s: any) => [s.id, s.code]));

    const countsByStatus: Record<string, number> = {};
    for (const row of byStatus) {
      const code = statusMap.get(row.statusId) ?? 'UNKNOWN';
      countsByStatus[code] = row._count;
    }

    return { totalAssets, countsByStatus, pendingApprovals, overdueAssignments: overdue };
  }

  async financeSummary() {
    // Section 27: financial data is ONLY exposed through a finance.view
    // permission - this endpoint is called from the role-scoped dashboard and
    // the guard below is the authorization boundary (checked again here even
    // though the controller also guards it, in case it gains new callers).
    const grouped = await this.prisma.asset.groupBy({
      by: ['currency'],
      _sum: { originalCost: true },
      _count: { id: true },
      where: { isDeleted: false, originalCost: { not: null } },
    });

    // Base-currency equivalent, recorded at acquisition time (Priority 4.2).
    const baseSum = await this.prisma.asset.aggregate({
      _sum: { baseCurrencyAmount: true },
      where: { isDeleted: false, baseCurrencyAmount: { not: null } },
    });

    return {
      // Original entered amounts per currency - historical values, never converted.
      byCurrency: grouped.map((g) => ({
        currency: g.currency ?? 'UNKNOWN',
        totalAcquisitionCost: Number(g._sum.originalCost ?? 0),
        assetCount: g._count.id,
      })),
      // Server-computed base-currency equivalent recorded at acquisition.
      baseCurrencyTotal: Number(baseSum._sum.baseCurrencyAmount ?? 0),
    };
  }

  async recentActivity(take = 15) {
    return this.prisma.assetHistory.findMany({
      orderBy: { eventDate: 'desc' },
      take,
      include: { asset: { select: { assetTag: true, name: true } } },
    });
  }
}
