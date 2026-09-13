import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionGuard } from '../common/guards/permission.guard';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { Audit } from '../common/decorators/audit.decorator';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Post()
  @RequirePermission('users.create')
  @Audit({ action: 'CREATE', module: 'users', recordType: 'User' })
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Get()
  @RequirePermission('users.view')
  findAll(@Query('departmentId') departmentId?: string, @Query('status') status?: string) {
    return this.usersService.findAll({
      departmentId: departmentId ? Number(departmentId) : undefined,
      status,
    });
  }

  @Get(':id')
  @RequirePermission('users.view')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }

  @Get(':id/outstanding-assets')
  @RequirePermission('users.view')
  outstandingAssets(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.outstandingAssets(id);
  }

  @Patch(':id')
  @RequirePermission('users.edit')
  @Audit({ action: 'UPDATE', module: 'users', recordType: 'User' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  @Patch(':id/deactivate')
  @RequirePermission('users.edit')
  @Audit({ action: 'UPDATE', module: 'users', recordType: 'User' })
  deactivate(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.deactivate(id);
  }

  @Patch(':id/activate')
  @RequirePermission('users.edit')
  @Audit({ action: 'UPDATE', module: 'users', recordType: 'User' })
  activate(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.activate(id);
  }
}
