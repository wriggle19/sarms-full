import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';

export class ReceivePoItemDto {
  @ApiProperty() @IsInt() poItemId: number;
  @ApiProperty() @IsInt() owningDepartmentId: number;
}
