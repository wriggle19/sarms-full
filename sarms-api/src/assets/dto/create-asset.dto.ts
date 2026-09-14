import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateAssetDto {
  @ApiProperty() @IsString() name: string;
  @ApiProperty() @IsInt() categoryId: number;
  @ApiPropertyOptional() @IsOptional() @IsString() manufacturer?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() model?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() serialNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() serviceTag?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() imei?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() macAddress?: string;

  @ApiPropertyOptional() @IsOptional() @IsDateString() purchaseDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() acquisitionDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() acquisitionMethod?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() vendorId?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() purchaseOrderId?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() invoiceNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() warrantyStart?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() warrantyEnd?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() warrantyProvider?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() warrantyType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() warrantyNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() warrantyCoverage?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() originalCost?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() currency?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() fundingSource?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() projectCode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() assetClass?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() usefulLifeYears?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() salvageValue?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() barcodeValue?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() imageUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() parentAssetId?: number;

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
