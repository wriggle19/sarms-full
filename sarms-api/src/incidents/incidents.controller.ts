import { Body, Controller, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionGuard } from '../common/guards/permission.guard';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { Audit } from '../common/decorators/audit.decorator';
import { IncidentsService } from './incidents.service';
import { ReportIncidentDto, ResolveIncidentDto } from './dto/incident.dto';

@ApiTags('incidents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('incidents')
export class IncidentsController {
  constructor(private service: IncidentsService) {}

  @Post()
  @RequirePermission('assets.edit')
  @Audit({ action: 'CREATE', module: 'incidents', recordType: 'AssetIncident' })
  report(@Body() dto: ReportIncidentDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.report(dto, user.id);
  }

  @Get()
  @RequirePermission('assets.view')
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @RequirePermission('assets.view')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post(':id/resolve')
  @RequirePermission('assets.edit')
  @Audit({ action: 'UPDATE', module: 'incidents', recordType: 'AssetIncident' })
  resolve(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ResolveIncidentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.resolve(id, dto, user.id);
  }
}
