"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { api } from "@/lib/api";
import { useApi, usePaged } from "@/lib/hooks";
import { label } from "@/lib/labels";
import { fmtDateTime } from "@/lib/format";
import {
  BarList,
  Button,
  Card,
  Field,
  FilterBar,
  FilterSelect,
  InfoGrid,
  Modal,
  PagedTable,
  Page,
  PageHeader,
  TextInput,
  toast,
} from "@/components/ui";

const MODULES = [
  { value: "SYSTEM", label: "Quản trị hệ thống" },
  { value: "INFO_SOURCE", label: "Nguồn thông tin" },
  { value: "AD_PROCESSING", label: "Xử lý quảng cáo" },
  { value: "VIOLATION", label: "Vi phạm" },
];
const moduleLabel = (m) => MODULES.find((x) => x.value === m)?.label || m;

export default function AuditLogsPage() {
  const list = usePaged("/audit-logs", {});
  const stats = useApi("/audit-logs/stats");
  const [detail, setDetail] = useState(null);
  const [exporting, setExporting] = useState(false);

  const actions = (stats.data?.byAction || []).map((a) => ({ value: a.action, label: a.action }));

  const exportXlsx = async () => {
    setExporting(true);
    try {
      await api.download("/audit-logs/export", list.filters, "nhat-ky-hoat-dong.xlsx");
    } catch (e) {
      toast.error(e);
    } finally {
      setExporting(false);
    }
  };

  return (
    <Page>
      <PageHeader
        title="Nhật ký hoạt động"
        subtitle="Mọi thao tác thêm / sửa / xóa / duyệt / đăng nhập đều được ghi lại kèm người thực hiện, vai trò, địa chỉ IP."
        crumbs={["Quản trị hệ thống"]}
        actions={
          <Button variant="secondary" icon={Download} loading={exporting} onClick={exportXlsx}>
            Xuất Excel
          </Button>
        }
      />
      <div className="ui-grid ui-grid-2">
        <Card title="Theo loại thao tác">
          <BarList items={(stats.data?.byAction || []).slice(0, 8).map((a) => ({ label: a.action, value: a.count }))} />
        </Card>
        <Card title="Theo phân hệ">
          <BarList items={(stats.data?.byModule || []).map((a) => ({ label: moduleLabel(a.module), value: a.count }))} />
        </Card>
      </div>
      <Card title="Nhật ký">
        <FilterBar list={list} searchPlaceholder="Email, mô tả, mã đối tượng">
          <FilterSelect list={list} name="module" label="Phân hệ" options={MODULES} />
          <FilterSelect list={list} name="action" label="Thao tác" options={actions} />
          <Field label="Từ ngày">
            <TextInput type="date" value={list.filters.from || ""} onChange={(e) => list.setFilter("from", e.target.value)} />
          </Field>
          <Field label="Đến ngày">
            <TextInput type="date" value={list.filters.to || ""} onChange={(e) => list.setFilter("to", e.target.value)} />
          </Field>
        </FilterBar>
        <PagedTable
          list={list}
          minWidth={980}
          onRowClick={setDetail}
          columns={[
            { key: "t", title: "Thời gian", nowrap: true, render: (r) => fmtDateTime(r.createdAt) },
            {
              key: "u",
              title: "Người thực hiện",
              render: (r) => (
                <>
                  <div className="ui-cell-main">{r.userEmail || "Khách"}</div>
                  <div className="ui-cell-sub">{label("role", r.role)}</div>
                </>
              ),
            },
            { key: "a", title: "Thao tác", render: (r) => <span className="ui-code">{r.action}</span> },
            { key: "m", title: "Phân hệ", render: (r) => moduleLabel(r.module) },
            { key: "d", title: "Mô tả", render: (r) => r.description },
            { key: "ip", title: "IP", nowrap: true, render: (r) => r.ipAddress },
          ]}
        />
      </Card>
      <Modal open={!!detail} title="Chi tiết nhật ký" onClose={() => setDetail(null)}>
        {detail && (
          <InfoGrid
            items={[
              { label: "Thời gian", value: fmtDateTime(detail.createdAt) },
              { label: "Người thực hiện", value: detail.userEmail },
              { label: "Vai trò", value: label("role", detail.role) },
              { label: "Thao tác", value: detail.action },
              { label: "Phân hệ", value: moduleLabel(detail.module) },
              { label: "Đối tượng", value: [detail.entityType, detail.entityId].filter(Boolean).join(" #") },
              { label: "Mô tả", value: detail.description, wide: true },
              { label: "Địa chỉ IP", value: detail.ipAddress },
              { label: "Trình duyệt", value: detail.userAgent },
              {
                label: "Dữ liệu kèm theo",
                wide: true,
                value: detail.metadata ? <pre className="ui-note" style={{ margin: 0, overflowX: "auto" }}>{JSON.stringify(detail.metadata, null, 2)}</pre> : null,
              },
            ]}
          />
        )}
      </Modal>
    </Page>
  );
}
