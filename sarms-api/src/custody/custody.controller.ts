import { Body, Controller, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionGuard } from '../common/guards/permission.guard';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { Audit } from '../common/decorators/audit.decorator';
import { CustodyService } from './custody.service';
import { IssueAssetDto } from './dto/issue-asset.dto';
import { ReturnAssetDto } from './dto/return-asset.dto';
import { TransferAssetDto } from './dto/transfer-asset.dto';

@ApiTags('custody')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller()
export class CustodyController {
  constructor(private custodyService: CustodyService) {}

  @Post('assignments/issue')
  @RequirePermission('assets.issue')
  @Audit({ action: 'ISSUE', module: 'custody', recordType: 'AssetAssignment' })
  issue(@Body() dto: IssueAssetDto, @CurrentUser() user: AuthenticatedUser) {
    return this.custodyService.issue(dto, user.id);
  }

  @Patch('assignments/:id/acknowledge')
  @RequirePermission('assets.issue')
  acknowledge(@Param('id', ParseIntPipe) id: number, @Body('signatureUrl') signatureUrl: string) {
    return this.custodyService.acknowledge(id, signatureUrl);
  }

  @Patch('assignments/:id/return')
  @RequirePermission('assets.return')
  @Audit({ action: 'RETURN', module: 'custody', recordType: 'AssetAssignment' })
  returnAsset(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReturnAssetDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.custodyService.returnAsset(id, dto, user.id);
  }

  @Post('transfers')
  @RequirePermission('assets.transfer')
  @Audit({ action: 'TRANSFER', module: 'custody', recordType: 'AssetTransfer' })
  transfer(@Body() dto: TransferAssetDto, @CurrentUser() user: AuthenticatedUser) {
    return this.custodyService.transfer(dto, user.id);
  }
}
