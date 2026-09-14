import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { NotificationsDispatchService } from './notifications-dispatch.service';
import { MailService } from '../mail/mail.service';

/**
 * Unattended recurring scans (§16, §26 of the completion requirements).
 *
 * Enabled by default; set SCHEDULER_ENABLED=false to disable (e.g. when an
 * external cron hits POST /scheduler/run-* instead, or in multi-replica
 * deployments where only one replica should scan). Interval is configurable
 * via SCHEDULER_INTERVAL_MS (default: 1 hour).
 */
@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);
  private readonly enabled: boolean;
  private readonly intervalMs: number;

  constructor(
    private dispatch: NotificationsDispatchService,
    private mail: MailService,
  ) {
    this.enabled = process.env.SCHEDULER_ENABLED !== 'false';
    this.intervalMs = Number(process.env.SCHEDULER_INTERVAL_MS || 60 * 60 * 1000);
  }

  @Interval('sarms-scan-tick', Number(process.env.SCHEDULER_INTERVAL_MS) || 60 * 60 * 1000)
  async tick() {
    if (!this.enabled) return;
    try {
      const overdue = await this.dispatch.runOverdueScan();
      const warranty = await this.dispatch.runWarrantyScan(30);
      this.logger.log(
        `Scheduled scans complete: overdue=${overdue?.notificationsCreated ?? 'n/a'} warranty=${warranty?.notificationsCreated ?? 'n/a'}`,
      );
    } catch (err) {
      // Never let a scheduled scan crash the process; log and continue.
      this.logger.error(`Scheduled scan failed: ${err instanceof Error ? err.message : err}`);
    }
  }
}
