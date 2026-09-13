import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ReturnAssetDto {
  @ApiProperty({ description: 'Condition code observed at return' })
  @IsString()
  conditionAtReturnCode: string;

  @ApiPropertyOptional({ description: 'If set, asset goes to MAINTENANCE instead of AVAILABLE after return' })
  @IsOptional()
  @IsString()
  sendToMaintenance?: boolean | string;

  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}
