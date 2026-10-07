import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { User } from '../users/entities/user.entity';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    register(registerDto: RegisterDto): Promise<Partial<User>>;
    login(req: {
        user: User;
    }): Promise<{
        accessToken: string;
        refreshToken: string;
        message: string;
        user: User;
    }>;
}
