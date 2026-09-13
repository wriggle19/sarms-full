import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsInt, IsOptional, IsString } from 'class-validator';

export enum RequestTypeDto {
  NEW_EQUIPMENT = 'NEW_EQUIPMENT',
  TEMPORARY_LOAN = 'TEMPORARY_LOAN',
  LONG_TERM_ASSIGNMENT = 'LONG_TERM_ASSIGNMENT',
  ACADEMIC_YEAR_ASSIGNMENT = 'ACADEMIC_YEAR_ASSIGNMENT',
  CLASSROOM_EQUIPMENT = 'CLASSROOM_EQUIPMENT',
  DEPARTMENT_EQUIPMENT = 'DEPARTMENT_EQUIPMENT',
  REPLACEMENT = 'REPLACEMENT',
  REPAIR = 'REPAIR',
  TRANSFER = 'TRANSFER',
  RETURN = 'RETURN',
  ACCESSORY = 'ACCESSORY',
  OTHER = 'OTHER',
}

export enum RequestPriorityDto {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export class CreateRequestDto {
  @ApiProperty() @IsInt() departmentId: number;
  @ApiProperty({ enum: RequestTypeDto }) @IsEnum(RequestTypeDto) requestType: RequestTypeDto;

  @ApiPropertyOptional() @IsOptional() @IsInt() categoryId?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() specificAssetId?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() quantity?: number;

  @ApiPropertyOptional() @IsOptional() @IsString() purpose?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() locationRoomId?: number;
  @ApiPropertyOptional() @IsOptional() @IsDateString() startDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() expectedEndDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() academicYearId?: number;

  @ApiPropertyOptional({ enum: RequestPriorityDto })
  @IsOptional()
  @IsEnum(RequestPriorityDto)
  priority?: RequestPriorityDto;

  @ApiPropertyOptional() @IsOptional() @IsString() justification?: string;
}
