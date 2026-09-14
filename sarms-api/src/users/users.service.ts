import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  private static SAFE_SELECT = {
    id: true,
    employeeId: true,
    fullName: true,
    email: true,
    phone: true,
    status: true,
    profilePhotoUrl: true,
    departmentId: true,
    positionId: true,
    campusId: true,
    supervisorId: true,
    startDate: true,
    endDate: true,
    lastLoginAt: true,
    createdAt: true,
    updatedAt: true,
  } as const;

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
      select: {
        ...UsersService.SAFE_SELECT,
        roles: { include: { role: true } },
        department: true,
      },
    });
  }

  findAll(params: { departmentId?: number; status?: string }) {
    return this.prisma.user.findMany({
      where: {
        departmentId: params.departmentId,
        status: params.status as any,
      },
      select: {
        ...UsersService.SAFE_SELECT,
        department: true,
        position: true,
        roles: { include: { role: true } },
      },
      orderBy: { fullName: 'asc' },
    });
  }

  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        ...UsersService.SAFE_SELECT,
        department: true,
        position: true,
        roles: { include: { role: true } },
      },
    });
    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }
    return user;
  }

  async update(id: number, dto: UpdateUserDto) {
    await this.findOne(id);
    const updated = await this.prisma.user.update({ where: { id }, data: dto });
    const { passwordHash: _ph, ...safe } = updated;
    return safe;
  }

  async deactivate(id: number) {
    await this.findOne(id);
    const updated = await this.prisma.user.update({ where: { id }, data: { status: 'INACTIVE' } });
    const { passwordHash: _ph, ...safe } = updated;
    return safe;
  }

  async activate(id: number) {
    await this.findOne(id);
    const updated = await this.prisma.user.update({ where: { id }, data: { status: 'ACTIVE' } });
    const { passwordHash: _ph, ...safe } = updated;
    return safe;
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
