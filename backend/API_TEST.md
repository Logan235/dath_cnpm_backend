# Hướng dẫn test backend

Có 2 cách test:

| Cách | Dùng khi | Lệnh |
|---|---|---|
| **Tự động** | Kiểm tra nhanh toàn bộ hệ thống còn chạy đúng (170 bước) | `npm run test:flows` (backend phải đang chạy) |
| **Bằng tay trên Swagger** | Xem từng API, thử dữ liệu của mình | Mở `http://localhost:3001/api-docs` |

## 0. Chuẩn bị trên Swagger

1. `POST /auth/login` → **Try it out** → nhập body → **Execute**:
   ```json
   { "email": "chuyenvien@demo.com", "password": "Demo@123456", "role": "SPECIALIST" }
   ```
2. Copy giá trị `accessToken` trong kết quả.
3. Bấm nút **Authorize** (góc phải trên) → dán token → **Authorize** → **Close**.
4. Muốn đổi vai trò: gọi lại `/auth/login` với tài khoản khác, rồi Authorize lại bằng token mới.

| Vai trò | Email (mật khẩu chung `Demo@123456`) | `role` |
|---|---|---|
| Quản trị hệ thống | admin@demo.com | ADMIN |
| Chuyên viên Sở Y tế | chuyenvien@demo.com, chuyenvien2@demo.com | SPECIALIST |
| Cán bộ quản lý / Lãnh đạo | lanhdao@demo.com | MANAGER |
| Cán bộ an ninh mạng | anninhmang@demo.com | CYBER_POLICE |
| Cơ sở KCB (Bệnh viện Đa khoa X) | cosokcb@demo.com | FACILITY |
| Người dân | nguoidan@demo.com | CITIZEN |
| Cán bộ mới (email cơ quan, chưa có vai trò) | canbo.moi@syt.com | *(bỏ trống)* |

Danh sách mã trạng thái kèm nhãn tiếng Việt: `GET /meta/enums`.

---

## 1. Đăng nhập theo đuôi email + form xin cấp quyền

| # | Vai trò | API | Kết quả mong đợi |
|---|---|---|---|
| 1 | (không đăng nhập) | `POST /auth/register` `{"email":"a@gmail.com","password":"Test@1234"}` | `accountType: CITIZEN`, có vai trò CITIZEN |
| 2 | (không đăng nhập) | `POST /auth/register` `{"email":"b@syt.com","password":"Test@1234"}` | `accountType: OFFICIAL`, `requiresRoleRequest: true` |
| 3 | | `POST /auth/login` b@syt.com, `role: SPECIALIST` | **403** `ROLE_NOT_GRANTED` |
| 4 | | `POST /auth/login` b@syt.com, **không** gửi `role` | Token có `role: null`, `needsRoleRequest: true` → Authorize |
| 5 | b@syt.com | `GET /organizations/options` rồi `POST /role-requests` `{"requestedRoleCode":"SPECIALIST","departmentId":3,"reason":"..."}` | Form `PENDING`, admin + lãnh đạo nhận thông báo |
| 6 | MANAGER / ADMIN | `GET /role-requests?status=PENDING` → `POST /role-requests/{id}/approve` | Người gửi được cấp vai trò. Lãnh đạo **không** cấp được MANAGER/ADMIN |
| 7 | | Đăng nhập lại b@syt.com với `role: SPECIALIST` | Thành công |

Đuôi email cơ quan là tham số `OFFICIAL_EMAIL_DOMAINS`. Admin sửa bằng `PATCH /parameters/OFFICIAL_EMAIL_DOMAINS`.

Khi chưa đăng nhập vẫn dùng được: `POST /prechecks`, `GET /public/facilities`, `GET /public/violating-facilities`, `GET /legal-documents`, `GET /licenses/verify`, `POST /public/reports`.

## 2. Module Quản trị hệ thống (ADMIN)

- **Cơ cấu tổ chức:** `POST /organizations` (thêm, có `parentId` để thêm đơn vị con), `GET /organizations/tree`. `PATCH /organizations/{id}/status` `{"isActive":false}` vô hiệu hóa luôn các đơn vị con. Xóa đơn vị còn đơn vị con hoặc người dùng → 409.
- **Vai trò & quyền:** `GET /roles/permissions` (danh mục quyền), `POST /roles` `{"roleCode":"THANH_TRA","roleName":"Thanh tra","permissionCodes":["violation.view"]}`. `PUT /roles/{id}/permissions` có hiệu lực ngay, kể cả với token đang dùng.
- **Người dùng:** `POST /users` (bỏ trống password thì hệ thống trả `temporaryPassword`), `PUT /users/{id}/roles`, `POST /users/{id}/lock` (token cũ bị từ chối ngay), `/unlock`, `/reset-password`, `GET /users/{id}/login-history`.
- **Nhật ký:** `GET /audit-logs?module=VIOLATION`, `GET /audit-logs/export` (Excel).
- **Tham số:** `GET /parameters`, `PATCH /parameters/{key}`. Các tham số quan trọng:
  - `AI_VIOLATION_THRESHOLD`
  - `REVIEW_REQUIRED_COUNT` (đặt 2 để bật đánh giá chéo)
  - `PENALTY_APPROVAL_THRESHOLD`
  - `PIPELINE_AUTO_AI`

## 3. Module Quản lý nguồn thông tin (SPECIALIST)

Mỗi mục có **2 cách nhập**: (1) form JSON, (2) upload file PDF / Word (.docx, .doc) / TXT để hệ thống trích xuất thông tin. File mẫu nằm trong thư mục `samples/`.

| Mục | Cách 1 (form) | Cách 2 (upload) | File mẫu |
|---|---|---|---|
| Văn bản pháp lý | `POST /legal-documents` | `POST /legal-documents/import` | `van-ban-phap-ly-mau.docx` |
| Đơn vị KCB | `POST /facilities` | `POST /facilities/import` | `co-so-kcb-mau.pdf` |
| Giấy phép / CCHN | `POST /licenses` | `POST /licenses/import` | `giay-phep-cchn-mau.docx` |

- Upload trả về `draft` (bản nháp) và `missingFields`. Frontend đổ `draft` vào form để người dùng kiểm tra rồi gọi API cách 1. Thêm `?autoSave=true` để lưu luôn nếu đủ thông tin.
- **Thêm đơn vị KCB** sẽ tự tạo GPHĐ và **tài khoản đăng nhập cho cơ sở** (`account.temporaryPassword`).
- **Ràng buộc:**
  - Mã không được trùng.
  - Số văn bản phải đúng định dạng.
  - Văn bản / giấy phép đang được AI hoặc lịch sử kiểm tra sử dụng thì không xóa được, chỉ vô hiệu hóa.
  - AI chỉ dùng văn bản và giấy phép ở trạng thái ACTIVE.
  - Vô hiệu hóa loại nguồn sẽ vô hiệu hóa các nguồn thuộc loại đó.
  - Từ khóa không được chứa ký tự đặc biệt.
- **Thu thập tin:** `POST /crawl-schedules` → `POST /crawl-schedules/{id}/start` → `POST /crawl-schedules/{id}/run` `{"count":5}`. Crawler giả lập sinh mẫu tin; muốn dùng dữ liệu thật thì gửi `items`.

## 4. Module Xử lý thông tin quảng cáo (SPECIALIST, MANAGER)

Seed có sẵn 7 mẫu tin trạng thái `COLLECTED` (MT-000001 → MT-000007). Thử theo thứ tự sau:

1. `GET /ad-items?status=COLLECTED` — màn hình **Kết quả thu thập tin**.
2. `POST /ad-items/qc/extract` `{"text":"Nha khoa Sài Gòn Smile ... bác sĩ Trần Thị Bình ... 00234/HCM-GPHĐ"}` — **Kiểm tra nhanh QC**, trả bảng đối chiếu GPHĐ/CCHN.
3. `POST /ad-items/qc/decision` `{"ids":["5"],"action":"DISCARD","reason":"IRRELEVANT","confirm":true}` — loại bỏ tin không hợp lệ (không thể hoàn tác).
4. `POST /ad-items/auto-filter` `{}` — **Tự động lọc tất cả**: loại MT-000006 (trùng lặp với MT-000002) và MT-000004 (whitelist). Nếu bỏ qua bước 3 thì MT-000005 cũng bị loại vì không liên quan y tế. Các mẫu tin còn lại được **AI phân tích ngay**.
5. `GET /ad-items/1` — xem `latestAnalysis`: nhãn, độ tin cậy, căn cứ, văn bản pháp lý.
6. `GET /review-queue` (hàng đợi theo điểm ưu tiên) → `POST /review-queue/claim` `{"count":3}`.
7. `GET /ad-items/1/decision-support` — màn hình hỗ trợ ra quyết định.
8. `POST /ad-items/1/reviews` `{"decision":"VIOLATION","severity":"HIGH","reason":"..."}`:
   - Mẫu tin chuyển `CONFIRMED_VIOLATION`.
   - **Hồ sơ vi phạm VP-… được tạo tự động**.
   - Dữ liệu phản hồi được lưu vào tập tái huấn luyện.
9. `POST /ad-items/7/reviews` (Phòng khám Hồng Phúc, không có trong CSDL) → AI đối soát **tự gộp vào đối tượng DT-0001** vì trùng SĐT.
10. **Đánh giá chéo:**
    1. ADMIN đặt `REVIEW_REQUIRED_COUNT = 2`.
    2. chuyenvien và chuyenvien2 đánh giá ngược nhau → mẫu tin chuyển `CONFLICT`.
    3. MANAGER gọi `POST /ad-items/{id}/resolve-conflict`.
11. `GET /ai/performance` (accuracy / precision / recall / F1), `GET /ai/feedback/export?format=jsonl`, `POST /ai/analyze-text`.

## 5. Module Quản lý thông tin vi phạm

| Bước | Vai trò | API |
|---|---|---|
| Kiểm tra thẩm quyền | SPECIALIST | `POST /violations/{id}/assess` `{"withinAuthority":true,"hasEnoughInfo":true}` → `PROCESSING` |
| Không thuộc thẩm quyền | SPECIALIST | `POST /violations/{id}/transfer` `{"targetAgency":"CYBER_POLICE","reason":"..."}` → `TRANSFERRED` + hồ sơ HS-… |
| Lập QĐ xử phạt | SPECIALIST | `POST /violations/{id}/penalty-decisions` `{"decisionNumber":"01/QĐ-XPHC","fineAmount":15000000}`. Vi phạm nghiêm trọng hoặc phạt ≥ 20 triệu → `PENDING_APPROVAL` |
| Phê duyệt | MANAGER | `GET /penalty-decisions/pending-approval` → `POST /penalty-decisions/{id}/approve` (người lập không được tự duyệt) |
| In quyết định | | `GET /penalty-decisions/{id}/document` (file Word) |
| Chấp hành xong | SPECIALIST | `POST /penalty-decisions/{id}/execution` `{"executionStatus":"COMPLIED"}` → hồ sơ `RESOLVED`, tính lại điểm rủi ro |
| Nhắc nhở / bác bỏ | SPECIALIST | `POST /violations/{id}/warn`, `POST /violations/{id}/dismiss` |
| Nhập Excel | SPECIALIST | `GET /violations/import-template`, `POST /violations/import` (mẫu `samples/vi-pham-import-mau.xlsx`) |

**Phối hợp Công an (CYBER_POLICE):**

1. `GET /investigation-cases`
2. `POST /investigation-cases/{id}/accept`
3. `POST .../updates` (ghi tiến độ)
4. `POST .../identify` `{"suspectId":1,"findings":"..."}`
5. `POST .../complete` `{"outcome":"HANDLED","resultSummary":"...","closeViolation":false}` → hồ sơ quay về Sở Y tế
6. `POST .../close`

Hồ sơ gửi Sở TT&TT (`DEPT_INFO_COMM`) do chuyên viên cập nhật kết quả.

**Đối tượng vi phạm (CYBER_POLICE):** `GET /suspects` (sắp theo điểm rủi ro), `GET /suspects/dashboard`, `GET /suspects/1` (timeline + chi tiết điểm rủi ro), `POST /suspects/detect` `{"violationId":…}`, `GET /suspects/match-candidates` (độ tương đồng 0.7–0.9 chờ xác nhận), `POST /suspects/{id}/merge`.

**Phản hồi của cơ sở (FACILITY → SPECIALIST):**

1. cosokcb gọi `GET /facility-portal/violations`.
2. cosokcb gọi `POST /facility-feedbacks` `{"violationId":…,"feedbackType":"COMPLAINT","subject":"...","content":"..."}`, rồi `POST /facility-feedbacks/{id}/attachments`.
3. Chuyên viên gọi `GET /facility-feedbacks` → `POST /facility-feedbacks/{id}/respond` `{"decision":"ACCEPTED","responseNote":"...","dismissViolation":true}`.

**Kiểm tra trước quảng cáo (5 bước):**

- Không đăng nhập: `POST /prechecks` `{"contentText":"Thẩm mỹ viện Bella nâng mũi cam kết đẹp vĩnh viễn"}` → `FAIL`, kèm lý do và khuyến nghị. Tra lại bằng `GET /prechecks/lookup/{code}`.
- Cơ sở KCB đăng nhập gửi → `PENDING_REVIEW`. Chuyên viên `POST /prechecks/{id}/review` đưa ra kết quả cuối.

**Thống kê:** `GET /statistics/overview`, `GET /statistics/my-tasks` (việc cần làm theo vai trò), `GET /statistics/export`, `GET /violations/export`.

## 6. Bảng phân quyền mặc định

| Quyền | ADMIN | SPECIALIST | MANAGER | CYBER_POLICE | FACILITY | CITIZEN |
|---|:-:|:-:|:-:|:-:|:-:|:-:|
| Quản trị tổ chức / vai trò / người dùng / tham số | ✔ | | xem | | | |
| Duyệt form xin cấp quyền | ✔ | | ✔ | | | |
| Quản lý nguồn thông tin (văn bản, cơ sở, giấy phép, thu thập) | ✔ | ✔ | xem | xem cơ sở/giấy phép | | |
| Kiểm tra nhanh QC, lọc, gửi AI | ✔ | ✔ | | | | |
| Đánh giá kết quả AI | ✔ | ✔ | ✔ | | | |
| Giải quyết xung đột đánh giá | ✔ | | ✔ | | | |
| Lập / xử lý hồ sơ vi phạm, lập QĐ xử phạt | ✔ | ✔ | | | | |
| Phê duyệt QĐ xử phạt | ✔ | | ✔ | | | |
| Đối tượng vi phạm, hồ sơ phối hợp điều tra | ✔ | xem | xem | ✔ | | |
| Gửi giải trình / phản hồi | | | | | ✔ | |
| Kiểm tra trước, tra cứu, phản ánh | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ (cả khách) |

Admin đổi bảng này bằng `PUT /roles/{id}/permissions`.
