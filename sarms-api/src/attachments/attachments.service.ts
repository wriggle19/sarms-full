import { BadRequestException, ForbiddenException, Injectable, NotFoundException, StreamableFile } from '@nestjs/common';
import { createReadStream, existsSync } from 'fs';
import { lookup } from 'mime-types';
import { extname, join } from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator';

/**
 * Secure document store (§46): allow-listed MIME types, 10MB cap, random
 * on-disk names (no path traversal, no executable uploads), downloads gated
 * behind JWT so URLs are never publicly guessable.
 */
export const ATTACHABLE_ENTITIES = [
  'ASSET',
  'REQUEST',
  'PURCHASE_ORDER',
  'MAINTENANCE',
  'DISPOSAL',
  'INCIDENT',
  'VENDOR',
] as const;

const ALLOWED_MIME = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'text/plain',
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const UPLOAD_DIR = (() => {
  const dir = process.env.UPLOAD_DIR;
  if (!dir) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('UPLOAD_DIR environment variable must be set in production');
    }
    return join(process.cwd(), 'uploads');
  }
  return dir;
})();

@Injectable()
export class AttachmentsService {
  constructor(private prisma: PrismaService) {}

  private assertEntity(entityType: string, entityId: number) {
    if (!(ATTACHABLE_ENTITIES as readonly string[]).includes(entityType)) {
      throw new BadRequestException(`entityType must be one of: ${ATTACHABLE_ENTITIES.join(', ')}`);
    }
    if (!Number.isInteger(entityId) || entityId <= 0) {
      throw new BadRequestException('entityId must be a positive integer');
    }
  }

  list(entityType: string, entityId: number) {
    this.assertEntity(entityType, entityId);
    return this.prisma.attachment.findMany({
      where: { entityType, entityId },
      include: { uploadedBy: { select: { id: true, fullName: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async save(
    file: Express.Multer.File | undefined,
    entityType: string,
    entityId: number,
    uploadedById: number,
  ) {
    if (!file) throw new BadRequestException('No file uploaded (field name: file)');
    this.assertEntity(entityType, entityId);
    if (file.size > MAX_BYTES) {
      throw new BadRequestException('File exceeds the 10MB limit');
    }
    const mime = file.mimetype;
    if (!ALLOWED_MIME.has(mime)) {
      throw new BadRequestException(`File type not allowed: ${mime}`);
    }
    // multer diskStorage already wrote with a random name; double-check extension.
    const ext = extname(file.originalname).toLowerCase();
    if (['.exe', '.bat', '.sh', '.js', '.php'].includes(ext)) {
      throw new BadRequestException('Executable files are not allowed');
    }
    return this.prisma.attachment.create({
      data: {
        entityType,
        entityId,
        fileName: file.originalname.slice(0, 200),
        // Stored path is server-private; served only via GET /attachments/:id.
        fileUrl: file.path,
        mimeType: mime,
        sizeBytes: file.size,
        uploadedById,
      },
    });
  }

  async getFile(id: number, user: AuthenticatedUser) {
    const row = await this.prisma.attachment.findUnique({ where: { id } });
    if (!row) throw new NotFoundException(`Attachment ${id} not found`);
    if (!row.fileUrl || !existsSync(row.fileUrl)) {
      throw new NotFoundException('Stored file is missing on disk');
    }
    // Permission check: requester must hold the view permission of the owning module.
    const modulePerm: Record<string, string> = {
      ASSET: 'assets.view',
      REQUEST: 'requests.view',
      PURCHASE_ORDER: 'procurement.manage',
      MAINTENANCE: 'maintenance.manage',
      DISPOSAL: 'disposal.approve',
      INCIDENT: 'assets.view',
      VENDOR: 'procurement.manage',
    };
    const needed = modulePerm[row.entityType];
    if (needed && !user.permissions.includes(needed) && !user.permissions.includes('audit.view')) {
      throw new ForbiddenException('You do not have access to this document');
    }
    const stream = createReadStream(row.fileUrl);
    return new StreamableFile(stream, {
      type: row.mimeType ?? (lookup(row.fileName) || 'application/octet-stream') as string,
      disposition: `attachment; filename=\"${row.fileName.replace(/\"/g, '')}\"`,
    });
  }

  async remove(id: number) {
    await this.prisma.attachment.findUnique({ where: { id } }).then((r) => {
      if (!r) throw new NotFoundException(`Attachment ${id} not found`);
    });
    return this.prisma.attachment.delete({ where: { id } });
  }

  async rename(id: number, fileName: string) {
    if (!fileName || fileName.length > 200) throw new BadRequestException('Invalid fileName');
    return this.prisma.attachment.update({ where: { id }, data: { fileName } });
  }
}
