import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

export interface JwtPayload {
  sub: number;
  email: string;
  permissions: string[];
  departmentId: number | null;
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  /**
   * Flattens a user's roles into a deduplicated list of permission codes.
   * Called at login and whenever a token is refreshed - never cached longer
   * than a single JWT's lifetime, so a permission change takes effect the
   * next time the user's token refreshes rather than requiring a manual
   * "kick everyone out" step.
   */
  async resolvePermissions(userId: number): Promise<string[]> {
    const userRoles = await this.prisma.userRole.findMany({
      where: { userId },
      include: { role: { include: { permissions: { include: { permission: true } } } } },
    });

    const codes = new Set<string>();
    for (const ur of userRoles) {
      for (const rp of ur.role.permissions) {
        codes.add(rp.permission.code);
      }
    }
    return Array.from(codes);
  }

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return user;
  }

  async login(email: string, password: string) {
    const user = await this.validateUser(email, password);
    const permissions = await this.resolvePermissions(user.id);

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      permissions,
      departmentId: user.departmentId,
    };

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        departmentId: user.departmentId,
        permissions,
      },
    };
  }

  async hashPassword(plain: string): Promise<string> {
    return bcrypt.hash(plain, 12);
  }

  /**
   * The logged-in user's own profile. Roles/department come along so the
   * frontend can render context (e.g. "Teacher, Science") without a second
   * admin-scoped call - this endpoint needs NO users.* permission.
   */
  async getProfile(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { department: true, position: true, roles: { include: { role: true } } },
    });
    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Account is no longer active');
    }
    const { passwordHash: _passwordHash, ...safe } = user;
    return safe;
  }

  /**
   * Self-service edit. Only safe fields (name, phone, photo) are writable -
   * email, roles, department and status stay admin-only so a user can't
   * escalate their own privileges.
   */
  async updateProfile(userId: number, dto: UpdateProfileDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Account is no longer active');
    }
    const updated = await this.prisma.user.update({ where: { id: userId }, data: dto });
    const { passwordHash: _passwordHash, ...safe } = updated;
    return safe;
  }

  /** Self-service password change - requires proving the current password. */
  async changePassword(userId: number, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('Account is no longer active');
    }
    const matches = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!matches) {
      throw new ForbiddenException('Current password is incorrect');
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await bcrypt.hash(newPassword, 12) },
    });
    return { message: 'Password changed successfully' };
  }
}
