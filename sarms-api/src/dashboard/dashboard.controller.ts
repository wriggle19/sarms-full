import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionGuard } from '../common/guards/permission.guard';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { DashboardService } from './dashboard.service';

@ApiTags('dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private service: DashboardService) {}

  @Get('summary')
  @RequirePermission('assets.view')
  summary() {
    return this.service.summary();
  }

  @Get('recent-activity')
  @RequirePermission('assets.view')
  recentActivity() {
    return this.service.recentActivity();
  }

  @Get('finance-summary')
  @RequirePermission('finance.view')
  financeSummary() {
    return this.service.financeSummary();
  }
}
