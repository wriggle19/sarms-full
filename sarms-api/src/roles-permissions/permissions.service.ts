import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PermissionsService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.permission.findMany({ orderBy: { code: 'asc' } });
  }

  /** Idempotent - safe to call on every deploy to keep the permission table in sync. */
  async seed(codes: { code: string; description?: string }[]) {
    for (const c of codes) {
      await this.prisma.permission.upsert({
        where: { code: c.code },
        update: { description: c.description },
        create: c,
      });
    }
  }
}
