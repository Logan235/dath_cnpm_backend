import { IsEmail, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  /** Email thường (gmail...) -> Người dân. Email cơ quan (VD ...@syt.com) -> Cán bộ, cần gửi form xin cấp quyền */
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email!: string;

  /** Tối thiểu 8 ký tự, có chữ hoa, chữ thường, số và ký tự đặc biệt (@$.!%*?&) */
  @MinLength(8, { message: 'Mật khẩu tối thiểu 8 ký tự' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$.!%*?&])[A-Za-z\d@$.!%*?&]{8,}$/, {
    message: 'Mật khẩu phải có chữ hoa, chữ thường, số và ký tự đặc biệt (@$.!%*?&)',
  })
  password!: string;

  /** Họ và tên */
  @IsOptional()
  @IsString()
  @MaxLength(255)
  fullName?: string;

  /** (giữ tương thích bản cũ) */
  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phoneNumber?: string;
}

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  currentPassword!: string;

  @MinLength(8, { message: 'Mật khẩu tối thiểu 8 ký tự' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$.!%*?&])[A-Za-z\d@$.!%*?&]{8,}$/, {
    message: 'Mật khẩu phải có chữ hoa, chữ thường, số và ký tự đặc biệt (@$.!%*?&)',
  })
  newPassword!: string;
}
