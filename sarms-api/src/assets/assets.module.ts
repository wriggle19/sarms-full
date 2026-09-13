import { Module } from '@nestjs/common';
import { AssetsService } from './assets.service';
import { AssetsController } from './assets.controller';
import { NumberSequenceService } from '../common/utils/number-sequence.service';

@Module({
  providers: [AssetsService, NumberSequenceService],
  controllers: [AssetsController],
  exports: [AssetsService],
})
export class AssetsModule {}
