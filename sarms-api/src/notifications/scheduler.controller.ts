import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionGuard } from '../common/guards/permission.guard';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { NotificationsDispatchService } from './notifications-dispatch.service';
import { MailService } from '../mail/mail.service';

/**
 * Manual triggers for the recurring notification scans. In production these
 * run on a cron (e.g. every hour); here an admin can also fire them by hand,
 * which doubles as a test harness while SMTP is unconfigured.
 */
@ApiTags('scheduler')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('scheduler')
export class SchedulerController {
  constructor(
    private dispatch: NotificationsDispatchService,
    private mail: MailService,
  ) {}

  @Post('run-overdue-scan')
  @RequirePermission('assets.issue')
  overdue() {
    return this.dispatch.runOverdueScan();
  }

  @Post('run-warranty-scan')
  @RequirePermission('finance.view')
  warranty() {
    return this.dispatch.runWarrantyScan();
  }

  @Post('run-calendar-scan')
  @RequirePermission('users.view')
  calendar() {
    return this.dispatch.runCalendarScan();
  }

  @Get('mail-status')
  @RequirePermission('users.view')
  mailStatus() {
    return { smtpConfigured: this.mail.isConfigured };
  }
}
