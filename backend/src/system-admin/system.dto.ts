import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class ListQueryDto {
  /** Trang (bắt đầu từ 1) */
  @IsOptional()
  @IsInt()
  page?: number;

  /** Số dòng mỗi trang (tối đa 200) */
  @IsOptional()
  @IsInt()
  pageSize?: number;

  /** Từ khóa tìm kiếm */
  @IsOptional()
  @IsString()
  search?: string;
}

// ---------------- Cơ cấu tổ chức ----------------
export const ORG_TYPES = ['SO_Y_TE', 'PHONG_BAN', 'QUAN_HUYEN', 'BENH_VIEN', 'CO_QUAN_PHOI_HOP', 'KHAC'];

export class OrgQueryDto extends ListQueryDto {
  /** true | false */
  @IsOptional()
  @IsString()
  isActive?: string;

  @IsOptional()
  @IsInt()
  parentId?: number;
}

export class CreateOrgDto {
  /** Mã đơn vị — duy nhất toàn hệ thống */
  @IsString()
  @IsNotEmpty({ message: 'Mã đơn vị là bắt buộc' })
  @MaxLength(50)
  code!: string;

  @IsString()
  @IsNotEmpty({ message: 'Tên đơn vị là bắt buộc' })
  @MaxLength(255)
  name!: string;

  /** Đơn vị cha (để trống nếu là cấp cao nhất) */
  @IsOptional()
  @IsInt()
  parentId?: number | null;

  /** SO_Y_TE | PHONG_BAN | QUAN_HUYEN | BENH_VIEN | CO_QUAN_PHOI_HOP | KHAC */
  @IsOptional()
  @IsIn(ORG_TYPES)
  orgType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @IsOptional()
  @IsString()
  note?: string;
}

export class UpdateOrgDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsInt()
  parentId?: number | null;

  @IsOptional()
  @IsIn(ORG_TYPES)
  orgType?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  note?: string;
}

export class SetActiveDto {
  @IsBoolean()
  isActive!: boolean;
}

// ---------------- Vai trò ----------------
export class CreateRoleDto {
  /** Mã vai trò, VD: INSPECTOR (chữ in hoa, số, gạch dưới) */
  @IsString()
  @Matches(/^[A-Z][A-Z0-9_]{1,49}$/, { message: 'Mã vai trò chỉ gồm chữ IN HOA, số, gạch dưới' })
  roleCode!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  roleName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  /** Danh sách mã quyền, VD ["violation.view","statistics.view"] */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissionCodes?: string[];
}

export class UpdateRoleDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  roleName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

export class SetPermissionsDto {
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  permissionCodes!: string[];
}

// ---------------- Người dùng ----------------
export class UserQueryDto extends ListQueryDto {
  /** ACTIVE | LOCKED */
  @IsOptional()
  @IsString()
  status?: string;

  /** Mã vai trò */
  @IsOptional()
  @IsString()
  role?: string;

  /** CITIZEN | OFFICIAL | FACILITY | STAFF */
  @IsOptional()
  @IsString()
  accountType?: string;

  @IsOptional()
  @IsInt()
  departmentId?: number;
}

export class CreateUserDto {
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  fullName!: string;

  /** Bỏ trống: lấy phần trước @ của email */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  username?: string;

  /** Bỏ trống: hệ thống sinh mật khẩu tạm và trả về 1 lần */
  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  position?: string;

  @IsOptional()
  @IsInt()
  departmentId?: number | null;

  @IsOptional()
  @IsInt()
  facilityId?: number | null;

  /** VD ["SPECIALIST"] */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  roleCodes?: string[];
}

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  fullName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  position?: string;

  @IsOptional()
  @IsInt()
  departmentId?: number | null;

  @IsOptional()
  @IsInt()
  facilityId?: number | null;
}

export class SetRolesDto {
  @IsArray()
  @IsString({ each: true })
  roleCodes!: string[];
}

export class ResetPasswordDto {
  /** Bỏ trống: sinh mật khẩu tạm */
  @IsOptional()
  @IsString()
  @MinLength(8)
  newPassword?: string;
}

// ---------------- Form xin cấp quyền ----------------
export class CreateRoleRequestDto {
  /** SPECIALIST | MANAGER | CYBER_POLICE */
  @IsIn(['SPECIALIST', 'MANAGER', 'CYBER_POLICE'], { message: 'Chỉ được xin vai trò SPECIALIST, MANAGER hoặc CYBER_POLICE' })
  requestedRoleCode!: string;

  /** Đơn vị công tác (lấy danh sách ở GET /organizations/options) */
  @IsOptional()
  @IsInt()
  departmentId?: number;

  /** Chức vụ */
  @IsOptional()
  @IsString()
  @MaxLength(255)
  position?: string;

  /** Mã số cán bộ / số thẻ công chức */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  staffCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  /** Lý do / nhiệm vụ được phân công */
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng nêu lý do xin cấp quyền' })
  reason!: string;
}

export class RoleRequestQueryDto extends ListQueryDto {
  /** PENDING | APPROVED | REJECTED | CANCELLED */
  @IsOptional()
  @IsString()
  status?: string;
}

export class ApproveRoleRequestDto {
  /** Có thể cấp vai trò khác với vai trò xin (VD xin MANAGER nhưng cấp SPECIALIST) */
  @IsOptional()
  @IsString()
  roleCode?: string;

  @IsOptional()
  @IsInt()
  departmentId?: number;

  @IsOptional()
  @IsString()
  note?: string;
}

export class RejectDto {
  /** Lý do (bắt buộc) */
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng nhập lý do' })
  note!: string;
}

// ---------------- Nhật ký / tham số ----------------
export class AuditQueryDto extends ListQueryDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  action?: string;

  @IsOptional()
  @IsString()
  module?: string;

  @IsOptional()
  @IsString()
  entityType?: string;

  @IsOptional()
  @IsString()
  entityId?: string;

  /** yyyy-mm-dd */
  @IsOptional()
  @IsString()
  from?: string;

  /** yyyy-mm-dd */
  @IsOptional()
  @IsString()
  to?: string;
}

export class CreateParamDto {
  @IsString()
  @Matches(/^[A-Z][A-Z0-9_]{1,99}$/, { message: 'Khóa tham số gồm chữ IN HOA, số, gạch dưới' })
  paramKey!: string;

  @IsString()
  paramValue!: string;

  /** STRING | NUMBER | BOOLEAN | JSON */
  @IsOptional()
  @IsIn(['STRING', 'NUMBER', 'BOOLEAN', 'JSON'])
  valueType?: string;

  @IsOptional()
  @IsString()
  paramGroup?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateParamDto {
  @IsString()
  paramValue!: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class NotificationQueryDto extends ListQueryDto {
  /** true: chỉ thông báo chưa đọc */
  @IsOptional()
  @IsString()
  unreadOnly?: string;
}
