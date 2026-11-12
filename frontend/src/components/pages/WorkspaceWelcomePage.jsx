"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Briefcase, Building, ShieldCheck, UserCheck, LayoutDashboard } from "lucide-react";
import { PORTALS } from "@/config/portals";
import { getSession } from "@/lib/auth";
import { api } from "@/lib/api";
import { Button, Card } from "@/components/ui";

/**
 * Trang chủ khu vực làm việc (Workspace Welcome Page) cho các vai trò chính thức.
 * Hiển thị thông tin chào mừng <tên người dùng>, chức vụ <ưu tiên vai trò hệ thống, fallback chức vụ công chức>
 * và 1 nút redirect "Bắt đầu làm việc" dẫn tới trang hoạt động nghiệp vụ đầu tiên của role.
 */
export default function WorkspaceWelcomePage({ portalKey }) {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [tasks, setTasks] = useState(null);

  useEffect(() => {
    const s = getSession();
    setSession(s);

    // Lấy thống kê việc cần làm để hiển thị thêm thông tin trực quan nếu có
    api.get("/statistics/my-tasks")
      .then((res) => setTasks(res?.data || res || null))
      .catch(() => {});
  }, []);

  const portal = PORTALS[portalKey] || PORTALS[session?.role] || {};
  const user = session?.user || {};

  // Ưu tiên vai trò hệ thống, fallback về chức vụ công chức
  const displayRoleOrPosition = portal.roleLabel || user.position || "Công chức";
  const userName = user.fullName || user.username || user.email || "người dùng";
  const orgName = session?.department?.name || session?.facility?.name || user.departmentName || null;
  const targetPage = portal.firstPage || portal.nav?.[0]?.href || `${portal.base || ""}/dashboard`;

  return (
    <div style={{ maxWidth: 900, margin: "24px auto", padding: "0 16px" }}>
      <Card>
        <div style={{ textAlign: "center", padding: "32px 16px" }}>
          {/* Badge biểu tượng khu vực */}
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              background: "#eef6ff",
              color: "#0065ff",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 16,
              border: "1px solid #cce5ff",
            }}
          >
            <ShieldCheck size={36} />
          </div>

          <h1 style={{ fontSize: 26, fontWeight: 700, color: "var(--ink-dark, #172b4d)", marginBottom: 8 }}>
            Chào mừng {userName}!
          </h1>

          <p style={{ fontSize: 16, color: "var(--ink-medium, #42526e)", marginBottom: 20 }}>
            Khu vực làm việc chính thức — Hệ thống AI Phát hiện dấu hiệu vi phạm quảng cáo Y tế
          </p>

          <div
            style={{
              display: "inline-flex",
              flexDirection: "column",
              gap: 10,
              background: "#f7f9fc",
              border: "1px solid #eef0f4",
              borderRadius: 12,
              padding: "16px 28px",
              textAlign: "left",
              marginBottom: 28,
              minWidth: 320,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14 }}>
              <UserCheck size={18} color="#0065ff" />
              <span>
                <strong>Chức vụ:</strong> {displayRoleOrPosition}
              </span>
            </div>

            {user.position && portal.roleLabel && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14 }}>
                <Briefcase size={18} color="#0065ff" />
                <span>
                  <strong>Chức danh công tác:</strong> {user.position}
                </span>
              </div>
            )}

            {orgName && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14 }}>
                <Building size={18} color="#0065ff" />
                <span>
                  <strong>Đơn vị:</strong> {orgName}
                </span>
              </div>
            )}
          </div>

          {/* Mô tả nhiệm vụ phân vùng */}
          {portal.moduleLabel && (
            <p
              style={{
                fontSize: 13,
                color: "#6b778c",
                maxWidth: 600,
                margin: "0 auto 28px auto",
                lineHeight: 1.5,
              }}
            >
              <strong>Phạm vi nhiệm vụ:</strong> {portal.moduleLabel}
            </p>
          )}

          {/* Nút Redirect chính */}
          <div>
            <Button
              size="lg"
              variant="primary"
              icon={ArrowRight}
              onClick={() => router.push(targetPage)}
              style={{
                padding: "12px 32px",
                fontSize: 15,
                fontWeight: 600,
                borderRadius: 8,
                boxShadow: "0 4px 12px rgba(0, 101, 255, 0.25)",
              }}
            >
              Bắt đầu làm việc
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
