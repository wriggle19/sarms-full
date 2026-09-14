import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsAdminController } from './notifications-admin.controller';
import { SchedulerController } from './scheduler.controller';
import { NotificationsDispatchService } from './notifications-dispatch.service';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [MailModule],
  providers: [NotificationsService, NotificationsDispatchService],
  controllers: [NotificationsController, NotificationsAdminController, SchedulerController],
  exports: [NotificationsService, NotificationsDispatchService],
})
export class NotificationsModule {}

