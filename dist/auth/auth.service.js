"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const user_entity_1 = require("../users/entities/user.entity");
const bcrypt_1 = __importDefault(require("bcrypt"));
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
let AuthService = class AuthService {
    constructor(userRepository, jwtService, configService) {
        this.userRepository = userRepository;
        this.jwtService = jwtService;
        this.configService = configService;
    }
    async register(registerDto) {
        const { email, password, displayName } = registerDto;
        const username = email.split('@')[0];
        const existingUser = await this.userRepository.findOne({
            where: [{ email }, { username }],
        });
        if (existingUser) {
            throw new common_1.ConflictException({
                message: 'User with this email or username already exists',
            });
        }
        const hashedPassword = await bcrypt_1.default.hash(password, 10);
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
        const result = { ...savedUser };
        delete result.passwordHash;
        delete result.refreshToken;
        return result;
    }
    async validateUser(loginDto) {
        const { email, password } = loginDto;
        const user = await this.userRepository.findOne({ where: { email } });
        if (!user) {
            throw new common_1.UnauthorizedException('User with this email not found');
        }
        if (!user.passwordHash) {
            throw new common_1.UnauthorizedException('Invalid password or user signed up using an external provider');
        }
        const isMatch = await bcrypt_1.default.compare(password, user.passwordHash);
        if (!isMatch) {
            throw new common_1.UnauthorizedException('Invalid email or password');
        }
        const result = { ...user };
        delete result.passwordHash;
        return result;
    }
    async login(user) {
        const payload = {
            email: user.email,
            sub: String(user.id),
            userId: String(user.id),
        };
        const refreshTokenPayload = {
            subject: String(user.id),
        };
        const accessToken = await this.jwtService.signAsync(payload, {
            expiresIn: (this.configService.get('expiresIn') ||
                '1h'),
        });
        const refreshToken = await this.jwtService.signAsync(refreshTokenPayload, {
            expiresIn: (this.configService.get('expiresIn1') ||
                '7d'),
        });
        const tokenHash = await bcrypt_1.default.hash(refreshToken, 10);
        await this.userRepository.update(user.id, {
            refreshToken: tokenHash,
            lastLoginAt: new Date(),
        });
        return {
            accessToken,
            refreshToken,
        };
    }
    async validateGoogleUser(email, displayName, providerId) {
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
        delete userObj.passwordHash;
        return userObj;
    }
    async validateGithubUser(email, githubId, displayName) {
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
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        jwt_1.JwtService,
        config_1.ConfigService])
], AuthService);
//# sourceMappingURL=auth.service.js.map