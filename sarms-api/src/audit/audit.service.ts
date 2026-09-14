import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  find(filters: { userId?: number; module?: string; action?: string; take?: number }) {
    return this.prisma.auditLog.findMany({
      where: {
        userId: filters.userId,
        module: filters.module,
        action: filters.action,
      },
      include: { user: { select: { id: true, fullName: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      take: Math.min(filters.take ?? 100, 500),
    });
  }

  modules() {
    return this.prisma.auditLog.findMany({
      distinct: ['module'],
      select: { module: true },
    });
  }
}
