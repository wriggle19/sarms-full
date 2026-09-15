import { Controller, Get, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Liveness/readiness probe for reverse proxies, orchestrators and uptime
 * monitors (Priority 1). Deliberately unauthenticated and dependency-light.
 *
 *   200 -> database reachable
 *   503 -> database unreachable
 *
 * Uses @Res({ passthrough: true }) so the 503 response can still carry the
 * full structured body (the global exception filter is bypassed by design
 * here - this endpoint reports a state, it does not fail).
 */
@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Health check (200 healthy / 503 degraded)' })
  async check(@Res({ passthrough: true }) res: Response) {
    const startedAt = Date.now();
    let database: 'up' | 'down' = 'up';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      database = 'down';
    }

    const healthy = database === 'up';
    res.status(healthy ? 200 : 503);

    return {
      status: healthy ? 'ok' : 'degraded',
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
      checks: {
        database: { status: database, responseTimeMs: Date.now() - startedAt },
      },
    };
  }
}