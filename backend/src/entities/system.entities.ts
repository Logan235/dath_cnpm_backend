// =====================================================================
// MODULE QUẢN TRỊ HỆ THỐNG — cơ cấu tổ chức, vai trò, quyền, người dùng,
// form xin cấp quyền, nhật ký hoạt động, tham số hệ thống, thông báo
// =====================================================================
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
  ManyToOne,
  OneToMany,
  JoinTable,
  JoinColumn,
} from 'typeorm';

/** Cơ cấu tổ chức (đơn vị / phòng ban), phân cấp cha - con */
@Entity('departments')
export class Department {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 50, unique: true })
  code!: string;

  @Column({ length: 255 })
  name!: string;

  @Column({ name: 'parent_id', type: 'int', nullable: true })
  parentId?: number | null;

  @ManyToOne(() => Department, (d) => d.children, { nullable: true })
  @JoinColumn({ name: 'parent_id' })
  parent?: Department | null;

  @OneToMany(() => Department, (d) => d.parent)
  children?: Department[];

  /** SO_Y_TE | PHONG_BAN | QUAN_HUYEN | BENH_VIEN | CO_QUAN_PHOI_HOP | KHAC */
  @Column({ name: 'org_type', length: 50, default: 'PHONG_BAN' })
  orgType!: string;

  @Column({ length: 20, nullable: true })
  phone?: string;

  @Column({ length: 500, nullable: true })
  address?: string;

  @Column({ type: 'text', nullable: true })
  note?: string;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;
}

@Entity('permissions')
export class Permission {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'permission_code', length: 100, unique: true })
  permissionCode!: string;

  @Column({ name: 'permission_name', length: 255 })
  permissionName!: string;

  /** SYSTEM | INFO_SOURCE | AD_PROCESSING | VIOLATION */
  @Column({ length: 50 })
  module!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;
}

@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'role_code', unique: true, length: 50 })
  roleCode!: string;

  @Column({ name: 'role_name', length: 255 })
  roleName!: string;

  @Column({ length: 500, nullable: true })
  description?: string;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  /** Vai trò hệ thống (6 vai trò gốc) không được xoá */
  @Column({ name: 'is_system', default: false })
  isSystem!: boolean;

  @ManyToMany(() => Permission)
  @JoinTable({
    name: 'role_permissions',
    joinColumn: { name: 'role_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'permission_id', referencedColumnName: 'id' },
  })
  permissions?: Permission[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ unique: true, length: 100 })
  username!: string;

  @Column({ name: 'password_hash', length: 255 })
  passwordHash!: string;

  @Column({ unique: true, length: 255 })
  email!: string;

  @Column({ name: 'full_name', length: 255 })
  fullName!: string;

  @Column({ name: 'phone_number', length: 20, nullable: true })
  phoneNumber?: string;

  /** ACTIVE | LOCKED */
  @Column({ length: 20, default: 'ACTIVE' })
  status!: string;

  /** CITIZEN | OFFICIAL | FACILITY | STAFF */
  @Column({ name: 'account_type', length: 20, default: 'CITIZEN' })
  accountType!: string;

  @Column({ length: 255, nullable: true })
  position?: string;

  @Column({ name: 'last_login_at', type: 'timestamp', nullable: true })
  lastLoginAt?: Date;

  @Column({ name: 'created_by', type: 'bigint', nullable: true })
  createdBy?: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;

  @Column({ name: 'department_id', type: 'int', nullable: true })
  departmentId?: number | null;

  @ManyToOne(() => Department, { nullable: true })
  @JoinColumn({ name: 'department_id' })
  department?: Department | null;

  @Column({ name: 'facility_id', type: 'int', nullable: true })
  facilityId?: number | null;

  @Column({ name: 'refresh_token', length: 500, nullable: true, select: true })
  refreshToken?: string;

  @ManyToMany(() => Role)
  @JoinTable({
    name: 'user_roles',
    joinColumn: { name: 'user_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'role_id', referencedColumnName: 'id' },
  })
  roles?: Role[];
}

/** Form xin cấp quyền cán bộ (email cơ quan gửi lên, admin/lãnh đạo duyệt) */
@Entity('role_requests')
export class RoleRequest {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'user_id', type: 'bigint' })
  userId!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Column({ name: 'requested_role_code', length: 50 })
  requestedRoleCode!: string;

  @Column({ name: 'department_id', type: 'int', nullable: true })
  departmentId?: number | null;

  @ManyToOne(() => Department, { nullable: true })
  @JoinColumn({ name: 'department_id' })
  department?: Department | null;

  @Column({ length: 255, nullable: true })
  position?: string;

  @Column({ name: 'staff_code', length: 100, nullable: true })
  staffCode?: string;

  @Column({ length: 20, nullable: true })
  phone?: string;

  @Column({ type: 'text', nullable: true })
  reason?: string;

  @Column({ name: 'attachment_path', length: 500, nullable: true })
  attachmentPath?: string;

  /** PENDING | APPROVED | REJECTED | CANCELLED */
  @Column({ length: 20, default: 'PENDING' })
  status!: string;

  @Column({ name: 'reviewed_by', type: 'bigint', nullable: true })
  reviewedBy?: string | null;

  @Column({ name: 'review_note', type: 'text', nullable: true })
  reviewNote?: string | null;

  @Column({ name: 'reviewed_at', type: 'timestamp', nullable: true })
  reviewedAt?: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;
}

/** Nhật ký hoạt động (audit trail) */
@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ name: 'user_id', type: 'bigint', nullable: true })
  userId?: string | null;

  @Column({ name: 'user_email', length: 255, nullable: true })
  userEmail?: string | null;

  @Column({ length: 50, nullable: true })
  role?: string | null;

  /** LOGIN | CREATE | UPDATE | DELETE | STATUS_CHANGE | APPROVE | REJECT | TRANSFER | EXPORT | IMPORT | REVIEW ... */
  @Column({ length: 50 })
  action!: string;

  @Column({ length: 50 })
  module!: string;

  @Column({ name: 'entity_type', length: 100, nullable: true })
  entityType?: string | null;

  @Column({ name: 'entity_id', length: 100, nullable: true })
  entityId?: string | null;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ name: 'ip_address', length: 100, nullable: true })
  ipAddress?: string | null;

  @Column({ name: 'user_agent', length: 500, nullable: true })
  userAgent?: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: any;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;
}

/** Tham số hệ thống (ngưỡng AI, ngưỡng rủi ro, ngưỡng phê duyệt...) */
@Entity('system_parameters')
export class SystemParameter {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'param_key', length: 100, unique: true })
  paramKey!: string;

  @Column({ name: 'param_value', type: 'text', nullable: true })
  paramValue?: string | null;

  /** STRING | NUMBER | BOOLEAN | JSON */
  @Column({ name: 'value_type', length: 20, default: 'STRING' })
  valueType!: string;

  @Column({ name: 'param_group', length: 50, nullable: true })
  paramGroup?: string;

  @Column({ length: 500, nullable: true })
  description?: string;

  @Column({ name: 'is_editable', default: true })
  isEditable!: boolean;

  @Column({ name: 'updated_by', type: 'bigint', nullable: true })
  updatedBy?: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;
}

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ name: 'user_id', type: 'bigint' })
  userId!: string;

  @Column({ length: 255 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  message?: string;

  /** INFO | WARNING | ALERT | TASK */
  @Column({ length: 50, default: 'INFO' })
  type!: string;

  @Column({ length: 500, nullable: true })
  link?: string;

  @Column({ name: 'entity_type', length: 100, nullable: true })
  entityType?: string;

  @Column({ name: 'entity_id', length: 100, nullable: true })
  entityId?: string;

  @Column({ name: 'is_read', default: false })
  isRead!: boolean;

  @Column({ name: 'read_at', type: 'timestamp', nullable: true })
  readAt?: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;
}
