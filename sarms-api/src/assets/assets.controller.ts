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
  findAll(@Query() query: QueryAssetsDto) {
    return this.assetsService.findAll(query);
  }

  @Get('scan/:qrToken')
  @RequirePermission('assets.view')
  scan(@Param('qrToken') qrToken: string) {
    return this.assetsService.findByQrToken(qrToken);
  }

  @Get(':id')
  @RequirePermission('assets.view')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.assetsService.findOne(id);
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
