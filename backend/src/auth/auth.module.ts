import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LocalStrategy } from './strategy/local.strategy';
import { GoogleStrategy } from './strategy/google.strategy';

@Module({
  imports: [
    PassportModule,
    // Rate limiting: 5 requests per 60 seconds per IP for login endpoint
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 5 }]),
  ],
  controllers: [AuthController],
  providers: [AuthService, LocalStrategy, GoogleStrategy],
  exports: [AuthService],
})
export class AuthModule {}
