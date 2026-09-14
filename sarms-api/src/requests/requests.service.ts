import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NumberSequenceService } from '../common/utils/number-sequence.service';
import { CreateRequestDto } from './dto/create-request.dto';

@Injectable()
export class RequestsService {
  constructor(
    private prisma: PrismaService,
    private numberSequence: NumberSequenceService,
    private notifications: NotificationsService,
  ) {}

  async create(dto: CreateRequestDto, requesterId: number) {
    const requestNumber = await this.numberSequence.next('REQ');

    const request = await this.prisma.assetRequest.create({
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

    // Section 27: a freshly submitted request notifies whoever has to act on it —
    // the requester's line manager (supervisor) and department head.
    const requester = await this.prisma.user.findUnique({ where: { id: requesterId } });
    const department = requester?.departmentId
      ? await this.prisma.department.findUnique({ where: { id: requester.departmentId } })
      : null;
    const approverIds = [
      requester?.supervisorId,
      department?.headUserId,
    ].filter((id): id is number => Boolean(id));

    await this.notifications.notifyMany(
      approverIds,
      'REQUEST_SUBMITTED',
      `New equipment request ${requestNumber}`,
      `${requester?.fullName ?? 'A staff member'} requested ${dto.quantity ?? 1}x ${dto.requestType} — pending your approval.`,
    );

    return request;
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
    const cancellable: string[] = ['DRAFT', 'SUBMITTED', 'CHANGES_REQUESTED'];
    if (!cancellable.includes(request.status)) {
      throw new ConflictException(`A request in status ${request.status} cannot be cancelled`);
    }
    return this.prisma.assetRequest.update({ where: { id }, data: { status: 'CANCELLED' } });
  }
}
