import { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { AssetsService } from './assets.service';

const user = (permissions: string[]): AuthenticatedUser =>
  ({ id: 1, email: 'u@s.test', permissions, departmentId: 1 }) as AuthenticatedUser;

describe('assets service finance sanitization (§27 / §1.6 Gap 5)', () => {
  let service: AssetsService;

  beforeEach(() => {
    // Only the method under test is exercised; Prisma is never touched.
    service = Object.create(AssetsService.prototype);
  });

  const asset = {
    id: 5,
    assetTag: 'LAP-00001',
    name: 'Laptop',
    originalCost: '4500.00',
    currency: 'GHS',
    fundingSource: 'CapEx',
    projectCode: 'P-2026',
    assetClass: 'IT',
    usefulLifeYears: 4,
    salvageValue: '200.00',
  } as any;

  it('keeps finance fields for a finance.view user', () => {
    const out = service.sanitizeForUser(asset, user(['assets.view', 'finance.view']));
    expect(out.originalCost).toBe('4500.00');
    expect(out.currency).toBe('GHS');
  });

  it('nulls finance fields for a plain assets.view user', () => {
    const out = service.sanitizeForUser(asset, user(['assets.view']));
    expect(out.originalCost).toBeNull();
    expect(out.currency).toBeNull();
    expect(out.fundingSource).toBeNull();
    expect(out.projectCode).toBeNull();
    expect(out.usefulLifeYears).toBeNull();
    // Non-finance fields untouched
    expect(out.assetTag).toBe('LAP-00001');
    expect(out.name).toBe('Laptop');
  });

  it('does not mutate the original object', () => {
    const copy = { ...asset };
    service.sanitizeForUser(asset, user(['assets.view']));
    expect(asset).toEqual(copy);
  });
});