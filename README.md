# AI phát hiện dấu hiệu vi phạm quảng cáo trong y tế

| Thư mục | Công nghệ | Cổng |
|---|---|---|
| `backend/` | NestJS + PostgreSQL, 4 module nghiệp vụ, ~225 API, Swagger | 3001 |
| `frontend/` | Next.js, giao diện theo vai trò, **đã nối toàn bộ vào API backend** | 3000 |

> Để project ở đường dẫn **không dấu, không khoảng trắng** (ví dụ `D:\ad-monitoring`). Đường dẫn có dấu tiếng Việt làm NestJS build sai đường dẫn module (`Cannot find module ...`).

## 1. Chạy backend (terminal 1)

```powershell
cd backend
copy .env.example .env          # đã có .env thì bỏ qua; sửa DB_PASSWORD, DB_NAME cho đúng máy
npm install                     # có sẵn .npmrc nên không còn lỗi ERESOLVE
npm run db:setup                # tự tạo database (nếu chưa có) + toàn bộ bảng + dữ liệu mẫu
npm run start:dev
```

- Thấy `Application is running on: http://localhost:3001` là backend đã chạy.
- `npm run db:setup` chạy nhiều lần vẫn an toàn, không mất dữ liệu.
- Muốn xóa sạch rồi cài lại dữ liệu mẫu từ đầu: `npm run db:reset`.

## 2. Chạy frontend (terminal 2)

```powershell
cd frontend
npm install
npm run dev
```

Mở **http://localhost:3000**.

- Chưa đăng nhập: vào thẳng **khu vực Người dân (công khai)** — kiểm tra quảng cáo, tra cứu cơ sở, xem đơn vị vi phạm, phản ánh quảng cáo, văn bản pháp lý. Nút **Đăng nhập / Đăng ký** ở góc phải.
- Frontend tự gọi backend ở cùng địa chỉ IP, cổng 3001. Backend chạy ở máy khác thì tạo `frontend/.env.local` với `NEXT_PUBLIC_API_URL=http://<ip>:3001`.

## 3. Tài khoản demo (mật khẩu chung `Demo@123456`)

| Vai trò | Email | Vào khu vực |
|---|---|---|
| Quản trị hệ thống | admin@demo.com | `/admin` — tổ chức, vai trò & quyền, người dùng, tài khoản, **duyệt form xin cấp quyền**, nhật ký, tham số |
| Chuyên viên Sở Y tế | chuyenvien@demo.com, chuyenvien2@demo.com | `/specialist` — nguồn thông tin, xử lý quảng cáo + đánh giá AI, hồ sơ vi phạm, xử phạt, phản hồi cơ sở |
| Cán bộ quản lý / Lãnh đạo | lanhdao@demo.com | `/manager` — phê duyệt xử phạt, giải quyết xung đột đánh giá, duyệt cấp quyền, thống kê |
| Cán bộ Phòng An ninh mạng | anninhmang@demo.com | `/cyber-security` — hồ sơ được chuyển, điều tra, đối tượng vi phạm, đối soát |
| Cơ sở KCB (Bệnh viện Đa khoa X) | cosokcb@demo.com | `/facility` — hồ sơ cơ sở, vi phạm của cơ sở, giải trình / khiếu nại, kiểm tra trước QC |
| Người dân | nguoidan@demo.com | `/citizen` — như khách, thêm mục "Của tôi" |
| Email cơ quan chưa được cấp quyền | canbo.moi@syt.com | `/role-request` — đã có 1 form chờ duyệt |

## 4. Test

**Backend tự động** (khi backend đang chạy, mở terminal khác):

```powershell
cd backend
npm run test:flows        # ~170 bước qua mọi luồng của 6 vai trò, mong đợi "0 lỗi"
```

**Bằng Swagger:** http://localhost:3001/api-docs (hướng dẫn trong `backend/API_TEST.md`).

**Bằng giao diện:** làm theo `frontend/HUONG_DAN_TEST_GIAO_DIEN.md` — 8 kịch bản đi hết các luồng nghiệp vụ bằng nhiều vai trò (đăng ký cán bộ → duyệt quyền, nhập văn bản từ file Word/PDF, crawler → lọc → AI → chuyên viên → hồ sơ → xử phạt → lãnh đạo duyệt, chuyển An ninh mạng, cơ sở giải trình, người dân không đăng nhập, đánh giá chéo...).

## 5. Hệ thống làm gì (theo PDF workflow + báo cáo)

**Đăng nhập**
- Không đăng nhập vẫn dùng được: kiểm tra trước quảng cáo, tra cứu cơ sở, tra cứu đơn vị vi phạm, phản ánh quảng cáo, văn bản pháp lý.
- Đăng ký bằng email thường → tài khoản Người dân.
- Đăng ký bằng email cơ quan (`@syt.com`, `@syt.gov.vn`, `@ca.gov.vn`; admin đổi được ở tham số `OFFICIAL_EMAIL_DOMAINS`) → tài khoản Cán bộ chưa có vai trò → gửi **form xin cấp quyền** → Admin hoặc Lãnh đạo duyệt trong hộp thư.
- Tài khoản nhiều vai trò: chọn vai trò khi đăng nhập hoặc đổi ở góc trên bên phải.

**1. Quản trị hệ thống:** cơ cấu tổ chức cha – con, vai trò & bảng phân quyền (37 quyền, có hiệu lực ngay), người dùng, tài khoản (khóa / mở khóa / đặt lại mật khẩu / lịch sử đăng nhập), nhật ký hoạt động (xuất Excel), tham số hệ thống, thông báo.

**2. Quản lý nguồn thông tin:** văn bản pháp lý, đơn vị KCB, giấy phép / CCHN — mỗi mục có 2 cách nhập: **form** hoặc **tải file PDF / Word → tự trích xuất → kiểm tra rồi lưu**. Thu thập tin: nguồn, chủ đề & từ khóa, lịch thu thập, phiên thu thập (crawler giả lập). Phân loại tin theo lĩnh vực / đối tượng / định dạng / nguồn. Cơ sở KCB và người dân chỉ xem.

**3. Xử lý thông tin quảng cáo:** kiểm tra nhanh QC (URL / nội dung / file) → kết quả thu thập (chuyển tiếp / loại bỏ / lọc tự động) → AI phân tích → hàng đợi ưu tiên → chuyên viên đánh giá (Human-in-the-loop) với màn hình hỗ trợ quyết định → đánh giá chéo, lãnh đạo giải quyết xung đột → dữ liệu tái huấn luyện + hiệu suất AI.

**4. Quản lý thông tin vi phạm:** hồ sơ vi phạm (tự lập khi xác nhận vi phạm, lập tay, nhập Excel) → kiểm tra thẩm quyền → xử phạt (lãnh đạo duyệt quyết định cấp cao, tải văn bản .doc) / nhắc nhở / chuyển An ninh mạng – Sở TT&TT → khắc phục hậu quả. Đối tượng vi phạm (đối soát Levenshtein + Jaccard, điểm rủi ro theo Bảng 12.7 – 12.8), hồ sơ phối hợp điều tra, phản hồi của cơ sở, kiểm tra trước 5 bước, thống kê, xuất Excel.

## 6. Giới hạn hiện tại

- **"AI" là bộ luật (rule-based):** dò cụm từ vi phạm + đối chiếu CSDL cơ sở, giấy phép, CCHN, phạm vi kỹ thuật; trả kết quả giống mô hình (nhãn, độ tin cậy, căn cứ, văn bản pháp lý). Khi có mô hình thật: đặt `AI_SERVICE_URL` trong `backend/.env` hoặc khai báo ở trang "Dữ liệu đánh giá chuyên viên → Mô hình AI".
- **Crawler giả lập:** nút "Chạy ngay" sinh mẫu tin theo từ khóa của lịch. Crawler thật gửi dữ liệu vào `POST /ad-items/ingest`.
- **Ảnh chưa có OCR:** ảnh được lưu làm bằng chứng, chữ trên ảnh cần gõ lại.
- Các trang Admin **Cài đặt hệ thống, Cài đặt giao diện, Cookies, Thông tin trang** vẫn là giao diện mẫu (backend chưa có API tương ứng).
- Ràng buộc / quy chuẩn kiểm định dữ liệu đang để mức cơ bản, sẽ nâng cấp sau (theo ghi chú trong PDF workflow).

## 7. Mở bằng điện thoại / máy khác

Mở tường lửa cho cổng **3000** và **3001**, rồi vào `http://<ip-máy-chạy>:3000`.
