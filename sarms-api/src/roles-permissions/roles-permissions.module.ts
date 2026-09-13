import { Module } from '@nestjs/common';
import { RolesService } from './roles.service';
import { PermissionsService } from './permissions.service';
import { RolesController } from './roles.controller';

@Module({
  providers: [RolesService, PermissionsService],
  controllers: [RolesController],
  exports: [RolesService, PermissionsService],
})
export class RolesPermissionsModule {}
