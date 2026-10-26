"use client";

import { useRouter } from "next/navigation";
import { useApi, useSession } from "@/lib/hooks";
import { PORTALS } from "@/config/portals";
import { label } from "@/lib/labels";
import { fmtDateTime, fmtMoney, fmtNumber } from "@/lib/format";
import { BarList, Card, DataTable, ErrorBox, Page, PageHeader, StatCard, StatusBadge } from "@/components/ui";

/** Ô "việc cần làm" theo vai trò: key trong /statistics/my-tasks -> nhãn + trang mở ra */
const TASKS = {
  SPECIALIST: [
    { key: "itemsWaitingQc", label: "Mẫu tin chờ kiểm tra nhanh", href: "/specialist/collect-results" },
    { key: "reviewQueue", label: "Mẫu tin chờ đánh giá (AI đã phân tích)", href: "/specialist/extract-results" },
    { key: "assignedToMe", label: "Mẫu tin tôi đang nhận xử lý", href: "/specialist/extract-results?scope=mine" },
    { key: "violationsToProcess", label: "Hồ sơ vi phạm cần xử lý", href: "/specialist/violations" },
    { key: "feedbacksToHandle", label: "Phản hồi của cơ sở chờ xử lý", href: "/specialist/facility-feedback" },
    { key: "prechecksToReview", label: "Kiểm tra trước chờ xác minh", href: "/specialist/prechecks" },
    { key: "unreadNotifications", label: "Thông báo chưa đọc", href: "/specialist/notifications" },
  ],
  MANAGER: [
    { key: "penaltiesPendingApproval", label: "Quyết định xử phạt chờ phê duyệt", href: "/manager/handling", tone: "warning" },
    { key: "reviewConflicts", label: "Mẫu tin đánh giá xung đột", href: "/manager/conflicts", tone: "danger" },
    { key: "roleRequestsPending", label: "Form xin cấp quyền chờ duyệt", href: "/manager/role-requests" },
    { key: "prechecksToReview", label: "Kiểm tra trước chờ xác minh", href: "/manager/prechecks" },
    { key: "reviewQueue", label: "Mẫu tin chờ đánh giá", href: "/manager/conflicts" },
    { key: "unreadNotifications", label: "Thông báo chưa đọc", href: "/manager/notifications" },
  ],
  CYBER_POLICE: [
    { key: "casesToHandle", label: "Hồ sơ được chuyển cần xử lý", href: "/cyber-security/cases", tone: "warning" },
    { key: "matchCandidates", label: "Cặp đối tượng cần đối soát", href: "/cyber-security/match-candidates" },
    { key: "unreadNotifications", label: "Thông báo chưa đọc", href: "/cyber-security/notifications" },
  ],
};

function SuspectOverview({ base }) {
  const router = useRouter();
  const d = useApi("/suspects/dashboard");
  if (!d.data) return null;
  const k = d.data.kpi || {};
  return (
    <>
      <div className="ui-grid ui-grid-4 ui-mb">
        <StatCard label="Đối tượng đang quản lý" value={fmtNumber(k.totalEntities)} />
        <StatCard label="Đối tượng rủi ro cao" value={fmtNumber(k.highRiskEntities)} tone="danger" />
        <StatCard label="Vi phạm chưa xác định đối tượng" value={fmtNumber(k.violationsPendingIdentification)} tone="warning" />
        <StatCard label="Hồ sơ phối hợp đang mở" value={fmtNumber(k.openCases)} />
      </div>
      <div className="ui-grid ui-grid-2">
        <Card title="Đối tượng có điểm rủi ro cao nhất">
          <DataTable
            minWidth={420}
            rows={d.data.topRiskEntities || []}
            onRowClick={(s) => router.push(`${base}/suspects/detail?id=${s.id}`)}
            columns={[
              {
                key: "n",
                title: "Đối tượng",
                render: (s) => (
                  <>
                    <div className="ui-cell-main">{s.name}</div>
                    <div className="ui-cell-sub ui-code">{s.code}</div>
                  </>
                ),
              },
              { key: "s", title: "Điểm", num: true, render: (s) => Number(s.riskScore).toFixed(0) },
              { key: "l", title: "Mức", render: (s) => <StatusBadge group="riskLevel" value={s.riskLevel} /> },
            ]}
          />
        </Card>
        <Card title="Vi phạm theo quận / huyện">
          <BarList items={(d.data.violationHeatmapByDistrict || []).map((x) => ({ label: x.district, value: x.violations }))} />
        </Card>
      </div>
    </>
  );
}

/** Trang "Việc cần làm" của chuyên viên / lãnh đạo / an ninh mạng */
export default function DashboardPage() {
  const router = useRouter();
  const { role, session } = useSession();
  const tasks = useApi(role ? "/statistics/my-tasks" : null);
  const st = useApi(role ? "/statistics/overview" : null);
  const base = PORTALS[role]?.base || "";
  const defs = TASKS[role] || [];
  const t = st.data?.violations?.totals || {};

  return (
    <Page>
      <PageHeader
        title={`Xin chào, ${session?.user?.fullName || ""}`}
        subtitle={`${label("role", role)} — các việc đang chờ bạn xử lý. Bấm vào ô để mở danh sách.`}
      />
      <ErrorBox error={tasks.error} onRetry={tasks.reload} />
      <div className="ui-grid ui-grid-4 ui-mb">
        {defs.map((d) => {
          const v = tasks.data?.[d.key];
          return (
            <StatCard key={d.key} label={d.label} value={tasks.data ? fmtNumber(v ?? 0) : "…"} tone={v ? d.tone : undefined} onClick={() => router.push(d.href)} />
          );
        })}
      </div>

      {role === "CYBER_POLICE" && <SuspectOverview base={base} />}

      {st.data && (
        <>
          <div className="ui-grid ui-grid-4 ui-mb">
            <StatCard label="Tổng hồ sơ vi phạm" value={fmtNumber(t.total)} />
            <StatCard label="Đang xử lý" value={fmtNumber(t.open)} tone="warning" />
            <StatCard label="Đã hoàn thành" value={fmtNumber(t.resolved)} tone="success" />
            <StatCard label="Tổng tiền phạt đã ban hành" value={fmtMoney(st.data.penalties?.totalFine)} />
          </div>
          <div className="ui-grid ui-grid-2">
            <Card title="Hồ sơ vi phạm theo trạng thái">
              <BarList items={(st.data.violations.byStatus || []).map((x) => ({ label: label("violationStatus", x.key), value: x.count }))} />
            </Card>
            <Card title="Mẫu tin theo bước xử lý">
              <BarList items={(st.data.adItems?.byStatus || []).map((x) => ({ label: label("adStatus", x.key), value: x.count }))} />
            </Card>
          </div>
          <div className="ui-muted" style={{ fontSize: 12 }}>
            Cập nhật lúc {fmtDateTime(st.data.generatedAt)}
          </div>
        </>
      )}
    </Page>
  );
}
