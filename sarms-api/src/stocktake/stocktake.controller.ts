import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionGuard } from '../common/guards/permission.guard';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { StocktakeService } from './stocktake.service';
import { CreateStocktakeDto, ScanDto } from './dto/stocktake.dto';

@ApiTags('stocktake')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('stocktakes')
export class StocktakeController {
  constructor(private service: StocktakeService) {}

  @Post()
  @RequirePermission('stocktake.manage')
  create(@Body() dto: CreateStocktakeDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.create(dto, user.id);
  }

  @Get()
  @RequirePermission('stocktake.manage')
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @RequirePermission('stocktake.manage')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post(':id/scan')
  @RequirePermission('stocktake.manage')
  scan(@Param('id', ParseIntPipe) id: number, @Body() dto: ScanDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.scan(id, dto, user.id);
  }

  @Patch(':id/close')
  @RequirePermission('stocktake.manage')
  close(@Param('id', ParseIntPipe) id: number) {
    return this.service.close(id);
  }
}
