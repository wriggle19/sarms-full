import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVendorDto, UpdateVendorDto } from './dto/vendor.dto';

@Injectable()
export class VendorsService {
  constructor(private prisma: PrismaService) {}

  create(dto: CreateVendorDto) {
    return this.prisma.vendor.create({ data: dto });
  }

  findAll() {
    return this.prisma.vendor.findMany({ where: { status: 'ACTIVE' }, orderBy: { name: 'asc' } });
  }

  async findOne(id: number) {
    const vendor = await this.prisma.vendor.findUnique({ where: { id } });
    if (!vendor) throw new NotFoundException(`Vendor ${id} not found`);
    return vendor;
  }

  async update(id: number, dto: UpdateVendorDto) {
    await this.findOne(id);
    return this.prisma.vendor.update({ where: { id }, data: dto });
  }

  async deactivate(id: number) {
    await this.findOne(id);
    return this.prisma.vendor.update({ where: { id }, data: { status: 'INACTIVE' } });
  }
}
