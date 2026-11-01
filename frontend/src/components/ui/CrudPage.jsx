"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2, Power } from "lucide-react";
import { api } from "@/lib/api";
import { usePaged, useAction } from "@/lib/hooks";
import Button from "./Button";
import Modal from "./Modal";
import { PagedTable } from "./DataTable";
import { Card, FilterBar, Page, PageHeader } from "./Layout";
import { SchemaForm, cleanPayload, validateRequired } from "./Form";
import { confirmDialog, toast } from "./feedback";

/**
 * Trang danh mục chuẩn: danh sách + tìm kiếm + lọc + thêm / sửa / xóa / bật-tắt.
 * Xem cách dùng ở các trang danh mục (loại văn bản, loại cơ sở, loại vi phạm...).
 */
export default function CrudPage({
  title,
  subtitle,
  crumbs,
  cardTitle,
  path,
  itemPath = (row) => `${path}/${row.id}`,
  columns,
  fields = [],
  editFields,
  toForm,
  toPayload,
  initialFilters = {},
  filters,
  canCreate = true,
  canEdit = true,
  canDelete = true,
  statusToggle,
  rowActions,
  headerActions,
  onRowClick,
  activeKey,
  modalWidth = 720,
  createTitle = "Thêm mới",
  editTitle = "Cập nhật",
  deleteMessage = (row) => `Xóa "${row.name || row.code || row.id}"? Thao tác này không hoàn tác được.`,
  searchPlaceholder,
  showSearch = true,
  beforeTable,
  emptyText,
  createLabel = "Thêm mới",
  listOptions,
  embedded = false,
  onSaved,
  createDefaults,
  children,
}) {
  const list = usePaged(path, initialFilters, listOptions);
  const [modal, setModal] = useState(null); // { mode, row, values, errors }
  const [busy, run] = useAction();

  const formFields = modal?.mode === "edit" ? editFields || fields.filter((f) => !f.createOnly) : fields;

  const openCreate = (initial = {}, notice = null) => setModal({ mode: "create", row: null, values: { ...initial }, errors: {}, notice });
  const openEdit = (row) => {
    const values = toForm ? toForm(row) : Object.fromEntries((editFields || fields).map((f) => [f.name, row[f.name] ?? ""]));
    setModal({ mode: "edit", row, values, errors: {} });
  };

  const save = () =>
    run(async () => {
      const errors = validateRequired(formFields, modal.values);
      if (Object.keys(errors).length) {
        setModal((m) => ({ ...m, errors }));
        toast.error("Vui lòng nhập đủ các trường bắt buộc.");
        return;
      }
      const body = toPayload ? toPayload(modal.values, modal.mode, modal.row) : cleanPayload(formFields, modal.values, { keepEmpty: modal.mode === "edit" });
      try {
        const res = modal.mode === "create" ? await api.post(path, body) : await api.patch(itemPath(modal.row), body);
        onSaved?.(res, modal.mode);
        toast.success(modal.mode === "create" ? "Đã thêm mới" : "Đã cập nhật");
        setModal(null);
        list.reload();
      } catch (e) {
        toast.error(e);
      }
    });

  const remove = async (row) => {
    if (!(await confirmDialog({ title: "Xác nhận xóa", message: deleteMessage(row), danger: true, confirmText: "Xóa" }))) return;
    try {
      await api.del(itemPath(row));
      toast.success("Đã xóa");
      list.reload();
    } catch (e) {
      toast.error(e);
    }
  };

  const toggle = async (row) => {
    const on = !!row[statusToggle.field || "isActive"];
    try {
      await api.patch(statusToggle.path ? statusToggle.path(row) : `${itemPath(row)}/status`, statusToggle.body ? statusToggle.body(row) : { isActive: !on });
      toast.success(on ? "Đã ngừng sử dụng" : "Đã kích hoạt");
      list.reload();
    } catch (e) {
      toast.error(e);
    }
  };

  const ctx = { list, openCreate, openEdit, reload: list.reload };
  const hasActions = canEdit || canDelete || statusToggle || rowActions;
  const cols = hasActions
    ? [
        ...columns,
        {
          key: "__actions",
          title: "Thao tác",
          nowrap: true,
          render: (row) => (
            <div className="ui-row" style={{ flexWrap: "nowrap" }} onClick={(e) => e.stopPropagation()}>
              {rowActions?.(row, ctx)}
              {canEdit && (typeof canEdit !== "function" || canEdit(row)) && (
                <Button size="sm" variant="secondary" icon={Pencil} onClick={() => openEdit(row)}>
                  Sửa
                </Button>
              )}
              {statusToggle && (
                <Button size="sm" variant="secondary" icon={Power} onClick={() => toggle(row)}>
                  {row[statusToggle.field || "isActive"] ? "Tắt" : "Bật"}
                </Button>
              )}
              {canDelete && (typeof canDelete !== "function" || canDelete(row)) && (
                <Button size="sm" variant="danger" icon={Trash2} onClick={() => remove(row)} aria-label="Xóa" title="Xóa" />
              )}
            </div>
          ),
        },
      ]
    : columns;

  const createBtn = canCreate && (
    <Button icon={Plus} onClick={() => openCreate(typeof createDefaults === "function" ? createDefaults() : createDefaults || {})}>
      {createLabel}
    </Button>
  );
  const table = (
    <Card
      title={cardTitle || `Danh sách ${title.toLowerCase()}`}
      actions={
        embedded && (
          <>
            {headerActions?.(ctx)}
            {createBtn}
          </>
        )
      }
    >
      {embedded && subtitle && <p className="ui-card-sub">{subtitle}</p>}
      <FilterBar list={list} searchPlaceholder={searchPlaceholder} showSearch={showSearch}>
        {filters?.(list)}
      </FilterBar>
      <PagedTable list={list} columns={cols} onRowClick={onRowClick} activeKey={activeKey} empty={emptyText} />
    </Card>
  );

  const Wrapper = embedded ? "div" : Page;
  return (
    <Wrapper>
      {!embedded && (
        <PageHeader
          title={title}
          subtitle={subtitle}
          crumbs={crumbs}
          actions={
            <>
              {headerActions?.(ctx)}
              {createBtn}
            </>
          }
        />
      )}
      {beforeTable?.(ctx)}
      {table}
      {typeof children === "function" ? children(ctx) : children}

      <Modal
        open={!!modal}
        width={modalWidth}
        title={modal?.mode === "edit" ? editTitle : createTitle}
        onClose={() => setModal(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(null)}>
              Hủy
            </Button>
            <Button icon={modal?.mode === "edit" ? Pencil : Plus} loading={busy} onClick={save}>
              {modal?.mode === "edit" ? "Lưu thay đổi" : "Thêm mới"}
            </Button>
          </>
        }
      >
        {modal?.notice}
        {modal && (
          <SchemaForm fields={formFields} values={modal.values} errors={modal.errors} onChange={(values) => setModal((m) => ({ ...m, values }))} />
        )}
      </Modal>
    </Wrapper>
  );
}
