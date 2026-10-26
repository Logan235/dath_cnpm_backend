// =====================================================================
// MODULE QUẢN TRỊ HỆ THỐNG
// =====================================================================
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import {
  AuditLog,
  Department,
  Facility,
  Notification,
  Permission,
  Role,
  RoleRequest,
  SystemParameter,
  User,
} from '../entities';
import { Actor, PermissionCache } from '../common/auth';
import { AuditService, NotificationService, ParamsService } from '../core/core.services';
import { applySearch, paginate, toBool } from '../common/utils/paging';
import { ACCOUNT_TYPE, LABELS, ROLE, ROLE_REQUEST_STATUS } from '../common/constants';
import * as D from './system.dto';

export function tempPassword(): string {
  return `Syt@${randomBytes(3).toString('hex')}9a`;
}

export function safeUser(u: User | null | undefined) {
  if (!u) return u;
  const { passwordHash, refreshToken, ...rest } = u as any;
  return { ...rest, roles: (u.roles ?? []).map((r) => (typeof r === 'string' ? r : r.roleCode)) };
}

// ---------------------------------------------------------------------
// Cơ cấu tổ chức
// ---------------------------------------------------------------------
@Injectable()
export class OrganizationsService {
  constructor(
    @InjectRepository(Department) private readonly repo: Repository<Department>,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(RoleRequest) private readonly roleRequests: Repository<RoleRequest>,
    private readonly audit: AuditService,
  ) {}

  list(q: D.OrgQueryDto) {
    const qb = this.repo.createQueryBuilder('d').leftJoinAndSelect('d.parent', 'p').orderBy('d.id', 'ASC');
    applySearch(qb, q.search, ['d.code', 'd.name']);
    const active = toBool(q.isActive);
    if (active !== undefined) qb.andWhere('d.isActive = :a', { a: active });
    if (q.parentId) qb.andWhere('d.parentId = :p', { p: q.parentId });
    return paginate(qb, q);
  }

  /** Cây cơ cấu tổ chức */
  async tree(includeInactive = true) {
    const all = await this.repo.find({ order: { id: 'ASC' } });
    const counts = await this.users
      .createQueryBuilder('u')
      .select('u.departmentId', 'id')
      .addSelect('COUNT(*)', 'n')
      .where('u.departmentId IS NOT NULL')
      .groupBy('u.departmentId')
      .getRawMany<{ id: number; n: string }>();
    const countMap = new Map(counts.map((c) => [Number(c.id), Number(c.n)]));
    const nodes = all
      .filter((d) => includeInactive || d.isActive)
      .map((d) => ({ ...d, userCount: countMap.get(d.id) ?? 0, children: [] as any[] }));
    const byId = new Map(nodes.map((n) => [n.id, n]));
    const roots: any[] = [];
    for (const n of nodes) {
      const parent = n.parentId ? byId.get(n.parentId) : undefined;
      if (parent) parent.children.push(n);
      else roots.push(n);
    }
    return roots;
  }

  /** Danh sách đơn vị đang hoạt động (dropdown cho form) */
  options() {
    return this.repo.find({ where: { isActive: true }, select: { id: true, code: true, name: true, orgType: true, parentId: true }, order: { id: 'ASC' } });
  }

  async get(id: number) {
    const d = await this.repo.findOne({ where: { id }, relations: { parent: true, children: true } });
    if (!d) throw new NotFoundException('Không tìm thấy đơn vị');
    const users = await this.users.find({ where: { departmentId: id }, relations: { roles: true } });
    return { ...d, users: users.map(safeUser) };
  }

  private async assertParent(parentId: number | null | undefined, selfId?: number) {
    if (!parentId) return;
    const parent = await this.repo.findOne({ where: { id: parentId } });
    if (!parent) throw new BadRequestException('Đơn vị cha không tồn tại');
    if (!parent.isActive) throw new BadRequestException('Đơn vị cha đang bị vô hiệu hóa');
    if (selfId) {
      // chống vòng lặp cha - con
      let cur: Department | null = parent;
      while (cur) {
        if (cur.id === selfId) throw new BadRequestException('Không thể chọn đơn vị con làm đơn vị cha');
        cur = cur.parentId ? await this.repo.findOne({ where: { id: cur.parentId } }) : null;
      }
    }
  }

  async create(dto: D.CreateOrgDto, actor: Actor) {
    if (await this.repo.findOne({ where: { code: dto.code } })) throw new ConflictException('Mã đơn vị đã tồn tại');
    await this.assertParent(dto.parentId);
    const d = await this.repo.save(this.repo.create({ ...dto, parentId: dto.parentId ?? null }));
    await this.audit.log(actor, { action: 'CREATE', module: 'SYSTEM', entityType: 'department', entityId: d.id, description: `Thêm đơn vị ${d.code} - ${d.name}` });
    return d;
  }

  async update(id: number, dto: D.UpdateOrgDto, actor: Actor) {
    const d = await this.repo.findOne({ where: { id } });
    if (!d) throw new NotFoundException('Không tìm thấy đơn vị');
    if (dto.code && dto.code !== d.code && (await this.repo.findOne({ where: { code: dto.code } }))) {
      throw new ConflictException('Mã đơn vị đã tồn tại');
    }
    if (dto.parentId !== undefined) await this.assertParent(dto.parentId, id);
    Object.assign(d, dto);
    const saved = await this.repo.save(d);
    await this.audit.log(actor, { action: 'UPDATE', module: 'SYSTEM', entityType: 'department', entityId: id, metadata: dto });
    return saved;
  }

  /** Vô hiệu hóa đơn vị thì vô hiệu hóa luôn các đơn vị con */
  async setActive(id: number, isActive: boolean, actor: Actor) {
    const d = await this.repo.findOne({ where: { id } });
    if (!d) throw new NotFoundException('Không tìm thấy đơn vị');
    if (isActive && d.parentId) {
      const parent = await this.repo.findOne({ where: { id: d.parentId } });
      if (parent && !parent.isActive) throw new BadRequestException('Phải kích hoạt đơn vị cha trước');
    }
    const ids = [id];
    if (!isActive) {
      const all = await this.repo.find();
      const walk = (pid: number) => all.filter((x) => x.parentId === pid).forEach((c) => (ids.push(c.id), walk(c.id)));
      walk(id);
    }
    await this.repo.update({ id: In(ids) }, { isActive });
    await this.audit.log(actor, {
      action: 'STATUS_CHANGE',
      module: 'SYSTEM',
      entityType: 'department',
      entityId: id,
      description: `${isActive ? 'Kích hoạt' : 'Vô hiệu hóa'} đơn vị ${d.code}${ids.length > 1 ? ` và ${ids.length - 1} đơn vị con` : ''}`,
    });
    return { id, isActive, affected: ids };
  }

  async remove(id: number, actor: Actor) {
    const d = await this.repo.findOne({ where: { id } });
    if (!d) throw new NotFoundException('Không tìm thấy đơn vị');
    if (await this.repo.count({ where: { parentId: id } })) throw new ConflictException('Đơn vị còn đơn vị con, không thể xóa');
    if (await this.users.count({ where: { departmentId: id } })) throw new ConflictException('Đơn vị còn người dùng, hãy chuyển người dùng hoặc vô hiệu hóa đơn vị');
    await this.roleRequests.update({ departmentId: id }, { departmentId: null });
    await this.repo.delete(id);
    await this.audit.log(actor, { action: 'DELETE', module: 'SYSTEM', entityType: 'department', entityId: id, description: `Xóa đơn vị ${d.code}` });
    return { deleted: true };
  }
}

// ---------------------------------------------------------------------
// Vai trò & phân quyền
// ---------------------------------------------------------------------
@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role) private readonly repo: Repository<Role>,
    @InjectRepository(Permission) private readonly perms: Repository<Permission>,
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly cache: PermissionCache,
    private readonly audit: AuditService,
  ) {}

  async list(q: D.ListQueryDto & { isActive?: string }) {
    const qb = this.repo.createQueryBuilder('r').leftJoinAndSelect('r.permissions', 'p').orderBy('r.id', 'ASC');
    applySearch(qb, q.search, ['r.roleCode', 'r.roleName', 'r.description']);
    const active = toBool(q.isActive);
    if (active !== undefined) qb.andWhere('r.isActive = :a', { a: active });
    const roles = await qb.getMany();
    const counts = await this.users
      .createQueryBuilder('u')
      .innerJoin('u.roles', 'r')
      .select('r.id', 'id')
      .addSelect('COUNT(*)', 'n')
      .groupBy('r.id')
      .getRawMany<{ id: number; n: string }>();
    const m = new Map(counts.map((c) => [Number(c.id), Number(c.n)]));
    return roles.map((r) => ({
      ...r,
      permissions: (r.permissions ?? []).map((p) => p.permissionCode),
      userCount: m.get(r.id) ?? 0,
    }));
  }

  async get(id: number) {
    const r = await this.repo.findOne({ where: { id }, relations: { permissions: true } });
    if (!r) throw new NotFoundException('Không tìm thấy vai trò');
    const users = await this.users.createQueryBuilder('u').innerJoin('u.roles', 'r', 'r.id = :id', { id }).getMany();
    return { ...r, users: users.map(safeUser) };
  }

  async permissionCatalog() {
    const all = await this.perms.find({ order: { id: 'ASC' } });
    const groups: Record<string, Permission[]> = {};
    all.forEach((p) => (groups[p.module] ??= []).push(p));
    return groups;
  }

  private async resolvePerms(codes: string[] = []) {
    if (!codes.length) return [];
    const found = await this.perms.find({ where: { permissionCode: In(codes) } });
    const missing = codes.filter((c) => !found.some((p) => p.permissionCode === c));
    if (missing.length) throw new BadRequestException(`Mã quyền không tồn tại: ${missing.join(', ')}`);
    return found;
  }

  async create(dto: D.CreateRoleDto, actor: Actor) {
    // Kiểm tra trùng lặp trước khi thêm (mục 9.2.2)
    if (await this.repo.findOne({ where: { roleCode: dto.roleCode } })) throw new ConflictException('Mã vai trò đã tồn tại');
    if (await this.repo.findOne({ where: { roleName: dto.roleName } })) throw new ConflictException('Tên vai trò đã tồn tại');
    const r = await this.repo.save(
      this.repo.create({ ...dto, isSystem: false, isActive: true, permissions: await this.resolvePerms(dto.permissionCodes) }),
    );
    await this.audit.log(actor, { action: 'CREATE', module: 'SYSTEM', entityType: 'role', entityId: r.id, description: `Thêm vai trò ${r.roleCode}` });
    return this.get(r.id);
  }

  async update(id: number, dto: D.UpdateRoleDto, actor: Actor) {
    const r = await this.repo.findOne({ where: { id } });
    if (!r) throw new NotFoundException('Không tìm thấy vai trò');
    if (dto.roleName && dto.roleName !== r.roleName && (await this.repo.findOne({ where: { roleName: dto.roleName } }))) {
      throw new ConflictException('Tên vai trò đã tồn tại');
    }
    Object.assign(r, dto);
    await this.repo.save(r);
    await this.audit.log(actor, { action: 'UPDATE', module: 'SYSTEM', entityType: 'role', entityId: id, metadata: dto });
    return this.get(id);
  }

  async setPermissions(id: number, codes: string[], actor: Actor) {
    const r = await this.repo.findOne({ where: { id }, relations: { permissions: true } });
    if (!r) throw new NotFoundException('Không tìm thấy vai trò');
    if (r.roleCode === ROLE.ADMIN && !codes.includes('role.manage')) {
      throw new BadRequestException('Không thể bỏ quyền role.manage của vai trò ADMIN (tránh tự khóa hệ thống)');
    }
    const before = (r.permissions ?? []).map((p) => p.permissionCode);
    r.permissions = await this.resolvePerms(codes);
    await this.repo.save(r);
    this.cache.invalidate();
    await this.audit.log(actor, {
      action: 'PERMISSION_CHANGE',
      module: 'SYSTEM',
      entityType: 'role',
      entityId: id,
      description: `Cập nhật quyền vai trò ${r.roleCode}`,
      metadata: { before, after: codes },
    });
    return this.get(id);
  }

  async setActive(id: number, isActive: boolean, actor: Actor) {
    const r = await this.repo.findOne({ where: { id } });
    if (!r) throw new NotFoundException('Không tìm thấy vai trò');
    if (r.roleCode === ROLE.ADMIN && !isActive) throw new BadRequestException('Không thể vô hiệu hóa vai trò ADMIN');
    r.isActive = isActive;
    await this.repo.save(r);
    this.cache.invalidate();
    await this.audit.log(actor, { action: 'STATUS_CHANGE', module: 'SYSTEM', entityType: 'role', entityId: id, description: `${isActive ? 'Kích hoạt' : 'Vô hiệu hóa'} vai trò ${r.roleCode}` });
    return r;
  }

  async remove(id: number, actor: Actor) {
    const r = await this.repo.findOne({ where: { id } });
    if (!r) throw new NotFoundException('Không tìm thấy vai trò');
    if (r.isSystem) throw new ForbiddenException('Không được xóa vai trò hệ thống');
    const n = await this.users.createQueryBuilder('u').innerJoin('u.roles', 'r', 'r.id = :id', { id }).getCount();
    if (n) throw new ConflictException(`Vai trò đang được gán cho ${n} người dùng`);
    r.permissions = [];
    await this.repo.save(r);
    await this.repo.delete(id);
    this.cache.invalidate();
    await this.audit.log(actor, { action: 'DELETE', module: 'SYSTEM', entityType: 'role', entityId: id, description: `Xóa vai trò ${r.roleCode}` });
    return { deleted: true };
  }
}

// ---------------------------------------------------------------------
// Người dùng & tài khoản
// ---------------------------------------------------------------------
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly repo: Repository<User>,
    @InjectRepository(Role) private readonly roles: Repository<Role>,
    @InjectRepository(Department) private readonly depts: Repository<Department>,
    @InjectRepository(Facility) private readonly facilities: Repository<Facility>,
    @InjectRepository(AuditLog) private readonly logs: Repository<AuditLog>,
    private readonly audit: AuditService,
  ) {}

  async list(q: D.UserQueryDto) {
    const qb = this.repo
      .createQueryBuilder('u')
      .leftJoinAndSelect('u.roles', 'r')
      .leftJoinAndSelect('u.department', 'd')
      .orderBy('u.createdAt', 'DESC');
    applySearch(qb, q.search, ['u.email', 'u.username', 'u.fullName', 'u.phoneNumber']);
    if (q.status) qb.andWhere('u.status = :s', { s: q.status });
    if (q.accountType) qb.andWhere('u.accountType = :t', { t: q.accountType });
    if (q.departmentId) qb.andWhere('u.departmentId = :dep', { dep: q.departmentId });
    if (q.role) qb.andWhere('u.id IN (SELECT ur.user_id FROM user_roles ur JOIN roles rr ON rr.id = ur.role_id WHERE rr.role_code = :rc)', { rc: q.role });
    const res = await paginate(qb, q);
    return { ...res, data: res.data.map(safeUser) };
  }

  async get(id: string) {
    const u = await this.repo.findOne({ where: { id }, relations: { roles: true, department: true } });
    if (!u) throw new NotFoundException('Không tìm thấy người dùng');
    const facility = u.facilityId ? await this.facilities.findOne({ where: { id: u.facilityId } }) : null;
    return { ...safeUser(u), facility };
  }

  private async resolveRoles(codes: string[] = []) {
    if (!codes.length) return [];
    const found = await this.roles.find({ where: { roleCode: In(codes) } });
    const missing = codes.filter((c) => !found.some((r) => r.roleCode === c));
    if (missing.length) throw new BadRequestException(`Vai trò không tồn tại: ${missing.join(', ')}`);
    return found;
  }

  private async assertRefs(departmentId?: number | null, facilityId?: number | null) {
    if (departmentId) {
      const d = await this.depts.findOne({ where: { id: departmentId } });
      if (!d) throw new BadRequestException('Đơn vị không tồn tại');
      if (!d.isActive) throw new BadRequestException('Đơn vị đang bị vô hiệu hóa');
    }
    if (facilityId && !(await this.facilities.findOne({ where: { id: facilityId } }))) {
      throw new BadRequestException('Cơ sở KCB không tồn tại');
    }
  }

  async create(dto: D.CreateUserDto, actor: Actor) {
    const email = dto.email.trim().toLowerCase();
    if (await this.repo.findOne({ where: { email } })) throw new ConflictException('Email đã tồn tại');
    const username = dto.username || email.split('@')[0];
    if (await this.repo.findOne({ where: { username } })) throw new ConflictException('Tên đăng nhập đã tồn tại');
    await this.assertRefs(dto.departmentId, dto.facilityId);
    const password = dto.password || tempPassword();
    const u = await this.repo.save(
      this.repo.create({
        email,
        username,
        fullName: dto.fullName,
        phoneNumber: dto.phoneNumber,
        position: dto.position,
        departmentId: dto.departmentId ?? null,
        facilityId: dto.facilityId ?? null,
        passwordHash: await bcrypt.hash(password, 10),
        status: 'ACTIVE',
        accountType: dto.facilityId ? ACCOUNT_TYPE.FACILITY : ACCOUNT_TYPE.STAFF,
        createdBy: actor.userId,
        roles: await this.resolveRoles(dto.roleCodes),
      }),
    );
    await this.audit.log(actor, { action: 'CREATE', module: 'SYSTEM', entityType: 'user', entityId: u.id, description: `Tạo tài khoản ${email}`, metadata: { roles: dto.roleCodes } });
    return { user: await this.get(u.id), temporaryPassword: dto.password ? undefined : password };
  }

  async update(id: string, dto: D.UpdateUserDto, actor: Actor) {
    const u = await this.repo.findOne({ where: { id } });
    if (!u) throw new NotFoundException('Không tìm thấy người dùng');
    await this.assertRefs(dto.departmentId, dto.facilityId);
    Object.assign(u, dto);
    await this.repo.save(u);
    await this.audit.log(actor, { action: 'UPDATE', module: 'SYSTEM', entityType: 'user', entityId: id, metadata: dto });
    return this.get(id);
  }

  async setRoles(id: string, codes: string[], actor: Actor) {
    const u = await this.repo.findOne({ where: { id }, relations: { roles: true } });
    if (!u) throw new NotFoundException('Không tìm thấy người dùng');
    if (id === actor.userId && !codes.includes(ROLE.ADMIN) && actor.role === ROLE.ADMIN) {
      throw new BadRequestException('Không thể tự gỡ vai trò ADMIN của chính mình');
    }
    const before = (u.roles ?? []).map((r) => r.roleCode);
    u.roles = await this.resolveRoles(codes);
    if (u.accountType === ACCOUNT_TYPE.CITIZEN && codes.some((c) => c !== ROLE.CITIZEN)) u.accountType = ACCOUNT_TYPE.STAFF;
    await this.repo.save(u);
    await this.audit.log(actor, { action: 'ROLE_CHANGE', module: 'SYSTEM', entityType: 'user', entityId: id, description: `Đổi vai trò ${u.email}`, metadata: { before, after: codes } });
    return this.get(id);
  }

  async setStatus(id: string, status: 'ACTIVE' | 'LOCKED', actor: Actor) {
    if (id === actor.userId && status === 'LOCKED') throw new BadRequestException('Không thể tự khóa tài khoản của mình');
    const u = await this.repo.findOne({ where: { id } });
    if (!u) throw new NotFoundException('Không tìm thấy người dùng');
    u.status = status;
    if (status === 'LOCKED') u.refreshToken = null as any;
    await this.repo.save(u);
    await this.audit.log(actor, { action: status === 'LOCKED' ? 'LOCK' : 'UNLOCK', module: 'SYSTEM', entityType: 'user', entityId: id, description: `${status === 'LOCKED' ? 'Khóa' : 'Mở khóa'} tài khoản ${u.email}` });
    return { id, status };
  }

  async resetPassword(id: string, newPassword: string | undefined, actor: Actor) {
    const u = await this.repo.findOne({ where: { id } });
    if (!u) throw new NotFoundException('Không tìm thấy người dùng');
    const pwd = newPassword || tempPassword();
    await this.repo.update(id, { passwordHash: await bcrypt.hash(pwd, 10), refreshToken: null as any });
    await this.audit.log(actor, { action: 'RESET_PASSWORD', module: 'SYSTEM', entityType: 'user', entityId: id, description: `Đặt lại mật khẩu ${u.email}` });
    return { id, temporaryPassword: newPassword ? undefined : pwd, message: 'Đã đặt lại mật khẩu' };
  }

  async remove(id: string, actor: Actor) {
    if (id === actor.userId) throw new BadRequestException('Không thể xóa chính mình');
    const u = await this.repo.findOne({ where: { id }, relations: { roles: true } });
    if (!u) throw new NotFoundException('Không tìm thấy người dùng');
    try {
      await this.repo.manager.transaction(async (m) => {
        await m.query('DELETE FROM user_roles WHERE user_id = $1', [id]);
        await m.query('DELETE FROM notifications WHERE user_id = $1', [id]);
        await m.query('DELETE FROM role_requests WHERE user_id = $1', [id]);
        await m.delete(User, id);
      });
    } catch {
      throw new ConflictException('Người dùng đã phát sinh dữ liệu nghiệp vụ, chỉ có thể KHÓA tài khoản');
    }
    await this.audit.log(actor, { action: 'DELETE', module: 'SYSTEM', entityType: 'user', entityId: id, description: `Xóa tài khoản ${u.email}` });
    return { deleted: true };
  }

  loginHistory(id: string, q: D.ListQueryDto) {
    const qb = this.logs
      .createQueryBuilder('l')
      .where('l.userId = :id', { id })
      .andWhere("l.action IN ('LOGIN','LOGIN_FAILED','LOGOUT')")
      .orderBy('l.createdAt', 'DESC');
    return paginate(qb, q);
  }
}

// ---------------------------------------------------------------------
// Form xin cấp quyền cán bộ (email cơ quan)
// ---------------------------------------------------------------------
@Injectable()
export class RoleRequestsService {
  constructor(
    @InjectRepository(RoleRequest) private readonly repo: Repository<RoleRequest>,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Role) private readonly roles: Repository<Role>,
    @InjectRepository(Department) private readonly depts: Repository<Department>,
    private readonly audit: AuditService,
    private readonly notify: NotificationService,
    private readonly params: ParamsService,
  ) {}

  private async isOfficial(email: string) {
    const domain = email.split('@')[1]?.toLowerCase() ?? '';
    const list = (await this.params.str('OFFICIAL_EMAIL_DOMAINS', 'syt.com'))
      .split(',')
      .map((d) => d.trim().toLowerCase().replace(/^@/, ''))
      .filter(Boolean);
    return list.some((d) => domain === d || domain.endsWith('.' + d));
  }

  async create(dto: D.CreateRoleRequestDto, actor: Actor) {
    const user = await this.users.findOne({ where: { id: actor.userId }, relations: { roles: true } });
    if (!user) throw new NotFoundException('Tài khoản không tồn tại');
    if (user.accountType !== ACCOUNT_TYPE.OFFICIAL && !(await this.isOfficial(user.email))) {
      throw new ForbiddenException('Chỉ tài khoản đăng ký bằng email cơ quan mới được gửi form xin cấp quyền cán bộ');
    }
    if ((user.roles ?? []).some((r) => r.roleCode === dto.requestedRoleCode)) {
      throw new BadRequestException('Bạn đã có vai trò này');
    }
    if (await this.repo.findOne({ where: { userId: user.id, status: ROLE_REQUEST_STATUS.PENDING } })) {
      throw new ConflictException('Bạn đã có một form đang chờ duyệt');
    }
    if (dto.departmentId) {
      const d = await this.depts.findOne({ where: { id: dto.departmentId } });
      if (!d || !d.isActive) throw new BadRequestException('Đơn vị công tác không hợp lệ');
    }
    const r = await this.repo.save(this.repo.create({ ...dto, userId: user.id, status: ROLE_REQUEST_STATUS.PENDING }));
    await this.audit.log(actor, { action: 'CREATE', module: 'SYSTEM', entityType: 'role_request', entityId: r.id, description: `Gửi form xin vai trò ${dto.requestedRoleCode}` });
    // Gửi tới admin và các vai trò tương đương có quyền duyệt
    const reviewerRoles = await this.reviewerRoleCodes();
    await this.notify.toRoles(reviewerRoles, {
      title: 'Form xin cấp quyền cán bộ mới',
      message: `${user.fullName} (${user.email}) xin vai trò ${LABELS.role[dto.requestedRoleCode] ?? dto.requestedRoleCode}`,
      type: 'TASK',
      link: `/admin/role-requests/${r.id}`,
      entityType: 'role_request',
      entityId: r.id,
    });
    return r;
  }

  /** Các vai trò có quyền role_request.review */
  private async reviewerRoleCodes() {
    const rows = await this.roles
      .createQueryBuilder('r')
      .innerJoin('r.permissions', 'p', 'p.permissionCode = :c', { c: 'role_request.review' })
      .where('r.isActive = true')
      .getMany();
    return rows.map((r) => r.roleCode);
  }

  async attach(id: number, path: string, actor: Actor) {
    const r = await this.repo.findOne({ where: { id } });
    if (!r) throw new NotFoundException('Không tìm thấy form');
    if (r.userId !== actor.userId) throw new ForbiddenException('Không phải form của bạn');
    r.attachmentPath = path;
    return this.repo.save(r);
  }

  mine(actor: Actor) {
    return this.repo.find({ where: { userId: actor.userId }, relations: { department: true }, order: { createdAt: 'DESC' } });
  }

  async cancel(id: number, actor: Actor) {
    const r = await this.repo.findOne({ where: { id } });
    if (!r) throw new NotFoundException('Không tìm thấy form');
    if (r.userId !== actor.userId) throw new ForbiddenException('Không phải form của bạn');
    if (r.status !== ROLE_REQUEST_STATUS.PENDING) throw new BadRequestException('Chỉ hủy được form đang chờ duyệt');
    r.status = ROLE_REQUEST_STATUS.CANCELLED;
    return this.repo.save(r);
  }

  async list(q: D.RoleRequestQueryDto) {
    const qb = this.repo
      .createQueryBuilder('rr')
      .leftJoinAndSelect('rr.user', 'u')
      .leftJoinAndSelect('rr.department', 'd')
      .orderBy('rr.createdAt', 'DESC');
    if (q.status) qb.andWhere('rr.status = :s', { s: q.status });
    applySearch(qb, q.search, ['u.email', 'u.fullName', 'rr.staffCode', 'rr.position']);
    const res = await paginate(qb, q);
    return { ...res, data: res.data.map((r) => ({ ...r, user: safeUser(r.user) })) };
  }

  async get(id: number) {
    const r = await this.repo.findOne({ where: { id }, relations: { user: { roles: true }, department: true } });
    if (!r) throw new NotFoundException('Không tìm thấy form');
    // Kiểm tra sơ bộ (hỗ trợ người duyệt): đuôi email, đơn vị, form cũ
    const history = await this.repo.find({ where: { userId: r.userId }, order: { createdAt: 'DESC' } });
    return {
      ...r,
      user: safeUser(r.user),
      autoCheck: {
        officialEmail: r.user ? await this.isOfficial(r.user.email) : false,
        departmentActive: r.department ? r.department.isActive : null,
        previousRequests: history.filter((h) => h.id !== r.id).map((h) => ({ id: h.id, status: h.status, requestedRoleCode: h.requestedRoleCode })),
      },
    };
  }

  private assertCanReview(actor: Actor, roleCode: string) {
    // Lãnh đạo chỉ cấp được vai trò nghiệp vụ; vai trò ADMIN/MANAGER do ADMIN cấp
    if (actor.role !== ROLE.ADMIN && [ROLE.ADMIN, ROLE.MANAGER].includes(roleCode as any)) {
      throw new ForbiddenException('Chỉ Quản trị hệ thống mới được cấp vai trò này');
    }
  }

  async approve(id: number, dto: D.ApproveRoleRequestDto, actor: Actor) {
    const r = await this.repo.findOne({ where: { id } });
    if (!r) throw new NotFoundException('Không tìm thấy form');
    if (r.status !== ROLE_REQUEST_STATUS.PENDING) throw new BadRequestException('Form không ở trạng thái chờ duyệt');
    if (r.userId === actor.userId) throw new ForbiddenException('Không được tự duyệt form của mình');
    const roleCode = dto.roleCode || r.requestedRoleCode;
    this.assertCanReview(actor, roleCode);
    const role = await this.roles.findOne({ where: { roleCode } });
    if (!role || !role.isActive) throw new BadRequestException('Vai trò không tồn tại hoặc đang bị vô hiệu hóa');

    const user = await this.users.findOne({ where: { id: r.userId }, relations: { roles: true } });
    if (!user) throw new NotFoundException('Tài khoản người gửi không còn tồn tại');
    if (!(user.roles ?? []).some((x) => x.id === role.id)) user.roles = [...(user.roles ?? []), role];
    const departmentId = dto.departmentId ?? r.departmentId;
    if (departmentId) user.departmentId = departmentId;
    if (r.position) user.position = r.position;
    if (r.phone && !user.phoneNumber) user.phoneNumber = r.phone;
    await this.users.save(user);

    Object.assign(r, { status: ROLE_REQUEST_STATUS.APPROVED, reviewedBy: actor.userId, reviewNote: dto.note ?? null, reviewedAt: new Date() });
    await this.repo.save(r);
    await this.audit.log(actor, { action: 'APPROVE', module: 'SYSTEM', entityType: 'role_request', entityId: id, description: `Cấp vai trò ${roleCode} cho ${user.email}` });
    await this.notify.toUsers([user.id], {
      title: 'Form xin cấp quyền đã được duyệt',
      message: `Bạn đã được cấp vai trò ${LABELS.role[roleCode] ?? roleCode}. Đăng nhập lại và chọn vai trò này.`,
      type: 'INFO',
      entityType: 'role_request',
      entityId: id,
    });
    return { request: r, user: safeUser(user) };
  }

  async reject(id: number, note: string, actor: Actor) {
    const r = await this.repo.findOne({ where: { id }, relations: { user: true } });
    if (!r) throw new NotFoundException('Không tìm thấy form');
    if (r.status !== ROLE_REQUEST_STATUS.PENDING) throw new BadRequestException('Form không ở trạng thái chờ duyệt');
    this.assertCanReview(actor, r.requestedRoleCode);
    Object.assign(r, { status: ROLE_REQUEST_STATUS.REJECTED, reviewedBy: actor.userId, reviewNote: note, reviewedAt: new Date() });
    await this.repo.save(r);
    await this.audit.log(actor, { action: 'REJECT', module: 'SYSTEM', entityType: 'role_request', entityId: id, description: `Từ chối form của ${r.user?.email}: ${note}` });
    await this.notify.toUsers([r.userId], { title: 'Form xin cấp quyền bị từ chối', message: note, type: 'WARNING', entityType: 'role_request', entityId: id });
    return { ...r, user: safeUser(r.user) };
  }
}

// ---------------------------------------------------------------------
// Nhật ký, tham số, thông báo
// ---------------------------------------------------------------------
@Injectable()
export class AdminMiscService {
  constructor(
    @InjectRepository(AuditLog) private readonly logs: Repository<AuditLog>,
    @InjectRepository(SystemParameter) private readonly paramsRepo: Repository<SystemParameter>,
    @InjectRepository(Notification) private readonly notis: Repository<Notification>,
    private readonly params: ParamsService,
    private readonly audit: AuditService,
  ) {}

  auditQuery(q: D.AuditQueryDto) {
    const qb = this.logs.createQueryBuilder('l').orderBy('l.createdAt', 'DESC');
    if (q.userId) qb.andWhere('l.userId = :u', { u: q.userId });
    if (q.action) qb.andWhere('l.action = :a', { a: q.action });
    if (q.module) qb.andWhere('l.module = :m', { m: q.module });
    if (q.entityType) qb.andWhere('l.entityType = :et', { et: q.entityType });
    if (q.entityId) qb.andWhere('l.entityId = :ei', { ei: q.entityId });
    if (q.from) qb.andWhere('l.createdAt >= :f', { f: q.from });
    if (q.to) qb.andWhere("l.createdAt < (:t::date + interval '1 day')", { t: q.to });
    applySearch(qb, q.search, ['l.userEmail', 'l.description', 'l.action']);
    return qb;
  }

  listAudit(q: D.AuditQueryDto) {
    return paginate(this.auditQuery(q), q);
  }

  async auditStats() {
    const byAction = await this.logs.createQueryBuilder('l').select('l.action', 'action').addSelect('COUNT(*)::int', 'count').groupBy('l.action').orderBy('count', 'DESC').getRawMany();
    const byModule = await this.logs.createQueryBuilder('l').select('l.module', 'module').addSelect('COUNT(*)::int', 'count').groupBy('l.module').getRawMany();
    return { byAction, byModule };
  }

  listParams(group?: string) {
    return this.paramsRepo.find({ where: group ? { paramGroup: group } : {}, order: { paramGroup: 'ASC', paramKey: 'ASC' } });
  }

  private validateValue(type: string, value: string) {
    if (type === 'NUMBER' && !Number.isFinite(Number(value))) throw new BadRequestException('Giá trị phải là số');
    if (type === 'BOOLEAN' && !['true', 'false'].includes(value)) throw new BadRequestException('Giá trị phải là true hoặc false');
    if (type === 'JSON') {
      try {
        JSON.parse(value);
      } catch {
        throw new BadRequestException('Giá trị phải là JSON hợp lệ');
      }
    }
  }

  async createParam(dto: D.CreateParamDto, actor: Actor) {
    if (await this.paramsRepo.findOne({ where: { paramKey: dto.paramKey } })) throw new ConflictException('Khóa tham số đã tồn tại');
    this.validateValue(dto.valueType ?? 'STRING', dto.paramValue);
    const p = await this.paramsRepo.save(this.paramsRepo.create({ ...dto, updatedBy: actor.userId }));
    this.params.invalidate();
    await this.audit.log(actor, { action: 'CREATE', module: 'SYSTEM', entityType: 'parameter', entityId: p.paramKey });
    return p;
  }

  async updateParam(key: string, dto: D.UpdateParamDto, actor: Actor) {
    const p = await this.paramsRepo.findOne({ where: { paramKey: key } });
    if (!p) throw new NotFoundException('Không tìm thấy tham số');
    if (!p.isEditable) throw new ForbiddenException('Tham số này không cho phép sửa');
    this.validateValue(p.valueType, dto.paramValue);
    const before = p.paramValue;
    p.paramValue = dto.paramValue;
    if (dto.description !== undefined) p.description = dto.description;
    p.updatedBy = actor.userId;
    await this.paramsRepo.save(p);
    this.params.invalidate();
    await this.audit.log(actor, { action: 'UPDATE', module: 'SYSTEM', entityType: 'parameter', entityId: key, metadata: { before, after: dto.paramValue } });
    return p;
  }

  async deleteParam(key: string, actor: Actor) {
    const p = await this.paramsRepo.findOne({ where: { paramKey: key } });
    if (!p) throw new NotFoundException('Không tìm thấy tham số');
    if (!p.isEditable) throw new ForbiddenException('Tham số này không cho phép xóa');
    await this.paramsRepo.delete(p.id);
    this.params.invalidate();
    await this.audit.log(actor, { action: 'DELETE', module: 'SYSTEM', entityType: 'parameter', entityId: key });
    return { deleted: true };
  }

  myNotifications(actor: Actor, q: D.NotificationQueryDto) {
    const qb = this.notis.createQueryBuilder('n').where('n.userId = :u', { u: actor.userId }).orderBy('n.createdAt', 'DESC');
    if (toBool(q.unreadOnly)) qb.andWhere('n.isRead = false');
    applySearch(qb, q.search, ['n.title', 'n.message']);
    return paginate(qb, q);
  }

  async unreadCount(actor: Actor) {
    return { unread: await this.notis.count({ where: { userId: actor.userId, isRead: false } }) };
  }

  async markRead(id: string, actor: Actor) {
    const n = await this.notis.findOne({ where: { id, userId: actor.userId } });
    if (!n) throw new NotFoundException('Không tìm thấy thông báo');
    n.isRead = true;
    n.readAt = new Date();
    return this.notis.save(n);
  }

  async markAllRead(actor: Actor) {
    const r = await this.notis.update({ userId: actor.userId, isRead: false }, { isRead: true, readAt: new Date() });
    return { updated: r.affected ?? 0 };
  }
}
