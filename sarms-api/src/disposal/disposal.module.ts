import { Module } from '@nestjs/common';
import { DisposalService } from './disposal.service';
import { DisposalController } from './disposal.controller';
import { AssetsModule } from '../assets/assets.module';

@Module({
  imports: [AssetsModule],
  providers: [DisposalService],
  controllers: [DisposalController],
  exports: [DisposalService],
})
export class DisposalModule {}
