"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import AppShell from "./AppShell";
import { PORTALS, homeFor } from "@/config/portals";
import { fetchMe, getSession, logout, refreshWithRole, saveSession } from "@/lib/auth";

/**
 * Bọc toàn bộ một khu vực (vd. /admin/...). Chỉ hiển thị khi:
 *  - đã đăng nhập, và
 *  - vai trò trong phiên đúng bằng vai trò của khu vực này.
 * Sai vai trò => chuyển về trang chủ của vai trò mình. Chưa đăng nhập / token hết hạn => /login.
 * Cán bộ (email cơ quan) chưa được cấp vai trò => /role-request.
 */
export default function PortalShell({ portal: portalKey, children }) {
  const router = useRouter();
  const pathname = usePathname();
  const portal = PORTALS[portalKey];
  const [session, setSession] = useState(null);

  useEffect(() => {
    const s = getSession();
    if (!s?.accessToken) {
      router.replace(`/login?next=${encodeURIComponent(pathname || portal.home)}`);
      return;
    }
    if (!s.role) {
      router.replace("/role-request");
      return;
    }
    if (!PORTALS[s.role]) {
      logout();
      router.replace("/login");
      return;
    }
    if (s.role !== portalKey) {
      router.replace(homeFor(s));
      return;
    }
    setSession(s);

    // Hỏi lại backend: token còn hợp lệ không, quyền hiện tại là gì (admin có thể vừa đổi quyền)
    let cancelled = false;
    fetchMe(s.accessToken).then(async (res) => {
      if (cancelled) return;
      if (res.status === "unauthorized") {
        const r = await refreshWithRole(s.role);
        if (cancelled) return;
        if (r.ok && r.session.role === portalKey) {
          setSession(r.session);
          return;
        }
        logout();
        router.replace(`/login?expired=1&next=${encodeURIComponent(pathname || portal.home)}`);
        return;
      }
      if (res.status === "ok") {
        if (res.data?.role !== portalKey) {
          logout();
          router.replace("/login?expired=1");
          return;
        }
        const next = {
          ...getSession(),
          permissions: res.data.permissions || [],
          user: { ...(s.user || {}), ...(res.data.user || {}) },
          availableRoles: res.data.user?.roles || s.availableRoles || [],
          department: res.data.department,
          facility: res.data.facility,
        };
        saveSession(next);
        setSession(next);
      }
    });
    return () => {
      cancelled = true;
    };
    // Chỉ kiểm tra khi vào khu vực; điều hướng giữa các trang trong khu vực không cần kiểm tra lại
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [portalKey]);

  if (!session) {
    return (
      <div className="portal-checking" role="status">
        Đang kiểm tra phiên đăng nhập…
      </div>
    );
  }

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  const handleSwitchRole = async (role) => {
    const r = await refreshWithRole(role);
    if (r.ok) window.location.href = homeFor(r.session);
  };

  return (
    <AppShell
      nav={portal.nav}
      base={portal.base}
      userName={session.user?.fullName || session.user?.username || ""}
      roleLabel={portal.roleLabel}
      roles={(session.availableRoles || []).filter((r) => PORTALS[r])}
      currentRole={session.role}
      onSwitchRole={handleSwitchRole}
      onLogout={handleLogout}
    >
      {children}
    </AppShell>
  );
}
