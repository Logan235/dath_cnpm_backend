import { Suspense } from "react";
import LoginPage from "@/components/LoginPage";

export const metadata = { title: "Đăng nhập | AI phát hiện dấu hiệu vi phạm trong y tế" };

export default function Page() {
  return (
    <Suspense fallback={<div className="login-loading" style={{padding: 40, textAlign: "center"}}>Đang tải...</div>}>
      <LoginPage />
    </Suspense>
  );
}
