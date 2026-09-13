import { Module } from '@nestjs/common';
import { StocktakeService } from './stocktake.service';
import { StocktakeController } from './stocktake.controller';

@Module({
  providers: [StocktakeService],
  controllers: [StocktakeController],
})
export class StocktakeModule {}
