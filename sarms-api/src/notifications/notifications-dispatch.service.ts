import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';

/**
 * Dispatch layer (§26-27, §62): turns system events into in-app Notification
 * rows and, where the template channel says so, outbound email via
 * MailService. The scheduler controller triggers the recurring scans
 * (overdue loans, warranty expiry, calendar deadlines) - in production these
 * would move to a cron/BullMQ worker without changing any logic here.
 */
@Injectable()
export class NotificationsDispatchService {
  constructor(
    private prisma: PrismaService,
    private mail: MailService,
  ) {}

  /** Skip if an identical notification was already sent in the last 24h. */
  private async dedupe(userId: number, templateKey: string, title: string): Promise<boolean> {
    const recent = await this.prisma.notification.findFirst({
      where: {
        userId,
        templateKey,
        title,
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });
    return recent !== null;
  }

  async dispatch(
    userId: number,
    eventKey: string,
    vars: Record<string, string | number>,
    fallback: { title: string; body: string },
  ) {
    const title = await this.mail.render(
      (await this.prisma.notificationTemplate.findUnique({ where: { eventKey } }))?.subject ?? fallback.title,
      vars,
    );
    if (await this.dedupe(userId, eventKey, title)) return null;

    const body = this.mail.render(
      (await this.prisma.notificationTemplate.findUnique({ where: { eventKey } }))?.bodyTemplate ??
        fallback.body,
      vars,
    );
    const notification = await this.prisma.notification.create({
      data: { userId, templateKey: eventKey, title, body, channel: 'IN_APP' },
    });

    const template = await this.prisma.notificationTemplate.findUnique({ where: { eventKey } });
    if (!template || template.channel !== 'IN_APP') {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (user?.email) {
        const sent = await this.mail.send({ to: user.email, subject: title, text: body });
        if (sent) {
          await this.prisma.notification.update({
            where: { id: notification.id },
            data: { channel: 'EMAIL', sentAt: new Date() },
          });
        }
      }
    }
    return notification;
  }

  /** §26: everyone holding equipment past its expected return date. */
  async runOverdueScan() {
    const overdue = await this.prisma.assetAssignment.findMany({
      where: { status: 'ACTIVE', expectedReturnDate: { lt: new Date() } },
      include: { asset: true, custodian: true },
    });
    let created = 0;
    for (const a of overdue) {
      if (!a.custodianUserId) continue;
      const days = Math.floor((Date.now() - a.expectedReturnDate!.getTime()) / 86400000);
      const n = await this.dispatch(
        a.custodianUserId,
        'LOAN_OVERDUE',
        { assetTag: a.asset.assetTag, days, expectedReturn: a.expectedReturnDate!.toISOString().slice(0, 10) },
        { title: `Equipment overdue: ${a.asset.assetTag}`, body: `${a.asset.assetTag} was due back ${a.expectedReturnDate!.toISOString().slice(0, 10)} (${days} days ago). Please return it to the asset office.` },
      );
      if (n) created++;
    }
    return { scanned: overdue.length, notificationsCreated: created };
  }

  /** §29: warranties expiring within the next `days` days. */
  async runWarrantyScan(days = 30) {
    const horizon = new Date(Date.now() + days * 86400000);
    const assets = await this.prisma.asset.findMany({
      where: { warrantyEnd: { gte: new Date(), lte: horizon }, isDeleted: false },
      include: { responsibleDepartment: true },
    });
    // Notify users holding the finance.view permission (asset officers / finance).
    const financeRoles = await this.prisma.rolePermission.findMany({
      where: { permission: { code: 'finance.view' } },
      include: { role: { include: { users: true } } },
    });
    const recipients = new Set<number>();
    for (const rp of financeRoles) {
      for (const ur of rp.role.users) recipients.add(ur.userId);
    }
    let created = 0;
    for (const userId of recipients) {
      for (const a of assets) {
        const n = await this.dispatch(
          userId,
          'WARRANTY_EXPIRING',
          { assetTag: a.assetTag, warrantyEnd: a.warrantyEnd!.toISOString().slice(0, 10) },
          { title: `Warranty expiring: ${a.assetTag}`, body: `Warranty on ${a.assetTag} expires ${a.warrantyEnd!.toISOString().slice(0, 10)}.` },
        );
        if (n) created++;
      }
    }
    return { assetsScanned: assets.length, notificationsCreated: created };
  }

  /** §45: calendar deadlines inside the next `days` days. */
  async runCalendarScan(days = 14) {
    const horizon = new Date(Date.now() + days * 86400000);
    const events = await this.prisma.schoolCalendarEvent.findMany({
      where: { eventDate: { gte: new Date(), lte: horizon } },
    });
    const users = await this.prisma.user.findMany({ where: { status: 'ACTIVE' }, select: { id: true } });
    let created = 0;
    for (const u of users) {
      for (const e of events) {
        const n = await this.dispatch(
          u.id,
          'CALENDAR_DEADLINE',
          { title: e.title, date: e.eventDate.toISOString().slice(0, 10) },
          { title: e.title, body: `${e.title} is coming up on ${e.eventDate.toISOString().slice(0, 10)}.` },
        );
        if (n) created++;
      }
    }
    return { eventsScanned: events.length, notificationsCreated: created };
  }
}
