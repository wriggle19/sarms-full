import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDepartmentDto, UpdateDepartmentDto } from './dto/department.dto';

@Injectable()
export class DepartmentsService {
  constructor(private prisma: PrismaService) {}

  create(dto: CreateDepartmentDto) {
    return this.prisma.department.create({ data: dto });
  }

  findAll() {
    return this.prisma.department.findMany({
      where: { isActive: true },
      include: { children: true, headUser: true },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: number) {
    const dept = await this.prisma.department.findUnique({
      where: { id },
      include: { children: true, headUser: true },
    });
    if (!dept) throw new NotFoundException(`Department ${id} not found`);
    return dept;
  }

  async update(id: number, dto: UpdateDepartmentDto) {
    await this.findOne(id);
    return this.prisma.department.update({ where: { id }, data: dto });
  }

  async deactivate(id: number) {
    await this.findOne(id);
    return this.prisma.department.update({ where: { id }, data: { isActive: false } });
  }
}
