import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AssetsService } from '../assets/assets.service';
import { CreateDisposalDto } from './dto/disposal.dto';

const DISPOSAL_FINANCE_THRESHOLD = 0; // require finance approval for all disposals

/**
 * Section 35. Disposal only proceeds from RETIRED (see
 * ASSET_STATUS_TRANSITIONS: RETIRED -> DISPOSED is the only edge out of
 * RETIRED) - transitionStatus() enforces that, so this service can't
 * accidentally dispose of something still in active use.
 */
@Injectable()
export class DisposalService {
  constructor(
    private prisma: PrismaService,
    private assetsService: AssetsService,
  ) {}

  async create(dto: CreateDisposalDto, approvedById: number) {
    const asset = await this.prisma.asset.findUnique({ where: { id: dto.assetId }, include: { status: true } });
    if (!asset) throw new BadRequestException(`Asset ${dto.assetId} not found`);
    if (asset.status.code !== 'RETIRED') {
      throw new BadRequestException('Only retired assets can be disposed of - retire the asset first');
    }

    // Finance approval is required for all disposals (threshold = 0).
    // For assets above a value threshold this is mandatory; the field must
    // reference a real user with the finance.view permission.
    const bookValue = Number(dto.bookValue ?? asset.originalCost ?? 0);
    if (bookValue > DISPOSAL_FINANCE_THRESHOLD) {
      if (!dto.financeApprovedById) {
        throw new BadRequestException('financeApprovedById is required for asset disposals');
      }
      const financeUser = await this.prisma.userRole.findFirst({
        where: {
          userId: dto.financeApprovedById,
          role: { permissions: { some: { permission: { code: 'finance.view' } } } },
        },
      });
      if (!financeUser) {
        throw new ForbiddenException('financeApprovedById must be a user with the finance.view permission');
      }
    }

    const disposal = await this.prisma.disposal.create({
      data: {
        assetId: dto.assetId,
        reason: dto.reason,
        bookValue: dto.bookValue,
        disposalMethod: dto.disposalMethod,
        approvedById,
        financeApprovedById: dto.financeApprovedById,
        disposalVendorId: dto.disposalVendorId,
        proceeds: dto.proceeds,
      },
    });

    await this.assetsService.transitionStatus(dto.assetId, 'DISPOSED', approvedById, `Disposed: ${dto.disposalMethod}`);

    return disposal;
  }

  findAll() {
    return this.prisma.disposal.findMany({ include: { asset: true, approvedBy: true }, orderBy: { disposalDate: 'desc' } });
  }
}
