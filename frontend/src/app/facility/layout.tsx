import PortalShell from "@/components/PortalShell";

// Khu vực của vai trò FACILITY: chỉ tài khoản đăng nhập với vai trò này mới vào được
export default function Layout({ children }: { children: React.ReactNode }) {
  return <PortalShell portal="FACILITY">{children}</PortalShell>;
}
