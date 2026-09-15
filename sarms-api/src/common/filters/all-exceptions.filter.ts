import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';

/**
 * Global catch-all exception filter (Priority 1).
 *
 * Guarantees every error leaving the API has the SAME JSON shape
 * ({ statusCode, message, error }) so clients never have to special-case
 * NestJS's default payloads, and ensures internal details (stack traces,
 * Prisma error text, SQL fragments) never reach the client in production.
 *
 * Full details - including the stack - are always logged server-side, tagged
 * with the per-request id so one request's lines can be correlated.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();
    const request = ctx.getRequest();
    const response = ctx.getResponse();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    // HttpExceptions carry deliberate, safe messages (validation failures,
    // business-rule rejections). Anything else is an unexpected error whose
    // message may leak internals.
    let message: string | string[];
    let error: string;

    if (exception instanceof HttpException) {
      const payload = exception.getResponse();
      if (typeof payload === 'string') {
        message = payload;
        error = exception.name;
      } else {
        const p = payload as Record<string, any>;
        message = p.message ?? exception.message;
        error = p.error ?? exception.name;
      }
    } else if (process.env.NODE_ENV !== 'production') {
      // Development only: surface the real error for fast debugging.
      message = exception instanceof Error ? exception.message : 'Internal server error';
      error = 'Internal Server Error';
    } else {
      message = 'Internal server error';
      error = 'Internal Server Error';
    }

    const requestId = request?.id ?? request?.headers?.['x-request-id'];
    const method = httpAdapter.getRequestMethod(request);
    const url = httpAdapter.getRequestUrl(request);

    // Always log the full error server-side, regardless of environment.
    const detail =
      exception instanceof Error ? exception.stack ?? exception.message : String(exception);
    if (status >= 500) {
      this.logger.error(`[${requestId ?? '-'}] ${method} ${url} -> ${status}: ${detail}`);
    } else {
      this.logger.warn(
        `[${requestId ?? '-'}] ${method} ${url} -> ${status}: ${Array.isArray(message) ? message.join('; ') : message}`,
      );
    }

    httpAdapter.reply(
      response,
      {
        statusCode: status,
        message,
        error,
        ...(requestId ? { requestId } : {}),
        path: url,
        timestamp: new Date().toISOString(),
      },
      status,
    );
  }
}
