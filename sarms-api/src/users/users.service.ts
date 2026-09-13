import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('A user with this email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const { roleIds, password, ...rest } = dto;

    return this.prisma.user.create({
      data: {
        ...rest,
        passwordHash,
        roles: roleIds
          ? { create: roleIds.map((roleId) => ({ roleId })) }
          : undefined,
      },
      include: { roles: { include: { role: true } }, department: true },
    });
  }

  findAll(params: { departmentId?: number; status?: string }) {
    return this.prisma.user.findMany({
      where: {
        departmentId: params.departmentId,
        status: params.status as any,
      },
      include: { department: true, position: true, roles: { include: { role: true } } },
      orderBy: { fullName: 'asc' },
    });
  }

  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { department: true, position: true, roles: { include: { role: true } } },
    });
    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }
    return user;
  }

  async update(id: number, dto: UpdateUserDto) {
    await this.findOne(id);
    return this.prisma.user.update({ where: { id }, data: dto });
  }

  async deactivate(id: number) {
    await this.findOne(id);
    return this.prisma.user.update({ where: { id }, data: { status: 'INACTIVE' } });
  }

  async activate(id: number) {
    await this.findOne(id);
    return this.prisma.user.update({ where: { id }, data: { status: 'ACTIVE' } });
  }

  /**
   * Assets currently in this user's custody - the check that gates
   * offboarding/clearance (Section 68 of the original spec).
   */
  async outstandingAssets(id: number) {
    return this.prisma.assetAssignment.findMany({
      where: { custodianUserId: id, status: 'ACTIVE' },
      include: { asset: true },
    });
  }
}
