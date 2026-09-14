import { ForbiddenException } from '@nestjs/common';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { AttachmentsService } from './attachments.service';

const user = (permissions: string[]): AuthenticatedUser =>
  ({ id: 1, email: 'u@s.test', permissions, departmentId: 1 }) as AuthenticatedUser;

describe('AttachmentsService access control (§34)', () => {
  let service: AttachmentsService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      attachment: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        delete: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
      },
    };
    service = new AttachmentsService(prisma);
  });

  it('blocks a plain user from listing maintenance documents', () => {
    expect(() => service.list('MAINTENANCE', 1, user(['assets.view']))).toThrow(ForbiddenException);
    expect(prisma.attachment.findMany).not.toHaveBeenCalled();
  });

  it('lets a maintenance-manage user list maintenance documents', () => {
    expect(() => service.list('MAINTENANCE', 1, user(['maintenance.manage']))).not.toThrow();
    expect(prisma.attachment.findMany).toHaveBeenCalled();
  });

  it('blocks unauthorized deletes', async () => {
    prisma.attachment.findUnique.mockResolvedValue({ id: 9, entityType: 'DISPOSAL' });
    await expect(service.remove(9, user(['assets.view']))).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.attachment.delete).not.toHaveBeenCalled();
  });

  it('blocks unauthorized renames', async () => {
    prisma.attachment.findUnique.mockResolvedValue({ id: 9, entityType: 'PURCHASE_ORDER' });
    await expect(service.rename(9, 'x.pdf', user(['assets.view']))).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.attachment.update).not.toHaveBeenCalled();
  });

  it('rejects invalid entity types (no IDOR against arbitrary tables)', () => {
    expect(() => service.list('USER', 1, user(['audit.view']))).toThrow(/entityType/);
  });

  it('rejects non-positive entity ids', () => {
    expect(() => service.list('ASSET', 0, user(['assets.view']))).toThrow(/positive integer/);
    expect(() => service.list('ASSET', -5, user(['assets.view']))).toThrow(/positive integer/);
  });

  it('rejects disallowed MIME types on upload', async () => {
    const file = { size: 100, mimetype: 'application/x-msdownload', originalname: 'evil.exe' } as any;
    await expect(service.save(file, 'ASSET', 1, 1)).rejects.toThrow(/not allowed/);
    expect(prisma.attachment.create).not.toHaveBeenCalled();
  });

  it('rejects files over the 10MB limit', async () => {
    const file = { size: 11 * 1024 * 1024, mimetype: 'application/pdf', originalname: 'big.pdf' } as any;
    await expect(service.save(file, 'ASSET', 1, 1)).rejects.toThrow(/10MB/);
  });
});