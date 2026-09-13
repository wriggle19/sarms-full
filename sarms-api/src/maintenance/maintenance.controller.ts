import { Body, Controller, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionGuard } from '../common/guards/permission.guard';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { Audit } from '../common/decorators/audit.decorator';
import { MaintenanceService } from './maintenance.service';
import { CompleteMaintenanceDto, ReportMaintenanceDto } from './dto/maintenance.dto';

@ApiTags('maintenance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('maintenance')
export class MaintenanceController {
  constructor(private service: MaintenanceService) {}

  @Post()
  @RequirePermission('maintenance.manage')
  @Audit({ action: 'CREATE', module: 'maintenance', recordType: 'MaintenanceRecord' })
  report(@Body() dto: ReportMaintenanceDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.report(dto, user.id);
  }

  @Get()
  @RequirePermission('maintenance.manage')
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @RequirePermission('maintenance.manage')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post(':id/complete')
  @RequirePermission('maintenance.manage')
  @Audit({ action: 'UPDATE', module: 'maintenance', recordType: 'MaintenanceRecord' })
  complete(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CompleteMaintenanceDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.complete(id, dto, user.id);
  }
}
