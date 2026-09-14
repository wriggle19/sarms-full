import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/** Part 1: availability + create + list. */
@Injectable()
export class ReservationsService {
  constructor(private prisma: PrismaService) {}

  async checkAvailability(assetId?: number, categoryId?: number, start?: Date, end?: Date) {
    if (!start || !end || isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
      throw new BadRequestException('Invalid time window - provide valid startDateTime and endDateTime');
    }
    if (!assetId && !categoryId) throw new BadRequestException('Provide assetId or categoryId');
    const timeOverlap = {
      status: { in: ['PENDING', 'APPROVED'] as any },
      startDateTime: { lt: end },
      endDateTime: { gt: start },
    };
    const overlapping = await (this.prisma as any).assetReservation.findMany({
      where: assetId ? { ...timeOverlap, assetId } : { ...timeOverlap, assetId: null, categoryId },
    });
    let conflictingAssignments: object[] = [];
    if (assetId) {
      conflictingAssignments = await this.prisma.assetAssignment.findMany({
        where: { assetId, status: 'ACTIVE', OR: [{ expectedReturnDate: null }, { expectedReturnDate: { gt: start } }] },
      });
    }
    return { available: overlapping.length === 0 && conflictingAssignments.length === 0, overlappingReservations: overlapping, conflictingAssignments };
  }

  async create(
    dto: { assetId?: number; categoryId?: number; startDateTime: string; endDateTime: string; purpose?: string; roomId?: number; departmentId?: number },
    reservedById: number,
  ) {
    const start = new Date(dto.startDateTime);
    const end = new Date(dto.endDateTime);
    const check = await this.checkAvailability(dto.assetId, dto.categoryId, start, end);
    if (!check.available) {
      throw new BadRequestException('Requested slot overlaps an existing reservation or active assignment');
    }
    return (this.prisma as any).assetReservation.create({
      data: {
        assetId: dto.assetId, categoryId: dto.categoryId, reservedById,
        departmentId: dto.departmentId, roomId: dto.roomId,
        startDateTime: start, endDateTime: end, purpose: dto.purpose,
      },
    });
  }

  listMine(userId: number) {
    return (this.prisma as any).assetReservation.findMany({
      where: { reservedById: userId },
      orderBy: { startDateTime: 'desc' },
      include: { asset: true, requester: true },
    });
  }

  listAll(status?: string) {
    return (this.prisma as any).assetReservation.findMany({
      where: status ? { status: status as any } : undefined,
      orderBy: { startDateTime: 'desc' },
      take: 200,
      include: { asset: true, requester: true },
    });
  }
}
