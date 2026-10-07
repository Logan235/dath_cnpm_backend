# 🎯 NestJS Authentication Backend

## ✅ Đã Fix Xong

### 1. **PassportModule Configuration** ✅
- Di chuyển PassportModule ra imports chính
- Register với defaultStrategy: `PassportModule.register({ defaultStrategy: 'jwt' })`
- File: `src/auth/auth.module.ts`

### 2. **Github Guard Syntax** ✅
- Sửa `Injectable();` thành `@Injectable()`
- File: `src/auth/guards/github.guard.ts`

### 3. **OAuth Routes** ✅
- Tạm thời comment OAuth routes (Google, Github)
- File: `src/auth/auth.controller.ts`

### 4. **Build & Server** ✅
- Server build thành công
- Khởi động trên port **3001**

---

## 🚨 QUAN TRỌNG - BẠN CẦN LÀM NGAY

### **Chạy SQL Script trong pgAdmin:**

1. Mở **pgAdmin**
2. Kết nối PostgreSQL
3. Tạo database `ad_monitor` (nếu chưa có)
4. Right-click `ad_monitor` → **Query Tool**
5. Mở file `src/database/init.sql`
6. Copy toàn bộ nội dung → Paste vào Query Tool
7. Click **Execute** (F5)
8. Verify: Expand `ad_monitor` → `Schemas` → `public` → `Tables` (phải có 7 tables)

---

## 🚀 Khởi động Server

```bash
cd BACKEND
pnpm run start:dev
```

**Expected:**
```
[Nest] Nest application successfully started
Application is running on: http://[::1]:3001
```

---

## 🧪 Test API

### Register User:
```powershell
$body = @{
    email = "admin@example.com"
    password = "Admin123456"
    displayName = "Admin User"
} | ConvertTo-Json

Invoke-WebRequest -Uri 'http://localhost:3001/auth/register' `
    -Method POST `
    -ContentType 'application/json' `
    -Body $body
```

### Login:
```powershell
$body = @{
    email = "admin@example.com"
    password = "Admin123456"
} | ConvertTo-Json

Invoke-WebRequest -Uri 'http://localhost:3001/auth/login' `
    -Method POST `
    -ContentType 'application/json' `
    -Body $body
```

---

## 📊 Status

| Component | Status |
|-----------|--------|
| Database Connection | ✅ |
| PassportModule | ✅ |
| LocalStrategy | ✅ |
| JwtStrategy | ✅ |
| Server Running | ✅ Port 3001 |
| Database Tables | ⚠️ **RUN init.sql** |

---

## 📁 Files

- `API_TEST.md` - Chi tiết test API
- `src/database/init.sql` - ⚠️ Cần chạy trong pgAdmin
- `.env` - Database config

---

**Sau khi chạy init.sql, test API và báo kết quả!** 🚀
