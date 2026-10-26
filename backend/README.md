# Backend — NestJS + PostgreSQL

```powershell
copy .env.example .env     # sửa DB_PASSWORD / DB_NAME
npm install
npm run db:setup           # tạo database + bảng + dữ liệu mẫu (chạy lại nhiều lần vẫn an toàn)
npm run start:dev          # http://localhost:3001 — Swagger: http://localhost:3001/api-docs
npm run test:flows         # (terminal khác) test tự động 170 bước
```

| Lệnh | Tác dụng |
|---|---|
| `npm run db:setup` | Chạy `src/database/schema.sql` + `seed.sql` (giữ dữ liệu cũ) |
| `npm run db:reset` | **Xóa sạch** các bảng của hệ thống rồi tạo lại + seed |
| `npm run test:flows` | Kiểm thử toàn bộ luồng nghiệp vụ qua API |

## Cấu trúc mã nguồn

```
src/
  entities/            38 bảng (TypeORM) — chia theo 4 module
  common/              phân quyền (AccessGuard, @Public, @RequirePermissions), hằng số + nhãn tiếng Việt, tiện ích
  core/                dịch vụ dùng chung: nhật ký, tham số, thông báo, điểm rủi ro, upload & đọc PDF/Word,
                       tạo hồ sơ vi phạm + đối soát đối tượng
  ai/                  bộ AI rule-based (thay bằng AI_SERVICE_URL khi có mô hình thật)
  auth/                đăng ký theo đuôi email, đăng nhập theo vai trò, refresh token
  system-admin/        Module 1 — Quản trị hệ thống
  info-source/         Module 2 — Quản lý nguồn thông tin
  ad-processing/       Module 3 — Quản lý xử lý thông tin quảng cáo
  violations/          Module 4 — Quản lý thông tin vi phạm (+ thống kê, tra cứu công khai, cổng cơ sở KCB)
  database/            schema.sql, seed.sql, reset.sql
scripts/               db.js (chạy SQL theo .env), test-flows.js (test tự động)
samples/               file Word/PDF/Excel mẫu để thử chức năng upload
```

Hướng dẫn test từng chức năng: [API_TEST.md](API_TEST.md).
