import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsInt, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePoItemDto {
  @ApiProperty() @IsString() description: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() categoryId?: number;
  @ApiProperty() @IsInt() quantity: number;
  @ApiProperty() @IsNumber() unitCost: number;
  @ApiPropertyOptional() @IsOptional() @IsString() currency?: string;
}

export class CreatePurchaseOrderDto {
  @ApiProperty() @IsInt() vendorId: number;
  @ApiProperty() @IsInt() departmentId: number;
  @ApiPropertyOptional() @IsOptional() @IsString() currency?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() expectedDeliveryDate?: string;

  @ApiProperty({ type: [CreatePoItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePoItemDto)
  items: CreatePoItemDto[];
}
