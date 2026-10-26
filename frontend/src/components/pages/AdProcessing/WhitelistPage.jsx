"use client";

import { useOptions } from "@/lib/hooks";
import { label, options } from "@/lib/labels";
import { fmtDate } from "@/lib/format";
import { CrudPage, FilterSelect, StatusBadge } from "@/components/ui";

/** Whitelist: nguồn tin cậy (tên miền, fanpage chính thức, số điện thoại...) — bộ lọc tự động bỏ qua */
export default function WhitelistPage() {
  const facilities = useOptions("/facilities", (f) => ({ value: f.id, label: f.name }));
  const fields = [
    { name: "entryType", label: "Loại", type: "select", required: true, options: options("whitelistType"), createOnly: true, placeholder: false },
    { name: "value", label: "Giá trị", required: true, hint: "VD benhvienx.vn | facebook.com/benhviendakhoax | 0283775xxxx" },
    { name: "facilityId", label: "Thuộc cơ sở", type: "select", numeric: true, options: facilities, placeholder: "— Không —" },
    { name: "note", label: "Ghi chú", type: "textarea", span: "all", rows: 2 },
  ];
  return (
    <CrudPage
      title="Whitelist"
      cardTitle="Danh sách nguồn tin cậy"
      subtitle="Mẫu tin đến từ nguồn trong whitelist (trang chính thức của cơ sở đã được cấp phép, báo chí chính thống...) sẽ được bộ lọc tự động bỏ qua."
      crumbs={["Xử lý thông tin QC"]}
      path="/whitelist"
      columns={[
        { key: "t", title: "Loại", render: (w) => label("whitelistType", w.entryType) },
        { key: "v", title: "Giá trị", render: (w) => <span className="ui-cell-main">{w.value}</span> },
        { key: "f", title: "Cơ sở", render: (w) => facilities.find((f) => String(f.value) === String(w.facilityId))?.label || "" },
        { key: "n", title: "Ghi chú", render: (w) => w.note },
        { key: "d", title: "Ngày tạo", nowrap: true, render: (w) => fmtDate(w.createdAt) },
        { key: "s", title: "Trạng thái", render: (w) => <StatusBadge group="active" value={String(w.isActive)} /> },
      ]}
      fields={fields}
      createDefaults={{ entryType: "DOMAIN" }}
      statusToggle={{ field: "isActive", path: (w) => `/whitelist/${w.id}`, body: (w) => ({ isActive: !w.isActive }) }}
      searchPlaceholder="Tên miền, tài khoản, số điện thoại"
      filters={(list) => <FilterSelect list={list} name="entryType" label="Loại" options={options("whitelistType")} />}
      deleteMessage={(w) => `Xóa "${w.value}" khỏi whitelist?`}
    />
  );
}
