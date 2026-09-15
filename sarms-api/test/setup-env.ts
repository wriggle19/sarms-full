/**
 * Shared environment bootstrap for the e2e suite.
 *
 * `setupFiles` entries run BEFORE the test framework and before any module
 * import, which is exactly what we need: PrismaClient resolves DATABASE_URL
 * when it is constructed, so the value must be in place first.
 *
 * Set TEST_DATABASE_URL to point at a disposable database. If it is absent we
 * fall back to DATABASE_URL; if neither exists the e2e suite skips itself.
 */
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'e2e-test-secret-not-for-production';
process.env.UPLOAD_DIR = process.env.UPLOAD_DIR || '/tmp/sarms-e2e-uploads';
process.env.SCHEDULER_ENABLED = process.env.SCHEDULER_ENABLED || 'false';
process.env.CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';
// Keep throttling out of the way: the suite performs several logins.
process.env.RATE_LIMIT_MAX = process.env.RATE_LIMIT_MAX || '10000';

if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
}
if (!process.env.DATABASE_URL) {
  // eslint-disable-next-line no-console
  console.warn('[e2e] No DATABASE_URL/TEST_DATABASE_URL set - e2e suite will be skipped.');
}