import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { UPLOAD_ROOT } from './core/files';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // exposedHeaders: để frontend đọc được tên file khi tải Excel / Word
  app.enableCors({ exposedHeaders: ['Content-Disposition'] });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  // File đã upload (văn bản, giấy phép, bằng chứng...) tải tại /uploads/...
  app.useStaticAssets(UPLOAD_ROOT, { prefix: '/uploads' });

  const config = new DocumentBuilder()
    .setTitle('API — Hệ thống AI phát hiện vi phạm quảng cáo y tế')
    .setDescription(
      [
        'Cách test: 1) POST /auth/login (VD admin@demo.com / Demo@123456, role ADMIN) → copy accessToken.',
        '2) Bấm nút **Authorize** (góc phải) → dán token → Authorize.',
        '3) Gọi các API. Đổi vai trò = đăng nhập lại với role khác.',
        'Tài khoản demo (mật khẩu chung Demo@123456): admin@demo.com (ADMIN), chuyenvien@demo.com & chuyenvien2@demo.com (SPECIALIST),',
        'lanhdao@demo.com (MANAGER), anninhmang@demo.com (CYBER_POLICE), cosokcb@demo.com (FACILITY), nguoidan@demo.com (CITIZEN),',
        'canbo.moi@syt.com (email cơ quan, chưa có vai trò).',
      ].join('\n\n'),
    )
    .setVersion('2.0')
    .addBearerAuth()
    .addSecurityRequirements('bearer')
    .build();
  SwaggerModule.setup('api-docs', app, SwaggerModule.createDocument(app, config), {
    swaggerOptions: { persistAuthorization: true, docExpansion: 'none', tagsSorter: 'alpha', filter: true },
    customSiteTitle: 'API AI Sở Y tế',
  });

  const port = Number(process.env.PORT || 3001);
  await app.listen(port, '0.0.0.0');
  console.log(`Application is running on: http://localhost:${port}`);
  console.log(`Swagger (test API):        http://localhost:${port}/api-docs`);
}
bootstrap();
