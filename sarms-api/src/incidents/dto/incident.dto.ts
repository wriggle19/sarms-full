import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';

export enum IncidentTypeDto {
  LOST = 'LOST',
  MISSING = 'MISSING',
  STOLEN = 'STOLEN',
  DAMAGED = 'DAMAGED',
}

export class ReportIncidentDto {
  @ApiProperty() @IsInt() assetId: number;
  @ApiProperty({ enum: IncidentTypeDto }) @IsEnum(IncidentTypeDto) type: IncidentTypeDto;
  @ApiPropertyOptional() @IsOptional() @IsInt() locationRoomId?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() policeReportNumber?: string;
}

export class ResolveIncidentDto {
  @ApiProperty() @IsString() resolution: string;
  @ApiPropertyOptional({ description: 'True if the asset was recovered in usable condition' })
  @IsOptional()
  recovered?: boolean;
}
