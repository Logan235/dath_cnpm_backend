"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Download, FileSpreadsheet, Plus } from "lucide-react";
import { api } from "@/lib/api";
import { portalPath } from "@/lib/auth";
import { useAction, useOptions, usePaged, useSession } from "@/lib/hooks";
import { label, options } from "@/lib/labels";
import { fmtDate, truncate } from "@/lib/format";
import {
  Alert,
  Button,
  Card,
  Field,
  FilePicker,
  FilterBar,
  FilterSelect,
  Modal,
  PagedTable,
  Page,
  PageHeader,
  SchemaForm,
  StatusBadge,
  TextInput,
  cleanPayload,
  toast,
  validateRequired,
} from "@/components/ui";
import { ViolationTypeChips, useViolationTypes } from "../AdProcessing/common";

export function useViolationFormFields(mode = "create") {
  const types = useViolationTypes();
  const facilities = useOptions("/facilities", (f) => ({ value: f.id, label: f.name }));
  const typeOpts = types.filter((t) => t.isActive !== false).map((t) => ({ value: t.code, label: t.name }));
  const fields = [
    { name: "title", label: "Tiêu đề hồ sơ", required: true, span: "all" },
    { name: "content", label: "Nội dung quảng cáo vi phạm", type: "textarea", required: true, span: "all", rows: 4, createOnly: true },
    { name: "contentUrl", label: "Đường dẫn quảng cáo", span: "all", createOnly: true },
    { name: "facilityId", label: "Cơ sở vi phạm (nếu đã xác định)", type: "select", numeric: true, options: facilities, placeholder: "— Chưa xác định —" },
    { name: "severity", label: "Mức độ", type: "select", options: options("severity"), placeholder: "Theo loại vi phạm" },
    { name: "typeCodes", label: "Loại vi phạm", type: "chips", required: true, options: typeOpts, span: "all" },
    { name: "source", label: "Nguồn hồ sơ", type: "select", options: options("adSource", ["MANUAL", "PARTNER"]), placeholder: false, createOnly: true },
    { name: "reach", label: "Lượt tiếp cận ước tính", type: "number", createOnly: true },
    { name: "detectedAt", label: "Ngày phát hiện", type: "date", createOnly: true },
    { name: "priority", label: "Điểm ưu tiên (0–100)", type: "number", editOnly: true },
    { name: "conclusion", label: "Kết luận / nhận định của chuyên viên", type: "textarea", span: "all", rows: 2 },
    { name: "detectSuspect", label: "Đối soát đối tượng", type: "checkbox", checkboxLabel: "Tự động đối soát với đối tượng vi phạm đã có (Levenshtein + Jaccard)", span: "all", createOnly: true },
  ];
  return { fields: fields.filter((f) => (mode === "create" ? !f.editOnly : !f.createOnly)), types };
}

/** Danh sách hồ sơ vi phạm (chuyên viên quản lý; lãnh đạo, an ninh mạng xem) */
export default function ViolationsListPage() {
  const router = useRouter();
  const { can } = useSession();
  const canManage = can("violation.manage");
  const types = useViolationTypes();
  const facilities = useOptions("/facilities", (f) => ({ value: f.id, label: f.name }));
  const list = usePaged("/violations", {});
  const { fields } = useViolationFormFields("create");
  const [modal, setModal] = useState(null);
  const [importRes, setImportRes] = useState(null);
  const [busy, run] = useAction();

  const open = (v) => router.push(portalPath(`/violations/detail?id=${v.id}`));

  const create = () =>
    run(async () => {
      const errors = validateRequired(fields, modal.values);
      if (Object.keys(errors).length) return setModal((m) => ({ ...m, errors }));
      const body = cleanPayload(fields, modal.values);
      if (body.contentUrl) body.evidence = [{ type: "URL", url: body.contentUrl, note: "Đường dẫn gốc" }];
      try {
        const r = await api.post("/violations", body);
        const v = r.violation || r;
        toast.success(`Đã lập hồ sơ ${v.code}`);
        setModal(null);
        open(v);
      } catch (e) {
        toast.error(e);
      }
    });

  const importFile = (files) =>
    run(async () => {
      try {
        const r = await api.upload("/violations/import", files[0]);
        setImportRes(r);
        list.reload();
      } catch (e) {
        toast.error(e);
      }
    });

  const download = (path, name, q) =>
    run(async () => {
      try {
        await api.download(path, q, name);
      } catch (e) {
        toast.error(e);
      }
    });

  return (
    <Page>
      <PageHeader
        title="Hồ sơ vi phạm"
        subtitle="Hồ sơ được lập tự động khi chuyên viên xác nhận vi phạm, hoặc lập thủ công / nhập Excel từ đơn vị phối hợp. Bấm vào hồ sơ để kiểm tra thẩm quyền, xử phạt, chuyển phối hợp."
        crumbs={["Quản lý thông tin vi phạm"]}
        actions={
          <>
            <Button variant="secondary" icon={Download} loading={busy} onClick={() => download("/violations/export", "ho-so-vi-pham.xlsx", list.filters)}>
              Xuất Excel
            </Button>
            {canManage && (
              <>
                <Button variant="ghost" icon={FileSpreadsheet} onClick={() => download("/violations/import-template", "mau-nhap-vi-pham.xlsx")}>
                  File mẫu
                </Button>
                <FilePicker accept=".xlsx" onFiles={importFile} loading={busy}>
                  Nhập từ Excel
                </FilePicker>
                <Button icon={Plus} onClick={() => setModal({ values: { source: "MANUAL", typeCodes: [], detectSuspect: true }, errors: {} })}>
                  Lập hồ sơ
                </Button>
              </>
            )}
          </>
        }
      />
      {importRes && (
        <Alert tone={importRes.errors?.length ? "warning" : "success"}>
          Đã nhập {importRes.created?.length || 0}/{importRes.total} dòng.
          {importRes.created?.length > 0 && ` Hồ sơ mới: ${importRes.created.map((c) => c.code).join(", ")}.`}
          {importRes.errors?.length > 0 && (
            <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
              {importRes.errors.map((e) => (
                <li key={e.line}>
                  Dòng {e.line}: {e.error}
                </li>
              ))}
            </ul>
          )}
        </Alert>
      )}
      <Card title={`Danh sách hồ sơ (${list.total})`}>
        <FilterBar list={list} searchPlaceholder="Mã hồ sơ, tiêu đề, nội dung">
          <FilterSelect list={list} name="status" label="Trạng thái" options={options("violationStatus")} />
          <FilterSelect list={list} name="severity" label="Mức độ" options={options("severity")} />
          <FilterSelect list={list} name="typeCode" label="Loại vi phạm" options={types.map((t) => ({ value: t.code, label: t.name }))} />
          <FilterSelect list={list} name="facilityId" label="Cơ sở" options={facilities} />
          <FilterSelect list={list} name="source" label="Nguồn" options={options("adSource")} />
          <FilterSelect list={list} name="unidentified" label="Đối tượng" options={[{ value: "true", label: "Chưa xác định đối tượng" }]} />
          <Field label="Phát hiện từ">
            <TextInput type="date" value={list.filters.from || ""} onChange={(e) => list.setFilter("from", e.target.value)} />
          </Field>
          <Field label="đến">
            <TextInput type="date" value={list.filters.to || ""} onChange={(e) => list.setFilter("to", e.target.value)} />
          </Field>
        </FilterBar>
        <PagedTable
          list={list}
          minWidth={1100}
          onRowClick={open}
          columns={[
            { key: "code", title: "Mã hồ sơ", nowrap: true, render: (v) => <span className="ui-code">{v.code}</span> },
            {
              key: "title",
              title: "Nội dung",
              render: (v) => (
                <>
                  <div className="ui-cell-main">{truncate(v.title, 90)}</div>
                  <div className="ui-cell-sub">{label("adSource", v.source)}</div>
                </>
              ),
            },
            { key: "who", title: "Cơ sở / đối tượng", render: (v) => v.facility?.name || v.suspect?.name || <span className="ui-muted">Chưa xác định</span> },
            { key: "types", title: "Loại vi phạm", render: (v) => <ViolationTypeChips codes={(v.types || []).map((t) => t.code)} types={types} /> },
            { key: "sev", title: "Mức độ", render: (v) => <StatusBadge group="severity" value={v.severity} /> },
            { key: "date", title: "Phát hiện", nowrap: true, render: (v) => fmtDate(v.detectedAt) },
            { key: "st", title: "Trạng thái", render: (v) => <StatusBadge group="violationStatus" value={v.status} /> },
            { key: "as", title: "Người xử lý", render: (v) => v.assignee?.fullName || <span className="ui-muted">—</span> },
          ]}
        />
      </Card>
      <Modal
        open={!!modal}
        width={860}
        title="Lập hồ sơ vi phạm"
        onClose={() => setModal(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(null)}>
              Hủy
            </Button>
            <Button loading={busy} onClick={create}>
              Lập hồ sơ
            </Button>
          </>
        }
      >
        {modal && <SchemaForm fields={fields} values={modal.values} errors={modal.errors} onChange={(values) => setModal((m) => ({ ...m, values }))} />}
      </Modal>
    </Page>
  );
}
