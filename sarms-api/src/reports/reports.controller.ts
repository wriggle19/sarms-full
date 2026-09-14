import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionGuard } from '../common/guards/permission.guard';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { ReportsService } from './reports.service';

function toCsv(rows: Record<string, any>[]): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const escape = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  return [headers.join(','), ...rows.map((r) => headers.map((h) => escape(r[h])).join(','))].join('\n');
}

@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('reports')
export class ReportsController {
  constructor(private reports: ReportsService) {}

  @Get('asset-register')
  @RequirePermission('assets.view')
  assetRegister(
    @Query('departmentId') departmentId?: string,
    @Query('categoryId') categoryId?: string,
    @Query('statusId') statusId?: string,
  ) {
    return this.reports.assetRegister({
      departmentId: departmentId ? Number(departmentId) : undefined,
      categoryId: categoryId ? Number(categoryId) : undefined,
      statusId: statusId ? Number(statusId) : undefined,
    });
  }

  @Get('asset-register.csv')
  @RequirePermission('assets.view')
  async assetRegisterCsv(@Res() res: Response, @Query('departmentId') departmentId?: string) {
    const assets = await this.reports.assetRegister({ departmentId: departmentId ? Number(departmentId) : undefined });
    const csv = toCsv(
      assets.map((a: any) => ({
        assetTag: a.assetTag,
        name: a.name,
        category: a.category?.name,
        serialNumber: a.serialNumber,
        status: a.status?.code,
        condition: a.condition?.code,
        department: a.responsibleDepartment?.name,
        room: a.currentRoom?.name,
        originalCost: a.originalCost,
        currency: a.currency,
      })),
    );
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="asset-register.csv"');
    res.send(csv);
  }

  @Get('overdue')
  @RequirePermission('assets.view')
  overdue() {
    return this.reports.overdue();
  }

  @Get('overdue.csv')
  @RequirePermission('assets.view')
  async overdueCsv(@Res() res: Response) {
    const rows = await this.reports.overdue();
    const csv = toCsv(
      rows.map((r: any) => ({
        assetTag: r.asset?.assetTag,
        assetName: r.asset?.name,
        custodian: r.custodian?.fullName,
        email: r.custodian?.email,
        phone: r.custodian?.phone,
        department: r.custodian?.department?.name,
        issuedAt: r.issuedAt,
        expectedReturnDate: r.expectedReturnDate,
      })),
    );
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="overdue.csv"');
    res.send(csv);
  }

  @Get('warranties-expiring')
  @RequirePermission('assets.view')
  warrantiesExpiring(@Query('days') days?: string) {
    return this.reports.warrantiesExpiring(days ? Number(days) : 30);
  }

  @Get('by-department')
  @RequirePermission('assets.view')
  byDepartment() {
    return this.reports.byDepartment();
  }

  @Get('maintenance-costs')
  @RequirePermission('maintenance.manage')
  maintenanceCosts() {
    return this.reports.maintenanceCosts();
  }

  @Get('compliance')
  @RequirePermission('assets.view')
  compliance() {
    return this.reports.compliance();
  }
}
