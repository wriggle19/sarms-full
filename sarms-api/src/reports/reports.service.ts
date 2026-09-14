import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Section 40/66. Report endpoints return plain rows; the CSV/PDF formatting
 * lives in the controller layer so each export format can be added without
 * touching the query logic.
 */
@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  /** Complete asset register (optionally scoped). */
  assetRegister(filters: { departmentId?: number; categoryId?: number; statusId?: number }) {
    return this.prisma.asset.findMany({
      where: {
        isDeleted: false,
        responsibleDepartmentId: filters.departmentId,
        categoryId: filters.categoryId,
        statusId: filters.statusId,
      },
      include: { category: true, status: true, condition: true, currentRoom: true, responsibleDepartment: true },
      orderBy: { assetTag: 'asc' },
    });
  }

  /** Overdue assignments with borrower contact info (Section 26). */
  async overdue() {
    const now = new Date();
    return this.prisma.assetAssignment.findMany({
      where: { status: 'ACTIVE', expectedReturnDate: { lt: now } },
      include: {
        asset: { include: { category: true } },
        custodian: { include: { department: true } },
      },
      orderBy: { expectedReturnDate: 'asc' },
    });
  }

  /** Warranties expiring within N days (Section 29). */
  async warrantiesExpiring(days = 30) {
    const until = new Date();
    until.setDate(until.getDate() + days);
    return this.prisma.asset.findMany({
      where: { isDeleted: false, warrantyEnd: { gte: new Date(), lte: until } },
      include: { category: true, vendor: true },
      orderBy: { warrantyEnd: 'asc' },
    });
  }

  /** Assets grouped by department with counts and total value (§40). */
  async byDepartment() {
    const assets = await this.prisma.asset.findMany({
      where: { isDeleted: false },
      include: { responsibleDepartment: true, status: true },
    });
    const grouped = new Map<number, { department: string; count: number; totalValue: number }>();
    for (const a of assets) {
      const key = a.responsibleDepartmentId;
      const entry = grouped.get(key) ?? { department: a.responsibleDepartment.name, count: 0, totalValue: 0 };
      entry.count += 1;
      entry.totalValue += Number(a.originalCost ?? 0);
      grouped.set(key, entry);
    }
    return Array.from(grouped.values()).sort((a, b) => b.count - a.count);
  }

  /** Maintenance cost report (§40). */
  maintenanceCosts() {
    return this.prisma.maintenanceRecord.findMany({
      where: { status: 'COMPLETED' },
      include: { asset: true },
      orderBy: { completionDate: 'desc' },
    });
  }

  /** Lost/missing/stocktake-discrepancy compliance report (§40). */
  async compliance() {
    const [incidents, missingFromStocktake, noLocation, noSerial] = await this.prisma.$transaction([
      this.prisma.assetIncident.findMany({ include: { asset: true }, orderBy: { reportDate: 'desc' } }),
      this.prisma.stocktakeItem.findMany({
        where: { result: { in: ['MISSING', 'WRONG_LOCATION', 'UNREGISTERED'] } },
        include: { asset: true, stocktake: true },
        orderBy: { id: 'desc' },
        take: 200,
      }),
      this.prisma.asset.count({ where: { isDeleted: false, currentRoomId: null } }),
      this.prisma.asset.count({ where: { isDeleted: false, serialNumber: null } }),
    ]);
    return { incidents, stocktakeDiscrepancies: missingFromStocktake, assetsWithoutLocation: noLocation, assetsWithoutSerial: noSerial };
  }
}
