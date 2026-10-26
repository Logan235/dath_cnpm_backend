"use client";

import { useApi, useOptions, useSession } from "@/lib/hooks";
import { options } from "@/lib/labels";
import { fmtMoney } from "@/lib/format";
import { CrudPage, FilterSelect, StatusBadge } from "@/components/ui";

/** Danh mục phân loại vi phạm: trọng số dùng tính điểm rủi ro, mức độ, căn cứ pháp lý, khung tiền phạt */
export default function ViolationTypesPage() {
  const { can } = useSession();
  const manage = can("violation_type.manage");
  const stats = useApi("/violation-types/stats");
  const docs = useOptions("/legal-documents", (d) => ({ value: d.id, label: `${d.documentNumber} — ${d.title}` }), { status: "ACTIVE" });
  const count = (code) => (Array.isArray(stats.data) ? stats.data.find((s) => s.code === code)?.violations : undefined) ?? 0;

  const fields = [
    { name: "code", label: "Mã loại vi phạm", required: true, createOnly: true, hint: "VD FALSE_CLAIM — AI trả về mã này" },
    { name: "name", label: "Tên loại vi phạm", required: true },
    { name: "severity", label: "Mức độ", type: "select", required: true, options: options("severity"), placeholder: false },
    { name: "weight", label: "Trọng số rủi ro (w)", type: "number", required: true, min: 0, hint: "Dùng trong công thức điểm rủi ro (Bảng 12.7)" },
    { name: "legalDocumentId", label: "Văn bản pháp lý", type: "select", numeric: true, options: docs, placeholder: "— Không —", span: "all" },
    { name: "legalBasis", label: "Điều khoản căn cứ", placeholder: "VD Điều 38 Nghị định 117/2020/NĐ-CP", span: "all" },
    { name: "fineMin", label: "Mức phạt tối thiểu (VNĐ)", type: "number", min: 0 },
    { name: "fineMax", label: "Mức phạt tối đa (VNĐ)", type: "number", min: 0 },
    { name: "description", label: "Mô tả / dấu hiệu nhận biết", type: "textarea", span: "all", rows: 3 },
  ];

  return (
    <CrudPage
      title="Danh mục phân loại vi phạm"
      subtitle="Mỗi loại vi phạm có trọng số rủi ro, mức độ, căn cứ pháp lý và khung tiền phạt. AI và chuyên viên gán loại vi phạm theo danh mục này."
      crumbs={["Quản lý thông tin vi phạm"]}
      path="/violation-types"
      columns={[
        {
          key: "n",
          title: "Loại vi phạm",
          render: (t) => (
            <>
              <div className="ui-cell-main">{t.name}</div>
              <div className="ui-cell-sub ui-code">{t.code}</div>
            </>
          ),
        },
        { key: "s", title: "Mức độ", render: (t) => <StatusBadge group="severity" value={t.severity} /> },
        { key: "w", title: "Trọng số", num: true, render: (t) => t.weight },
        { key: "l", title: "Căn cứ pháp lý", render: (t) => [t.legalBasis, t.legalDocument?.documentNumber].filter(Boolean).join(" — ") },
        { key: "f", title: "Khung phạt", nowrap: true, render: (t) => (t.fineMax ? `${fmtMoney(t.fineMin)} – ${fmtMoney(t.fineMax)}` : <span className="ui-muted">—</span>) },
        { key: "c", title: "Số hồ sơ", num: true, render: (t) => count(t.code) },
        { key: "a", title: "Trạng thái", render: (t) => <StatusBadge group="active" value={String(t.isActive)} /> },
      ]}
      fields={fields}
      canCreate={manage}
      canEdit={manage}
      canDelete={manage}
      statusToggle={manage ? { field: "isActive" } : undefined}
      createDefaults={{ severity: "MEDIUM", weight: 10 }}
      toForm={(t) => Object.fromEntries(fields.map((f) => [f.name, t[f.name] ?? ""]))}
      modalWidth={820}
      searchPlaceholder="Tên, mã loại vi phạm"
      filters={(list) => <FilterSelect list={list} name="isActive" label="Trạng thái" options={[{ value: "true", label: "Đang dùng" }, { value: "false", label: "Ngừng dùng" }]} />}
      deleteMessage={(t) => `Xóa loại vi phạm "${t.name}"? Loại đã có hồ sơ thì chỉ có thể ngừng dùng.`}
    />
  );
}
