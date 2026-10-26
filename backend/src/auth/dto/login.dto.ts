import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class LoginDto {
  /** Email đăng nhập */
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email!: string;

  @IsString()
  @IsNotEmpty({ message: 'Vui lòng nhập mật khẩu' })
  password!: string;

  /**
   * Vai trò chọn ở màn hình đăng nhập: ADMIN | SPECIALIST | MANAGER | CYBER_POLICE | FACILITY | CITIZEN.
   * Bỏ trống: hệ thống tự chọn nếu tài khoản chỉ có 1 vai trò.
   */
  @IsOptional()
  @IsString()
  role?: string;
}

export class RefreshDto {
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;

  /** Vai trò muốn giữ trong access token mới (mặc định: vai trò cũ) */
  @IsOptional()
  @IsString()
  role?: string;
}
