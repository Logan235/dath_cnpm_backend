# 📊 BÁO CÁO TỔNG QUAN HỆ THỐNG: AI PHÁT HIỆN DẤU HIỆU VI PHẠM QUẢNG CÁO TRONG Y TẾ
*(Medical Guardian & Ad Monitoring System)*

---

## 📑 MỤC LỤC
1. [Tổng quan Đề tài & Kiến trúc Hệ thống](#1-tổng-quan-đề-tài--kiến-trúc-hệ-thống)
2. [Luồng Hoạt động & Kiến trúc Backend (NestJS)](#2-luồng-hoạt-động--kiến-trúc-backend-nestjs)
3. [Luồng Hoạt động & Kiến trúc Crawler (Thu thập dữ liệu)](#3-luồng-hoạt-động--kiến-trúc-crawler-thu-thập-dữ-liệu)
4. [Luồng Hoạt động & Kiến trúc AI & Xử lý NLP (Python / ONNX / Whisper)](#4-luồng-hoạt-động--kiến-trúc-ai--xử-lý-nlp-python--onnx--whisper)
5. [Hướng dẫn Cài đặt, Cấu hình & Chạy Hệ thống](#5-hướng-dẫn-cài-đặt-cấu-hình--chạy-hệ-thống)
6. [Hướng dẫn Kiểm tra (Testing & End-to-End Scenarios)](#6-hướng-dẫn-kiểm-tra-testing--end-to-end-scenarios)
7. [Tổng hợp Luồng Hoạt động End-to-End (Từ thu thập đến xử lý & phân phối)](#7-tổng-hợp-luồng-hoạt-động-end-to-end-từ-thu-thập-đến-xử-lý--phân-phối)

---

## 1. TỔNG QUAN ĐỀ TÀI & KIẾN TRÚC HỆ THỐNG

Hệ thống **AI Phát hiện dấu hiệu vi phạm quảng cáo trong y tế** được xây dựng nhằm hỗ trợ Sở Y tế TP. Hồ Chí Minh trong công tác quản lý, giám sát và xử lý các hành vi quảng cáo trái phép trong lĩnh vực y tế (khám chữa bệnh, thẩm mỹ viện, phòng khám, dược phẩm, thiết bị y tế).

### 🏛️ Sơ đồ Kiến trúc Tổng thể (3 Tầng):
1. **Frontend Layer (Next.js 15 App Router)**: Giao diện đa phân vùng (`/citizen`, `/admin`, `/specialist`, `/manager`, `/cyber-security`, `/facility`, trang xin cấp quyền `/role-request`). Tích hợp badge thông báo real-time và status banner.
2. **Backend API Layer (NestJS TypeScript)**: ~225 RESTful APIs, RBAC (37 quyền chi tiết), hàng đợi (`Queue`), quản lý nguồn thông tin, xử lý vi phạm, xử phạt, thống kê tác vụ (`/statistics/my-tasks`).
3. **Crawler & AI Engine Layer (Python / FastAPI / ONNX / Selenium / Whisper)**: Thu thập dữ liệu bài viết quảng cáo từ Facebook Ads Library, Google Search, trích xuất văn bản từ hình ảnh/âm thanh, phân loại nội dung vi phạm bằng mô hình ONNX và đối chiếu với danh mục chuyên môn của Sở Y tế.

---

## 2. LUỒNG HOẠT ĐỘNG & KIẾN TRÚC BACKEND (NESTJS)

Backend được tổ chức theo mô hình Modular Monolith tiêu chuẩn của NestJS:
1. **`AuthModule`**: Xác thực JWT, phân quyền, quản lý phiên đăng nhập (`refreshWithRole`), kiểm tra email cơ quan.
2. **`SystemAdminModule`**: Quản lý tổ chức, phân quyền (37 quyền), tài khoản, **duyệt form xin cấp quyền** (`/role-requests`), nhật ký hoạt động (`Activity Logs`).
3. **`InfoSourceModule`**: Kho văn bản pháp lý, danh mục cơ sở KCB, chứng chỉ hành nghề, cấu hình lịch trình & nguồn thu thập.
4. **`AdProcessingModule`**: Kho tin quảng cáo (`ad_items`), bộ lọc tự động, kết nối AI phân tích, hàng đợi xử lý bất đồng bộ.
5. **`ViolationsModule`**: Hồ sơ vi phạm, đối tượng vi phạm, kiểm tra thẩm quyền, quyết định xử phạt (lãnh đạo duyệt), giải trình, chuyển An ninh mạng.
6. **`QueueModule` & `AiModule`**: Xử lý hàng đợi job AI (Hỗ trợ cả RabbitMQ mode và Sync/Fallback mode).

---

## 3. LUỒNG HOẠT ĐỘNG & KIẾN TRÚC CRAWLER (THU THẬP DỮ LIỆU)

- **Facebook Ads Crawler**: Playwright / Selenium kết hợp cấu hình `config.json` trích xuất quảng cáo y tế, thẩm mỹ trên Facebook.
- **Google Search Crawler**: Thu thập kết quả tìm kiếm dựa trên danh mục từ khóa y tế (`keywords.txt`, `sub_keywords.txt`) để phát hiện landing page vi phạm.
- **Orchestrator Service**: `crawler-orchestrator.service.ts` quản lý bảng `crawl_sources`, `crawl_schedules`, `crawl_jobs` để lập lịch chạy định kỳ và đẩy vào hàng đợi hệ thống.


---

## 4. LUỒNG HOẠT ĐỘNG & KIẾN TRÚC AI & XỬ LÝ NLP (PYTHON / ONNX / WHISPER)

1. **Text Classification (ONNX Model)**:
   - Mô hình Transformer (`model.safetensors` / ONNX runtime trong `text_classifier.py`) phân tích văn bản quảng cáo và phân loại: `VIOLATION`, `SUSPECTED`, `NO_VIOLATION`.
2. **Technique Extraction & Matching**:
   - Đối chiếu với từ khóa chuyên môn kỹ thuật y tế của Sở Y tế (`SYT-DMKT-keywords`, vector `.npz`) để phát hiện hành vi quảng cáo vượt quá phạm vi chuyên môn cấp phép.
3. **Audio / Speech-to-Text (Whisper)**:
   - Chuyển đổi âm thanh/lời thoại trong video quảng cáo (`audio/`, `audio_16k/`) thành văn bản phục vụ phân tích vi phạm.

---

## 5. HƯỚNG DẪN CÀI ĐẶT, CẤU HÌNH & CHẠY HỆ THỐNG

### 🗄️ Bước 1: Khởi tạo Database (PostgreSQL)
```sql
CREATE DATABASE medical_ad_guardian;
```
Chạy lệnh tự động từ thư mục `backend`:
```bash
cd backend
copy .env.example .env
npm install
npm run db:setup
```

### ⚙️ Bước 2: Cài đặt & Chạy Backend (NestJS API)
```bash
cd backend
npm run start:dev
```
- Server chạy tại: `http://localhost:3001`
- Swagger API Docs: `http://localhost:3001/api-docs`

### 💻 Bước 3: Cài đặt & Chạy Frontend (Next.js 15)
```bash
cd frontend
npm install
npm run dev
```
- Mở ứng dụng tại: `http://localhost:3000`

### 🤖 Bước 4: Chạy Crawler & AI Engine
```bash
cd crawler-ai-model
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\Activate.ps1
pip install -r requirements.txt
python main.py
```



---

## 6. HƯỚNG DẪN KIỂM TRA (TESTING & END-TO-END SCENARIOS)

### A. Chạy Test Tự Động Backend:
```bash
cd backend
npm run test:flows
```
*Mong đợi:* `All flows passed successfully` (~170 bước kiểm thử đi qua toàn bộ 6 vai trò).

### B. Danh sách Tài khoản Demo & Vai trò (Mật khẩu: `Demo@123456`):
- **Quản trị hệ thống:** `admin@demo.com` (`/admin`)
- **Chuyên viên Sở Y tế:** `chuyenvien@demo.com` (`/specialist`)
- **Cán bộ Quản lý / Lãnh đạo:** `lanhdao@demo.com` (`/manager`)
- **Cán bộ An ninh mạng:** `anninhmang@demo.com` (`/cyber-security`)
- **Cơ sở KCB:** `cosokcb@demo.com` (`/facility`)
- **Người dân:** `nguoidan@demo.com` (`/citizen`)
- **Cán bộ mới xin cấp quyền:** `canbo.moi@syt.com` (`/role-request`)

---

## 7. TỔNG HỢP LUỒNG HOẠT ĐỘNG END-TO-END (TỪ THU THẬP ĐẾN XỬ LÝ & PHÂN PHỐI)

```text
[ 🌐 Mạng xã hội / Google Search ]
               │
               ▼ (Crawler Playwright/Selenium)
[ 📦 Thu thập dữ liệu thô (ad_items: COLLECTED) ]
               │
               ▼ (Queue / Built-in AI Pipeline)
[ 🧠 AI & NLP Classifier (Mô hình ONNX & Trích xuất kỹ thuật y tế) ]
               │
               ▼ (Gắn nhãn: VIOLATION / SUSPECTED / NO_VIOLATION)
[ 🔔 Hàng đợi tác vụ Chuyên viên & Chuông thông báo Real-time ]
               │
               ▼
[ 👥 Chuyên viên kiểm duyệt (Human-in-the-loop) & Lập hồ sơ vi phạm ]
               │
               ▼
[ ⚖️ Trình Lãnh đạo phê duyệt xử phạt / Chuyển An ninh mạng điều tra ]
               │
               ▼
[ 🖥️ Cập nhật Dashboard, Thống kê tác vụ & Báo cáo Real-time ]
```

