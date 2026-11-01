import PortalShell from "@/components/PortalShell";

// Khu vực của vai trò CYBER_POLICE: chỉ tài khoản đăng nhập với vai trò này mới vào được
export default function Layout({ children }: { children: React.ReactNode }) {
  return <PortalShell portal="CYBER_POLICE">{children}</PortalShell>;
}
