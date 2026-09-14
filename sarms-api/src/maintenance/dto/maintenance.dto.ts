import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

export class ReportMaintenanceDto {
  @ApiProperty() @IsInt() assetId: number;
  @ApiProperty() @IsString() issueDescription: string;
  @ApiPropertyOptional() @IsOptional() @IsString() priority?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() conditionBeforeId?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() technicianName?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() vendorId?: number;
}

export class CompleteMaintenanceDto {
  @ApiPropertyOptional() @IsOptional() @IsString() diagnosis?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() repairPerformed?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() repairNotes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() partsReplaced?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() partsCost?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() laborCost?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() cost?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() currency?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() invoiceNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() technicianName?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() vendorId?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() warrantyClaim?: boolean;
  @ApiProperty({ description: 'Condition code after repair' }) @IsString() conditionAfterCode: string;
  @ApiPropertyOptional({ description: 'If false, asset goes to RETIRED instead of AVAILABLE' })
  @IsOptional()
  repaired?: boolean;
}
