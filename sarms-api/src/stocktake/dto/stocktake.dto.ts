import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';

export enum StocktakeScopeDto {
  CAMPUS = 'CAMPUS',
  BUILDING = 'BUILDING',
  DEPARTMENT = 'DEPARTMENT',
  ROOM = 'ROOM',
  CATEGORY = 'CATEGORY',
  ALL = 'ALL',
}

export class CreateStocktakeDto {
  @ApiProperty() @IsString() name: string;
  @ApiProperty({ enum: StocktakeScopeDto }) @IsEnum(StocktakeScopeDto) scopeType: StocktakeScopeDto;
  @ApiPropertyOptional() @IsOptional() @IsInt() scopeId?: number;
}

export class ScanDto {
  @ApiProperty() @IsString() qrToken: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() scannedRoomId?: number;
}
