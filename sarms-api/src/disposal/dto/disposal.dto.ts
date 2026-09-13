import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

export enum DisposalMethodDto {
  SOLD = 'SOLD',
  DONATED = 'DONATED',
  SCRAPPED = 'SCRAPPED',
  RECYCLED = 'RECYCLED',
  OTHER = 'OTHER',
}

export class CreateDisposalDto {
  @ApiProperty() @IsInt() assetId: number;
  @ApiProperty() @IsString() reason: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() bookValue?: number;
  @ApiProperty({ enum: DisposalMethodDto }) @IsEnum(DisposalMethodDto) disposalMethod: DisposalMethodDto;
  @ApiPropertyOptional() @IsOptional() @IsInt() disposalVendorId?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() proceeds?: number;
}
