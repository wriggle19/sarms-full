import { ConflictException, NotFoundException } from '@nestjs/common';
import { CustodyService } from './custody.service';

/**
 * Unit tests for the custody ledger rules (§6, §13, §39). Prisma is mocked:
 * the focus is on the business rules, not the database driver.
 */
describe('CustodyService issue rules', () => {
  let service: CustodyService;
  let tx: any;

  const activeAsset = (code: string) => ({
    id: 1,
    isDeleted: false,
    currentRoomId: null,
    currentCustodianId: null,
    status: { code },
  });

  beforeEach(() => {
    tx = {
      asset: {
        findUnique: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
      },
      assetAssignment: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: 99, ...data })),
      },
      assetHistory: { create: jest.fn().mockResolvedValue({}) },
    };
    const prisma: any = {
      $transaction: (fn: (t: any) => Promise<any>, _opts?: any) => fn(tx),
      assetCondition: { findUnique: jest.fn().mockResolvedValue({ id: 3, code: 'GOOD' }) },
    };
    const assetsService: any = { transitionStatus: jest.fn().mockResolvedValue({}) };
    service = new CustodyService(prisma as any, assetsService);
  });

  const dto = {
    assetId: 1,
    assignmentType: 'PERSON' as const,
    custodianUserId: 7,
    conditionAtIssueCode: 'GOOD',
  };

  it('issues an available asset and writes assignment + history + custodian pointer', async () => {
    tx.asset.findUnique.mockResolvedValue(activeAsset('AVAILABLE'));
    const assignment = await service.issue(dto as any, 10);
    expect(assignment.custodianUserId).toBe(7);
    expect(tx.assetAssignment.create).toHaveBeenCalledTimes(1);
    expect(tx.assetHistory.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ eventType: 'ISSUED' }) }),
    );
    expect(tx.asset.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
        data: expect.objectContaining({ currentCustodianId: 7 }),
      }),
    );
  });

  it('refuses a second active assignment for the same asset (double issuance)', async () => {
    tx.asset.findUnique.mockResolvedValue(activeAsset('AVAILABLE'));
    tx.assetAssignment.findFirst.mockResolvedValue({ id: 55, status: 'ACTIVE' });
    await expect(service.issue(dto as any, 10)).rejects.toBeInstanceOf(ConflictException);
    expect(tx.assetAssignment.create).not.toHaveBeenCalled();
  });

  it('refuses to issue assets in blocking statuses', async () => {
    for (const code of ['MAINTENANCE', 'RETIRED', 'DISPOSED', 'LOST', 'STOLEN']) {
      tx.asset.findUnique.mockResolvedValue(activeAsset(code));
      await expect(service.issue(dto as any, 10)).rejects.toBeInstanceOf(ConflictException);
    }
    expect(tx.assetAssignment.create).not.toHaveBeenCalled();
  });

  it('refuses to issue a deleted asset', async () => {
    tx.asset.findUnique.mockResolvedValue({ ...activeAsset('AVAILABLE'), isDeleted: true });
    await expect(service.issue(dto as any, 10)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('refuses an unknown condition code', async () => {
    (service as any).prisma.assetCondition.findUnique.mockResolvedValue(null);
    await expect(service.issue(dto as any, 10)).rejects.toBeInstanceOf(Error);
    expect(tx.assetAssignment.create).not.toHaveBeenCalled();
  });

describe('CustodyService return rules (§15)', () => {
  const makePrisma = (conditionCode: string, assignment: any) => ({
    assetCondition: { findUnique: jest.fn().mockResolvedValue({ id: 6, code: conditionCode }) },
    assetAssignment: {
      findUnique: jest.fn().mockResolvedValue(assignment),
      update: jest.fn().mockResolvedValue({}),
    },
    asset: { update: jest.fn().mockResolvedValue({}) },
    assetHistory: { create: jest.fn().mockResolvedValue({}) },
    $transaction: (ops: any[]) => Promise.all(ops),
  });

  const openAssignment = { id: 55, status: 'ACTIVE', assetId: 1, asset: { id: 1 } };

  it('a GOOD-condition return goes to AVAILABLE and clears the custodian pointer', async () => {
    const prisma = makePrisma('GOOD', openAssignment);
    const assetsService: any = { transitionStatus: jest.fn() };
    const svc = new CustodyService(prisma as any, assetsService);

    await svc.returnAsset(55, { conditionAtReturnCode: 'GOOD' } as any, 10);
    expect(prisma.asset.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
        data: expect.objectContaining({ currentCustodianId: null }),
      }),
    );
    expect(assetsService.transitionStatus).toHaveBeenCalledWith(1, 'AVAILABLE', 10, 'Returned');
  });

  it('a DAMAGED return goes to MAINTENANCE, never straight back to AVAILABLE', async () => {
    const prisma = makePrisma('DAMAGED', openAssignment);
    const assetsService: any = { transitionStatus: jest.fn() };
    const svc = new CustodyService(prisma as any, assetsService);

    await svc.returnAsset(55, { conditionAtReturnCode: 'DAMAGED' } as any, 10);
    expect(assetsService.transitionStatus).toHaveBeenCalledWith(1, 'MAINTENANCE', 10, 'Returned');
  });

  it('refuses to close an already-closed assignment (duplicate return)', async () => {
    const prisma = makePrisma('GOOD', { ...openAssignment, status: 'RETURNED' });
    const svc = new CustodyService(prisma as any, { transitionStatus: jest.fn() } as any);
    await expect(
      svc.returnAsset(55, { conditionAtReturnCode: 'GOOD' } as any, 10),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});

});