import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsInt, IsOptional, IsString } from 'class-validator';

export class FinalizeIssuanceDto {
  @ApiProperty({ description: 'The specific physical asset being handed out for this request' })
  @IsInt()
  assetId: number;

  @ApiProperty() @IsString() conditionAtIssueCode: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() expectedReturnDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() roomId?: number;
}
