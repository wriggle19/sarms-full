import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionGuard } from '../common/guards/permission.guard';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { AcademicYearsService } from './academic-years.service';
import { CreateAcademicYearDto, UpdateAcademicYearDto } from './dto/academic-year.dto';

@ApiTags('academic-years')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('academic-years')
export class AcademicYearsController {
  constructor(private service: AcademicYearsService) {}

  @Post()
  @RequirePermission('academic-years.manage')
  create(@Body() dto: CreateAcademicYearDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @RequirePermission('academic-years.manage')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @RequirePermission('academic-years.manage')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateAcademicYearDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @RequirePermission('academic-years.manage')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }

  @Patch(':id/set-current')
  @RequirePermission('academic-years.manage')
  setCurrent(@Param('id', ParseIntPipe) id: number) {
    return this.service.setCurrent(id);
  }

  @Get(':id/outstanding')
  @RequirePermission('assets.view')
  outstanding(@Param('id', ParseIntPipe) id: number) {
    return this.service.endOfYearOutstanding(id);
  }
}
