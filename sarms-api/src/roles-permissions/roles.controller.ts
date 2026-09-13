import { Body, Controller, Get, Param, ParseIntPipe, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionGuard } from '../common/guards/permission.guard';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { RolesService } from './roles.service';
import { PermissionsService } from './permissions.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRolePermissionsDto } from './dto/update-role-permissions.dto';

@ApiTags('roles-permissions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller()
export class RolesController {
  constructor(
    private rolesService: RolesService,
    private permissionsService: PermissionsService,
  ) {}

  @Get('permissions')
  @RequirePermission('roles.manage')
  listPermissions() {
    return this.permissionsService.findAll();
  }

  @Get('roles')
  @RequirePermission('roles.manage')
  findAll() {
    return this.rolesService.findAll();
  }

  @Post('roles')
  @RequirePermission('roles.manage')
  create(@Body() dto: CreateRoleDto) {
    return this.rolesService.create(dto);
  }

  @Get('roles/:id')
  @RequirePermission('roles.manage')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.rolesService.findOne(id);
  }

  @Put('roles/:id/permissions')
  @RequirePermission('roles.manage')
  setPermissions(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateRolePermissionsDto) {
    return this.rolesService.setPermissions(id, dto);
  }

  @Post('users/:userId/roles/:roleId')
  @RequirePermission('roles.manage')
  assign(@Param('userId', ParseIntPipe) userId: number, @Param('roleId', ParseIntPipe) roleId: number) {
    return this.rolesService.assignToUser(userId, roleId);
  }
}
