import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionGuard } from '../common/guards/permission.guard';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { Audit } from '../common/decorators/audit.decorator';
import { AssetsService } from './assets.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { QueryAssetsDto } from './dto/query-assets.dto';

@ApiTags('assets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('assets')
export class AssetsController {
  constructor(private assetsService: AssetsService) {}

  @Post()
  @RequirePermission('assets.create')
  @Audit({ action: 'CREATE', module: 'assets', recordType: 'Asset' })
  register(@Body() dto: CreateAssetDto, @CurrentUser() user: AuthenticatedUser) {
    return this.assetsService.register(dto, user.id);
  }

  @Get()
  @RequirePermission('assets.view')
  async findAll(@Query() query: QueryAssetsDto, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.assetsService.findAll(query);
    return { ...result, items: result.items.map((a) => this.assetsService.sanitizeForUser(a, user)) };
  }

  @Get('scan/:qrToken')
  @RequirePermission('assets.view')
  async scan(@Param('qrToken') qrToken: string, @CurrentUser() user: AuthenticatedUser) {
    const asset = await this.assetsService.findByQrToken(qrToken);
    return this.assetsService.sanitizeForUser(asset, user);
  }

  @Get(':id')
  @RequirePermission('assets.view')
  async findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
    const asset = await this.assetsService.findOne(id);
    return this.assetsService.sanitizeForUser(asset, user);
  }

  @Patch(':id/status/:statusCode')
  @RequirePermission('assets.edit')
  @Audit({ action: 'STATUS_CHANGE', module: 'assets', recordType: 'Asset' })
  transitionStatus(
    @Param('id', ParseIntPipe) id: number,
    @Param('statusCode') statusCode: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.assetsService.transitionStatus(id, statusCode, user.id);
  }

  @Delete(':id')
  @RequirePermission('assets.delete')
  @Audit({ action: 'DELETE', module: 'assets', recordType: 'Asset' })
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
    return this.assetsService.softDelete(id, user.id);
  }
}
