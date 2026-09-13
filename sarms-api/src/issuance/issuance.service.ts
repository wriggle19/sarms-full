import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CustodyService } from '../custody/custody.service';
import { FinalizeIssuanceDto } from './dto/finalize-issuance.dto';

/**
 * The bridge between "a request was approved" and "an asset actually left
 * the shelf". This is deliberately its own module rather than folded into
 * requests or custody - it's the one place that needs to know about both,
 * and keeping it separate keeps requests.service and custody.service usable
 * on their own for cases that don't go through a request at all (e.g. a
 * classroom projector install with no prior request).
 */
@Injectable()
export class IssuanceService {
  constructor(
    private prisma: PrismaService,
    private custodyService: CustodyService,
  ) {}

  /** The IT/Asset Officer's issuance queue: every APPROVED request awaiting a physical asset. */
  queue() {
    return this.prisma.assetRequest.findMany({
      where: { status: 'APPROVED' },
      include: { requester: true, category: true, department: true },
      orderBy: { priority: 'desc' },
    });
  }

  async finalize(requestId: number, dto: FinalizeIssuanceDto, issuedById: number) {
    const request = await this.prisma.assetRequest.findUnique({ where: { id: requestId } });
    if (!request) throw new NotFoundException(`Request ${requestId} not found`);
    if (request.status !== 'APPROVED') {
      throw new ConflictException('Only APPROVED requests can be issued');
    }

    const assignment = await this.custodyService.issue(
      {
        assetId: dto.assetId,
        assignmentType: 'PERSON' as any,
        custodianUserId: request.requesterId,
        roomId: dto.roomId ?? request.locationRoomId ?? undefined,
        academicYearId: request.academicYearId ?? undefined,
        requestId,
        expectedReturnDate: dto.expectedReturnDate ?? request.expectedEndDate?.toISOString(),
        conditionAtIssueCode: dto.conditionAtIssueCode,
      },
      issuedById,
    );

    await this.prisma.assetRequest.update({ where: { id: requestId }, data: { status: 'ISSUED' } });

    return assignment;
  }
}
