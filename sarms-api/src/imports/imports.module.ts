import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AssetsModule } from '../assets/assets.module';
import { ImportsService } from './imports.service';
import { ImportsController } from './imports.controller';

@Module({
  imports: [PrismaModule, AssetsModule],
  providers: [ImportsService],
  controllers: [ImportsController],
})
export class ImportsModule {}
