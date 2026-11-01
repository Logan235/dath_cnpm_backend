import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { ALL_ENTITIES } from './entities';
import { CoreModule } from './core/core.module';
import { AuthModule } from './auth/auth.module';
import { SystemAdminModule } from './system-admin/system-admin.module';
import { InfoSourceModule } from './info-source/info-source.module';
import { AdProcessingModule } from './ad-processing/ad-processing.module';
import { ViolationsModule } from './violations/violations.module';

const LOCAL_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST', 'localhost'),
        port: Number(config.get<string>('DB_PORT', '5432')),
        username: config.get<string>('DB_USERNAME', 'postgres'),
        password: config.get<string>('DB_PASSWORD', 'postgres'),
        database: config.get<string>('DB_NAME', 'do_an_tong_hop'),
        entities: ALL_ENTITIES,
        // Bảng do src/database/schema.sql tạo (npm run db:setup), KHÔNG để TypeORM tự sửa bảng
        synchronize: false,
        // Cột thời gian là "timestamp" (không múi giờ): cho PostgreSQL dùng cùng múi giờ với máy chạy backend,
        // để giờ do DB tự điền (DEFAULT CURRENT_TIMESTAMP) khớp với giờ do backend ghi.
        extra: { options: `-c timezone=${LOCAL_TZ}` },
      }),
    }),
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
