import { Body, Controller, Get, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { ChangePasswordDto, RegisterDto } from './dto/register.dto';
import { LoginDto, RefreshDto } from './dto/login.dto';
import { LocalAuthGuard } from './guards/local.guard';
import { User } from '../entities';
import { Actor, CurrentUser, Public } from '../common/auth';

@ApiTags('0. Đăng nhập / Đăng ký')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Đăng ký tài khoản',
    description:
      'Email thường -> Người dân (vai trò CITIZEN). Email cơ quan (đuôi trong tham số OFFICIAL_EMAIL_DOMAINS, mặc định syt.com, syt.gov.vn, ca.gov.vn) -> tài khoản cán bộ chưa có vai trò, cần gửi form POST /role-requests.',
  })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  @UseGuards(LocalAuthGuard)
  @ApiBody({ type: LoginDto })
  @ApiOperation({
    summary: 'Đăng nhập (chọn vai trò)',
    description:
      'Trả accessToken: bấm nút "Authorize" ở đầu trang Swagger, dán token để gọi các API khác. Chọn vai trò không có trong tài khoản -> 403 ROLE_NOT_GRANTED.',
  })
  login(@Req() req: { user: User; body: LoginDto; ip?: string; headers: any }) {
    return this.authService.login(req.user, req.body, { ip: req.ip, userAgent: req.headers?.['user-agent'] });
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({ summary: 'Cấp lại access token bằng refresh token' })
  refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto.refreshToken, dto.role);
  }

  @Get('me')
  @ApiOperation({ summary: 'Thông tin phiên đăng nhập hiện tại (vai trò, quyền, form xin quyền gần nhất)' })
  me(@CurrentUser() actor: Actor) {
    return this.authService.getProfile(actor);
  }

  @Post('logout')
  @HttpCode(200)
  @ApiOperation({ summary: 'Đăng xuất (thu hồi refresh token)' })
  logout(@CurrentUser() actor: Actor) {
    return this.authService.logout(actor);
  }

  @Post('change-password')
  @HttpCode(200)
  @ApiOperation({ summary: 'Đổi mật khẩu' })
  changePassword(@CurrentUser() actor: Actor, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(actor, dto);
  }
}
