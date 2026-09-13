import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Generates numbers like REQ-2026-000001, PO-2026-000042, AST-000001.
 * Uses an atomic increment against NumberSequence so concurrent requests
 * never collide - do not generate these numbers any other way.
 */
@Injectable()
export class NumberSequenceService {
  constructor(private prisma: PrismaService) {}

  async next(prefix: string, opts?: { yearScoped?: boolean; padding?: number }): Promise<string> {
    const padding = opts?.padding ?? 6;
    const yearScoped = opts?.yearScoped !== false;
    const year = yearScoped ? new Date().getFullYear() : null;

    let sequence: { prefix: string; year: number | null; lastNumber: number };
    if (yearScoped) {
      // year is non-null, so the compound unique key works for an atomic upsert.
      sequence = await this.prisma.numberSequence.upsert({
        where: { prefix_year: { prefix, year: year! } },
        update: { lastNumber: { increment: 1 } },
        create: { prefix, year, lastNumber: 1 },
      });
    } else {
      // Non-year-scoped sequences (e.g. AST-000001) use a NULL year. Prisma's
      // compound-unique upsert key requires a non-null year, so handle them with
      // a find-then-increment inside a transaction instead.
      sequence = await this.prisma.$transaction(async (tx) => {
        const existing = await tx.numberSequence.findFirst({ where: { prefix, year: null } });
        if (existing) {
          return tx.numberSequence.update({
            where: { id: existing.id },
            data: { lastNumber: { increment: 1 } },
          });
        }
        return tx.numberSequence.create({ data: { prefix, year: null, lastNumber: 1 } });
      });
    }

    const padded = String(sequence.lastNumber).padStart(padding, '0');
    return year ? `${prefix}-${year}-${padded}` : `${prefix}-${padded}`;
  }
}
