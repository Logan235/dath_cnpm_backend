# API Testing Guide

## Server Information
- **Base URL**: `http://localhost:3001`
- **Database**: PostgreSQL (ad_monitor)

## Prerequisites
✅ PostgreSQL đang chạy
✅ Database `ad_monitor` đã được tạo
✅ File `init.sql` đã được chạy trong pgAdmin để tạo bảng `users`
✅ Server đang chạy: `npm run start:dev` hoặc `pnpm run start:dev`

---

## API Endpoints

### 1. Register User
**POST** `/auth/register`

**Request Body:**
```json
{
  "email": "test@example.com",
  "password": "Test123456",
  "displayName": "Test User"
}
```

**Success Response (200):**
```json
{
  "id": "1726000000000",
  "username": "test",
  "email": "test@example.com",
  "fullName": "Test User",
  "status": "ACTIVE",
  "createdAt": "2026-09-10T09:30:00.000Z",
  "updatedAt": "2026-09-10T09:30:00.000Z"
}
```

**Error Response (409 - Conflict):**
```json
{
  "statusCode": 409,
  "message": "User with this email or username already exists"
}
```

---

### 2. Login
**POST** `/auth/login`

**Request Body:**
```json
{
  "email": "test@example.com",
  "password": "Test123456"
}
```

**Success Response (200):**
```json
{
  "message": "Login successfully",
  "user": {
    "id": "1726000000000",
    "username": "test",
    "email": "test@example.com",
    "fullName": "Test User",
    "status": "ACTIVE"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Response (401 - Unauthorized):**
```json
{
  "statusCode": 401,
  "message": "Invalid email or password"
}
```

---

## Testing with PowerShell

### Register a new user:
```powershell
$body = @{
    email = "test@example.com"
    password = "Test123456"
    displayName = "Test User"
} | ConvertTo-Json

Invoke-WebRequest -Uri 'http://localhost:3001/auth/register' `
    -Method POST `
    -ContentType 'application/json' `
    -Body $body `
    -UseBasicParsing
```

### Login:
```powershell
$body = @{
    email = "test@example.com"
    password = "Test123456"
} | ConvertTo-Json

Invoke-WebRequest -Uri 'http://localhost:3001/auth/login' `
    -Method POST `
    -ContentType 'application/json' `
    -Body $body `
    -UseBasicParsing
```

---

## Testing with Thunder Client / Postman

1. **Install Extension** (nếu dùng VS Code):
   - Thunder Client (recommended)
   - REST Client

2. **Create Collection**: "Auth API Tests"

3. **Add Requests**:
   - **Register**: POST `http://localhost:3001/auth/register`
   - **Login**: POST `http://localhost:3001/auth/login`

4. **Set Headers**:
   ```
   Content-Type: application/json
   ```

5. **Use the JSON bodies** shown above

---

## Troubleshooting

### Server không khởi động:
```bash
cd BACKEND
pnpm install
pnpm run build
pnpm run start:dev
```

### Database connection error:
- Kiểm tra PostgreSQL đang chạy
- Kiểm tra credentials trong `.env`
- Kiểm tra database `ad_monitor` đã tồn tại

### "Column does not exist" error:
- Chạy lại file `init.sql` trong pgAdmin

### "User already exists":
- User đã được tạo trước đó
- Thay đổi email khác hoặc xóa user trong database
