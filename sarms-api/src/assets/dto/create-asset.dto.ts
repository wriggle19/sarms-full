import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateAssetDto {
  @ApiProperty() @IsString() name: string;
  @ApiProperty() @IsInt() categoryId: number;
  @ApiPropertyOptional() @IsOptional() @IsString() manufacturer?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() model?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() serialNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() serviceTag?: string;

  @ApiPropertyOptional() @IsOptional() @IsDateString() acquisitionDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() vendorId?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() purchaseOrderId?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() invoiceNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() warrantyStart?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() warrantyEnd?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() originalCost?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() currency?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() fundingSource?: string;

  @ApiProperty() @IsInt() owningDepartmentId: number;
  @ApiProperty() @IsInt() responsibleDepartmentId: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() currentRoomId?: number;

  @ApiPropertyOptional({ description: 'Defaults to the "AVAILABLE" status code if omitted' })
  @IsOptional() @IsString() statusCode?: string;
  @ApiPropertyOptional({ description: 'Defaults to the "NEW" condition code if omitted' })
  @IsOptional() @IsString() conditionCode?: string;

  @ApiPropertyOptional() @IsOptional() @IsInt() academicYearId?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}
