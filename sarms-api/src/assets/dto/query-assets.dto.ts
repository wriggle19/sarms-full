import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryAssetsDto {
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() categoryId?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() departmentId?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() statusCode?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() roomId?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) page?: number = 1;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) pageSize?: number = 25;
}
