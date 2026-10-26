import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LocalStrategy } from './strategy/local.strategy';
// import { GoogleStrategy } from './strategy/google.strategy';
// import { GithubStrategy } from './strategy/github.strategy';

@Module({
  imports: [PassportModule],
  controllers: [AuthController],
  providers: [AuthService, LocalStrategy],
  exports: [AuthService],
})
export class AuthModule {}
