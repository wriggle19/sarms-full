import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';

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
}
