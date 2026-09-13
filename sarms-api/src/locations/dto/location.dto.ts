import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';

export class CreateCampusDto {
  @ApiProperty() @IsString() name: string;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
}

export class CreateBuildingDto {
  @ApiProperty() @IsString() name: string;
  @ApiProperty() @IsInt() campusId: number;
}

export class CreateFloorDto {
  @ApiProperty() @IsString() label: string;
  @ApiProperty() @IsInt() buildingId: number;
}

export enum RoomTypeDto {
  CLASSROOM = 'CLASSROOM',
  OFFICE = 'OFFICE',
  LAB = 'LAB',
  STORAGE = 'STORAGE',
  COMMON_AREA = 'COMMON_AREA',
  OTHER = 'OTHER',
}

export class CreateRoomDto {
  @ApiProperty() @IsString() name: string;
  @ApiProperty() @IsInt() floorId: number;
  @ApiPropertyOptional({ enum: RoomTypeDto }) @IsOptional() @IsEnum(RoomTypeDto) type?: RoomTypeDto;
  @ApiPropertyOptional() @IsOptional() @IsInt() departmentId?: number;
}

export class UpdateCampusDto extends PartialType(CreateCampusDto) {}
export class UpdateBuildingDto extends PartialType(CreateBuildingDto) {}
export class UpdateFloorDto extends PartialType(CreateFloorDto) {}
export class UpdateRoomDto extends PartialType(CreateRoomDto) {}
