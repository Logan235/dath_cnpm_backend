"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Pencil, Plus, Power, Trash2, Building2 } from "lucide-react";
import { api } from "@/lib/api";
import { useAction, useApi } from "@/lib/hooks";
import { label, options } from "@/lib/labels";
import {
  Alert,
  Badge,
  Button,
  Card,
  ErrorBox,
  InfoGrid,
  Loading,
  Modal,
  Page,
  PageHeader,
  SchemaForm,
  SearchBox,
  StatusBadge,
  cleanPayload,
  confirmDialog,
  toast,
  validateRequired,
} from "@/components/ui";

function flatten(nodes, depth = 0, out = []) {
  for (const n of nodes || []) {
    out.push({ ...n, depth });
    flatten(n.children, depth + 1, out);
  }
  return out;
}

function TreeNode({ node, depth, selectedId, onSelect, collapsed, toggle, filter }) {
  const kids = node.children || [];
  const isCollapsed = collapsed.has(node.id) && !filter;
  const match = !filter || node.name.toLowerCase().includes(filter) || node.code.toLowerCase().includes(filter);
  const childMatches = (n) => n.name.toLowerCase().includes(filter) || n.code.toLowerCase().includes(filter) || (n.children || []).some(childMatches);
  if (filter && !match && !kids.some(childMatches)) return null;
  return (
    <li>
      <div
        className={`org-node${String(selectedId) === String(node.id) ? " is-active" : ""}`}
        style={{ paddingLeft: 8 + depth * 18, opacity: node.isActive ? 1 : 0.55 }}
      >
        {kids.length ? (
          <button type="button" className="org-toggle" onClick={() => toggle(node.id)} aria-label={isCollapsed ? "Mở" : "Thu gọn"}>
            {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
          </button>
        ) : (
          <span className="org-toggle" />
        )}
        <button type="button" className="org-name" onClick={() => onSelect(node.id)}>
          <Building2 size={14} style={{ flexShrink: 0, color: "#3577DB" }} />
          <span>
            {node.name} <span className="ui-muted">({node.code})</span>
          </span>
        </button>
        {node.userCount > 0 && <Badge tone="info">{node.userCount} người</Badge>}
      </div>
      {!isCollapsed && kids.length > 0 && (
        <ul className="org-tree">
          {kids.map((c) => (
            <TreeNode key={c.id} node={c} depth={depth + 1} selectedId={selectedId} onSelect={onSelect} collapsed={collapsed} toggle={toggle} filter={filter} />
          ))}
        </ul>
      )}
    </li>
  );
}

export default function OrgChartPage() {
  const tree = useApi("/organizations/tree");
  const [selectedId, setSelectedId] = useState(null);
  const [collapsed, setCollapsed] = useState(new Set());
  const [filter, setFilter] = useState("");
  const [modal, setModal] = useState(null);
  const [busy, run] = useAction();

  const flat = useMemo(() => flatten(tree.data || []), [tree.data]);
  const selected = flat.find((n) => String(n.id) === String(selectedId));

  const fields = [
    { name: "code", label: "Mã đơn vị", required: true, hint: "Duy nhất toàn hệ thống" },
    { name: "name", label: "Tên đơn vị", required: true },
    {
      name: "parentId",
      label: "Đơn vị cha",
      type: "select",
      numeric: true,
      placeholder: "— Cấp cao nhất —",
      options: flat.filter((n) => !modal?.row || n.id !== modal.row.id).map((n) => ({ value: n.id, label: `${"— ".repeat(n.depth)}${n.name}` })),
    },
    { name: "orgType", label: "Loại đơn vị", type: "select", options: options("orgType") },
    { name: "phone", label: "Điện thoại" },
    { name: "address", label: "Địa chỉ" },
    { name: "note", label: "Ghi chú", type: "textarea", span: "all", rows: 2 },
  ];

  const toggle = (id) =>
    setCollapsed((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const save = () =>
    run(async () => {
      const errors = validateRequired(fields, modal.values);
      if (Object.keys(errors).length) return setModal((m) => ({ ...m, errors }));
      const body = cleanPayload(fields, modal.values, { keepEmpty: modal.mode === "edit" });
      if (body.parentId === undefined) body.parentId = null;
      try {
        const res = modal.mode === "edit" ? await api.patch(`/organizations/${modal.row.id}`, body) : await api.post("/organizations", body);
        toast.success(modal.mode === "edit" ? "Đã cập nhật đơn vị" : "Đã thêm đơn vị");
        setModal(null);
        tree.reload();
        if (res?.id) setSelectedId(res.id);
      } catch (e) {
        toast.error(e);
      }
    });

  const setActive = async (node) => {
    const turnOff = node.isActive;
    if (
      turnOff &&
      !(await confirmDialog({
        title: "Vô hiệu hóa đơn vị",
        message: `Vô hiệu hóa "${node.name}"? Các đơn vị con cũng bị vô hiệu hóa theo.`,
        danger: true,
        confirmText: "Vô hiệu hóa",
      }))
    )
      return;
    try {
      await api.patch(`/organizations/${node.id}/status`, { isActive: !turnOff });
      toast.success(turnOff ? "Đã vô hiệu hóa" : "Đã kích hoạt");
      tree.reload();
    } catch (e) {
      toast.error(e);
    }
  };

  const remove = async (node) => {
    if (!(await confirmDialog({ title: "Xóa đơn vị", message: `Xóa "${node.name}"?`, danger: true, confirmText: "Xóa" }))) return;
    try {
      await api.del(`/organizations/${node.id}`);
      toast.success("Đã xóa đơn vị");
      setSelectedId(null);
      tree.reload();
    } catch (e) {
      toast.error(e);
    }
  };

  const openCreate = (parent) =>
    setModal({ mode: "create", values: { parentId: parent?.id ?? "", orgType: parent ? "PHONG_BAN" : "SO_Y_TE" }, errors: {} });
  const openEdit = (n) =>
    setModal({
      mode: "edit",
      row: n,
      values: { code: n.code, name: n.name, parentId: n.parentId ?? "", orgType: n.orgType || "", phone: n.phone || "", address: n.address || "", note: n.note || "" },
      errors: {},
    });

  return (
    <Page>
      <PageHeader
        title="Cơ cấu tổ chức"
        subtitle="Quản lý đơn vị theo cấp cha – con. Vô hiệu hóa đơn vị cha sẽ vô hiệu hóa toàn bộ đơn vị con."
        crumbs={["Quản trị hệ thống"]}
        actions={
          <Button icon={Plus} onClick={() => openCreate(null)}>
            Thêm đơn vị cấp cao nhất
          </Button>
        }
      />
      <ErrorBox error={tree.error} onRetry={tree.reload} />
      <div className="ui-split">
        <Card title={`Sơ đồ tổ chức (${flat.length} đơn vị)`}>
          <div className="ui-mb">
            <SearchBox onSearch={(v) => setFilter(v.toLowerCase())} placeholder="Tìm theo tên hoặc mã đơn vị" />
          </div>
          {tree.loading && !tree.data ? (
            <Loading />
          ) : (
            <ul className="org-tree" style={{ paddingLeft: 0 }}>
              {(tree.data || []).map((n) => (
                <TreeNode key={n.id} node={n} depth={0} selectedId={selectedId} onSelect={setSelectedId} collapsed={collapsed} toggle={toggle} filter={filter} />
              ))}
            </ul>
          )}
        </Card>
        <Card
          title="Thông tin đơn vị"
          actions={
            selected && (
              <>
                <Button size="sm" variant="secondary" icon={Plus} onClick={() => openCreate(selected)}>
                  Thêm đơn vị con
                </Button>
                <Button size="sm" variant="secondary" icon={Pencil} onClick={() => openEdit(selected)}>
                  Sửa
                </Button>
              </>
            )
          }
        >
          {!selected ? (
            <div className="ui-muted" style={{ fontSize: 13 }}>
              Chọn một đơn vị ở sơ đồ bên trái.
            </div>
          ) : (
            <>
              <InfoGrid
                items={[
                  { label: "Mã đơn vị", value: <span className="ui-code">{selected.code}</span> },
                  { label: "Trạng thái", value: <StatusBadge group="active" value={String(selected.isActive)} text={selected.isActive ? "Đang hoạt động" : "Vô hiệu hóa"} /> },
                  { label: "Tên đơn vị", value: selected.name, wide: true },
                  { label: "Loại đơn vị", value: label("orgType", selected.orgType) },
                  { label: "Đơn vị cha", value: flat.find((n) => n.id === selected.parentId)?.name || "— Cấp cao nhất —" },
                  { label: "Điện thoại", value: selected.phone },
                  { label: "Số người dùng", value: selected.userCount },
                  { label: "Địa chỉ", value: selected.address, wide: true },
                  { label: "Ghi chú", value: selected.note, wide: true },
                ]}
              />
              {!selected.isActive && (
                <Alert tone="warning" style={{ marginTop: 14 }}>
                  Đơn vị đang bị vô hiệu hóa. Muốn kích hoạt, đơn vị cha phải đang hoạt động.
                </Alert>
              )}
              <div className="ui-row ui-mt">
                <Button variant="secondary" icon={Power} onClick={() => setActive(selected)}>
                  {selected.isActive ? "Vô hiệu hóa" : "Kích hoạt"}
                </Button>
                <Button variant="danger" icon={Trash2} onClick={() => remove(selected)}>
                  Xóa đơn vị
                </Button>
              </div>
            </>
          )}
        </Card>
      </div>

      <Modal
        open={!!modal}
        title={modal?.mode === "edit" ? "Cập nhật đơn vị" : "Thêm đơn vị"}
        onClose={() => setModal(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(null)}>
              Hủy
            </Button>
            <Button loading={busy} onClick={save}>
              Lưu
            </Button>
          </>
        }
      >
        {modal && <SchemaForm fields={fields} values={modal.values} errors={modal.errors} onChange={(values) => setModal((m) => ({ ...m, values }))} />}
      </Modal>
    </Page>
  );
}
