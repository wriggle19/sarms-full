import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsDateString, IsString } from 'class-validator';

export class CreateAcademicYearDto {
  @ApiProperty({ example: '2026/2027' })
  @IsString()
  label: string;

  @ApiProperty() @IsDateString() startDate: string;
  @ApiProperty() @IsDateString() endDate: string;
}

export class UpdateAcademicYearDto extends PartialType(CreateAcademicYearDto) {}
