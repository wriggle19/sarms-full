import { Body, Controller, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionGuard } from '../common/guards/permission.guard';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { Audit } from '../common/decorators/audit.decorator';
import { ApprovalsService } from './approvals.service';
import { CreateWorkflowDto } from './dto/create-workflow.dto';
import { DecideDto } from './dto/decide.dto';

@ApiTags('approvals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller()
export class ApprovalsController {
  constructor(private approvalsService: ApprovalsService) {}

  @Post('approval-workflows')
  @RequirePermission('workflows.manage')
  createWorkflow(@Body() dto: CreateWorkflowDto) {
    return this.approvalsService.createWorkflow(dto);
  }

  @Get('approval-workflows')
  @RequirePermission('workflows.manage')
  findWorkflows() {
    return this.approvalsService.findWorkflows();
  }

  @Get('approvals/pending')
  @RequirePermission('requests.approve')
  pending(@CurrentUser() user: AuthenticatedUser) {
    return this.approvalsService.pendingFor(user.id);
  }

  @Post('requests/:id/decide')
  @RequirePermission('requests.approve')
  @Audit({ action: 'APPROVE', module: 'approvals', recordType: 'AssetRequest' })
  decide(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: DecideDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.approvalsService.decide(id, user.id, dto);
  }
}
