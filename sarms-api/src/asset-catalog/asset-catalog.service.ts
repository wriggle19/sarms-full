import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto, CreateConditionDto, CreateStatusDto, UpdateCategoryDto, UpdateConditionDto, UpdateStatusDto } from './dto/catalog.dto';

/**
 * These three lookups (category, status, condition) exist so admins can
 * extend the system's vocabulary without a code change (Sections 7, 9, 10).
 * Seed a sensible default set via prisma/seed.ts, then let admins add more
 * through this module's endpoints.
 */
@Injectable()
export class AssetCatalogService {
  constructor(private prisma: PrismaService) {}

  // Categories
  createCategory(dto: CreateCategoryDto) {
    return this.prisma.assetCategory.create({ data: dto });
  }
  findCategories() {
    return this.prisma.assetCategory.findMany({ include: { subcategories: true } });
  }
  async updateCategory(id: number, dto: UpdateCategoryDto) {
    await this.findCategory(id);
    return this.prisma.assetCategory.update({ where: { id }, data: dto });
  }
  async deleteCategory(id: number) {
    await this.findCategory(id);
    return this.prisma.assetCategory.delete({ where: { id } });
  }
  private async findCategory(id: number) {
    const cat = await this.prisma.assetCategory.findUnique({ where: { id } });
    if (!cat) throw new NotFoundException(`Asset category ${id} not found`);
    return cat;
  }

  // Statuses
  createStatus(dto: CreateStatusDto) {
    return this.prisma.assetStatus.create({ data: dto });
  }
  findStatuses() {
    return this.prisma.assetStatus.findMany();
  }
  async updateStatus(id: number, dto: UpdateStatusDto) {
    await this.findStatus(id);
    return this.prisma.assetStatus.update({ where: { id }, data: dto });
  }
  async deleteStatus(id: number) {
    await this.findStatus(id);
    return this.prisma.assetStatus.delete({ where: { id } });
  }
  private async findStatus(id: number) {
    const s = await this.prisma.assetStatus.findUnique({ where: { id } });
    if (!s) throw new NotFoundException(`Asset status ${id} not found`);
    return s;
  }

  // Conditions
  createCondition(dto: CreateConditionDto) {
    return this.prisma.assetCondition.create({ data: dto });
  }
  findConditions() {
    return this.prisma.assetCondition.findMany({ orderBy: { rank: 'asc' } });
  }
  async updateCondition(id: number, dto: UpdateConditionDto) {
    await this.findCondition(id);
    return this.prisma.assetCondition.update({ where: { id }, data: dto });
  }
  async deleteCondition(id: number) {
    await this.findCondition(id);
    return this.prisma.assetCondition.delete({ where: { id } });
  }
  private async findCondition(id: number) {
    const c = await this.prisma.assetCondition.findUnique({ where: { id } });
    if (!c) throw new NotFoundException(`Asset condition ${id} not found`);
    return c;
  }
}
