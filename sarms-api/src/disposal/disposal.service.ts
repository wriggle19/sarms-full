import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AssetsService } from '../assets/assets.service';
import { CreateDisposalDto } from './dto/disposal.dto';

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

    const disposal = await this.prisma.disposal.create({
      data: {
        assetId: dto.assetId,
        reason: dto.reason,
        bookValue: dto.bookValue,
        disposalMethod: dto.disposalMethod,
        approvedById,
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
