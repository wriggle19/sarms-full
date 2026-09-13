import { Body, Controller, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionGuard } from '../common/guards/permission.guard';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { Audit } from '../common/decorators/audit.decorator';
import { ProcurementService } from './procurement.service';
import { CreatePurchaseOrderDto } from './dto/create-po.dto';
import { ReceivePoItemDto } from './dto/receive-po.dto';

@ApiTags('procurement')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('purchase-orders')
export class ProcurementController {
  constructor(private service: ProcurementService) {}

  @Post()
  @RequirePermission('procurement.manage')
  @Audit({ action: 'CREATE', module: 'procurement', recordType: 'PurchaseOrder' })
  create(@Body() dto: CreatePurchaseOrderDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.create(dto, user.id);
  }

  @Get()
  @RequirePermission('procurement.manage')
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @RequirePermission('procurement.manage')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post(':id/receive')
  @RequirePermission('procurement.manage')
  @Audit({ action: 'CREATE', module: 'procurement', recordType: 'Asset' })
  receive(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReceivePoItemDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.receiveItem(id, dto, user.id);
  }
}
