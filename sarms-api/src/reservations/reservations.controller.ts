import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionGuard } from '../common/guards/permission.guard';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { Audit } from '../common/decorators/audit.decorator';
import { ReservationsService } from './reservations.service';
import { ReservationActionsService } from './reservation-actions.service';

@ApiTags('reservations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('reservations')
export class ReservationsController {
  constructor(private service: ReservationsService, private actions: ReservationActionsService) {}

  @Get('availability')
  @RequirePermission('assets.view')
  availability(
    @Query('assetId') assetId?: string,
    @Query('categoryId') categoryId?: string,
    @Query('start') start?: string,
    @Query('end') end?: string,
  ) {
    return this.service.checkAvailability(
      assetId ? Number(assetId) : undefined,
      categoryId ? Number(categoryId) : undefined,
      start ? new Date(start) : undefined,
      end ? new Date(end) : undefined,
    );
  }

  @Post()
  @RequirePermission('requests.create')
  @Audit({ action: 'CREATE', module: 'reservations', recordType: 'AssetReservation' })
  create(@Body() dto: any, @CurrentUser() user: AuthenticatedUser) {
    return this.service.create(dto, user.id);
  }

  @Get('mine')
  @RequirePermission('assets.view')
  mine(@CurrentUser() user: AuthenticatedUser) {
    return this.service.listMine(user.id);
  }

  @Get()
  @RequirePermission('assets.view')
  all(@Query('status') status?: string) {
    return this.service.listAll(status);
  }

  @Post(':id/decide')
  @RequirePermission('requests.approve')
  @Audit({ action: 'APPROVE', module: 'reservations', recordType: 'AssetReservation' })
  decide(@Param('id', ParseIntPipe) id: number, @Body() dto: { decision: 'APPROVED' | 'REJECTED' | 'CANCELLED' }, @CurrentUser() user: AuthenticatedUser) {
    return this.actions.decide(id, user.id, dto.decision);
  }

  @Post(':id/fulfill')
  @RequirePermission('assets.issue')
  @Audit({ action: 'ISSUE', module: 'reservations', recordType: 'AssetReservation' })
  fulfill(@Param('id', ParseIntPipe) id: number, @Body() dto: any, @CurrentUser() user: AuthenticatedUser) {
    return this.actions.fulfill(id, user.id, dto);
  }
}
