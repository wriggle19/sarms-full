import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty() @IsString() name: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() parentCategoryId?: number;
}

export class CreateStatusDto {
  @ApiProperty() @IsString() code: string;
  @ApiProperty() @IsString() label: string;
  @ApiPropertyOptional() @IsOptional() @IsString() colorHex?: string;
}

export class CreateConditionDto {
  @ApiProperty() @IsString() code: string;
  @ApiProperty() @IsString() label: string;
  @ApiProperty() @IsInt() rank: number;
}

export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {}
export class UpdateStatusDto extends PartialType(CreateStatusDto) {}
export class UpdateConditionDto extends PartialType(CreateConditionDto) {}
