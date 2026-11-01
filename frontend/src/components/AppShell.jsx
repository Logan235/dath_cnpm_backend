"use client";

import { useState } from "react";
import TopHeader from "./TopHeader";
import Sidebar from "./Sidebar";
import Footer from "./Footer";

/**
 * Khung giao diện (Header + Sidebar + nội dung + Footer) của một khu vực theo vai trò.
 * `nav` lấy từ src/config/portals.js, nên mỗi vai trò thấy sidebar riêng.
 */
function AppShell({ children, nav, base, userName, roleLabel, roles, currentRole, onSwitchRole, onLogout }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <>
      <TopHeader
        onMenuClick={() => setSidebarOpen((open) => !open)}
        userName={userName}
        roleLabel={roleLabel}
        notificationsHref={base ? `${base}/notifications` : null}
        roles={roles}
        currentRole={currentRole}
        onSwitchRole={onSwitchRole}
        onLogout={onLogout}
      />
      <Sidebar nav={nav} isOpen={sidebarOpen} onNavigate={() => setSidebarOpen(false)} />

      {/* Lớp phủ tối phía sau sidebar khi mở trên mobile, bấm vào để đóng lại */}
      <div className={`sidebar-overlay${sidebarOpen ? " is-visible" : ""}`} onClick={() => setSidebarOpen(false)} />

      <div className="app-content">
        <main className="app-main">{children}</main>
        <Footer />
      </div>
    </>
  );
}

export default AppShell;
