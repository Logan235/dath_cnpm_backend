"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { refreshWithRole, getSession } from "@/lib/auth";
import { homeFor } from "@/config/portals";
import { AlertCircle, CheckCircle2, XCircle, ArrowRight, RefreshCw } from "lucide-react";

export default function RoleRequestStatusBanner() {
  const router = useRouter();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(false);
  const session = getSession();

  useEffect(() => {
    if (!session?.accessToken) return;
    api.get("/role-requests/mine")
      .then((res) => {
        const list = Array.isArray(res) ? res : res?.data || [];
        if (list.length > 0) {
          setRequest(list[0]);
        }
      })
      .catch(() => {});
  }, [session?.accessToken]);

  if (!request) return null;

  const handleRefreshSession = async () => {
    setLoading(true);
    try {
      const r = await refreshWithRole();
      if (r.ok && r.session.role) {
        router.replace(homeFor(r.session));
      } else {
        router.reload?.() || window.location.reload();
      }
    } catch {
      window.location.reload();
    } finally {
      setLoading(false);
    }
  };

  const status = request.status;
  if (status === "APPROVED" && session?.role) return null; // Đã có role rồi thì không cần banner nữa

  let bg = "#eef6ff";
  let border = "#b9e0ff";
  let icon = <AlertCircle size={18} color="#0065ff" />;
  let text = `Yêu cầu cấp quyền vai trò ${request.requestedRoleCode || ""} đang chờ Quản trị viên / Lãnh đạo phê duyệt.`;

  if (status === "APPROVED") {
    bg = "#e6f4ea";
    border = "#ceead6";
    icon = <CheckCircle2 size={18} color="#137333" />;
    text = `Yêu cầu cấp quyền ${request.requestedRoleCode} của bạn ĐÃ ĐƯỢC DUYỆT! Bấm vào đây để vào khu vực làm việc.`;
  } else if (status === "REJECTED") {
    bg = "#fce8e6";
    border = "#fad2cf";
    icon = <XCircle size={18} color="#c5221f" />;
    text = `Yêu cầu cấp quyền bị từ chối${request.reviewNote ? `: ${request.reviewNote}` : ""}. Bạn có thể gửi lại đơn mới.`;
  }

  return (
    <div
      style={{
        background: bg,
        borderBottom: `1px solid ${border}`,
        padding: "10px 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        fontSize: 13,
        color: "#202124",
        zIndex: 105,
        position: "relative",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
        {icon}
        <span>{text}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        {status === "APPROVED" ? (
          <button
            onClick={handleRefreshSession}
            disabled={loading}
            className="ui-btn ui-btn-primary"
            style={{ fontSize: 12, padding: "4px 10px", display: "flex", alignItems: "center", gap: 4 }}
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            <span>Vào khu vực làm việc ngay</span>
          </button>
        ) : (
          <button
            onClick={() => router.push("/role-request")}
            className="ui-btn ui-btn-outline"
            style={{ fontSize: 12, padding: "4px 10px", display: "flex", alignItems: "center", gap: 4 }}
          >
            <span>Chi tiết đơn</span>
            <ArrowRight size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
