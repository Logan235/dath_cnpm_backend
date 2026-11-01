import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ALL_ENTITIES } from '../entities';
import { AccessGuard, PermissionCache } from '../common/auth';
import { AuditService, NotificationService, ParamsService, RiskService } from './core.services';
import { DocumentTextService } from './files';
import { AiAnalyzerService } from '../ai/ai-analyzer.service';
import { SuspectMatchingService, ViolationIntakeService } from './violation-intake.service';

/** Module dùng chung: repository của mọi entity + các dịch vụ nền tảng */
@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature(ALL_ENTITIES),
    JwtModule.registerAsync({
      global: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET') || 'default_backup_secret',
      }),
    }),
  ],
  providers: [
    PermissionCache,
    AuditService,
    ParamsService,
    NotificationService,
    RiskService,
    DocumentTextService,
    AiAnalyzerService,
    SuspectMatchingService,
    ViolationIntakeService,
    { provide: APP_GUARD, useClass: AccessGuard },
  ],
  exports: [
    TypeOrmModule,
    JwtModule,
    PermissionCache,
    AuditService,
    ParamsService,
    NotificationService,
    RiskService,
    DocumentTextService,
    AiAnalyzerService,
    SuspectMatchingService,
    ViolationIntakeService,
  ],
})
export class CoreModule {}
