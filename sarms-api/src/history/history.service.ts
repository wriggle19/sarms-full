import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HistoryService {
  constructor(private prisma: PrismaService) {}

  forAsset(assetId: number) {
    return this.prisma.assetHistory.findMany({
      where: { assetId },
      orderBy: { eventDate: 'asc' },
    });
  }

  /** Powers "show me everything assigned to this employee" (Section 67). */
  forUser(userId: number) {
    return this.prisma.assetAssignment.findMany({
      where: { custodianUserId: userId },
      include: { asset: true },
      orderBy: { issuedAt: 'desc' },
    });
  }

  /** Powers "show me every asset in this room". */
  forRoom(roomId: number) {
    return this.prisma.asset.findMany({ where: { currentRoomId: roomId } });
  }
}
