import { Module } from '@nestjs/common';
import { CustodyService } from './custody.service';
import { CustodyController } from './custody.controller';
import { AssetsModule } from '../assets/assets.module';

@Module({
  imports: [AssetsModule],
  providers: [CustodyService],
  controllers: [CustodyController],
  exports: [CustodyService],
})
export class CustodyModule {}
