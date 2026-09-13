import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString } from 'class-validator';

export class ReportMaintenanceDto {
  @ApiProperty() @IsInt() assetId: number;
  @ApiProperty() @IsString() issueDescription: string;
  @ApiPropertyOptional() @IsOptional() @IsString() priority?: string;
}

export class CompleteMaintenanceDto {
  @ApiPropertyOptional() @IsOptional() @IsString() repairPerformed?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() partsReplaced?: string;
  @ApiPropertyOptional() @IsOptional() cost?: number;
  @ApiProperty({ description: 'Condition code after repair' }) @IsString() conditionAfterCode: string;
  @ApiPropertyOptional({ description: 'If false, asset goes to RETIRED instead of AVAILABLE' })
  @IsOptional()
  repaired?: boolean;
}
