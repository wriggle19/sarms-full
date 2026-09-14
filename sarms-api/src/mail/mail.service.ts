import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { PrismaService } from '../prisma/prisma.service';

export interface OutboundMail {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/**
 * Email dispatch abstraction (§62): all mail flows through here so no
 * controller/service hard-codes SMTP logic. In dev without SMTP configured
 * we log + still write the in-app Notification row; with SMTP_* env set we
 * actually deliver via nodemailer.
 */
@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter | null = null;

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {
    const host = this.config.get<string>('SMTP_HOST');
    if (host) {
      this.transporter = nodemailer.createTransport({
        host,
        port: this.config.get<number>('SMTP_PORT', 587),
        secure: this.config.get<boolean>('SMTP_SECURE', false),
        auth: this.config.get<string>('SMTP_USER')
          ? {
              user: this.config.get<string>('SMTP_USER'),
              pass: this.config.get<string>('SMTP_PASS', ''),
            }
          : undefined,
      });
    }
  }

  get isConfigured(): boolean {
    return this.transporter !== null;
  }

  async send(mail: OutboundMail): Promise<boolean> {
    if (!this.transporter) {
      // eslint-disable-next-line no-console
      console.log('[mail:dev-log]', mail.to, mail.subject);
      return false;
    }
    await this.transporter.sendMail({
      from: this.config.get<string>('SMTP_FROM', 'SARMS <no-reply@sarms.local>'),
      ...mail,
    });
    return true;
  }

  /** Template renderer: {{key}} placeholders replaced from vars. */
  render(template: string, vars: Record<string, string | number>): string {
    let out = template;
    for (const [k, v] of Object.entries(vars)) {
      out = out.split(`{{${k}}}`).join(String(v));
    }
    return out;
  }

  /**
   * Dispatch a templated notification to a user: renders the
   * NotificationTemplate row, writes the Notification row, and attempts
   * email delivery if the template channel includes EMAIL and SMTP is up.
   */
  async dispatchToUser(
    userId: number,
    eventKey: string,
    vars: Record<string, string | number> = {},
    fallback?: { title: string; body: string },
  ) {
    const template = await this.prisma.notificationTemplate.findUnique({
      where: { eventKey },
    });
    const title = template ? this.render(template.subject, vars) : (fallback?.title ?? eventKey);
    const body = template ? this.render(template.bodyTemplate, vars) : (fallback?.body ?? eventKey);
    const notification = await this.prisma.notification.create({
      data: { userId, templateKey: eventKey, title, body, channel: 'IN_APP' },
    });
    const wantsEmail = !template || template.channel !== 'IN_APP';
    if (wantsEmail) {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (user?.email) {
        const sent = await this.send({ to: user.email, subject: title, text: body });
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
}
