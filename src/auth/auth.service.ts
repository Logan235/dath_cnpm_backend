import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async register(registerDto: RegisterDto) {
    const { email, password, displayName } = registerDto as any;
    const username = email.split('@')[0];

    const existingUser = await this.userRepository.findOne({
      where: [{ email }, { username }],
    });

    if (existingUser) {
      throw new ConflictException({
        message: 'User with this email or username already exists',
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const autoFullName = displayName || username;

    const newUser = this.userRepository.create({
      id: String(Date.now()),
      username,
      email,
      passwordHash: hashedPassword,
      fullName: autoFullName,
      status: 'ACTIVE',
    });

    const savedUser = await this.userRepository.save(newUser);
    const result: Partial<User> = { ...savedUser };
    delete result.passwordHash;
    delete result.refreshToken;

    return result;
  }

  async validateUser(loginDto: LoginDto): Promise<Partial<User>> {
    const { email, password } = loginDto;
    const user = await this.userRepository.findOne({ where: { email } });

    if (!user) {
      throw new UnauthorizedException('User with this email not found');
    }

    if (!user.passwordHash) {
      throw new UnauthorizedException(
        'Invalid password or user signed up using an external provider',
      );
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const result: Partial<User> = { ...user };
    delete result.passwordHash;
    return result;
  }

  async login(user: User) {
    const payload = {
      email: user.email,
      sub: String(user.id),
      userId: String(user.id),
    };

    const refreshTokenPayload = {
      subject: String(user.id),
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      expiresIn: (this.configService.get<string>('expiresIn') ||
        '1h') as JwtSignOptions['expiresIn'],
    });

    const refreshToken = await this.jwtService.signAsync(refreshTokenPayload, {
      expiresIn: (this.configService.get<string>('expiresIn1') ||
        '7d') as JwtSignOptions['expiresIn'],
    });

    const tokenHash = await bcrypt.hash(refreshToken, 10);

    await this.userRepository.update(user.id, {
      refreshToken: tokenHash,
      lastLoginAt: new Date(),
    });

    return {
      accessToken,
      refreshToken,
    };
  }

  async validateGoogleUser(
    email: string,
    displayName: string,
    providerId: string,
  ): Promise<User> {
    let user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      const username = email.split('@')[0];
      const newUser = this.userRepository.create({
        id: String(Date.now()),
        username,
        email,
        passwordHash: '',
        fullName: displayName || username,
        status: 'ACTIVE',
      });
      user = await this.userRepository.save(newUser);
    }

    const userObj = { ...user };
    delete (userObj as any).passwordHash;
    return userObj;
  }

  async validateGithubUser(
    email: string,
    githubId: string,
    displayName: string,
  ): Promise<User> {
    let user = await this.userRepository.findOne({
      where: email ? [{ email }, { username: githubId }] : [{ username: githubId }],
    });

    if (!user) {
      const userEmail = email || `${githubId}@users.noreply.github.com`;
      const username = githubId;
      const newUser = this.userRepository.create({
        id: String(Date.now()),
        username,
        email: userEmail,
        passwordHash: '',
        fullName: displayName || 'Github User',
        status: 'ACTIVE',
      });
      user = await this.userRepository.save(newUser);
    }
    return user;
  }
}


