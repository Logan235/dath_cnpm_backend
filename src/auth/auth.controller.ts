import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  Request,
  UseGuards,
  Redirect,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LocalAuthGuard } from './guards/local.guard';
// import { GoogleAuthGuard } from './guards/google.guard';
// import { GithubAuthGuard } from './guards/github.guard';
import { User } from '../users/entities/user.entity';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(200)
  async register(@Body() registerDto: RegisterDto) {
    return await this.authService.register(registerDto);
  }

  @Post('login')
  @HttpCode(200)
  @UseGuards(LocalAuthGuard)
  async login(@Request() req: { user: User }) {
    return {
      message: 'Login successfully',
      user: req.user,
      ...(await this.authService.login(req.user)),
    };
  }

  // OAuth routes temporarily disabled - uncomment when OAuth credentials are configured
  /*
  @Get('google/login')
  @UseGuards(GoogleAuthGuard)
  googleLogin() {
    return {
      message: 'Redirecting to Google for authentication',
    };
  }

  @Get('google/redirect')
  @UseGuards(GoogleAuthGuard)
  @Redirect()
  async googleRedirect(@Request() req: any) {
    const authToken = await this.authService.login(req.user);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const redirectUrl = new URL('/oauth/callback', frontendUrl);

    redirectUrl.searchParams.set('accessToken', authToken.accessToken);
    redirectUrl.searchParams.set('refreshToken', authToken.refreshToken);

    const userPayload = { ...req.user };
    delete (userPayload as any).passwordHash;
    redirectUrl.searchParams.set(
      'user',
      encodeURIComponent(JSON.stringify(userPayload)),
    );

    return {
      statusCode: 302,
      url: redirectUrl.toString(),
    };
  }

  @Get('github/login')
  @UseGuards(GithubAuthGuard)
  githubLogin() {
    return {
      message: 'Redirecting to GitHub for authentication',
    };
  }

  @Get('github/redirect')
  @UseGuards(GithubAuthGuard)
  @Redirect()
  async githubRedirect(@Request() req: { user: User }) {
    const authToken = await this.authService.login(req.user);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    const redirectUrl = new URL('/oauth/callback', frontendUrl);
    redirectUrl.searchParams.set('accessToken', authToken.accessToken);
    redirectUrl.searchParams.set('refreshToken', authToken.refreshToken);
    
    const userPayload = { ...req.user };
    delete (userPayload as any).passwordHash;
    redirectUrl.searchParams.set(
      'user',
      encodeURIComponent(JSON.stringify(userPayload)),
    );

    return {
      statusCode: 302,
      url: redirectUrl.toString(),
    };
  }
  */
}

