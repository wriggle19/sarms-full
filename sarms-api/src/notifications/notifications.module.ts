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
  imports: [ScheduleModule.forRoot()],
  providers: [NotificationsService, NotificationsDispatchService, SchedulerService],
  controllers: [NotificationsController, NotificationsAdminController, SchedulerController],
  exports: [NotificationsService, NotificationsDispatchService],
})
export class NotificationsModule {}

