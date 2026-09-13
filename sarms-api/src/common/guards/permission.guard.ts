import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSION_KEY } from '../decorators/require-permission.decorator';
import { AuthenticatedUser } from '../decorators/current-user.decorator';

/**
 * Runs after JwtAuthGuard. Checks the permission codes attached to the route
 * (via @RequirePermission) against the permissions embedded in the user's JWT.
 * This only answers "can this role do this kind of thing at all" - record-level
 * checks (e.g. "can this manager approve THIS request") belong in the service.
 */
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!required || required.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser | undefined;

    if (!user) {
      throw new ForbiddenException('Not authenticated');
    }

    const hasPermission = required.every((code) => user.permissions.includes(code));
    if (!hasPermission) {
      throw new ForbiddenException(
        `Missing required permission(s): ${required.join(', ')}`,
      );
    }

    return true;
  }
}
