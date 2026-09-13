import { SetMetadata } from '@nestjs/common';

export const PERMISSION_KEY = 'required_permission';

/**
 * Marks a controller method as requiring a specific permission code
 * (e.g. "assets.create", "requests.approve"). Checked by PermissionGuard.
 */
export const RequirePermission = (...permissions: string[]) =>
  SetMetadata(PERMISSION_KEY, permissions);
