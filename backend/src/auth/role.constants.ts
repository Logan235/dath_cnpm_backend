// Giữ lại để tương thích code cũ — nguồn chuẩn nằm ở src/common/constants.ts
import { ROLE } from '../common/constants';

export const ROLE_CODES = ROLE;
export type { RoleCode } from '../common/constants';
export const ALL_ROLE_CODES: string[] = Object.values(ROLE);
// Đăng ký bằng email thường -> CITIZEN. Email cơ quan -> chưa có vai trò, phải gửi form xin cấp quyền.
export const DEFAULT_REGISTER_ROLE = ROLE.CITIZEN;
