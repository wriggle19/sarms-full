import { Module } from '@nestjs/common';
import { AssetsModule } from '../assets/assets.module';
import { CustodyModule } from '../custody/custody.module';
import { BulkService } from './bulk.service';
import { BulkController } from './bulk.controller';

@Module({
  imports: [AssetsModule, CustodyModule],
  providers: [BulkService],
  controllers: [BulkController],
  exports: [BulkService],
})
export class BulkModule {}
