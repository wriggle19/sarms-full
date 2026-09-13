import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRolePermissionsDto } from './dto/update-role-permissions.dto';

@Injectable()
export class RolesService {
  constructor(private prisma: PrismaService) {}

  create(dto: CreateRoleDto) {
    return this.prisma.role.create({
      data: {
        name: dto.name,
        description: dto.description,
        permissions: dto.permissionIds
          ? { create: dto.permissionIds.map((permissionId) => ({ permissionId })) }
          : undefined,
      },
      include: { permissions: { include: { permission: true } } },
    });
  }

  findAll() {
    return this.prisma.role.findMany({
      include: { permissions: { include: { permission: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: number) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: { permissions: { include: { permission: true } } },
    });
    if (!role) throw new NotFoundException(`Role ${id} not found`);
    return role;
  }

  /**
   * Replaces a role's entire permission set. This is intentionally a full
   * replace, not a merge - the admin screen shows checkboxes for every
   * permission and submits the complete resulting set, matching what the
   * admin actually sees on screen.
   */
  async setPermissions(roleId: number, dto: UpdateRolePermissionsDto) {
    await this.findOne(roleId);
    await this.prisma.$transaction([
      this.prisma.rolePermission.deleteMany({ where: { roleId } }),
      this.prisma.rolePermission.createMany({
        data: dto.permissionIds.map((permissionId) => ({ roleId, permissionId })),
      }),
    ]);
    return this.findOne(roleId);
  }

  assignToUser(userId: number, roleId: number) {
    return this.prisma.userRole.upsert({
      where: { userId_roleId: { userId, roleId } },
      update: {},
      create: { userId, roleId },
    });
  }

  removeFromUser(userId: number, roleId: number) {
    return this.prisma.userRole.delete({ where: { userId_roleId: { userId, roleId } } });
  }
}
