import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString } from 'class-validator';

export class TransferAssetDto {
  @ApiProperty() @IsInt() assetId: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() toRoomId?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() toDepartmentId?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() toCustodianId?: number;
  @ApiProperty() @IsString() reason: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() approvedById?: number;
}
