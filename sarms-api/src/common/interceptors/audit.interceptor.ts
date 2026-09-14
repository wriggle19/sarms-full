import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../../prisma/prisma.service';
import { AUDIT_KEY, AuditMeta } from '../decorators/audit.decorator';
import { AuthenticatedUser } from '../decorators/current-user.decorator';

/**
 * Writes an AuditLog row after any @Audit()-tagged handler completes
 * successfully. Failed requests are not logged here (NestJS exception
 * filters handle those separately) - this interceptor only records actions
 * that actually happened.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  /**
   * Secrets must never land in the audit log: login responses embed a live
   * JWT, and user objects can carry password hashes. Strip them before the
   * value is serialized.
   */
  private static SENSITIVE_KEYS = [
    'accessToken',
    'refreshToken',
    'password',
    'passwordHash',
    'currentPassword',
    'newPassword',
    'resetToken',
  ];

  private sanitize(value: unknown, depth = 0): unknown {
    if (depth > 3 || value === null || typeof value !== 'object') {
      return value;
    }
    if (Array.isArray(value)) {
      return value.map((v) => this.sanitize(v, depth + 1));
    }
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = AuditInterceptor.SENSITIVE_KEYS.includes(k)
        ? '[REDACTED]'
        : this.sanitize(v, depth + 1);
    }
    return out;
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const meta = this.reflector.getAllAndOverride<AuditMeta>(AUDIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!meta) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser | undefined;

    return next.handle().pipe(
      tap((result) => {
        const recordId = result?.id ?? request.params?.id ?? null;
        this.prisma.auditLog
          .create({
            data: {
              userId: user?.id ?? null,
              action: meta.action,
              module: meta.module,
              recordType: meta.recordType,
              recordId: recordId ? Number(recordId) : null,
              newValue: result ? JSON.stringify(this.sanitize(result)) : undefined,
              ipAddress: request.ip,
              userAgent: request.headers?.['user-agent'],
            },
          })
          .catch(() => {
            // Audit logging must never break the actual request. Log to
            // stderr and move on - a monitoring alert on this catch block
            // is worth setting up in production.
            // eslint-disable-next-line no-console
            console.error('Failed to write audit log for', meta);
          });
      }),
    );
  }
}
