"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AVATAR_SRC, LOGO_SRC } from "@/assets/icons";
import { Menu as MenuIcon, LogOut, Bell } from "lucide-react";
import { api } from "@/lib/api";
import { label } from "@/lib/labels";

function useUnreadCount(enabled) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!enabled) return undefined;
    let alive = true;
    const load = () =>
      api
        .get("/notifications/unread-count")
        .then((d) => alive && setCount(d?.unread || 0))
        .catch(() => {});
    load();
    const t = setInterval(load, 60000);
    window.addEventListener("admonitor-notifications", load);
    return () => {
      alive = false;
      clearInterval(t);
      window.removeEventListener("admonitor-notifications", load);
    };
  }, [enabled]);
  return count;
}

function TopHeader({ onMenuClick, userName = "", roleLabel = "", notificationsHref, roles = [], currentRole, onSwitchRole, onLogout }) {
  const unread = useUnreadCount(!!notificationsHref);
  return (
    <header
      className="app-header"
      style={{
        background: "rgba(255,255,255,0.7)",
        backdropFilter: "blur(5px)",
        WebkitBackdropFilter: "blur(5px)",
        border: "1px solid #ffffff",
        borderRadius: 8,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px",
        boxShadow: "0 1px 9px -3px rgba(0,0,0,0.08)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 20, minWidth: 0 }}>
        {/* Nút hamburger: ẩn trên desktop, hiện trên mobile qua CSS (.menu-toggle-btn) */}
        <button type="button" className="menu-toggle-btn" onClick={onMenuClick} aria-label="Mở/đóng menu">
          <MenuIcon size={22} strokeWidth={2.5} color="#29346B" />
        </button>

        <div className="app-header-org" style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <img
            src={LOGO_SRC}
            alt="Sở Y tế TP. Hồ Chí Minh"
            style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "contain", flexShrink: 0 }}
          />
          <div className="app-header-org-text" style={{ lineHeight: 1.25 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: "#1a2b4a" }}>SỞ Y TẾ</div>
            <div style={{ fontWeight: 700, fontSize: 13, color: "#1a2b4a" }}>TP. HỒ CHÍ MINH</div>
          </div>
        </div>
        <div className="app-header-title" style={{ fontWeight: 700, fontSize: 22, color: "#1a1a1a", marginLeft: 8 }}>
          AI phát hiện dấu hiệu vi phạm trong y tế
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
        {notificationsHref && (
          <Link href={notificationsHref} className="header-logout-btn" title="Thông báo" aria-label={`Thông báo (${unread} chưa đọc)`} style={{ position: "relative" }}>
            <Bell size={18} />
            {unread > 0 && (
              <span
                style={{
                  position: "absolute",
                  top: -4,
                  right: -4,
                  minWidth: 18,
                  height: 18,
                  borderRadius: 9,
                  background: "#e93323",
                  color: "#fff",
                  fontSize: 10.5,
                  fontWeight: 700,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "0 4px",
                }}
              >
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </Link>
        )}
        <img
          src={AVATAR_SRC}
          alt=""
          style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
        />
        <div className="app-header-user" style={{ lineHeight: 1.25, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: "#1a1a1a" }}>{userName}</div>
          {roles.length > 1 && onSwitchRole ? (
            <select
              value={currentRole || ""}
              onChange={(e) => onSwitchRole(e.target.value)}
              aria-label="Đổi vai trò"
              style={{ fontSize: 12, color: "#3577DB", border: "none", background: "transparent", padding: 0, cursor: "pointer", maxWidth: 200 }}
            >
              {roles.map((r) => (
                <option key={r} value={r}>
                  {label("role", r)}
                </option>
              ))}
            </select>
          ) : (
            <div style={{ fontSize: 12, color: "#8891a5" }}>{roleLabel}</div>
          )}
        </div>
        {onLogout && (
          <button type="button" className="header-logout-btn" onClick={onLogout} title="Đăng xuất" aria-label="Đăng xuất">
            <LogOut size={18} />
          </button>
        )}
      </div>
    </header>
  );
}

export default TopHeader;
