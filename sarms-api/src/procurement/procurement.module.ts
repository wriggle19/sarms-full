import { Module } from '@nestjs/common';
import { ProcurementService } from './procurement.service';
import { ProcurementController } from './procurement.controller';
import { AssetsModule } from '../assets/assets.module';
import { NumberSequenceService } from '../common/utils/number-sequence.service';

@Module({
  imports: [AssetsModule],
  providers: [ProcurementService, NumberSequenceService],
  controllers: [ProcurementController],
  exports: [ProcurementService],
})
export class ProcurementModule {}
