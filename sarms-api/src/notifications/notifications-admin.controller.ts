import { Body, Controller, Get, Param, ParseIntPipe, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionGuard } from '../common/guards/permission.guard';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { PrismaService } from '../prisma/prisma.service';

class UpsertTemplateDto {
  @IsString() subject: string;
  @IsString() bodyTemplate: string;
  // 'IN_APP' | 'EMAIL'
  channel?: string;
}

/**
 * §27/§63: administrators configure notification templates (who gets emailed
 * vs who just gets an in-app bell row, and what the message says) without
 * touching code. Templates are keyed by eventKey (REQUEST_APPROVED,
 * LOAN_OVERDUE, ...).
 */
@ApiTags('notification-templates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('notification-templates')
export class NotificationsAdminController {
  constructor(private prisma: PrismaService) {}

  @Get()
  @RequirePermission('users.view')
  list() {
    return this.prisma.notificationTemplate.findMany({ orderBy: { eventKey: 'asc' } });
  }

  @Put(':eventKey')
  @RequirePermission('users.view')
  async upsert(@Param('eventKey') eventKey: string, @Body() dto: UpsertTemplateDto) {
    return this.prisma.notificationTemplate.upsert({
      where: { eventKey },
      create: {
        eventKey,
        subject: dto.subject,
        bodyTemplate: dto.bodyTemplate,
        channel: (dto.channel as any) ?? 'EMAIL',
      },
      update: {
        subject: dto.subject,
        bodyTemplate: dto.bodyTemplate,
        ...(dto.channel ? { channel: (dto.channel as any) } : {}),
      },
    });
  }
}
