// =====================================================================
// PHÂN QUYỀN TOÀN CỤC
//  - Mặc định MỌI API đều cần đăng nhập (Bearer token).
//  - @Public()                 : không cần đăng nhập (người dân / khách). Nếu có token
//                                hợp lệ thì vẫn nhận diện người dùng.
//  - @RequirePermissions(...)  : vai trò hiện tại (role trong JWT) phải có ÍT NHẤT 1 quyền.
//  - @Roles(...)               : vai trò hiện tại phải nằm trong danh sách.
//  Quyền của từng vai trò lưu ở bảng role_permissions -> admin đổi được qua API.
// =====================================================================
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
  UnauthorizedException,
  createParamDecorator,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role, User } from '../entities';

export const IS_PUBLIC = 'isPublic';
export const PERMISSIONS_KEY = 'permissions';
export const ROLES_KEY = 'roles';

export const Public = () => SetMetadata(IS_PUBLIC, true);
export const RequirePermissions = (...perms: string[]) => SetMetadata(PERMISSIONS_KEY, perms);
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

/** Thông tin người đang thao tác (gắn vào request) */
export interface Actor {
  userId: string;
  email: string;
  fullName: string;
  role: string | null;
  accountType: string;
  facilityId: number | null;
  departmentId: number | null;
  permissions: string[];
  ip?: string;
  userAgent?: string;
}

export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): Actor | null => {
  const req = ctx.switchToHttp().getRequest();
  if (!req.user) return null;
  return {
    ...req.user,
    ip: (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.ip,
    userAgent: req.headers['user-agent'],
  };
});

export function hasPermission(actor: Actor | null | undefined, perm: string): boolean {
  return !!actor && actor.permissions.includes(perm);
}

@Injectable()
export class PermissionCache {
  private cache = new Map<string, { perms: string[]; active: boolean; at: number }>();
  constructor(@InjectRepository(Role) private readonly roles: Repository<Role>) {}

  async forRole(roleCode: string): Promise<{ perms: string[]; active: boolean }> {
    const hit = this.cache.get(roleCode);
    if (hit && Date.now() - hit.at < 30_000) return hit;
    const role = await this.roles.findOne({ where: { roleCode }, relations: { permissions: true } });
    const val = {
      perms: (role?.permissions ?? []).map((p) => p.permissionCode),
      active: !!role?.isActive,
      at: Date.now(),
    };
    this.cache.set(roleCode, val);
    return val;
  }

  invalidate() {
    this.cache.clear();
  }
}

@Injectable()
export class AccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly permCache: PermissionCache,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const targets = [ctx.getHandler(), ctx.getClass()];
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, targets);
    const req = ctx.switchToHttp().getRequest();

    const header: string = req.headers['authorization'] || '';
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';

    if (token) {
      try {
        const payload: any = await this.jwt.verifyAsync(token, {
          secret: this.config.get<string>('JWT_SECRET') || 'default_backup_secret',
        });
        req.user = await this.buildActor(payload);
      } catch (e) {
        if (!isPublic) {
          throw e instanceof UnauthorizedException
            ? e
            : new UnauthorizedException('Phiên đăng nhập không hợp lệ hoặc đã hết hạn');
        }
        req.user = null; // route công khai: coi như khách
      }
    }

    if (isPublic) return true;
    if (!req.user) throw new UnauthorizedException('Vui lòng đăng nhập');

    const roles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, targets);
    if (roles?.length && !roles.includes(req.user.role)) {
      throw new ForbiddenException('Vai trò hiện tại không được phép thực hiện chức năng này');
    }
    const perms = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, targets);
    if (perms?.length && !perms.some((p) => req.user.permissions.includes(p))) {
      throw new ForbiddenException(`Bạn không có quyền: ${perms.join(' / ')}`);
    }
    return true;
  }

  private async buildActor(payload: any): Promise<Actor> {
    if (!payload?.sub || payload.type === 'refresh') throw new UnauthorizedException('Token không hợp lệ');
    const user = await this.users.findOne({ where: { id: String(payload.sub) }, relations: { roles: true } });
    if (!user) throw new UnauthorizedException('Tài khoản không tồn tại');
    if (user.status !== 'ACTIVE') throw new UnauthorizedException('Tài khoản đã bị khóa');

    let role: string | null = payload.role ?? null;
    let permissions: string[] = [];
    if (role) {
      const granted = (user.roles ?? []).some((r) => r.roleCode === role);
      if (!granted) throw new UnauthorizedException('Vai trò đã bị thu hồi, vui lòng đăng nhập lại');
      const info = await this.permCache.forRole(role);
      if (!info.active) throw new UnauthorizedException('Vai trò đang bị vô hiệu hóa');
      permissions = info.perms;
    } else {
      role = null;
    }
    return {
      userId: String(user.id),
      email: user.email,
      fullName: user.fullName,
      role,
      accountType: user.accountType,
      facilityId: user.facilityId ?? null,
      departmentId: user.departmentId ?? null,
      permissions,
    };
  }
}
