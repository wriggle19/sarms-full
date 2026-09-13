import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsEnum, IsInt, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { RequestTypeDto } from '../../requests/dto/create-request.dto';

export enum ApproverTypeDto {
  LINE_MANAGER = 'LINE_MANAGER',
  DEPARTMENT_HEAD = 'DEPARTMENT_HEAD',
  ROLE = 'ROLE',
  SPECIFIC_USER = 'SPECIFIC_USER',
}

export class WorkflowStepDto {
  @ApiProperty() @IsInt() stepOrder: number;
  @ApiProperty({ enum: ApproverTypeDto }) @IsEnum(ApproverTypeDto) approverType: ApproverTypeDto;
  @ApiPropertyOptional() @IsOptional() @IsInt() approverRoleId?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() specificUserId?: number;
}

export class CreateWorkflowDto {
  @ApiProperty() @IsString() name: string;
  @ApiPropertyOptional({ enum: RequestTypeDto })
  @IsOptional()
  @IsEnum(RequestTypeDto)
  appliesToRequestType?: RequestTypeDto;
  @ApiPropertyOptional() @IsOptional() @IsInt() appliesToCategoryId?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() minValueThreshold?: number;

  @ApiProperty({ type: [WorkflowStepDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkflowStepDto)
  steps: WorkflowStepDto[];
}
