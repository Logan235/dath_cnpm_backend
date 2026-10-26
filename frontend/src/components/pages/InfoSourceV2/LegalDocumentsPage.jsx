"use client";

import { useState } from "react";
import { Eye, Power } from "lucide-react";
import { api } from "@/lib/api";
import { useApi, useOptions } from "@/lib/hooks";
import { options } from "@/lib/labels";
import { fmtDate, toDateInput } from "@/lib/format";
import { Button, CrudPage, Field, FilterSelect, InfoGrid, Loading, Modal, StatusBadge, TextInput, cleanPayload, toast } from "@/components/ui";
import { AttachButton, FileLink, ImportButton, ImportNotice } from "./shared";

const FIELD_LABELS = {
  code: "Mã văn bản",
  documentNumber: "Số hiệu",
  title: "Trích yếu",
  typeId: "Loại văn bản",
  issuer: "Cơ quan ban hành",
  issuedDate: "Ngày ban hành",
};

function DocDetail({ id, onClose, canManage, onChanged }) {
  const d = useApi(`/legal-documents/${id}`);
  const doc = d.data;
  return (
    <Modal open title={doc ? `${doc.documentNumber} — ${doc.title}` : "Văn bản pháp lý"} width={820} onClose={onClose}>
      {!doc ? (
        <Loading />
      ) : (
        <>
          <InfoGrid
            items={[
              { label: "Mã văn bản", value: <span className="ui-code">{doc.code}</span> },
              { label: "Số hiệu", value: doc.documentNumber },
              { label: "Loại văn bản", value: doc.type?.name },
              { label: "Cơ quan ban hành", value: doc.issuer },
              { label: "Ngày ban hành", value: fmtDate(doc.issuedDate) },
              { label: "Ngày hiệu lực", value: fmtDate(doc.effectiveDate) },
              { label: "Ngày hết hiệu lực", value: fmtDate(doc.expiryDate) },
              { label: "Lĩnh vực", value: doc.field },
              { label: "Trạng thái", value: <StatusBadge group="recordStatus" value={doc.status} /> },
              { label: "File đính kèm", value: <FileLink path={doc.attachmentPath} name={doc.attachmentName} /> },
              { label: "Tóm tắt", value: doc.summary, wide: true },
            ]}
          />
          {doc.content && (
            <>
              <div className="ui-label ui-mt" style={{ marginBottom: 6 }}>
                Nội dung
              </div>
              <div className="ui-quote" style={{ maxHeight: 360, overflowY: "auto" }}>
                {doc.content}
              </div>
            </>
          )}
          {canManage && (
            <div className="ui-row ui-mt">
              <AttachButton
                path={`/legal-documents/${doc.id}/attachment`}
                onDone={() => {
                  d.reload();
                  onChanged?.();
                }}
              >
                {doc.attachmentPath ? "Thay file đính kèm" : "Đính kèm file"}
              </AttachButton>
            </div>
          )}
        </>
      )}
    </Modal>
  );
}

/**
 * Văn bản pháp lý. readOnly = true: chỉ tra cứu (cơ sở KCB, người dân).
 * Chuyên viên: thêm bằng form hoặc tải file PDF / Word lên để tự trích xuất.
 */
export default function LegalDocumentsPage({ readOnly = false, embeddedTitle = "" }) {
  const types = useOptions("/legal-document-types", (t) => ({ value: t.id, label: t.name }));
  const [viewId, setViewId] = useState(null);

  const fields = [
    { name: "code", label: "Mã văn bản", required: true, hint: "Không trùng, VD LQC-2012", createOnly: false },
    { name: "documentNumber", label: "Số hiệu", required: true, hint: "VD 16/2012/QH13, 117/2020/NĐ-CP" },
    { name: "title", label: "Trích yếu / tên văn bản", required: true, span: "all" },
    { name: "typeId", label: "Loại văn bản", type: "select", numeric: true, required: true, options: types },
    { name: "issuer", label: "Cơ quan ban hành" },
    { name: "issuedDate", label: "Ngày ban hành", type: "date" },
    { name: "effectiveDate", label: "Ngày hiệu lực", type: "date" },
    { name: "expiryDate", label: "Ngày hết hiệu lực", type: "date" },
    { name: "field", label: "Lĩnh vực", placeholder: "VD Quảng cáo, Khám chữa bệnh, Dược" },
    { name: "summary", label: "Tóm tắt", type: "textarea", span: "all", rows: 3 },
    { name: "content", label: "Nội dung (dùng cho AI trích dẫn căn cứ)", type: "textarea", span: "all", rows: 5 },
  ];

  const columns = [
    {
      key: "doc",
      title: "Văn bản",
      render: (d) => (
        <>
          <div className="ui-cell-main">{d.documentNumber}</div>
          <div style={{ fontSize: 13 }}>{d.title}</div>
        </>
      ),
    },
    { key: "type", title: "Loại", render: (d) => d.type?.name },
    { key: "issuer", title: "Cơ quan ban hành", render: (d) => d.issuer },
    { key: "issued", title: "Ban hành", nowrap: true, render: (d) => fmtDate(d.issuedDate) },
    { key: "field", title: "Lĩnh vực", render: (d) => d.field },
    { key: "file", title: "File", render: (d) => <FileLink path={d.attachmentPath} name="Tải" /> },
    { key: "status", title: "Trạng thái", render: (d) => <StatusBadge group="recordStatus" value={d.status} /> },
  ];

  const toggleStatus = async (d, reload) => {
    try {
      await api.patch(`/legal-documents/${d.id}/status`, { status: d.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" });
      toast.success(d.status === "ACTIVE" ? "Đã chuyển hết hiệu lực" : "Đã chuyển còn hiệu lực");
      reload();
    } catch (e) {
      toast.error(e);
    }
  };

  return (
    <CrudPage
      title={embeddedTitle || "Văn bản pháp lý"}
      subtitle={
        readOnly
          ? "Tra cứu văn bản pháp luật về quảng cáo và khám chữa bệnh đang được áp dụng."
          : "Nhập bằng form, hoặc tải file PDF / Word lên để hệ thống tự trích xuất số hiệu, loại, ngày ban hành... rồi kiểm tra và lưu."
      }
      crumbs={[readOnly ? "Tra cứu" : "Quản lý nguồn thông tin"]}
      path="/legal-documents"
      initialFilters={readOnly ? { status: "ACTIVE" } : {}}
      columns={columns}
      fields={fields}
      canCreate={!readOnly}
      canEdit={!readOnly}
      canDelete={!readOnly}
      createLabel="Thêm bằng form"
      createTitle="Thêm văn bản pháp lý"
      editTitle="Cập nhật văn bản pháp lý"
      modalWidth={860}
      searchPlaceholder="Số hiệu, trích yếu, mã văn bản"
      onRowClick={(d) => setViewId(d.id)}
      deleteMessage={(d) => `Xóa văn bản ${d.documentNumber}? Văn bản đã được AI dùng làm căn cứ thì chỉ có thể chuyển "Hết hiệu lực".`}
      toForm={(d) => ({
        ...Object.fromEntries(fields.map((f) => [f.name, d[f.name] ?? ""])),
        issuedDate: toDateInput(d.issuedDate),
        effectiveDate: toDateInput(d.effectiveDate),
        expiryDate: toDateInput(d.expiryDate),
      })}
      toPayload={(v, mode) => {
        const body = cleanPayload(fields, v, { keepEmpty: mode === "edit" });
        if (mode === "create" && v.attachmentPath) {
          body.attachmentPath = v.attachmentPath;
          body.attachmentName = v.attachmentName;
        }
        return body;
      }}
      headerActions={(ctx) =>
        !readOnly && (
          <ImportButton
            path="/legal-documents"
            onDraft={(res) => {
              const dr = res.draft || {};
              ctx.openCreate(
                {
                  ...Object.fromEntries(fields.map((f) => [f.name, dr[f.name] ?? ""])),
                  attachmentPath: dr.attachmentPath || res.file?.url,
                  attachmentName: dr.attachmentName || res.file?.name,
                },
                <ImportNotice result={res} labels={FIELD_LABELS} />,
              );
            }}
          />
        )
      }
      filters={(list) => (
        <>
          <FilterSelect list={list} name="typeId" label="Loại văn bản" options={types} />
          {!readOnly && <FilterSelect list={list} name="status" label="Hiệu lực" options={options("recordStatus")} />}
          <Field label="Ban hành từ">
            <TextInput type="date" value={list.filters.from || ""} onChange={(e) => list.setFilter("from", e.target.value)} />
          </Field>
          <Field label="đến">
            <TextInput type="date" value={list.filters.to || ""} onChange={(e) => list.setFilter("to", e.target.value)} />
          </Field>
        </>
      )}
      rowActions={(d, ctx) => (
        <>
          <Button size="sm" variant="secondary" icon={Eye} onClick={() => setViewId(d.id)}>
            Xem
          </Button>
          {!readOnly && (
            <Button size="sm" variant="secondary" icon={Power} onClick={() => toggleStatus(d, ctx.reload)} title="Đổi hiệu lực">
              {d.status === "ACTIVE" ? "Hết HL" : "Còn HL"}
            </Button>
          )}
        </>
      )}
    >
      {(ctx) => viewId && <DocDetail id={viewId} canManage={!readOnly} onClose={() => setViewId(null)} onChanged={ctx.reload} />}
    </CrudPage>
  );
}
