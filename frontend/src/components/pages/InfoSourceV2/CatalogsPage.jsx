"use client";

import { useState } from "react";
import Tabs from "@/components/Tabs";
import { CrudPage, Page, PageHeader, StatusBadge } from "@/components/ui";

const CATALOG_FIELDS = [
  { name: "code", label: "Mã", required: true, hint: "Chữ in hoa, không dấu, VD NGHI_DINH" },
  { name: "name", label: "Tên", required: true },
  { name: "description", label: "Mô tả", type: "textarea", span: "all", rows: 2 },
];

/** Danh mục dạng mã – tên – mô tả, có bật / tắt (loại văn bản, loại cơ sở, phân loại nguồn, chủ đề...) */
export function CatalogTab({ path, title, subtitle, extraColumns = [], rowActions, onRowClick, activeKey, children }) {
  return (
    <CrudPage
      embedded
      title={title}
      cardTitle={title}
      subtitle={subtitle}
      path={path}
      listOptions={{ pageSize: 20 }}
      columns={[
        { key: "code", title: "Mã", render: (r) => <span className="ui-code">{r.code}</span> },
        { key: "name", title: "Tên", render: (r) => <span className="ui-cell-main">{r.name}</span> },
        { key: "desc", title: "Mô tả", render: (r) => r.description },
        ...extraColumns,
        { key: "st", title: "Trạng thái", render: (r) => <StatusBadge group="active" value={String(r.isActive)} /> },
      ]}
      fields={CATALOG_FIELDS}
      statusToggle={{ field: "isActive" }}
      createTitle={`Thêm: ${title.toLowerCase()}`}
      editTitle={`Sửa: ${title.toLowerCase()}`}
      modalWidth={600}
      rowActions={rowActions}
      onRowClick={onRowClick}
      activeKey={activeKey}
      deleteMessage={(r) => `Xóa "${r.name}"? Mục đang được dùng thì chỉ có thể tắt.`}
    >
      {children}
    </CrudPage>
  );
}

const TABS = [
  { key: "doc-types", label: "Loại văn bản pháp lý", path: "/legal-document-types", sub: "Luật, Nghị định, Thông tư, Quyết định, Công văn..." },
  { key: "facility-types", label: "Loại hình cơ sở KCB", path: "/facility-types", sub: "Bệnh viện, phòng khám chuyên khoa, cơ sở thẩm mỹ..." },
  { key: "source-categories", label: "Phân loại nguồn tin", path: "/source-categories", sub: "Mạng xã hội, báo điện tử, website cơ sở, truyền hình..." },
];

export default function CatalogsPage() {
  const [tab, setTab] = useState(TABS[0].key);
  const t = TABS.find((x) => x.key === tab);
  return (
    <Page>
      <PageHeader title="Danh mục dùng chung" subtitle="Các danh mục nền dùng ở văn bản pháp lý, đơn vị KCB và nguồn thu thập tin." crumbs={["Quản lý nguồn thông tin"]} />
      <Tabs tabs={TABS} active={tab} onChange={setTab} />
      <CatalogTab key={t.key} path={t.path} title={t.label} subtitle={t.sub} />
    </Page>
  );
}
