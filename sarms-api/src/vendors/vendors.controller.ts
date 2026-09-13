import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionGuard } from '../common/guards/permission.guard';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { VendorsService } from './vendors.service';
import { CreateVendorDto, UpdateVendorDto } from './dto/vendor.dto';

@ApiTags('vendors')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('vendors')
export class VendorsController {
  constructor(private service: VendorsService) {}

  @Post()
  @RequirePermission('procurement.manage')
  create(@Body() dto: CreateVendorDto) {
    return this.service.create(dto);
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

  @Patch(':id')
  @RequirePermission('procurement.manage')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateVendorDto) {
    return this.service.update(id, dto);
  }

  @Patch(':id/deactivate')
  @RequirePermission('procurement.manage')
  deactivate(@Param('id', ParseIntPipe) id: number) {
    return this.service.deactivate(id);
  }
}
