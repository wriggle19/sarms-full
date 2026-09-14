import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsDateString, IsInt, IsOptional, IsString } from 'class-validator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionGuard } from '../common/guards/permission.guard';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { Audit } from '../common/decorators/audit.decorator';
import { PrismaService } from '../prisma/prisma.service';

export class CreateCalendarEventDto {
  @IsString() title: string;
  // TERM_START, TERM_END, TEACHER_RETURN, STUDENT_RETURN, STAFF_CLEARANCE,
  // EQUIPMENT_RETURN_DEADLINE, INVENTORY_DATE, HOLIDAY
  @IsString() eventType: string;
  @IsDateString() eventDate: string;
  @IsOptional() @IsDateString() endDate?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsInt() academicYearId?: number;
}

/**
 * §45: school calendar / important dates. The notification scheduler scans
 * these for upcoming deadlines (equipment return deadline, inventory date,
 * staff clearance day, ...).
 */
@ApiTags('calendar')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('calendar')
export class CalendarController {
  constructor(private prisma: PrismaService) {}

  @Get()
  @RequirePermission('assets.view')
  list(@Param('from') _from?: string) {
    return this.prisma.schoolCalendarEvent.findMany({ orderBy: { eventDate: 'asc' } });
  }

  @Post()
  @RequirePermission('users.view')
  @Audit({ action: 'CREATE', module: 'calendar', recordType: 'SchoolCalendarEvent' })
  create(@Body() dto: CreateCalendarEventDto) {
    return this.prisma.schoolCalendarEvent.create({
      data: {
        title: dto.title,
        eventType: dto.eventType as any,
        eventDate: new Date(dto.eventDate),
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        description: dto.description,
        academicYearId: dto.academicYearId,
      },
    });
  }

  @Delete(':id')
  @RequirePermission('users.view')
  @Audit({ action: 'DELETE', module: 'calendar', recordType: 'SchoolCalendarEvent' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.prisma.schoolCalendarEvent.delete({ where: { id } });
  }
}
