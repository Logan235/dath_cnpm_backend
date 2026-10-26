import PublicShell from "@/components/PublicShell";

// Khu vực người dân: CÔNG KHAI — không đăng nhập vẫn kiểm tra quảng cáo, tra cứu cơ sở, phản ánh được
export default function Layout({ children }: { children: React.ReactNode }) {
  return <PublicShell>{children}</PublicShell>;
}
