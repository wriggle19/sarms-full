import { SetMetadata } from '@nestjs/common';

export const AUDIT_KEY = 'audit_meta';

export interface AuditMeta {
  action: string; // CREATE, UPDATE, DELETE, APPROVE, REJECT, ISSUE, RETURN, ...
  module: string; // "assets", "requests", ...
  recordType: string; // "Asset", "AssetRequest", ...
}

/**
 * Tags a controller method so AuditInterceptor logs it automatically on
 * success. Use this instead of hand-writing AuditLog.create() calls in every
 * service - it keeps audit coverage consistent instead of ad hoc.
 */
export const Audit = (meta: AuditMeta) => SetMetadata(AUDIT_KEY, meta);
