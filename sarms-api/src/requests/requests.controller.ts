import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionGuard } from '../common/guards/permission.guard';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { Audit } from '../common/decorators/audit.decorator';
import { RequestsService } from './requests.service';
import { ApprovalsService } from '../approvals/approvals.service';
import { CreateRequestDto } from './dto/create-request.dto';

@ApiTags('requests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('requests')
export class RequestsController {
  constructor(
    private requestsService: RequestsService,
    private approvalsService: ApprovalsService,
  ) {}

  @Post()
  @RequirePermission('requests.create')
  @Audit({ action: 'CREATE', module: 'requests', recordType: 'AssetRequest' })
  async create(@Body() dto: CreateRequestDto, @CurrentUser() user: AuthenticatedUser) {
    const request = await this.requestsService.create(dto, user.id);
    // Immediately routes into the configured approval chain - a request
    // sitting in SUBMITTED with no workflow attached is a bug, not a
    // valid resting state.
    return this.approvalsService.startWorkflow(request.id);
  }

  @Get('mine')
  findMine(@CurrentUser() user: AuthenticatedUser) {
    return this.requestsService.findMine(user.id);
  }

  @Get()
  @RequirePermission('requests.view')
  findAll(@Query('status') status?: string) {
    return this.requestsService.findAll(status);
  }

  @Get(':id')
  @RequirePermission('requests.view')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.requestsService.findOne(id);
  }

  @Patch(':id/cancel')
  cancel(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
    return this.requestsService.cancel(id, user.id);
  }
}
