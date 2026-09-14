import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsInt, IsOptional, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { PrismaService } from '../../prisma/prisma.service';

class ResetSequenceDto {
  @ApiPropertyOptional({ description: 'Set lastNumber to this value (default 0 = restart from 1 on next call)' })
  @IsOptional() @IsInt() @Min(0) lastNumber?: number;
}

@ApiTags('sequences')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('sequences')
export class SequencesController {
  constructor(private prisma: PrismaService) {}

  @Get()
  @RequirePermission('users.view')
  findAll() {
    return this.prisma.numberSequence.findMany({ orderBy: [{ prefix: 'asc' }, { year: 'desc' }] });
  }

  @Patch(':prefix')
  @RequirePermission('users.view')
  async reset(@Param('prefix') prefix: string, @Body() dto: ResetSequenceDto) {
    // Reset all rows for this prefix (covers both year-scoped and non-scoped).
    const rows = await this.prisma.numberSequence.findMany({ where: { prefix } });
    await Promise.all(
      rows.map((r) =>
        this.prisma.numberSequence.update({
          where: { id: r.id },
          data: { lastNumber: dto.lastNumber ?? 0 },
        }),
      ),
    );
    return this.prisma.numberSequence.findMany({ where: { prefix }, orderBy: { year: 'desc' } });
  }
}
