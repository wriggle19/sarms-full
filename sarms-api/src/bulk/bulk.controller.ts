import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionGuard } from '../common/guards/permission.guard';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { Audit } from '../common/decorators/audit.decorator';
import { BulkService } from './bulk.service';
import { IsArray, IsInt, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class BulkTransferDto {
  @ApiProperty({ type: [Number] }) @IsArray() @IsInt({ each: true }) assetIds: number[];
  @ApiPropertyOptional() @IsOptional() @IsInt() toRoomId?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() toCustodianId?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() reason?: string;
}

class BulkStatusDto {
  @ApiProperty({ type: [Number] }) @IsArray() @IsInt({ each: true }) assetIds: number[];
  @ApiProperty() @IsString() statusCode: string;
  @ApiPropertyOptional() @IsOptional() @IsString() reason?: string;
}

@ApiTags('bulk')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('bulk')
export class BulkController {
  constructor(private bulk: BulkService) {}

  @Post('transfers')
  @RequirePermission('assets.transfer')
  @Audit({ action: 'BULK_TRANSFER', module: 'bulk', recordType: 'Asset' })
  transfer(@Body() dto: BulkTransferDto, @CurrentUser() user: AuthenticatedUser) {
    return this.bulk.transfer(dto, user.id);
  }

  @Post('statuses')
  @RequirePermission('assets.edit')
  @Audit({ action: 'BULK_STATUS', module: 'bulk', recordType: 'Asset' })
  changeStatus(@Body() dto: BulkStatusDto, @CurrentUser() user: AuthenticatedUser) {
    return this.bulk.changeStatus(dto, user.id);
  }

  @Post('labels')
  @RequirePermission('assets.view')
  labels(@Body('assetIds') assetIds: number[]) {
    return this.bulk.labels(assetIds ?? []);
  }
}
