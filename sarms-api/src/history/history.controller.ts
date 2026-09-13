import { Controller, Get, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionGuard } from '../common/guards/permission.guard';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { HistoryService } from './history.service';

@ApiTags('history')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('history')
export class HistoryController {
  constructor(private historyService: HistoryService) {}

  @Get('assets/:id')
  @RequirePermission('assets.view')
  forAsset(@Param('id', ParseIntPipe) id: number) {
    return this.historyService.forAsset(id);
  }

  @Get('users/:id')
  @RequirePermission('assets.view')
  forUser(@Param('id', ParseIntPipe) id: number) {
    return this.historyService.forUser(id);
  }

  @Get('rooms/:id')
  @RequirePermission('assets.view')
  forRoom(@Param('id', ParseIntPipe) id: number) {
    return this.historyService.forRoom(id);
  }
}
