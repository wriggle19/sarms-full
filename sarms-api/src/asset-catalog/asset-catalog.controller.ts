import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionGuard } from '../common/guards/permission.guard';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { AssetCatalogService } from './asset-catalog.service';
import { CreateCategoryDto, CreateConditionDto, CreateStatusDto, UpdateCategoryDto, UpdateConditionDto, UpdateStatusDto } from './dto/catalog.dto';

@ApiTags('asset-catalog')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller()
export class AssetCatalogController {
  constructor(private service: AssetCatalogService) {}

  @Post('asset-categories')
  @RequirePermission('catalog.manage')
  createCategory(@Body() dto: CreateCategoryDto) {
    return this.service.createCategory(dto);
  }
  @Get('asset-categories')
  findCategories() {
    return this.service.findCategories();
  }
  @Patch('asset-categories/:id')
  @RequirePermission('catalog.manage')
  updateCategory(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCategoryDto) {
    return this.service.updateCategory(id, dto);
  }
  @Delete('asset-categories/:id')
  @RequirePermission('catalog.manage')
  deleteCategory(@Param('id', ParseIntPipe) id: number) {
    return this.service.deleteCategory(id);
  }

  @Post('asset-statuses')
  @RequirePermission('catalog.manage')
  createStatus(@Body() dto: CreateStatusDto) {
    return this.service.createStatus(dto);
  }
  @Get('asset-statuses')
  findStatuses() {
    return this.service.findStatuses();
  }
  @Patch('asset-statuses/:id')
  @RequirePermission('catalog.manage')
  updateStatus(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateStatusDto) {
    return this.service.updateStatus(id, dto);
  }
  @Delete('asset-statuses/:id')
  @RequirePermission('catalog.manage')
  deleteStatus(@Param('id', ParseIntPipe) id: number) {
    return this.service.deleteStatus(id);
  }

  @Post('asset-conditions')
  @RequirePermission('catalog.manage')
  createCondition(@Body() dto: CreateConditionDto) {
    return this.service.createCondition(dto);
  }
  @Get('asset-conditions')
  findConditions() {
    return this.service.findConditions();
  }
  @Patch('asset-conditions/:id')
  @RequirePermission('catalog.manage')
  updateCondition(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateConditionDto) {
    return this.service.updateCondition(id, dto);
  }
  @Delete('asset-conditions/:id')
  @RequirePermission('catalog.manage')
  deleteCondition(@Param('id', ParseIntPipe) id: number) {
    return this.service.deleteCondition(id);
  }
}
