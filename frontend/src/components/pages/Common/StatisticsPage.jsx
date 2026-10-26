"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { api } from "@/lib/api";
import { useApi, useSession } from "@/lib/hooks";
import { label } from "@/lib/labels";
import { fmtMoney, fmtNumber } from "@/lib/format";
import { BarList, Button, Card, DataTable, ErrorBox, Field, Loading, Page, PageHeader, StatCard, StatusBadge, TextInput, toast } from "@/components/ui";

const bars = (arr, group, colorOf) => (arr || []).map((x) => ({ label: x.name || (group ? label(group, x.key) : x.key), value: x.count, color: colorOf?.(x.key) }));
const SEVERITY_COLOR = { LOW: "#7aa7e8", MEDIUM: "#f0ad4e", HIGH: "#e5534b" };

/** Thống kê báo cáo vi phạm (chuyên viên, lãnh đạo, an ninh mạng) */
export default function StatisticsPage() {
  const [range, setRange] = useState({ from: "", to: "" });
  const [applied, setApplied] = useState({});
  const { can } = useSession();
  const st = useApi("/statistics/overview", applied);
  const [exporting, setExporting] = useState(false);
  const d = st.data;
  const t = d?.violations?.totals || {};

  const exportXlsx = async () => {
    setExporting(true);
    try {
      await api.download("/statistics/export", applied, "thong-ke-vi-pham.xlsx");
    } catch (e) {
      toast.error(e);
    } finally {
      setExporting(false);
    }
  };

  return (
    <Page>
      <PageHeader
        title="Thống kê báo cáo vi phạm"
        subtitle="Số liệu tổng hợp hồ sơ vi phạm, mẫu tin quảng cáo, quyết định xử phạt và kiểm tra trước."
        crumbs={["Quản lý thông tin vi phạm"]}
        actions={
          can("statistics.export") && (
            <Button variant="secondary" icon={Download} loading={exporting} onClick={exportXlsx}>
              Xuất báo cáo Excel
            </Button>
          )
        }
      />
      <Card>
        <div className="ui-filters" style={{ marginBottom: 0 }}>
          <Field label="Từ ngày">
            <TextInput type="date" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} />
          </Field>
          <Field label="Đến ngày">
            <TextInput type="date" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} />
          </Field>
          <Button onClick={() => setApplied({ from: range.from || undefined, to: range.to || undefined })}>Xem thống kê</Button>
          <Button
            variant="ghost"
            onClick={() => {
              setRange({ from: "", to: "" });
              setApplied({});
            }}
          >
            Toàn bộ thời gian
          </Button>
        </div>
      </Card>
      <ErrorBox error={st.error} onRetry={st.reload} />
      {!d ? (
        st.loading && <Loading />
      ) : (
        <>
          <div className="ui-grid ui-grid-4 ui-mb">
            <StatCard label="Tổng hồ sơ vi phạm" value={fmtNumber(t.total)} />
            <StatCard label="Đang xử lý" value={fmtNumber(t.open)} tone="warning" />
            <StatCard label="Đã hoàn thành" value={fmtNumber(t.resolved)} tone="success" hint={t.avgDaysToResolve != null ? `TB ${t.avgDaysToResolve} ngày / hồ sơ` : undefined} />
            <StatCard label="Vi phạm nghiêm trọng" value={fmtNumber(t.high)} tone="danger" />
          </div>
          <div className="ui-grid ui-grid-4 ui-mb">
            <StatCard label="Quyết định xử phạt" value={fmtNumber(d.penalties?.decisions)} />
            <StatCard label="Tổng tiền phạt" value={fmtMoney(d.penalties?.totalFine)} />
            <StatCard label="Quyết định chờ phê duyệt" value={fmtNumber(d.penalties?.pending)} tone={d.penalties?.pending ? "warning" : undefined} />
            <StatCard label="Hồ sơ bị bác bỏ" value={fmtNumber(t.dismissed)} />
          </div>
          <div className="ui-grid ui-grid-2">
            <Card title="Hồ sơ theo trạng thái">
              <BarList items={bars(d.violations.byStatus, "violationStatus")} />
            </Card>
            <Card title="Hồ sơ theo mức độ">
              <BarList items={bars(d.violations.bySeverity, "severity", (k) => SEVERITY_COLOR[k])} />
            </Card>
            <Card title="Theo loại vi phạm">
              <BarList items={bars(d.violations.byType)} />
            </Card>
            <Card title="Theo lĩnh vực">
              <BarList items={bars(d.violations.byField, "field")} />
            </Card>
            <Card title="Theo quận / huyện">
              <BarList items={bars(d.violations.byDistrict)} />
            </Card>
            <Card title="Theo tháng phát hiện">
              <BarList items={bars(d.violations.byMonth)} />
            </Card>
            <Card title="Nguồn phát hiện">
              <BarList items={bars(d.violations.bySource, "adSource")} />
            </Card>
            <Card title="Kết quả kiểm tra trước quảng cáo">
              <BarList items={bars(d.prechecks, "precheckResult")} />
            </Card>
            <Card title="Mẫu tin theo trạng thái xử lý">
              <BarList items={bars(d.adItems?.byStatus, "adStatus")} />
            </Card>
            <Card title="Mẫu tin theo nền tảng">
              <BarList items={bars(d.adItems?.byPlatform, "platform")} />
            </Card>
          </div>
          <Card title="Cơ sở có điểm rủi ro cao nhất">
            <DataTable
              minWidth={620}
              rows={d.topRiskFacilities || []}
              columns={[
                {
                  key: "n",
                  title: "Cơ sở",
                  render: (f) => (
                    <>
                      <div className="ui-cell-main">{f.name}</div>
                      <div className="ui-cell-sub ui-code">{f.code}</div>
                    </>
                  ),
                },
                { key: "d", title: "Quận / huyện", render: (f) => f.district },
                { key: "c", title: "Số vi phạm", num: true, render: (f) => f.violationCount },
                { key: "s", title: "Điểm rủi ro", num: true, render: (f) => Number(f.riskScore).toFixed(0) },
                { key: "l", title: "Mức rủi ro", render: (f) => <StatusBadge group="riskLevel" value={f.riskLevel} /> },
              ]}
            />
          </Card>
        </>
      )}
    </Page>
  );
}
