# 🤖 Hướng dẫn Hệ thống Crawler & AI Phân tích Quảng cáo Y tế

Tài liệu này tổng hợp chi tiết kiến trúc, các chỉnh sửa cơ sở dữ liệu, cách vận hành crawler, tích hợp AI (bao gồm chế độ giả lập/sync và RabbitMQ queue), cũng như hướng dẫn kiểm tra và chạy thử.

---

## 📋 1. Tổng quan Kiến trúc Crawler & AI

Hệ thống tích hợp 2 luồng chính:
1. **Crawler Orchestrator (`info-source` / `crawler-orchestrator.service.ts`)**: Quản lý lịch trình (`CrawlSchedule`), nguồn thu thập (`CrawlSource`), và thực hiện thu thập dữ liệu quảng cáo từ các nền tảng (Facebook, TikTok, Google, Website, v.v.).
2. **Ad Processing & AI Pipeline (`ad-processing` / `ai-analyzer.service.ts`)**: 
   - Dữ liệu thô thu thập được lưu vào bảng `ad_items` (trạng thái `COLLECTED` -> `FILTERED`).
   - Gửi sang AI để phân tích nội dung (kiểm tra từ khóa vi phạm y tế, nhãn AI: `VIOLATION`, `SUSPECTED`, `NO_VIOLATION`).
   - Hỗ trợ **2 chế độ chạy AI**:
     - **Chế độ Queue (RabbitMQ)**: Nếu cấu hình `RABBITMQ_URL`, các job AI được đẩy vào message queue qua NestJS `@ClientProxyFactory` để xử lý bất đồng bộ.
     - **Chế độ Sync / Fallback trực tiếp**: Nếu không cấu hình `RABBITMQ_URL`, hệ thống tự động chuyển sang chế độ chạy đồng bộ (built-in AI analyzer) giúp ứng dụng khởi động và hoạt động ngay mà không bắt buộc phải cài đặt RabbitMQ.

---

## 🗄️ 2. Các Chỉnh sửa Cơ sở Dữ liệu (Database Migration & Adapter Layer)

Để giải quyết triệt để các lệch pha schema (`schema discrepancies`) giữa cơ sở dữ liệu cũ `dath_cnpm` và các tính năng crawler/AI mới, lớp adapter SQL (`src/database/adapter-layer.sql`) đã được cập nhật với lệnh `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` an toàn trước khi tạo triggers/views.

### Các bảng cốt lõi liên quan đến Crawler & AI:
1. **`crawl_sources`**: Quản lý các nguồn crawler (URL, nền tảng, trạng thái).
2. **`crawl_schedules`**: Quản lý lịch chạy tự động cho từng nguồn.
3. **`crawl_jobs`**: Lưu lịch sử các phiên chạy crawler (`started_at`, `finished_at`, `status`, `items_collected`).
4. **`ad_items`**: Lưu trữ mẫu tin quảng cáo thu thập được. Các cột quan trọng đã bổ sung:
   - `crawl_job_id`, `schedule_id`, `crawl_source_id`, `topic_id`.
   - `status`: Bao gồm các trạng thái:
     - `COLLECTED`: Đã thu thập
     - `FILTERED`: Đã qua bộ lọc
     - `AI_ANALYZING`: **(Mới)** AI đang xử lý
     - `AI_ANALYZED`: AI đã phân tích xong (chờ chuyên viên duyệt)
     - `CONFIRMED_VIOLATION` / `NOT_VIOLATION`: Kết luận cuối cùng.

### Cách chạy Migration Adapter:
```bash
npm run db:adapter
```
Lệnh này sẽ thực thi file `src/database/adapter-layer.sql` để cập nhật cấu trúc bảng, cột, triggers và views mà không làm mất dữ liệu cũ.

---

## ⚙️ 3. Cấu hình Môi trường (`.env`)

Đảm bảo file `.env` trong thư mục `backend/` có các cấu hình cơ bản sau:

```env
PORT=3001
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=dath_cnpm

JWT_SECRET=your_jwt_secret_key

# Tùy chọn: RabbitMQ (Nếu để trống hoặc bỏ qua, hệ thống tự dùng chế độ AI đồng bộ built-in)
# RABBITMQ_URL=amqp://localhost:5672
```

---

## 🚀 4. Hướng dẫn Chạy Thử & Kiểm tra Chi tiết

### Bước 1: Khởi động Backend
```bash
cd dath_cnpm_backend/backend
npm install
npm run db:adapter   # Cập nhật DB schema & adapter triggers
npm run start:dev    # Khởi động NestJS server ở cổng 3001
```

### Bước 2: Kiểm tra API qua Swagger Documentation
Truy cập trình duyệt tại:
👉 **`http://localhost:3001`** (hoặc `http://localhost:3001/api` tùy cấu hình Swagger).

### Bước 3: Kiểm tra các Chức năng Crawler & AI cụ thể

1. **Quản lý Nguồn Crawler & Lịch trình**:
   - `GET /crawler/sources`: Xem danh sách nguồn thu thập.
   - `POST /crawler/sources`: Thêm nguồn thu thập mới.
   - `POST /crawler/schedules`: Cấu hình lịch chạy tự động.
   - `POST /crawler/jobs/run`: Kích hoạt một phiên chạy crawl thủ công (`crawl_job_id`).

2. **Kiểm tra Mẫu tin Quảng cáo & AI Analysis**:
   - `GET /ad-processing/items`: Lấy danh sách mẫu tin quảng cáo thu thập được.
   - `POST /ad-processing/items/{id}/analyze`: Yêu cầu AI phân tích thủ công mẫu tin quảng cáo (chuyển trạng thái sang `AI_ANALYZING` -> `AI_ANALYZED`).
   - `GET /ad-processing/items/{id}`: Xem chi tiết kết quả phân tích AI (mức độ rủi ro, từ khóa vi phạm, nhãn AI `VIOLATION` / `SUSPECTED` / `NO_VIOLATION`).

3. **Kiểm tra Tự động hóa qua Script Kiểm tra luồng**:
   Bạn có thể chạy script kiểm tra tích hợp tự động:
   ```bash
   node scripts/test-flows.js
   ```

---

## 🔍 5. Xử lý sự cố thường gặp (Troubleshooting)

- **Lỗi thiếu cột database (`crawl_job_id`, `ai_analyzing`,...)**: Chạy ngay lệnh `npm run db:adapter`.
- **Lỗi kết nối RabbitMQ**: Nếu không chạy RabbitMQ local, hoàn toàn yên tâm vì module Queue đã được viết logic fallback thông minh qua `ClientProxyFactory` sử dụng `DummyClientProxy`, giúp hệ thống chạy mượt mà ở chế độ Sync/Built-in AI mà không báo lỗi crash app.
