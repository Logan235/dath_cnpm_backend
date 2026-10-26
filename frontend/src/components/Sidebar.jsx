"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { COLORS } from "@/constants/colors";
import { ChevronDown, ChevronRight } from "lucide-react";

// Mục đang được xem: khớp đúng href, trang con của href, hoặc các trang phụ khai báo trong `also`
function matches(pathname, item) {
  if (!item.href) return false;
  const targets = [item.href, ...(item.also || [])];
  return targets.some((t) => pathname === t || pathname.startsWith(t + "/"));
}

/**
 * Sidebar nhận danh sách menu `nav` của khu vực (vai trò) hiện tại — xem src/config/portals.js
 * Nhóm menu chứa trang đang xem tự mở; các nhóm khác mở khi người dùng bấm vào.
 */
function Sidebar({ nav = [], isOpen: mobileOpen = false, onNavigate }) {
  const pathname = usePathname() || "";
  const [openMenus, setOpenMenus] = useState([]);

  // Tự mở nhóm menu chứa trang đang xem
  useEffect(() => {
    const active = nav.filter((g) => g.children?.some((c) => matches(pathname, c))).map((g) => g.key);
    if (active.length) setOpenMenus((prev) => [...new Set([...prev, ...active])]);
  }, [pathname, nav]);

  const toggleMenu = (key) => {
    setOpenMenus((previous) =>
      previous.includes(key) ? previous.filter((item) => item !== key) : [...previous, key]
    );
  };

  const itemBase = {
    display: "flex",
    alignItems: "center",
    gap: 10,
    width: 207,
    height: 41,
    padding: "8px 12px",
    borderRadius: 5.7,
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 500,
    boxSizing: "border-box",
    textDecoration: "none",
  };

  return (
    <nav
      className={`app-sidebar${mobileOpen ? " is-open" : ""}`}
      aria-label="Menu chức năng"
      style={{
        background: "#fff",
        borderRadius: 8,
        boxShadow: "0 1px 9px -3px rgba(0,0,0,0.05)",
        overflowY: "auto",
        padding: "9px",
        boxSizing: "border-box",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {nav.map((item) => {
          const hasChildren = !!item.children;
          const childActive = hasChildren && item.children.some((c) => matches(pathname, c));
          const isOpen = openMenus.includes(item.key);
          const isActiveParent = matches(pathname, item) || childActive;

          const content = (
            <div
              style={{
                ...itemBase,
                color: isActiveParent ? COLORS.sidebarActiveText : COLORS.sidebarText,
                background: isActiveParent ? COLORS.sidebarActiveBg : "transparent",
              }}
            >
              <img src={item.iconSrc} alt="" style={{ width: 24, height: 24, objectFit: "contain", flexShrink: 0 }} />
              <span style={{ flex: 1 }}>{item.label}</span>
              {hasChildren &&
                (isOpen ? <ChevronDown size={14} color="#777" /> : <ChevronRight size={14} color="#777" />)}
            </div>
          );

          return (
            <div key={item.key}>
              {hasChildren ? (
                <button
                  type="button"
                  onClick={() => toggleMenu(item.key)}
                  aria-expanded={isOpen}
                  style={{ all: "unset", display: "block", cursor: "pointer", borderRadius: 5.7 }}
                  className="sidebar-group-btn"
                >
                  {content}
                </button>
              ) : (
                <Link href={item.href || "#"} style={{ textDecoration: "none", display: "block" }} onClick={onNavigate}>
                  {content}
                </Link>
              )}

              {hasChildren && isOpen && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                    background: "#F6F8FD",
                    borderRadius: 5.7,
                    padding: "4px 0",
                    marginTop: 2,
                  }}
                >
                  {item.children.map((child) => {
                    const isActive = matches(pathname, child);
                    return (
                      <Link
                        key={child.key}
                        href={child.href || "#"}
                        onClick={onNavigate}
                        aria-current={isActive ? "page" : undefined}
                        style={{
                          ...itemBase,
                          width: "auto",
                          height: 36,
                          paddingLeft: 43,
                          color: isActive ? COLORS.sidebarActiveText : "#444",
                          background: "transparent",
                          fontWeight: isActive ? 600 : 400,
                          borderRadius: 0,
                          textDecoration: "none",
                        }}
                      >
                        {child.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </nav>
  );
}

export default Sidebar;
