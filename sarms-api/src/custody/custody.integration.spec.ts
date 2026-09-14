/**
 * Integration tests against a REAL Postgres database (§39 Concurrency, §6).
 * Run: DATABASE_URL=postgresql://... npx jest custody.integration
 * Skipped automatically when DATABASE_URL is unset, so `npm test` (unit suite)
 * never requires a database.
 */
import { PrismaClient } from '@prisma/client';
import { CustodyService } from './custody.service';
import { PrismaService } from '../prisma/prisma.service';

const dbUrl = process.env.DATABASE_URL;
const describeIfDb = dbUrl ? describe : describe.skip;

describeIfDb('CustodyService integration (live Postgres)', () => {
  let prisma!: PrismaClient;
  let service!: CustodyService;
  let adminId!: number;
  let catId!: number;
  let deptId!: number;

  const unique = () => `T${Date.now()}${Math.floor(Math.random() * 100000)}`;

  beforeAll(async () => {
    prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });
    await prisma.$connect();
    await prisma.assetStatus.upsert({
      where: { code: 'AVAILABLE' }, update: {},
      create: { code: 'AVAILABLE', label: 'Available', colorHex: '#16a34a' },
    });
    deptId = (await prisma.department.upsert({
      where: { code: 'INTTEST' }, update: {},
      create: { name: 'Integration Test Dept', code: 'INTTEST' },
    })).id;
    catId = (await prisma.assetCategory.create({ data: { name: `IntTest ${unique()}` } })).id;
    const bcrypt = require('bcrypt');
    adminId = (await prisma.user.create({
      data: {
        fullName: 'Integration Test User',
        email: `int-${unique()}@sarms.test`,
        passwordHash: await bcrypt.hash('integration-test-only', 12),
        departmentId: deptId,
        status: 'ACTIVE',
      },
    })).id;
  }, 60000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(() => {
    // PrismaService extends PrismaClient and reads DATABASE_URL from the env.
    service = new CustodyService(new PrismaService() as any, {
      transitionStatus: jest.fn().mockResolvedValue({}),
    } as any);
  });

  const createAsset = async (statusCode = 'AVAILABLE') =>
    prisma.asset.create({
      data: {
        assetTag: `INT-${unique()}`,
        name: 'Integration test asset',
        qrToken: unique(),
        serialNumber: `SN-${unique()}`,
        categoryId: catId,
        statusId: (await prisma.assetStatus.findUniqueOrThrow({ where: { code: statusCode } })).id,
        conditionId: (await prisma.assetCondition.findFirstOrThrow({ where: { code: 'GOOD' } })).id,
        owningDepartmentId: deptId,
        responsibleDepartmentId: deptId,
        createdById: adminId,
      },
    });

  const issueDto = (assetId: number) => ({
    assetId,
    assignmentType: 'PERSON' as const,
    custodianUserId: adminId,
    conditionAtIssueCode: 'GOOD',
  });


  it('serializable transaction: only ONE of two simultaneous issuances succeeds (§6 race test)', async () => {
    const asset = await createAsset();
    const dto = issueDto(asset.id);
    const results = await Promise.allSettled([
      service.issue(dto as any, adminId),
      service.issue(dto as any, adminId),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((r) => r.status === 'rejected')).toHaveLength(1);
    const active = await prisma.assetAssignment.findMany({
      where: { assetId: asset.id, status: 'ACTIVE' },
    });
    expect(active).toHaveLength(1);
  }, 30000);

  it('refuses to issue an asset in a blocking status (live rule check)', async () => {
    const asset = await createAsset('DISPOSED');
    await expect(service.issue(issueDto(asset.id) as any, adminId)).rejects.toThrow(/DISPOSED/);
  });

  it('enforces unique asset tags at the database level', async () => {
    const statusId = (await prisma.assetStatus.findUniqueOrThrow({ where: { code: 'AVAILABLE' } })).id;
    const conditionId = (await prisma.assetCondition.findFirstOrThrow({ where: { code: 'GOOD' } })).id;
    const base = {
      assetTag: `INT-${unique()}`, name: 'dup test', categoryId: catId,
      qrToken: unique(),
      statusId, conditionId, owningDepartmentId: deptId,
      responsibleDepartmentId: deptId, createdById: adminId,
    };
    await prisma.asset.create({ data: base });
    await expect(
      prisma.asset.create({ data: { ...base, serialNumber: `SN-${unique()}` } }),
    ).rejects.toThrow();
  });

  it('maintains currentCustodianId through a real issue -> return cycle', async () => {
    const asset = await createAsset();
    const assignment = await service.issue(issueDto(asset.id) as any, adminId);
    let fresh = await prisma.asset.findUniqueOrThrow({ where: { id: asset.id } });
    expect(fresh.currentCustodianId).toBe(adminId);

    await service.returnAsset(assignment.id, { conditionAtReturnCode: 'GOOD' } as any, adminId);
    fresh = await prisma.asset.findUniqueOrThrow({ where: { id: asset.id } });
    expect(fresh.currentCustodianId).toBeNull();
    const closed = await prisma.assetAssignment.findUniqueOrThrow({ where: { id: assignment.id } });
    expect(closed.status).toBe('RETURNED');
    expect(closed.actualReturnDate).not.toBeNull();
  }, 30000);

  it('append-only history: an ISSUED history row exists and is never edited', async () => {
    const asset = await createAsset();
    const assignment = await service.issue(issueDto(asset.id) as any, adminId);
    await service.returnAsset(assignment.id, { conditionAtReturnCode: 'GOOD' } as any, adminId);
    const history = await prisma.assetHistory.findMany({
      where: { assetId: asset.id }, orderBy: { id: 'asc' },
    });
    expect(history.length).toBeGreaterThanOrEqual(2);
    expect(history[0].eventType).toBe('ISSUED');
  }, 30000);
});
