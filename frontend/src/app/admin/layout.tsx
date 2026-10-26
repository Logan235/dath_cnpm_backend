import PortalShell from "@/components/PortalShell";

// Khu vực của vai trò ADMIN: chỉ tài khoản đăng nhập với vai trò này mới vào được
export default function Layout({ children }: { children: React.ReactNode }) {
  return <PortalShell portal="ADMIN">{children}</PortalShell>;
}
