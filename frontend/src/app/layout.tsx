import type { Metadata } from "next";
import "./globals.css";
import "./ui.css";
import { FeedbackHost } from "@/components/ui/feedback";

export const metadata: Metadata = {
  title: "AI phát hiện dấu hiệu vi phạm trong y tế",
  description: "Hệ thống giám sát quảng cáo khám chữa bệnh — Sở Y tế TP. Hồ Chí Minh",
};

// Khung Header + Sidebar được gắn ở layout của từng khu vực (admin, specialist, ...),
// trang /login không có khung này. FeedbackHost: thông báo nổi + hộp thoại xác nhận dùng chung.
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body>
        {children}
        <FeedbackHost />
      </body>
    </html>
  );
}
