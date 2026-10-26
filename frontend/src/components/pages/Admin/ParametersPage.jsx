"use client";

import { useMemo, useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { useAction, useApi } from "@/lib/hooks";
import { label, options } from "@/lib/labels";
import { fmtDateTime } from "@/lib/format";
import {
  Button,
  Card,
  DataTable,
  ErrorBox,
  Modal,
  Page,
  PageHeader,
  SchemaForm,
  Select,
  TextInput,
  cleanPayload,
  confirmDialog,
  toast,
  validateRequired,
} from "@/components/ui";

const GROUP_LABELS = {
  AI: "AI phân tích",
  AUTH: "Đăng nhập / tài khoản",
  MATCHING: "Đối soát đối tượng",
  PRECHECK: "Kiểm tra trước quảng cáo",
  REVIEW: "Đánh giá chuyên viên",
  RISK: "Điểm rủi ro",
  UI: "Giao diện",
  VIOLATION: "Xử lý vi phạm",
};

function ValueEditor({ row, onSaved }) {
  const [v, setV] = useState(row.paramValue);
  const [busy, run] = useAction();
  const changed = v !== row.paramValue;
  const save = () =>
    run(async () => {
      try {
        await api.patch(`/parameters/${encodeURIComponent(row.paramKey)}`, { paramValue: String(v) });
        toast.success(`Đã lưu ${row.paramKey}`);
        onSaved();
      } catch (e) {
        toast.error(e);
      }
    });
  return (
    <div className="ui-row" style={{ flexWrap: "nowrap", minWidth: 260 }}>
      {row.valueType === "BOOLEAN" ? (
        <Select value={v} onChange={(e) => setV(e.target.value)} options={[{ value: "true", label: "Bật (true)" }, { value: "false", label: "Tắt (false)" }]} disabled={!row.isEditable} />
      ) : (
        <TextInput
          value={v}
          type={row.valueType === "NUMBER" ? "number" : "text"}
          step="any"
          onChange={(e) => setV(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && changed && save()}
          disabled={!row.isEditable}
        />
      )}
      <Button size="sm" icon={Save} disabled={!changed} loading={busy} onClick={save} aria-label="Lưu" title="Lưu" />
    </div>
  );
}

export default function ParametersPage() {
  const [group, setGroup] = useState("");
  const params = useApi("/parameters");
  const [modal, setModal] = useState(null);
  const [busy, run] = useAction();

  const rows = useMemo(() => (params.data || []).filter((p) => !group || p.paramGroup === group), [params.data, group]);
  const groups = [...new Set((params.data || []).map((p) => p.paramGroup).filter(Boolean))];

  const fields = [
    { name: "paramKey", label: "Mã tham số", required: true, hint: "Chữ in hoa, gạch dưới. VD: MAX_UPLOAD_MB" },
    { name: "paramValue", label: "Giá trị", required: true },
    { name: "valueType", label: "Kiểu giá trị", type: "select", options: options("paramValueType"), placeholder: false },
    { name: "paramGroup", label: "Nhóm" },
    { name: "description", label: "Mô tả", type: "textarea", span: "all", rows: 2 },
  ];

  const create = () =>
    run(async () => {
      const errors = validateRequired(fields, modal.values);
      if (Object.keys(errors).length) return setModal((m) => ({ ...m, errors }));
      try {
        await api.post("/parameters", cleanPayload(fields, modal.values));
        toast.success("Đã thêm tham số");
        setModal(null);
        params.reload();
      } catch (e) {
        toast.error(e);
      }
    });

  const remove = async (p) => {
    if (!(await confirmDialog({ title: "Xóa tham số", message: `Xóa tham số ${p.paramKey}?`, danger: true, confirmText: "Xóa" }))) return;
    try {
      await api.del(`/parameters/${encodeURIComponent(p.paramKey)}`);
      toast.success("Đã xóa");
      params.reload();
    } catch (e) {
      toast.error(e);
    }
  };

  return (
    <Page>
      <PageHeader
        title="Tham số hệ thống"
        subtitle="Ngưỡng AI, số chuyên viên đánh giá chéo, ngưỡng phê duyệt xử phạt, đuôi email cơ quan... Thay đổi có hiệu lực ngay."
        crumbs={["Quản trị hệ thống"]}
        actions={
          <Button icon={Plus} onClick={() => setModal({ values: { valueType: "STRING" }, errors: {} })}>
            Thêm tham số
          </Button>
        }
      />
      <ErrorBox error={params.error} onRetry={params.reload} />
      <Card
        title="Danh sách tham số"
        actions={
          <Select
            value={group}
            onChange={(e) => setGroup(e.target.value)}
            placeholder="Tất cả nhóm"
            options={groups.map((g) => ({ value: g, label: GROUP_LABELS[g] || g }))}
            aria-label="Lọc theo nhóm"
          />
        }
      >
        <DataTable
          loading={params.loading}
          rows={rows}
          rowKey="paramKey"
          minWidth={980}
          columns={[
            { key: "g", title: "Nhóm", nowrap: true, render: (p) => GROUP_LABELS[p.paramGroup] || p.paramGroup },
            {
              key: "k",
              title: "Tham số",
              render: (p) => (
                <>
                  <div className="ui-code">{p.paramKey}</div>
                  <div className="ui-cell-sub">{p.description}</div>
                </>
              ),
            },
            { key: "t", title: "Kiểu", nowrap: true, render: (p) => label("paramValueType", p.valueType) },
            { key: "v", title: "Giá trị", render: (p) => <ValueEditor key={p.paramValue} row={p} onSaved={params.reload} /> },
            { key: "u", title: "Cập nhật", nowrap: true, render: (p) => fmtDateTime(p.updatedAt) },
            {
              key: "x",
              title: "",
              render: (p) => <Button size="sm" variant="danger" icon={Trash2} onClick={() => remove(p)} aria-label="Xóa" title="Xóa" />,
            },
          ]}
        />
      </Card>
      <Modal
        open={!!modal}
        title="Thêm tham số"
        onClose={() => setModal(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(null)}>
              Hủy
            </Button>
            <Button loading={busy} onClick={create}>
              Thêm
            </Button>
          </>
        }
      >
        {modal && <SchemaForm fields={fields} values={modal.values} errors={modal.errors} onChange={(values) => setModal((m) => ({ ...m, values }))} />}
      </Modal>
    </Page>
  );
}
