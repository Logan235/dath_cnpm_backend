import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import bcrypt from 'bcrypt';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Facility, Role, RoleRequest, User } from '../entities';
import { RegisterDto, ChangePasswordDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ACCOUNT_TYPE, LABELS, ROLE } from '../common/constants';
import { AuditService, ParamsService } from '../core/core.services';
import { Actor, PermissionCache } from '../common/auth';

/** Thứ tự ưu tiên khi tài khoản có nhiều vai trò mà không chọn vai trò */
const ROLE_PRIORITY = [ROLE.ADMIN, ROLE.MANAGER, ROLE.SPECIALIST, ROLE.CYBER_POLICE, ROLE.FACILITY, ROLE.CITIZEN];

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(Role) private readonly roleRepository: Repository<Role>,
    @InjectRepository(RoleRequest) private readonly roleRequests: Repository<RoleRequest>,
    @InjectRepository(Facility) private readonly facilities: Repository<Facility>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly params: ParamsService,
    private readonly audit: AuditService,
    private readonly permCache: PermissionCache,
  ) {}

  /** Đuôi email cơ quan (tham số OFFICIAL_EMAIL_DOMAINS, admin chỉnh được) */
  async officialDomains(): Promise<string[]> {
    const fromEnv = this.configService.get<string>('OFFICIAL_EMAIL_DOMAINS');
    const raw = await this.params.str('OFFICIAL_EMAIL_DOMAINS', fromEnv || 'syt.com');
    return raw
      .split(',')
      .map((d) => d.trim().toLowerCase().replace(/^@/, ''))
      .filter(Boolean);
  }

  async isOfficialEmail(email: string): Promise<boolean> {
    const domain = email.split('@')[1]?.toLowerCase() ?? '';
    const list = await this.officialDomains();
    return list.some((d) => domain === d || domain.endsWith('.' + d));
  }

  /**
   * Đăng ký:
   *  - email thường  -> tài khoản NGƯỜI DÂN (vai trò CITIZEN), dùng được ngay
   *  - email cơ quan -> tài khoản CÁN BỘ (OFFICIAL) chưa có vai trò; phải gửi form
   *                    POST /role-requests để admin / lãnh đạo xác nhận và cấp vai trò
   */
  async register(dto: RegisterDto) {
    const email = dto.email.trim().toLowerCase();
    const official = await this.isOfficialEmail(email);
    let username = email.split('@')[0];

    if (await this.userRepository.findOne({ where: { email } })) {
      throw new ConflictException('Email này đã được đăng ký');
    }
    if (await this.userRepository.findOne({ where: { username } })) {
      username = `${username}.${Date.now().toString(36).slice(-4)}`;
    }

    const citizenRole = await this.roleRepository.findOne({ where: { roleCode: ROLE.CITIZEN } });
    const user = await this.userRepository.save(
      this.userRepository.create({
        username,
        email,
        passwordHash: await bcrypt.hash(dto.password, 10),
        fullName: dto.fullName || dto.displayName || username,
        phoneNumber: dto.phoneNumber,
        status: 'ACTIVE',
        accountType: official ? ACCOUNT_TYPE.OFFICIAL : ACCOUNT_TYPE.CITIZEN,
        roles: !official && citizenRole ? [citizenRole] : [],
      }),
    );
    await this.audit.log(
      { userId: user.id, email: user.email },
      {
        action: 'REGISTER',
        module: 'SYSTEM',
        entityType: 'user',
        entityId: user.id,
        description: official ? 'Đăng ký tài khoản cán bộ (email cơ quan)' : 'Đăng ký tài khoản người dân',
      },
    );
    return {
      message: official
        ? 'Đăng ký thành công. Email thuộc cơ quan nhà nước: hãy đăng nhập (không chọn vai trò) và gửi form xin cấp quyền tại POST /role-requests.'
        : 'Đăng ký thành công. Bạn có thể đăng nhập với vai trò Người dân.',
      accountType: user.accountType,
      requiresRoleRequest: official,
      user: this.toSafeUser(user),
    };
  }

  async validateUser(loginDto: { email: string; password: string }): Promise<User> {
    const email = loginDto.email.trim().toLowerCase();
    const user = await this.userRepository.findOne({ where: { email }, relations: { roles: true } });
    if (!user || !user.passwordHash) throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    const ok = await bcrypt.compare(loginDto.password, user.passwordHash);
    if (!ok) {
      await this.audit.log({ userId: user.id, email: user.email }, { action: 'LOGIN_FAILED', module: 'SYSTEM', entityType: 'user', entityId: user.id });
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }
    if (user.status !== 'ACTIVE') throw new UnauthorizedException('Tài khoản đã bị khóa, liên hệ quản trị viên');
    return user;
  }

  async login(user: User, dto: Partial<LoginDto>, ctx?: { ip?: string; userAgent?: string }) {
    const activeRoles = (user.roles ?? []).filter((r) => r.isActive !== false);
    const roleCodes = activeRoles.map((r) => r.roleCode);
    let role: string | null = null;

    if (dto.role) {
      role = String(dto.role).trim().toUpperCase();
      if (!Object.values(ROLE).includes(role as any) && !(await this.roleRepository.findOne({ where: { roleCode: role } }))) {
        throw new BadRequestException('Vai trò không hợp lệ');
      }
      if (!roleCodes.includes(role)) {
        const pending = await this.roleRequests.findOne({ where: { userId: user.id, status: 'PENDING' } });
        throw new ForbiddenException({
          statusCode: 403,
          error: 'ROLE_NOT_GRANTED',
          message: `Tài khoản này không có vai trò "${LABELS.role[role] ?? role}".`,
          availableRoles: roleCodes,
          accountType: user.accountType,
          pendingRoleRequest: pending ? { id: pending.id, requestedRoleCode: pending.requestedRoleCode } : null,
          hint:
            user.accountType === ACCOUNT_TYPE.OFFICIAL
              ? 'Đăng nhập không chọn vai trò rồi gửi form xin cấp quyền (POST /role-requests)'
              : undefined,
        });
      }
    } else if (roleCodes.length) {
      role = [...roleCodes].sort((a, b) => ROLE_PRIORITY.indexOf(a as any) - ROLE_PRIORITY.indexOf(b as any))[0];
    }

    const tokens = await this.issueTokens(user, role);
    await this.userRepository.update(user.id, {
      refreshToken: await bcrypt.hash(tokens.refreshToken, 10),
      lastLoginAt: new Date(),
    });
    await this.audit.log(
      { userId: user.id, email: user.email, role, ip: ctx?.ip, userAgent: ctx?.userAgent },
      { action: 'LOGIN', module: 'SYSTEM', entityType: 'user', entityId: user.id, description: `Đăng nhập với vai trò ${role ?? '(chưa có)'}` },
    );
    const permissions = role ? (await this.permCache.forRole(role)).perms : [];
    return {
      message: 'Đăng nhập thành công',
      user: this.toSafeUser(user),
      role,
      roleLabel: role ? LABELS.role[role] ?? role : null,
      availableRoles: roleCodes,
      permissions,
      needsRoleRequest: !role && user.accountType === ACCOUNT_TYPE.OFFICIAL,
      ...tokens,
    };
  }

  private async issueTokens(user: User, role: string | null) {
    const accessToken = await this.jwtService.signAsync(
      { sub: String(user.id), userId: String(user.id), email: user.email, ...(role ? { role } : {}) },
      { expiresIn: (this.configService.get<string>('JWT_EXPIRES_IN') || '8h') as JwtSignOptions['expiresIn'] },
    );
    const refreshToken = await this.jwtService.signAsync(
      { subject: String(user.id), type: 'refresh', role },
      { expiresIn: (this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d') as JwtSignOptions['expiresIn'] },
    );
    return { accessToken, refreshToken };
  }

  async refresh(refreshToken: string, role?: string) {
    let payload: any;
    try {
      payload = await this.jwtService.verifyAsync(refreshToken);
    } catch {
      throw new UnauthorizedException('Refresh token không hợp lệ hoặc đã hết hạn');
    }
    const user = await this.userRepository.findOne({ where: { id: String(payload.subject) }, relations: { roles: true } });
    if (!user || !user.refreshToken || !(await bcrypt.compare(refreshToken, user.refreshToken))) {
      throw new UnauthorizedException('Refresh token đã bị thu hồi');
    }
    return this.login(user, { role: role ?? payload.role ?? undefined });
  }

  async logout(actor: Actor) {
    await this.userRepository.update(actor.userId, { refreshToken: null as any });
    await this.audit.log(actor, { action: 'LOGOUT', module: 'SYSTEM', entityType: 'user', entityId: actor.userId });
    return { message: 'Đã đăng xuất' };
  }

  /** Thông tin phiên hiện tại (GET /auth/me) */
  async getProfile(actor: Actor) {
    const user = await this.userRepository.findOne({
      where: { id: actor.userId },
      relations: { roles: true, department: true },
    });
    if (!user) throw new UnauthorizedException('Tài khoản không tồn tại');
    const facility = user.facilityId ? await this.facilities.findOne({ where: { id: user.facilityId } }) : null;
    const latestRequest = await this.roleRequests.findOne({ where: { userId: user.id }, order: { createdAt: 'DESC' } });
    return {
      user: this.toSafeUser(user),
      role: actor.role,
      roleLabel: actor.role ? LABELS.role[actor.role] ?? actor.role : null,
      permissions: actor.permissions,
      department: user.department ? { id: user.department.id, code: user.department.code, name: user.department.name } : null,
      facility: facility ? { id: facility.id, code: facility.code, name: facility.name } : null,
      isOfficialEmail: await this.isOfficialEmail(user.email),
      needsRoleRequest: user.accountType === ACCOUNT_TYPE.OFFICIAL && !(user.roles ?? []).length,
      latestRoleRequest: latestRequest
        ? { id: latestRequest.id, requestedRoleCode: latestRequest.requestedRoleCode, status: latestRequest.status, reviewNote: latestRequest.reviewNote }
        : null,
    };
  }

  async changePassword(actor: Actor, dto: ChangePasswordDto) {
    const user = await this.userRepository.findOne({ where: { id: actor.userId } });
    if (!user || !(await bcrypt.compare(dto.currentPassword, user.passwordHash))) {
      throw new BadRequestException('Mật khẩu hiện tại không đúng');
    }
    await this.userRepository.update(user.id, { passwordHash: await bcrypt.hash(dto.newPassword, 10), refreshToken: null as any });
    await this.audit.log(actor, { action: 'CHANGE_PASSWORD', module: 'SYSTEM', entityType: 'user', entityId: user.id });
    return { message: 'Đổi mật khẩu thành công' };
  }

  /** Bỏ trường nhạy cảm, đổi roles thành mảng mã vai trò */
  toSafeUser(user: Partial<User>) {
    const { passwordHash, refreshToken, roles, department, ...rest } = user as any;
    return { ...rest, roles: (roles ?? []).map((r: Role) => r.roleCode) };
  }

  // ----- OAuth (đang tắt, giữ để bật lại khi có credentials) -----
  async validateGoogleUser(email: string, displayName: string, _providerId: string): Promise<User> {
    return this.findOrCreateOAuthUser(email, displayName || email.split('@')[0]);
  }

  async validateGithubUser(email: string, githubId: string, displayName: string): Promise<User> {
    return this.findOrCreateOAuthUser(email || `${githubId}@users.noreply.github.com`, displayName || 'Github User');
  }

  private async findOrCreateOAuthUser(email: string, fullName: string): Promise<User> {
    let user = await this.userRepository.findOne({ where: { email }, relations: { roles: true } });
    if (!user) {
      const official = await this.isOfficialEmail(email);
      const citizen = await this.roleRepository.findOne({ where: { roleCode: ROLE.CITIZEN } });
      user = await this.userRepository.save(
        this.userRepository.create({
          username: `${email.split('@')[0]}.${Date.now().toString(36).slice(-4)}`,
          email,
          passwordHash: '',
          fullName,
          status: 'ACTIVE',
          accountType: official ? ACCOUNT_TYPE.OFFICIAL : ACCOUNT_TYPE.CITIZEN,
          roles: !official && citizen ? [citizen] : [],
        }),
      );
    }
    return user;
  }
}
