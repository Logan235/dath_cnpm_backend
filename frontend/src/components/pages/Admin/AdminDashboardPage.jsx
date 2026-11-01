"use client";

import { useRouter } from "next/navigation";
import { useApi } from "@/lib/hooks";
import { label } from "@/lib/labels";
import { fmtDateTime, fmtNumber } from "@/lib/format";
import { BarList, Card, DataTable, Page, PageHeader, StatCard } from "@/components/ui";

const MODULES = { SYSTEM: "Quản trị hệ thống", INFO_SOURCE: "Nguồn thông tin", AD_PROCESSING: "Xử lý quảng cáo", VIOLATION: "Vi phạm" };

export default function AdminDashboardPage() {
  const router = useRouter();
  const users = useApi("/users", { pageSize: 1 });
  const locked = useApi("/users", { pageSize: 1, status: "LOCKED" });
  const officials = useApi("/users", { pageSize: 1, accountType: "OFFICIAL" });
  const requests = useApi("/role-requests", { pageSize: 1, status: "PENDING" });
  const roles = useApi("/roles");
  const stats = useApi("/audit-logs/stats");
  const logs = useApi("/audit-logs", { pageSize: 8 });

  return (
    <Page>
      <PageHeader title="Tổng quan quản trị" subtitle="Tình hình tài khoản, phân quyền và hoạt động trên hệ thống." />
      <div className="ui-grid ui-grid-4 ui-mb">
        <StatCard label="Người dùng" value={fmtNumber(users.data?.total)} onClick={() => router.push("/admin/system-administration/users")} />
        <StatCard
          label="Form xin cấp quyền chờ duyệt"
          value={fmtNumber(requests.data?.total)}
          tone={requests.data?.total ? "warning" : undefined}
          onClick={() => router.push("/admin/system-administration/role-requests")}
        />
        <StatCard label="Tài khoản bị khóa" value={fmtNumber(locked.data?.total)} tone={locked.data?.total ? "danger" : undefined} onClick={() => router.push("/admin/system-administration/accounts")} />
        <StatCard label="Tài khoản cán bộ (email cơ quan)" value={fmtNumber(officials.data?.total)} />
      </div>
      <div className="ui-grid ui-grid-2">
        <Card title="Người dùng theo vai trò">
          <BarList items={(roles.data || []).map((r) => ({ label: r.roleName, value: r.userCount || 0 }))} />
        </Card>
        <Card title="Hoạt động theo phân hệ">
          <BarList items={(stats.data?.byModule || []).map((m) => ({ label: MODULES[m.module] || m.module, value: m.count }))} />
        </Card>
      </div>
      <Card title="Hoạt động gần đây">
        <DataTable
          minWidth={720}
          loading={logs.loading}
          rows={logs.data?.data || []}
          onRowClick={() => router.push("/admin/system-administration/activity-logs")}
          columns={[
            { key: "t", title: "Thời gian", nowrap: true, render: (r) => fmtDateTime(r.createdAt) },
            { key: "u", title: "Người thực hiện", render: (r) => r.userEmail || "Khách" },
            { key: "r", title: "Vai trò", render: (r) => label("role", r.role) },
            { key: "a", title: "Thao tác", render: (r) => <span className="ui-code">{r.action}</span> },
            { key: "d", title: "Mô tả", render: (r) => r.description },
          ]}
        />
      </Card>
    </Page>
  );
}
