import { Module } from '@nestjs/common';
import { AssetCatalogService } from './asset-catalog.service';
import { AssetCatalogController } from './asset-catalog.controller';

@Module({
  providers: [AssetCatalogService],
  controllers: [AssetCatalogController],
  exports: [AssetCatalogService],
})
export class AssetCatalogModule {}
