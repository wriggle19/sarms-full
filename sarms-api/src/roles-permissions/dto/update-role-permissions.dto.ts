import { ApiProperty } from '@nestjs/swagger';
import { IsArray } from 'class-validator';

export class UpdateRolePermissionsDto {
  @ApiProperty({ description: 'Full replacement list of permission IDs for this role' })
  @IsArray()
  permissionIds: number[];
}
