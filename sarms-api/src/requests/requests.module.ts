import { Module } from '@nestjs/common';
import { RequestsService } from './requests.service';
import { RequestsController } from './requests.controller';
import { NumberSequenceService } from '../common/utils/number-sequence.service';
import { ApprovalsModule } from '../approvals/approvals.module';

@Module({
  imports: [ApprovalsModule],
  providers: [RequestsService, NumberSequenceService],
  controllers: [RequestsController],
  exports: [RequestsService],
})
export class RequestsModule {}
