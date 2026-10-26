"use client";

import { useState } from "react";
import { Tags } from "lucide-react";
import { api } from "@/lib/api";
import { useAction, useApi, useOptions, usePaged } from "@/lib/hooks";
import { label, options } from "@/lib/labels";
import { truncate } from "@/lib/format";
import {
  BarList,
  Button,
  Card,
  Field,
  FilterBar,
  FilterSelect,
  Modal,
  PagedTable,
  Page,
  PageHeader,
  SchemaForm,
  StatusBadge,
  TextInput,
  toast,
} from "@/components/ui";
import { AdItemModal } from "../AdProcessing/common";

const FIELD_OPTS = options("field").filter((o) => o.value !== "CHUA_PHAN_LOAI");
const SUBJECT_OPTS = options("adSubject").filter((o) => o.value !== "CHUA_PHAN_LOAI");
const SUSPICION_OPTS = options("riskLevel");
const NONE = "Chưa phân loại";
const bars = (arr, group) => (arr || []).map((x) => ({ label: x.key === "CHUA_PHAN_LOAI" ? NONE : label(group, x.key), value: x.count }));

/** Phân loại tin: thống kê mẫu tin theo lĩnh vực / đối tượng / định dạng / nguồn và gán phân loại */
export default function DataClassificationPage() {
  const [range, setRange] = useState({});
  const stats = useApi("/ad-items/classification/stats", range);
  const topics = useOptions("/topics", (t) => ({ value: t.id, label: t.name }));
  const list = usePaged("/ad-items", {});
  const [edit, setEdit] = useState(null);
  const [viewId, setViewId] = useState(null);
  const [busy, run] = useAction();
  const s = stats.data || {};

  const fields = [
    { name: "field", label: "Lĩnh vực", type: "select", options: FIELD_OPTS },
    { name: "adSubject", label: "Đối tượng quảng cáo", type: "select", options: SUBJECT_OPTS },
    { name: "suspicionLevel", label: "Mức nghi vấn", type: "select", options: SUSPICION_OPTS },
    { name: "dataFormat", label: "Định dạng dữ liệu", type: "select", options: options("dataFormat") },
    { name: "topicId", label: "Chủ đề", type: "select", numeric: true, options: topics },
  ];

  const save = () =>
    run(async () => {
      const body = {};
      for (const f of fields) {
        const v = edit.values[f.name];
        if (v !== "" && v !== undefined && v !== null) body[f.name] = f.numeric ? Number(v) : v;
      }
      try {
        await api.patch(`/ad-items/${edit.id}/classification`, body);
        toast.success("Đã cập nhật phân loại");
        setEdit(null);
        list.reload();
        stats.reload();
      } catch (e) {
        toast.error(e);
      }
    });

  return (
    <Page>
      <PageHeader
        title="Quản lý phân loại tin"
        subtitle="Mẫu tin được phân loại theo lĩnh vực, đối tượng quảng cáo, định dạng, nguồn và mức nghi vấn (AI tự gán, chuyên viên chỉnh lại khi cần)."
        crumbs={["Quản lý nguồn thông tin"]}
      />
      <Card>
        <div className="ui-filters" style={{ marginBottom: 0 }}>
          <Field label="Thu thập từ ngày">
            <TextInput type="date" value={range.from || ""} onChange={(e) => setRange({ ...range, from: e.target.value || undefined })} />
          </Field>
          <Field label="đến ngày">
            <TextInput type="date" value={range.to || ""} onChange={(e) => setRange({ ...range, to: e.target.value || undefined })} />
          </Field>
        </div>
      </Card>
      <div className="ui-grid ui-grid-3">
        <Card title="Theo lĩnh vực">
          <BarList items={bars(s.byField, "field")} />
        </Card>
        <Card title="Theo đối tượng quảng cáo">
          <BarList items={bars(s.bySubject, "adSubject")} />
        </Card>
        <Card title="Theo mức nghi vấn">
          <BarList items={bars(s.bySuspicion, "riskLevel")} />
        </Card>
        <Card title="Theo nền tảng">
          <BarList items={bars(s.bySource, "platform")} />
        </Card>
        <Card title="Theo định dạng">
          <BarList items={bars(s.byFormat, "dataFormat")} />
        </Card>
        <Card title="Theo nguồn tin">
          <BarList items={bars(s.bySourceType, "adSource")} />
        </Card>
      </div>
      <Card title={`Mẫu tin (${list.total})`}>
        <FilterBar list={list} searchPlaceholder="Mã, nội dung">
          <FilterSelect list={list} name="field" label="Lĩnh vực" options={FIELD_OPTS} />
          <FilterSelect list={list} name="suspicionLevel" label="Mức nghi vấn" options={SUSPICION_OPTS} />
          <FilterSelect list={list} name="dataFormat" label="Định dạng" options={options("dataFormat")} />
          <FilterSelect list={list} name="status" label="Bước xử lý" options={options("adStatus")} />
        </FilterBar>
        <PagedTable
          list={list}
          minWidth={980}
          onRowClick={(r) => setViewId(r.id)}
          columns={[
            {
              key: "c",
              title: "Mẫu tin",
              render: (r) => (
                <>
                  <span className="ui-code">{r.code}</span>
                  <div style={{ fontSize: 13, marginTop: 3 }}>{truncate(r.content, 120)}</div>
                </>
              ),
            },
            { key: "f", title: "Lĩnh vực", render: (r) => label("field", r.field) || <span className="ui-muted">{NONE}</span> },
            { key: "sj", title: "Đối tượng", render: (r) => label("adSubject", r.adSubject) || <span className="ui-muted">—</span> },
            { key: "lv", title: "Nghi vấn", render: (r) => (r.suspicionLevel ? <StatusBadge group="riskLevel" value={r.suspicionLevel} /> : <span className="ui-muted">—</span>) },
            { key: "df", title: "Định dạng", render: (r) => label("dataFormat", r.dataFormat) },
            { key: "st", title: "Bước", render: (r) => <StatusBadge group="adStatus" value={r.status} /> },
            {
              key: "x",
              title: "",
              render: (r) => (
                <Button
                  size="sm"
                  variant="secondary"
                  icon={Tags}
                  onClick={(e) => {
                    e.stopPropagation();
                    setEdit({ id: r.id, code: r.code, values: { field: r.field || "", adSubject: r.adSubject || "", suspicionLevel: r.suspicionLevel || "", dataFormat: r.dataFormat || "", topicId: r.topicId || "" } });
                  }}
                >
                  Phân loại
                </Button>
              ),
            },
          ]}
        />
      </Card>
      <Modal
        open={!!edit}
        width={640}
        title={edit ? `Phân loại mẫu tin ${edit.code}` : ""}
        onClose={() => setEdit(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEdit(null)}>
              Hủy
            </Button>
            <Button loading={busy} onClick={save}>
              Lưu phân loại
            </Button>
          </>
        }
      >
        {edit && <SchemaForm fields={fields} values={edit.values} onChange={(values) => setEdit({ ...edit, values })} />}
      </Modal>
      {viewId && <AdItemModal id={viewId} onClose={() => setViewId(null)} />}
    </Page>
  );
}
