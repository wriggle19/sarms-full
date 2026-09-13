import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NumberSequenceService } from '../common/utils/number-sequence.service';
import { CreateRequestDto } from './dto/create-request.dto';

@Injectable()
export class RequestsService {
  constructor(
    private prisma: PrismaService,
    private numberSequence: NumberSequenceService,
  ) {}

  async create(dto: CreateRequestDto, requesterId: number) {
    const requestNumber = await this.numberSequence.next('REQ');

    return this.prisma.assetRequest.create({
      data: {
        requestNumber,
        requesterId,
        departmentId: dto.departmentId,
        requestType: dto.requestType,
        categoryId: dto.categoryId,
        specificAssetId: dto.specificAssetId,
        quantity: dto.quantity ?? 1,
        purpose: dto.purpose,
        locationRoomId: dto.locationRoomId,
        startDate: dto.startDate,
        expectedEndDate: dto.expectedEndDate,
        academicYearId: dto.academicYearId,
        priority: dto.priority,
        justification: dto.justification,
        status: 'SUBMITTED',
      },
    });
  }

  findMine(requesterId: number) {
    return this.prisma.assetRequest.findMany({
      where: { requesterId },
      include: { category: true, approvals: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  findAll(status?: string) {
    return this.prisma.assetRequest.findMany({
      where: status ? { status: status as any } : undefined,
      include: { requester: true, department: true, category: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number) {
    const request = await this.prisma.assetRequest.findUnique({
      where: { id },
      include: {
        requester: true,
        department: true,
        category: true,
        specificAsset: true,
        approvals: { include: { approver: true, step: true } },
        assignments: true,
      },
    });
    if (!request) throw new NotFoundException(`Request ${id} not found`);
    return request;
  }

  async cancel(id: number, requesterId: number) {
    const request = await this.findOne(id);
    if (request.requesterId !== requesterId) {
      throw new NotFoundException(`Request ${id} not found`); // don't leak existence to other users
    }
    return this.prisma.assetRequest.update({ where: { id }, data: { status: 'CANCELLED' } });
  }
}
