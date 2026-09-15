import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { NextFunction, Request, Response } from 'express';

/**
 * Assigns every request a correlation id (Priority 1).
 *
 * If an upstream proxy already sent X-Request-Id, that value is reused so a
 * trace spans nginx -> API. The id is echoed back in the response header and
 * stored on `req.id`, where the exception filter and access logging pick it up.
 */
@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request & { id?: string }, res: Response, next: NextFunction) {
    const incoming = req.headers['x-request-id'];
    const requestId =
      (Array.isArray(incoming) ? incoming[0] : incoming) || randomUUID();
    req.id = requestId;
    res.setHeader('X-Request-Id', requestId);

    const startedAt = Date.now();
    res.on('finish', () => {
      const ms = Date.now() - startedAt;
      const line = `[${requestId}] ${req.method} ${req.originalUrl} ${res.statusCode} ${ms}ms`;
      if (res.statusCode >= 500) this.logger.error(line);
      else if (res.statusCode >= 400) this.logger.warn(line);
      else this.logger.log(line);
    });

    next();
  }
}