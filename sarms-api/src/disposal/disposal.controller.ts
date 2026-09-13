import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionGuard } from '../common/guards/permission.guard';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { Audit } from '../common/decorators/audit.decorator';
import { DisposalService } from './disposal.service';
import { CreateDisposalDto } from './dto/disposal.dto';

@ApiTags('disposal')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('disposals')
export class DisposalController {
  constructor(private service: DisposalService) {}

  @Post()
  @RequirePermission('disposal.approve')
  @Audit({ action: 'CREATE', module: 'disposal', recordType: 'Disposal' })
  create(@Body() dto: CreateDisposalDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.create(dto, user.id);
  }

  @Get()
  @RequirePermission('disposal.approve')
  findAll() {
    return this.service.findAll();
  }
}
