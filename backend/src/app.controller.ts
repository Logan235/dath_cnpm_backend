import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { DataSource } from 'typeorm';
import { Public } from './common/auth';

@ApiTags('9. Danh mục dùng chung')
@Controller()
export class AppController {
  constructor(private readonly ds: DataSource) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Kiểm tra backend + kết nối database' })
  async health() {
    try {
      const [{ n }] = await this.ds.query(
        "SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema = 'public'",
      );
      const [{ users }] = await this.ds.query('SELECT count(*)::int AS users FROM users');
      return {
        status: 'success',
        message: 'Backend đang chạy và đã kết nối database',
        database: { connected: true, tables: n, totalUsers: users, expectedTables: 38 },
        docs: '/api-docs',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'error',
        message: 'Backend chạy nhưng lỗi database — hãy chạy: npm run db:setup',
        error: (error as Error).message,
        timestamp: new Date().toISOString(),
      };
    }
  }
}
