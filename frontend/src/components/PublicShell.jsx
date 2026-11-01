"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogIn, LogOut, Menu, UserPlus, LayoutDashboard } from "lucide-react";
import { LOGO_SRC } from "@/assets/icons";
import { PORTALS, homeFor } from "@/config/portals";
import { logout } from "@/lib/auth";
import { useSession } from "@/lib/hooks";
import Button from "./ui/Button";
import Footer from "./Footer";

/**
 * Khung của khu vực công khai (/citizen/...). Không bắt đăng nhập:
 * khách vẫn kiểm tra quảng cáo, tra cứu cơ sở, phản ánh được.
 * Đã đăng nhập (người dân) thì hiện tên + mục "Của tôi"; cán bộ thì có nút về khu vực làm việc.
 */
export default function PublicShell({ children }) {
  const pathname = usePathname() || "";
  const router = useRouter();
  const { session, ready } = useSession();
  const [open, setOpen] = useState(false);
  const loggedIn = !!session?.accessToken;
  const nav = PORTALS.CITIZEN.nav.filter((n) => !n.requiresLogin || loggedIn);
  const isStaff = loggedIn && session.role && session.role !== "CITIZEN";

  return (
    <>
      <header className="pub-header">
        <div className="pub-header-inner">
          <Link href="/citizen/pre-check" className="pub-brand">
            <img src={LOGO_SRC} alt="" />
            <span>
              <span className="pub-brand-name" style={{ display: "block" }}>
                Sở Y tế TP. Hồ Chí Minh
              </span>
              <span className="pub-brand-sub">Tra cứu và kiểm tra quảng cáo y tế</span>
            </span>
          </Link>
          <button type="button" className="ui-btn ui-btn-secondary pub-menu-btn" onClick={() => setOpen((o) => !o)} aria-label="Mở menu">
            <Menu size={18} />
          </button>
          <nav className={`pub-nav${open ? " is-open" : ""}`} aria-label="Chức năng công khai">
            {nav.map((n) => (
              <Link
                key={n.key}
                href={n.href}
                className={pathname === n.href || pathname.startsWith(n.href + "/") ? "is-active" : ""}
                onClick={() => setOpen(false)}
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="pub-user">
            {!ready ? null : loggedIn ? (
              <>
                <span style={{ fontSize: 13, fontWeight: 600, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={session.user?.email}>
                  {session.user?.fullName || session.user?.email}
                </span>
                {(isStaff || !session.role) && (
                  <Button size="sm" variant="secondary" icon={LayoutDashboard} onClick={() => router.push(homeFor(session))} title="Khu vực làm việc">
                    <span className="pub-hide-sm">Khu vực làm việc</span>
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  icon={LogOut}
                  onClick={async () => {
                    await logout();
                    router.replace("/citizen/pre-check");
                  }}
                  aria-label="Đăng xuất"
                  title="Đăng xuất"
                />
              </>
            ) : (
              <>
                <Button size="sm" variant="ghost" icon={UserPlus} className="pub-hide-sm" onClick={() => router.push("/register")}>
                  Đăng ký
                </Button>
                <Button size="sm" icon={LogIn} onClick={() => router.push(`/login?next=${encodeURIComponent(pathname)}`)}>
                  Đăng nhập
                </Button>
              </>
            )}
          </div>
        </div>
      </header>
      <main className="pub-main">{children}</main>
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "0 16px" }}>
        <Footer />
      </div>
    </>
  );
}
