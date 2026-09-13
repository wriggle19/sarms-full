import { Body, Controller, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionGuard } from '../common/guards/permission.guard';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { Audit } from '../common/decorators/audit.decorator';
import { IssuanceService } from './issuance.service';
import { FinalizeIssuanceDto } from './dto/finalize-issuance.dto';

@ApiTags('issuance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('issuance')
export class IssuanceController {
  constructor(private issuanceService: IssuanceService) {}

  @Get('queue')
  @RequirePermission('assets.issue')
  queue() {
    return this.issuanceService.queue();
  }

  @Post('requests/:id/finalize')
  @RequirePermission('assets.issue')
  @Audit({ action: 'ISSUE', module: 'issuance', recordType: 'AssetRequest' })
  finalize(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: FinalizeIssuanceDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.issuanceService.finalize(id, dto, user.id);
  }
}
