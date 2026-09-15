import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsAdminController } from './notifications-admin.controller';
import { SchedulerController } from './scheduler.controller';
import { SchedulerService } from './scheduler.service';
import { NotificationsDispatchService } from './notifications-dispatch.service';
import { MailModule } from '../mail/mail.module';

@Module({
  // MailModule MUST be imported: NotificationsDispatchService injects
  // MailService for outbound email. Removing it breaks application boot with
  // an unresolvable-dependency error (regression caught by e2e smoke test).
  imports: [MailModule, ScheduleModule.forRoot()],
  providers: [NotificationsService, NotificationsDispatchService, SchedulerService],
  controllers: [NotificationsController, NotificationsAdminController, SchedulerController],
  exports: [NotificationsService, NotificationsDispatchService],
})
export class NotificationsModule {}

