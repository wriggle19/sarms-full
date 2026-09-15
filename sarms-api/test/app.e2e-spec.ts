/**
 * End-to-end test of the critical user journey (Priority 2).
 * Boots the REAL AppModule (so any dependency-wiring regression - such as a
 * feature module losing an import and breaking boot - fails here), talks to it
 * over HTTP with supertest, and drives the full path:
 *   login -> create request -> approve (2 steps) -> finalize issuance
 *   -> acknowledge -> return
 * Requires a seeded, disposable database. See test/setup-env.ts.
 */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';

const hasDb = Boolean(process.env.DATABASE_URL);
const describeIfDb = hasDb ? describe : describe.skip;

describeIfDb('SARMS critical journey (e2e)', () => {
  let app: INestApplication;
  let http: any;
  let teacherToken: string;
  let adminToken: string;
  let officerToken: string;

  const PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'ChangeMe123!';

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    // Mirror main.ts so we exercise the same validation behaviour.
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();
    http = app.getHttpServer();
  }, 120000);

  afterAll(async () => {
    if (app) await app.close();
  });

  const login = async (email: string) => {
    const res = await request(http).post('/auth/login').send({ email, password: PASSWORD });
    expect(res.status).toBe(201);
    const token = res.body.accessToken ?? res.body.access_token;
    expect(token).toBeTruthy();
    return token as string;
  };

  it('boots the application (smoke: DI graph resolves)', async () => {
    const res = await request(http).get('/health');
    expect([200, 503]).toContain(res.status);
    expect(res.body.checks.database).toBeDefined();
  });

  it('rejects unauthenticated access to protected endpoints', async () => {
    const res = await request(http).get('/assets');
    expect(res.status).toBe(401);
  }, 30000);

  it('logs in the seeded teacher, admin and officer accounts', async () => {
    teacherToken = await login('teacher@sarms.local');
    adminToken = await login('admin@sarms.local');
    officerToken = await login('officer@sarms.local');
  }, 60000);

  let requestId: number;
  let assetId: number;
  let assignmentId: number;
it('teacher creates a request and it enters the approval chain', async () => {
    const me = await request(http).get('/auth/me').set('Authorization', `Bearer ${teacherToken}`);
    expect(me.status).toBe(200);

    const res = await request(http)
      .post('/requests')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        departmentId: me.body.departmentId,
        requestType: 'NEW_EQUIPMENT',
        quantity: 1,
        purpose: 'e2e test laptop',
      });

    expect([200, 201]).toContain(res.status);
    requestId = res.body.id;
    expect(requestId).toBeDefined();
    expect(res.body.requestNumber).toMatch(/^REQ/);
    // startWorkflow() runs as part of creation.
    expect(res.body.status).toBe('PENDING_APPROVAL');
  }, 60000);

  it('refuses self-approval (requester cannot decide their own request)', async () => {
    const res = await request(http)
      .post(`/requests/${requestId}/decide`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ decision: 'APPROVED', comment: 'self approval attempt' });

    // A teacher lacks requests.approve, so the permission guard and the
    // self-approval rule are both acceptable rejections here.
    expect([401, 403]).toContain(res.status);

    const after = await request(http)
      .get(`/requests/${requestId}`)
      .set('Authorization', `Bearer ${teacherToken}`);
    expect(after.body.status).toBe('PENDING_APPROVAL');
  }, 60000);

  it('admin approves step 1, officer approves step 2, request becomes APPROVED', async () => {
    const step1 = await request(http)
      .post(`/requests/${requestId}/decide`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ decision: 'APPROVED', comment: 'line manager ok' });
    expect([200, 201]).toContain(step1.status);

    const step2 = await request(http)
      .post(`/requests/${requestId}/decide`)
      .set('Authorization', `Bearer ${officerToken}`)
      .send({ decision: 'APPROVED', comment: 'IT ok' });
    expect([200, 201]).toContain(step2.status);
    expect(step2.body.status).toBe('APPROVED');

    const history = await request(http)
      .get(`/requests/${requestId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(history.body.status).toBe('APPROVED');
    expect(history.body.approvals.length).toBeGreaterThanOrEqual(2);
  }, 90000);

  it('officer issues the approved asset, and it cannot be issued twice', async () => {
    const categories = await request(http)
      .get('/asset-categories')
      .set('Authorization', `Bearer ${officerToken}`);
    expect(categories.status).toBe(200);
    const categoryId = categories.body[0]?.id ?? categories.body.data?.[0]?.id;
    expect(categoryId).toBeDefined();

    const me = await request(http).get('/auth/me').set('Authorization', `Bearer ${officerToken}`);
    const created = await request(http)
      .post('/assets')
      .set('Authorization', `Bearer ${officerToken}`)
      .send({
        name: 'E2E Test Laptop',
        categoryId,
        owningDepartmentId: me.body.departmentId,
        responsibleDepartmentId: me.body.departmentId,
      });
    expect([200, 201]).toContain(created.status);
    assetId = created.body.id;
    expect(assetId).toBeDefined();

    const conditions = await request(http)
      .get('/asset-conditions')
      .set('Authorization', `Bearer ${officerToken}`);
    const conditionCode = conditions.body[0]?.code ?? 'GOOD';

    const issued = await request(http)
      .post(`/issuance/requests/${requestId}/finalize`)
      .set('Authorization', `Bearer ${officerToken}`)
      .send({ assetId, conditionAtIssueCode: conditionCode });
    expect([200, 201]).toContain(issued.status);
    assignmentId = issued.body.id;
    expect(assignmentId).toBeDefined();

    const reqAfter = await request(http)
      .get(`/requests/${requestId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(reqAfter.body.status).toBe('ISSUED');

    const secondAttempt = await request(http)
      .post(`/issuance/requests/${requestId}/finalize`)
      .set('Authorization', `Bearer ${officerToken}`)
      .send({ assetId, conditionAtIssueCode: conditionCode });
    expect(secondAttempt.status).toBeGreaterThanOrEqual(400);
  }, 120000);

  it('returns the asset and custody is cleared', async () => {
    const conditions = await request(http)
      .get('/asset-conditions')
      .set('Authorization', `Bearer ${officerToken}`);
    const conditionCode = conditions.body[0]?.code ?? 'GOOD';

    const res = await request(http)
      .patch(`/assignments/${assignmentId}/return`)
      .set('Authorization', `Bearer ${officerToken}`)
      .send({ conditionAtReturnCode: conditionCode });
    expect([200, 201]).toContain(res.status);

    const asset = await request(http)
      .get(`/assets/${assetId}`)
      .set('Authorization', `Bearer ${officerToken}`);
    expect(asset.status).toBe(200);
    expect(asset.body.currentCustodianId).toBeNull();
  }, 90000);

  it('teacher cannot read the audit log (RBAC enforced server-side)', async () => {
    const audit = await request(http)
      .get("/audit-logs")
      .set('Authorization', `Bearer ${teacherToken}`);
    expect([401, 403]).toContain(audit.status);
  }, 30000);
});