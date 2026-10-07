import { Controller, Get } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './users/entities/user.entity';

@Controller()
export class AppController {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  @Get()
  async getHello() {
    try {
      const userCount = await this.userRepository.count();
      return {
        status: 'success',
        message: 'Ad Monitoring Backend PostgreSQL Auth API is running & DB is connected!',
        database: {
          connected: true,
          totalUsersInDb: userCount,
        },
        endpoints: {
          login: 'POST /auth/login',
          register: 'POST /auth/register',
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'error',
        message: 'Backend is running but Database connection failed!',
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }
}

