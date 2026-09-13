import { Module } from '@nestjs/common';
import { IssuanceService } from './issuance.service';
import { IssuanceController } from './issuance.controller';
import { CustodyModule } from '../custody/custody.module';

@Module({
  imports: [CustodyModule],
  providers: [IssuanceService],
  controllers: [IssuanceController],
  exports: [IssuanceService],
})
export class IssuanceModule {}
