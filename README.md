# 🏥 Hệ thống AI Phát hiện dấu hiệu vi phạm quảng cáo trong y tế (Medical Guardian System)

Hệ thống tích hợp toàn diện gồm **Backend (NestJS)**, **Frontend (Next.js 15)**, **Hệ thống Crawler & AI Models (Python/FastAPI/ONNX)** dùng để thu thập, phân tích, kiểm tra và phát hiện các dấu hiệu vi phạm pháp luật trong lĩnh vực quảng cáo y tế (Khám chữa bệnh, thẩm mỹ, dược phẩm, thiết bị y tế).

| Thư mục | Công nghệ | Cổng mặc định |
|---|---|---|
| `backend/` | NestJS + PostgreSQL, ~225 API, RBAC, Queue, Statistics, Swagger | `3001` |
| `frontend/` | Next.js 15, Giao diện đa vai trò, Notification Badges, Status Banner | `3000` |
| `crawler-ai-model/` | Python, FastAPI, Facebook/Google Ads Crawlers, ONNX AI Classification | `8000` (hoặc tùy chọn) |

> **Lưu ý đường dẫn:** Nên để project ở đường dẫn **không dấu, không khoảng trắng** (ví dụ `D:\ad-monitoring`) để tránh lỗi biên dịch module khi build NestJS.

---

## 🗄️ 1. Hướng dẫn Khởi tạo & Chạy Database (PostgreSQL)

### Bước 1: Tạo Database
Kết nối vào PostgreSQL (pgAdmin / DBeaver / psql) và tạo database:
```sql
CREATE DATABASE medical_ad_guardian;
```

### Bước 2: Import & Khởi tạo Dữ liệu mẫu (Seed Data)
Di chuyển vào thư mục backend và chạy lệnh setup database:
```bash
cd backend
copy .env.example .env          # Nếu chưa có .env (chỉnh sửa DB_PASSWORD, DB_NAME cho đúng máy)
npm install                     # Cài đặt các gói phụ thuộc
npm run db:setup                # Tự động tạo bảng + import toàn bộ dữ liệu mẫu ban đầu
```
- Lệnh `npm run db:setup` an toàn khi chạy nhiều lần (không làm mất dữ liệu cũ nếu đã tồn tại).
- Nếu muốn xóa sạch và nạp lại từ đầu: `npm run db:reset`.

---

## ⚙️ 2. Hướng dẫn Cài đặt & Chạy Hệ thống

### A. Chạy Backend (NestJS API)
```bash
cd backend
npm run start:dev
```
- Khi hiển thị `Application is running on: http://localhost:3001`, backend đã sẵn sàng.
- Tài liệu API Swagger: `http://localhost:3001/api-docs`.

### B. Chạy Frontend (Next.js Portal UI)
Mở một terminal mới:
```bash
cd frontend
npm install
npm run dev
```
- Mở trình duyệt tại **`http://localhost:3000`**.
- Mặc định frontend gọi backend tại `http://localhost:3001`. Nếu backend chạy ở IP khác, tạo file `frontend/.env.local` với nội dung `NEXT_PUBLIC_API_URL=http://<ip>:3001`.

### C. Chạy Crawler & AI Models (Python)
Mở terminal mới cho phần Crawler & AI:
```bash
cd crawler-ai-model
python -m venv venv
source venv/bin/activate  # Trên Windows: venv\Scripts\Activate.ps1
pip install -r requirements.txt
python main.py
```

---

## 👥 3. Tài khoản Demo & Phân quyền (Mật khẩu chung: `Demo@123456`)

| Vai trò / Nhóm | Email đăng nhập | Khu vực làm việc (`/portals`) | Chức năng chính |
|---|---|---|---|
| **Quản trị hệ thống** | `admin@demo.com` | `/admin` | Quản lý tổ chức, phân quyền (37 quyền), tài khoản, **duyệt form xin cấp quyền**, nhật ký hệ thống |
| **Chuyên viên Sở Y tế** | `chuyenvien@demo.com` | `/specialist` | Quản nguồn tin, xử lý quảng cáo + đánh giá AI, hồ sơ vi phạm, xử phạt, phản hồi cơ sở |
| **Cán bộ quản lý / Lãnh đạo** | `lanhdao@demo.com` | `/manager` | Phê duyệt quyết định xử phạt, giải quyết xung đột đánh giá, duyệt cấp quyền cán bộ |
| **Cán bộ An ninh mạng** | `anninhmang@demo.com` | `/cyber-security` | Điều tra hồ sơ phối hợp, đối tượng vi phạm, đối soát |
| **Cơ sở KCB** | `cosokcb@demo.com` | `/facility` | Xem thông tin cơ sở, vi phạm, giải trình/khiếu nại, kiểm tra trước quảng cáo |
| **Người dân** | `nguoidan@demo.com` | `/citizen` | Tra cứu cơ sở, kiểm tra quảng cáo, gửi phản ánh, xem mục "Của tôi" |
| **Cán bộ mới đăng ký** | `canbo.moi@syt.com` | `/role-request` | Tài khoản email cơ quan chưa có vai trò (đang chờ quản trị duyệt đơn xin cấp quyền) |

---

## 🔍 4. Hướng dẫn Kiểm tra từng Luồng Nghiệp Vụ (End-to-End)

### Luồng 1: Khu vực Công khai & Người dân (`/citizen`)
1. Truy cập `http://localhost:3000/citizen/pre-check` (không cần đăng nhập).
2. **Kiểm tra quảng cáo nhanh:** Nhập nội dung quảng cáo hoặc dán link, hệ thống AI đối chiếu với danh mục hợp pháp.
3. **Tra cứu cơ sở KCB & Danh bạ hành nghề:** Tra cứu thông tin bệnh viện, phòng khám, số giấy phép, bác sĩ chịu trách nhiệm.
4. **Gửi phản ánh:** Gửi thông tin tố giác khi phát hiện quảng cáo sai phạm.

### Luồng 2: Đăng ký & Xin cấp quyền Cán bộ (`/role-request`)
1. Đăng ký tài khoản mới với email cơ quan (ví dụ đuôi `@syt.com.vn`).
2. Hệ thống chuyển hướng sang trang **Xin cấp quyền cán bộ** (`/role-request`).
3. Chọn vai trò cần xin cấp (VD: *Chuyên viên Sở Y tế*), nhập lý do và gửi đơn. Giao diện hiển thị trạng thái 🟡 **Chờ duyệt** cùng banner thông báo sống.
4. Đăng nhập tài khoản Admin (`admin@demo.com`), vào **Quản lý form xin cấp quyền** (`/manager/role-requests`) để duyệt đơn.
5. Quay lại tài khoản cán bộ: khi đơn được duyệt (🟢 **Đã được duyệt**), hệ thống tự động đồng bộ và hỗ trợ chuyển vào phân vùng làm việc tương ứng.

### Luồng 3: Xử lý Quảng cáo & AI Phân tích (`/specialist` & `/cyber-security`)
1. **Crawler & Thu thập:** Hệ thống thu thập bài viết quảng cáo từ Facebook/Google dựa trên `keywords.txt`.
2. **AI Classification:** Mô hình ONNX phân tích và dán nhãn mức độ vi phạm.
3. **Kiểm duyệt viên (Human-in-the-loop):** Chuyên viên kiểm tra tại `/specialist/violations` hoặc `/specialist/expert-feedback`, lập hồ sơ vi phạm, trình lãnh đạo phê duyệt quyết định xử phạt hoặc chuyển An ninh mạng xử lý.

### Luồng 4: Kiểm tra Tự động (Automated Testing)
Chạy bộ test kiểm tra toàn bộ ~170 bước nghiệp vụ của backend:
```bash
cd backend
npm run test:flows
```
Mong đợi kết quả: **0 lỗi (All flows passed successfully)**.

---

## 🛠️ 5. Lệnh Kiểm tra Build & Phát triển
- **Kiểm tra Frontend Build & TypeScript:**
  ```bash
  cd frontend
  npm run build
  ```
- **Kiểm tra Backend Build (NestJS):**
  ```bash
  cd backend
  npm run build
  ```
