import { Body, Controller, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionGuard } from '../common/guards/permission.guard';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { Audit } from '../common/decorators/audit.decorator';
import { ImportsService } from './imports.service';

@ApiTags('imports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('imports')
export class ImportsController {
  constructor(private service: ImportsService) {}

  /**
   * Section 47. Pass raw CSV text. By default (?commit omitted) this only
   * validates + previews and writes nothing; call with ?commit=true to
   * actually import the valid rows.
   */
  @Post('assets')
  @RequirePermission('assets.create')
  import(
    @Body('csv') csv: string,
    @Query('commit') commit: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.import(csv ?? '', commit === 'true', user.id);
  }
}
