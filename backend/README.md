# Backend — NestJS + Supabase PostgreSQL

```powershell
copy .env.example .env     # Điền thông tin kết nối Supabase Cloud của nhóm vào .env
npm install
npm run start:dev          # http://localhost:3001 — Swagger: http://localhost:3001/api-docs
```

## 🌐 Hướng dẫn kết nối Supabase Cloud cho nhóm
1. Tạo Project trên [Supabase](https://supabase.com/).
2. Vào **SQL Editor** trên Supabase, chạy lần lượt nội dung trong `src/database/schema.sql` và `src/database/seed.sql`.
3. Lấy thông tin **Host**, **Port**, **Password** từ **Project Settings > Database** điền vào file `backend/.env`.

| Lệnh | Tác dụng |
|---|---|
| `npm run start:dev` | Chạy backend ở chế độ watch mode |
| `npm run build` | Build ứng dụng NestJS production |
| `npm run test:flows` | Kiểm thử toàn bộ luồng nghiệp vụ qua API |

## Cấu trúc mã nguồn

```
src/
  entities/            38 bảng (TypeORM) — chia theo 4 module
  common/              phân quyền (AccessGuard, @Public, @RequirePermissions), hằng số + nhãn tiếng Việt, tiện ích
  core/                dịch vụ dùng chung: nhật ký, tham số, thông báo, điểm rủi ro, upload & đọc PDF/Word,
                       tạo hồ sơ vi phạm + đối soát đối tượng
  ai/                  bộ AI rule-based
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

