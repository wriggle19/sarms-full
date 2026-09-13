import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsInt, IsOptional, IsString } from 'class-validator';

export enum AssignmentTypeDto {
  PERSON = 'PERSON',
  ROOM = 'ROOM',
  DEPARTMENT = 'DEPARTMENT',
  POOL = 'POOL',
}

export class IssueAssetDto {
  @ApiProperty() @IsInt() assetId: number;
  @ApiProperty({ enum: AssignmentTypeDto }) @IsEnum(AssignmentTypeDto) assignmentType: AssignmentTypeDto;

  @ApiPropertyOptional() @IsOptional() @IsInt() custodianUserId?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() roomId?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() departmentId?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() academicYearId?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() requestId?: number;

  @ApiPropertyOptional() @IsOptional() @IsDateString() expectedReturnDate?: string;
  @ApiProperty({ description: 'Condition code recorded at the moment of issuance' })
  @IsString()
  conditionAtIssueCode: string;

  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}
