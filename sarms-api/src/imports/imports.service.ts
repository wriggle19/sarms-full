import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AssetsService } from '../assets/assets.service';

/**
 * Section 47: CSV asset import. The controller accepts either pasted CSV
 * text or pre-parsed row objects, validates every row against the live
 * database (categories, departments, rooms), and by default only PREVIEWS.
 * Nothing is written unless commit=true - so an operator sees the
 * duplicate/error report before anything lands.
 */
export interface ImportRow {
  name: string;
  categoryName: string;
  serialNumber?: string;
  manufacturer?: string;
  model?: string;
  departmentName?: string;
  roomName?: string;
  originalCost?: number;
  currency?: string;
  notes?: string;
}

@Injectable()
export class ImportsService {
  constructor(
    private prisma: PrismaService,
    private assetsService: AssetsService,
  ) {}

  /** Minimal CSV parser good enough for one-header exports from Excel/Sheets. */
  parseCsv(text: string): ImportRow[] {
    const lines = text.trim().split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) return [];
    const split = (line: string) => {
      const out: string[] = [];
      let cur = '', inQ = false;
      for (const ch of line) {
        if (ch === '"') inQ = !inQ;
        else if (ch === ',' && !inQ) { out.push(cur.trim()); cur = ''; }
        else cur += ch;
      }
      out.push(cur.trim());
      return out;
    };
    const headers = split(lines[0]).map((h) => h.toLowerCase().replace(/\s+/g, ''));
    return lines.slice(1).map((line) => {
      const cells = split(line);
      const row: any = {};
      headers.forEach((h, i) => { row[h] = cells[i]; });
      return {
        name: row.name,
        categoryName: row.category,
        serialNumber: row.serialnumber || undefined,
        manufacturer: row.manufacturer || undefined,
        model: row.model || undefined,
        departmentName: row.department || undefined,
        roomName: row.room || undefined,
        originalCost: row.cost ? Number(row.cost) : undefined,
        currency: row.currency || undefined,
        notes: row.notes || undefined,
      } as ImportRow;
    });
  }

  async validate(rows: ImportRow[]) {
    const [categories, departments, rooms, existingSerials] = await this.prisma.$transaction([
      this.prisma.assetCategory.findMany(),
      this.prisma.department.findMany(),
      this.prisma.room.findMany(),
      this.prisma.asset.findMany({ where: { serialNumber: { not: null } }, select: { serialNumber: true } }),
    ]);
    const serialSet = new Set(existingSerials.map((a) => a.serialNumber));
    const catByName = new Map<string, any>(categories.map((c: any) => [c.name.toLowerCase(), c]));
    const deptByName = new Map<string, any>(departments.map((d: any) => [d.name.toLowerCase(), d]));
    const roomByName = new Map<string, any>(rooms.map((r: any) => [r.name.toLowerCase(), r]));

    const results: { row: ImportRow; valid: boolean; error?: string; duplicateSerial?: boolean }[] = [];
    for (const row of rows) {
      if (!row.name) { results.push({ row, valid: false, error: 'Missing name' }); continue; }
      if (!row.categoryName || !catByName.get(row.categoryName.toLowerCase())) {
        results.push({ row, valid: false, error: `Unknown category "${row.categoryName}"` });
        continue;
      }
      const duplicate = row.serialNumber && serialSet.has(row.serialNumber);
      if (duplicate) {
        results.push({ row, valid: false, error: `Duplicate serial ${row.serialNumber}`, duplicateSerial: true });
        continue;
      }
      if (row.departmentName && !deptByName.get(row.departmentName.toLowerCase())) {
        results.push({ row, valid: false, error: `Unknown department "${row.departmentName}"` });
        continue;
      }
      if (row.roomName && !roomByName.get(row.roomName.toLowerCase())) {
        results.push({ row, valid: false, error: `Unknown room "${row.roomName}"` });
        continue;
      }
      if (row.serialNumber) serialSet.add(row.serialNumber);
      results.push({ row, valid: true });
    }
    return results;
  }

  async import(text: string, commit: boolean, actorId: number) {
    const rows = this.parseCsv(text);
    const validation = await this.validate(rows);
    const valid = validation.filter((v) => v.valid);

    if (!commit) {
      return {
        preview: true,
        total: rows.length,
        validCount: valid.length,
        errorCount: validation.length - valid.length,
        rows: validation,
      };
    }

    const catByName = new Map<string, any>(
      (await this.prisma.assetCategory.findMany()).map((c: any) => [c.name.toLowerCase(), c]),
    );
    const deptByName = new Map<string, any>(
      (await this.prisma.department.findMany()).map((d: any) => [d.name.toLowerCase(), d]),
    );
    const roomByName = new Map<string, any>(
      (await this.prisma.room.findMany()).map((r: any) => [r.name.toLowerCase(), r]),
    );

    const created: any[] = [];
    const failed: { name: string; error: string }[] = [];
    for (const v of valid) {
      try {
        const deptId = v.row.departmentName ? deptByName.get(v.row.departmentName.toLowerCase())!.id : undefined;
        const asset = await this.assetsService.register(
          {
            name: v.row.name,
            categoryId: catByName.get(v.row.categoryName.toLowerCase())!.id,
            serialNumber: v.row.serialNumber,
            manufacturer: v.row.manufacturer,
            model: v.row.model,
            originalCost: v.row.originalCost,
            currency: v.row.currency,
            notes: v.row.notes,
            owningDepartmentId: deptId,
            responsibleDepartmentId: deptId,
            currentRoomId: v.row.roomName ? roomByName.get(v.row.roomName.toLowerCase())!.id : undefined,
          } as any,
          actorId,
        );
        created.push(asset);
      } catch (e: any) {
        failed.push({ name: v.row.name, error: e.message });
      }
    }
    return { preview: false, createdCount: created.length, created, failed };
  }
}

