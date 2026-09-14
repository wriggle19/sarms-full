import { Module } from '@nestjs/common';
import { ReservationsService } from './reservations.service';
import { ReservationActionsService } from './reservation-actions.service';
import { ReservationsController } from './reservations.controller';
import { AssetsModule } from '../assets/assets.module';

@Module({
  imports: [AssetsModule],
  providers: [ReservationsService, ReservationActionsService],
  controllers: [ReservationsController],
})
export class ReservationsModule {}
