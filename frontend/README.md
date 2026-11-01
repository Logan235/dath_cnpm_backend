# Frontend — Next.js

```powershell
npm install
npm run dev        # http://localhost:3000 (backend phải chạy ở cổng 3001)
npm run build      # kiểm tra build production
```

Backend ở máy / cổng khác: tạo `.env.local` với `NEXT_PUBLIC_API_URL=http://<ip>:3001`.

## Cấu trúc

| Đường dẫn | Nội dung |
|---|---|
| `src/config/portals.js` | Khu vực của từng vai trò: tiền tố URL, trang chủ, menu sidebar |
| `src/lib/auth.js` | Đăng nhập / đăng ký / đổi vai trò / đăng xuất, lưu phiên ở localStorage |
| `src/lib/api.js` | Gọi API: tự gắn token, tự làm mới token, đổi lỗi backend thành thông báo tiếng Việt, upload, tải file |
| `src/lib/hooks.js` | `useApi`, `usePaged` (danh sách + lọc + phân trang), `useSession` (quyền), `useAction` |
| `src/lib/labels.js` | Nhãn tiếng Việt + màu cho mọi mã trạng thái (khớp `backend/src/common/constants.ts`) |
| `src/components/ui/` | Bộ giao diện dùng chung: bảng, phân trang, form sinh từ cấu hình, hộp thoại, thông báo, hộp thư, trang danh mục `CrudPage` |
| `src/components/PortalShell.jsx` | Khung khu vực cần đăng nhập (kiểm tra vai trò, chuông thông báo, đổi vai trò) |
| `src/components/PublicShell.jsx` | Khung khu vực công khai `/citizen` (không cần đăng nhập) |
| `src/components/pages/Admin` | Quản trị hệ thống |
| `src/components/pages/InfoSourceV2` | Quản lý nguồn thông tin (văn bản, cơ sở, giấy phép, thu thập tin, phân loại tin) |
| `src/components/pages/AdProcessing` | Xử lý thông tin quảng cáo (QC, lọc, AI, đánh giá, whitelist, dữ liệu tái huấn luyện) |
| `src/components/pages/Violation` | Hồ sơ vi phạm, xử phạt, phản hồi, kiểm tra trước, đối tượng, hồ sơ phối hợp |
| `src/components/pages/Facility`, `Citizen` | Khu vực cơ sở KCB và người dân |
| `src/app/<khu-vực>/.../page.tsx` | Route — mỗi file chỉ gọi một trang ở `components/pages` |

Nút / thao tác hiển thị theo **quyền** của vai trò (lấy từ `/auth/me`), còn backend luôn tự kiểm tra lại quyền ở mọi API.

Hướng dẫn test từng luồng: `HUONG_DAN_TEST_GIAO_DIEN.md`.
