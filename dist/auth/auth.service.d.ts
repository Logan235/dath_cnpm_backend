import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
export declare class AuthService {
    private readonly userRepository;
    private jwtService;
    private configService;
    constructor(userRepository: Repository<User>, jwtService: JwtService, configService: ConfigService);
    register(registerDto: RegisterDto): Promise<Partial<User>>;
    validateUser(loginDto: LoginDto): Promise<Partial<User>>;
    login(user: User): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    validateGoogleUser(email: string, displayName: string, providerId: string): Promise<User>;
    validateGithubUser(email: string, githubId: string, displayName: string): Promise<User>;
}
