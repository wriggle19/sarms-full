import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Phase 1 stub: writes in-app Notification rows so the frontend has
 * something real to render immediately. Actual email/SMS delivery
 * (Section 27) should be wired in as a BullMQ processor that picks up
 * these rows and dispatches through nodemailer/an SMS provider - kept out
 * of the request/response cycle so a slow mail server never blocks an
 * approval or issuance action.
 */
@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async notify(userId: number, templateKey: string, title: string, body: string) {
    return this.prisma.notification.create({
      data: { userId, templateKey, title, body, channel: 'IN_APP' },
    });
  }

  findForUser(userId: number) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  markRead(id: number) {
    return this.prisma.notification.update({ where: { id }, data: { isRead: true } });
  }
}
