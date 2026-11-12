import { Body, Controller, Get, HttpCode, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { ChangePasswordDto, RegisterDto } from './dto/register.dto';
import { LoginDto, RefreshDto } from './dto/login.dto';
import { LocalAuthGuard } from './guards/local.guard';
import { GoogleAuthGuard } from './guards/google.guard';
import { User } from '../entities';
import { Actor, CurrentUser, Public } from '../common/auth';
import { ThrottlerGuard, Throttle } from '@nestjs/throttler';

@ApiTags('0. Đăng nhập / Đăng ký')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

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
  @UseGuards(ThrottlerGuard, LocalAuthGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiBody({ type: LoginDto })
  @ApiOperation({
    summary: 'Đăng nhập',
    description:
      'Trả accessToken và tự động phân quyền theo tài khoản (giới hạn 5 lần/phút).',
  })
  login(@Req() req: { user: User; body: LoginDto; ip?: string; headers: any }) {
    return this.authService.login(req.user, req.body, { ip: req.ip, userAgent: req.headers?.['user-agent'] });
  }

  @Public()
  @Get('google')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Đăng nhập bằng Google OAuth 2.0' })
  googleAuth() {
    // Guard tự chuyển hướng sang Google
  }

  @Public()
  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Callback xử lý xác thực từ Google OAuth 2.0' })
  async googleAuthRedirect(@Req() req: { user: User; ip?: string; headers: any }, @Res() res: Response) {
    const user = req.user;
    const loginResult = await this.authService.login(user, {}, { ip: req.ip, userAgent: req.headers?.['user-agent'] });
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    
    // Chuyển hướng về frontend kèm token dạng query params hoặc lưu trữ phù hợp
    const redirectUrl = loginResult.role
      ? `${frontendUrl}/login?token=${loginResult.accessToken}&role=${loginResult.role}`
      : `${frontendUrl}/role-request?token=${loginResult.accessToken}`;
    
    return res.redirect(redirectUrl);
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
