import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum ApprovalDecisionDto {
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CHANGES_REQUESTED = 'CHANGES_REQUESTED',
}

export class DecideDto {
  @ApiProperty({ enum: ApprovalDecisionDto }) @IsEnum(ApprovalDecisionDto) decision: ApprovalDecisionDto;
  @ApiPropertyOptional() @IsOptional() @IsString() comment?: string;
}
