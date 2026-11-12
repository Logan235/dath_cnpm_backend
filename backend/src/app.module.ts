import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { HttpModule } from '@nestjs/axios';
import { AppController } from './app.controller';
import { ALL_ENTITIES } from './entities';
import { CoreModule } from './core/core.module';
import { AuthModule } from './auth/auth.module';
import { SystemAdminModule } from './system-admin/system-admin.module';
import { InfoSourceModule } from './info-source/info-source.module';
import { AdProcessingModule } from './ad-processing/ad-processing.module';
import { ViolationsModule } from './violations/violations.module';
import { QueueModule } from './queue/queue.module';
import { WebhooksModule } from './webhooks/webhooks.module';

const LOCAL_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    ScheduleModule.forRoot(),
    HttpModule,
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const host = config.get<string>('DB_HOST', 'localhost');
        const isCloud = host.includes('supabase') || host.includes('rds') || config.get<string>('DB_SSL') === 'true';
        return {
          type: 'postgres',
          host,
          port: Number(config.get<string>('DB_PORT', '5432')),
          username: config.get<string>('DB_USERNAME', 'postgres'),
          password: config.get<string>('DB_PASSWORD', 'postgres'),
          database: config.get<string>('DB_NAME', 'postgres'),
          entities: ALL_ENTITIES,
          synchronize: false,
          ssl: isCloud ? { rejectUnauthorized: false } : false,
          extra: { options: `-c timezone=${LOCAL_TZ}` },
        };
      },
    }),
    QueueModule,
    WebhooksModule,
    CoreModule,
    AuthModule,
    SystemAdminModule,
    InfoSourceModule,
    AdProcessingModule,
    ViolationsModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
