# Hướng dẫn test bằng giao diện

Chuẩn bị: backend chạy ở cổng 3001, frontend ở cổng 3000. Muốn bắt đầu với dữ liệu sạch: trong thư mục `backend` chạy `npm run db:reset` rồi khởi động lại backend.

Mật khẩu mọi tài khoản demo: `Demo@123456`. Nên mở **2 trình duyệt** (hoặc 1 cửa sổ thường + 1 cửa sổ ẩn danh) để đăng nhập 2 vai trò cùng lúc.

Trên màn hình đăng nhập: bấm chọn **thẻ vai trò** → nhập email, mật khẩu → **Đăng nhập**.

---

## Kịch bản 1 — Cán bộ đăng ký bằng email cơ quan, xin cấp quyền

1. Mở http://localhost:3000 → **Đăng ký**. Nhập họ tên, email `ten.ban@syt.com`, mật khẩu (có chữ hoa, chữ thường, số, ký tự đặc biệt) → **Đăng ký**.
2. Hệ thống tự chuyển sang trang **Xin cấp quyền cán bộ**. Chọn vai trò (Chuyên viên), đơn vị, nhập lý do → **Gửi form**. Trạng thái: *Chờ duyệt*.
3. Cửa sổ khác: đăng nhập **Quản trị hệ thống** (`admin@demo.com`) → *Quản trị hệ thống → Duyệt form xin cấp quyền* → bấm form vừa gửi → xem phần *Hệ thống tự kiểm tra* → **Duyệt và cấp quyền**.
4. Quay lại cửa sổ cán bộ → tải lại trang → **Vào khu vực làm việc** → vào khu vực Chuyên viên.
5. Thử đăng xuất, đăng nhập lại nhưng chọn sai vai trò (VD *Cơ sở khám chữa bệnh*) → hệ thống báo vai trò được cấp và có nút *Vào với vai trò ...*.

Lãnh đạo (`lanhdao@demo.com`) cũng duyệt được ở *Phê duyệt → Duyệt form xin cấp quyền* nhưng chỉ cấp được vai trò Chuyên viên / An ninh mạng.

## Kịch bản 2 — Nhập thông tin bằng 2 cách (form và file PDF / Word)

Đăng nhập **Chuyên viên Sở Y tế** (`chuyenvien@demo.com`). File mẫu ở `backend/samples/`.

1. *Quản lý nguồn thông tin → Văn bản pháp lý* → **Nhập từ file PDF / Word** → chọn `van-ban-phap-ly-mau.docx` → form mở ra đã điền sẵn số hiệu, loại, ngày ban hành... → kiểm tra → **Thêm mới**. (Hoặc **Thêm bằng form** để nhập tay.)
2. *Đơn vị KCB* → **Nhập từ file PDF / Word** → `co-so-kcb-mau.pdf` → **Thêm mới**. Màn hình hiện tài khoản + mật khẩu tạm của cơ sở mới. Bấm vào một cơ sở để xem giấy phép, đổi tình trạng hoạt động, đưa vào danh sách đen.
3. *Giấy phép / CCHN* → **Nhập từ file PDF / Word** → `giay-phep-cchn-mau.docx` → **Thêm mới**. Ô *Tra cứu nhanh* phía trên: nhập `000123/HCM-CCHN` → **Kiểm tra**.
4. *Danh mục dùng chung*: loại văn bản, loại hình cơ sở, phân loại nguồn tin (thêm / sửa / bật-tắt / xóa).

## Kịch bản 3 — Luồng chính: quảng cáo → AI → chuyên viên → hồ sơ vi phạm → xử phạt

Đăng nhập **Chuyên viên**.

1. *Quản lý nguồn thông tin → Thu thập tin* → tab *Lịch thu thập* → dòng `LTT-001` → **Chạy ngay** → **Chạy** (crawler giả lập sinh mẫu tin).
2. *Xử lý thông tin QC → Kết quả thu thập tin* → **Tự động lọc tất cả** → **Chạy bộ lọc**. Bộ lọc loại tin trùng / thuộc whitelist / không liên quan; tin đạt được AI phân tích ngay. Có thể tự chọn mẫu tin rồi **Chuyển tiếp** hoặc **Loại bỏ** (chọn lý do). Tab *Đã loại* xem tin bị loại.
3. *Đánh giá kết quả AI* → hàng đợi sắp theo điểm ưu tiên → **Đánh giá** ở một mẫu tin AI kết luận *Vi phạm*. Màn hình hiện nội dung, kết quả AI (căn cứ, đối chiếu GPHĐ/CCHN, văn bản pháp lý), giấy phép và vi phạm cũ của cơ sở.
4. Chọn **Xác nhận vi phạm**, chỉnh loại vi phạm nếu cần, nhập lý do → **Gửi đánh giá** → xác nhận. Hệ thống tự lập hồ sơ `VP-...` → **Mở hồ sơ vi phạm**.
5. Trong hồ sơ: **Kiểm tra thẩm quyền** → giữ nguyên 2 ô đã tích → **Xác nhận** → **Lập quyết định xử phạt** → nhập tiền phạt `25000000` → **Lập quyết định** → trạng thái *Chờ lãnh đạo phê duyệt*.
6. Cửa sổ khác: **Lãnh đạo** → *Phê duyệt → Phê duyệt quyết định xử phạt* → **Phê duyệt** → **Phê duyệt và ban hành**.
7. Quay lại hồ sơ (chuyên viên) → tab *Xử phạt* → **Văn bản QĐ** (tải file Word) → **Cập nhật thi hành** → *Đã chấp hành* → **Lưu** → hồ sơ chuyển *Đã hoàn thành*. Tab *Lịch sử xử lý* ghi lại từng bước.

## Kịch bản 4 — Chuyển hồ sơ cho An ninh mạng

1. **Chuyên viên** → *Hồ sơ vi phạm* → **Lập hồ sơ** → nhập tiêu đề, nội dung (có số điện thoại / tài khoản), chọn loại vi phạm → **Lập hồ sơ**.
2. **Kiểm tra thẩm quyền** → bỏ tích *Đã đủ thông tin xác định đối tượng* → chọn *Phòng An ninh mạng* → **Xác nhận** → hồ sơ *Đã chuyển phối hợp*.
3. **An ninh mạng** (`anninhmang@demo.com`) → *Hồ sơ được chuyển* → chọn hồ sơ → **Tiếp nhận** → **Cập nhật tiến độ** → **Xác định đối tượng** (đối tượng đã có hoặc tạo mới) → **Cập nhật kết quả** → **Lưu trữ**.
4. *Đối tượng vi phạm*: xem điểm rủi ro (bảng chi tiết điểm), dòng thời gian vi phạm, thêm tài khoản mạng xã hội, cập nhật xác minh, gộp đối tượng trùng. *Đối soát đối tượng*: xác nhận các cặp nghi trùng.

## Kịch bản 5 — Người dân (không cần đăng nhập)

1. Mở http://localhost:3000 (chưa đăng nhập) → *Kiểm tra quảng cáo* → dán nội dung, VD: `Phòng khám Ánh Dương cam kết chữa khỏi hẳn bệnh trĩ sau 1 lần` → **Kiểm tra** → xem kết quả 5 bước và **mã tra cứu**.
2. Ô *Tra cứu kết quả theo mã* → nhập mã vừa nhận → **Tra cứu**.
3. *Tra cứu cơ sở KCB* → bấm một cơ sở → giấy phép, bác sĩ có CCHN, mức uy tín. *Đơn vị vi phạm*: danh sách công khai.
4. *Phản ánh quảng cáo* → nhập nội dung → **Gửi phản ánh** → nhận mã `MT-...`. Phản ánh vào hàng *Kết quả thu thập tin* của chuyên viên.
5. Đăng nhập `nguoidan@demo.com` (vai trò Người dân) → mục *Của tôi* xem phản ánh và lịch sử kiểm tra.

## Kịch bản 6 — Cơ sở KCB

1. **Cơ sở KCB** (`cosokcb@demo.com`) → *Hồ sơ cơ sở*: thông tin, giấy phép, kỹ thuật được cấp phép, mức rủi ro.
2. *Kiểm tra trước nội dung QC* → dán nội dung quảng cáo dự kiến → **Kiểm tra** → kết quả sơ bộ, chờ chuyên viên xác minh.
3. *Vi phạm của cơ sở* → chọn hồ sơ → **Giải trình / khiếu nại** (đính kèm file được). Hoặc *Giải trình / khiếu nại* → **Gửi phản hồi mới** → chọn hồ sơ / phiếu kiểm tra liên quan.
4. **Chuyên viên** → *Kiểm tra trước QC* → chọn phiếu → chọn kết quả cuối cùng → **Xác minh kết quả**. *Phản hồi từ đơn vị KCB* → chọn phản hồi → **Chấp nhận** / **Không chấp nhận** → **Gửi trả lời** (có thể bác bỏ hồ sơ vi phạm nếu giải trình hợp lý).
5. Cơ sở thấy câu trả lời, thông báo ở biểu tượng chuông; tải được quyết định xử phạt đã ban hành cho cơ sở mình.

## Kịch bản 7 — Đánh giá chéo, lãnh đạo giải quyết xung đột

1. **Admin** → *Tham số hệ thống* → `REVIEW_REQUIRED_COUNT` = `2` → nút lưu.
2. **Chuyên viên 1** (`chuyenvien@demo.com`) đánh giá một mẫu tin: *Xác nhận vi phạm* → "Đã ghi nhận 1/2 đánh giá".
3. **Chuyên viên 2** (`chuyenvien2@demo.com`) mở cùng mẫu tin (hàng đợi *Đánh giá kết quả AI*): *Không vi phạm* → mẫu tin chuyển *Xung đột*.
4. **Lãnh đạo** → *Phê duyệt → Giải quyết xung đột đánh giá* → **Xem và quyết định** → chọn *Vi phạm* / *Không vi phạm*, nhập lý do → **Ra quyết định**.
5. Đặt lại `REVIEW_REQUIRED_COUNT` = `1`.

## Kịch bản 8 — Quản trị và báo cáo

- **Admin**: *Cơ cấu tổ chức* (thêm đơn vị con, vô hiệu hóa đơn vị cha → đơn vị con bị vô hiệu theo), *Vai trò và phân quyền* (tích / bỏ quyền → **Lưu phân quyền**, có hiệu lực ngay), *Người dùng* (thêm người dùng → mật khẩu tạm hiện 1 lần, gán vai trò), *Tài khoản đăng nhập* (khóa / mở khóa / đặt lại mật khẩu / lịch sử), *Nhật ký hoạt động* (lọc, xuất Excel).
- **Chuyên viên / Lãnh đạo**: *Thống kê báo cáo* (lọc theo ngày, **Xuất báo cáo Excel**), *Hồ sơ vi phạm* → **Xuất Excel**, **File mẫu** + **Nhập từ Excel** (file mẫu `backend/samples/vi-pham-import-mau.xlsx`), *Dữ liệu đánh giá chuyên viên* (hiệu suất AI, ma trận nhầm lẫn, xuất dữ liệu tái huấn luyện).
- Chuông thông báo ở góc trên: bấm vào thông báo để mở thẳng đối tượng liên quan.
