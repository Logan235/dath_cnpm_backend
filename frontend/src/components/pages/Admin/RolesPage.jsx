"use client";

import { useEffect, useState } from "react";
import { Pencil, Plus, Power, Save, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { useAction, useApi } from "@/lib/hooks";
import {
  Alert,
  Badge,
  Button,
  Card,
  DataTable,
  ErrorBox,
  InfoGrid,
  Loading,
  Modal,
  Page,
  PageHeader,
  SchemaForm,
  StatusBadge,
  cleanPayload,
  confirmDialog,
  toast,
  validateRequired,
} from "@/components/ui";

const MODULES = {
  SYSTEM: "Quản trị hệ thống",
  INFO_SOURCE: "Quản lý nguồn thông tin",
  AD_PROCESSING: "Xử lý thông tin quảng cáo",
  VIOLATION: "Quản lý thông tin vi phạm",
};

export default function RolesPage() {
  const roles = useApi("/roles");
  const perms = useApi("/roles/permissions");
  const [selectedId, setSelectedId] = useState(null);
  const detail = useApi(selectedId ? `/roles/${selectedId}` : null);
  const [checked, setChecked] = useState(new Set());
  const [dirty, setDirty] = useState(false);
  const [modal, setModal] = useState(null);
  const [busy, run] = useAction();

  useEffect(() => {
    if (!selectedId && roles.data?.length) setSelectedId(roles.data[0].id);
  }, [roles.data, selectedId]);

  useEffect(() => {
    if (detail.data) {
      setChecked(new Set((detail.data.permissions || []).map((p) => p.permissionCode)));
      setDirty(false);
    }
  }, [detail.data]);

  const role = detail.data;
  const fields = [
    { name: "roleCode", label: "Mã vai trò", required: true, createOnly: true, hint: "Chữ in hoa, số, gạch dưới. VD: INSPECTOR" },
    { name: "roleName", label: "Tên vai trò", required: true },
    { name: "description", label: "Mô tả", type: "textarea", span: "all", rows: 3 },
  ];

  const toggle = (code) => {
    setChecked((s) => {
      const n = new Set(s);
      n.has(code) ? n.delete(code) : n.add(code);
      return n;
    });
    setDirty(true);
  };
  const toggleModule = (list, on) => {
    setChecked((s) => {
      const n = new Set(s);
      list.forEach((p) => (on ? n.add(p.permissionCode) : n.delete(p.permissionCode)));
      return n;
    });
    setDirty(true);
  };

  const savePerms = () =>
    run(async () => {
      try {
        await api.put(`/roles/${role.id}/permissions`, { permissionCodes: [...checked] });
        toast.success("Đã lưu phân quyền. Người dùng có vai trò này nhận quyền mới ngay ở thao tác tiếp theo.");
        detail.reload();
        roles.reload();
      } catch (e) {
        toast.error(e);
      }
    });

  const saveRole = () =>
    run(async () => {
      const f = modal.mode === "edit" ? fields.filter((x) => !x.createOnly) : fields;
      const errors = validateRequired(f, modal.values);
      if (Object.keys(errors).length) return setModal((m) => ({ ...m, errors }));
      try {
        if (modal.mode === "edit") await api.patch(`/roles/${role.id}`, cleanPayload(f, modal.values, { keepEmpty: true }));
        else {
          const r = await api.post("/roles", { ...cleanPayload(f, modal.values), roleCode: modal.values.roleCode.trim().toUpperCase(), permissionCodes: [] });
          setSelectedId(r.id);
        }
        toast.success("Đã lưu vai trò");
        setModal(null);
        roles.reload();
        detail.reload();
      } catch (e) {
        toast.error(e);
      }
    });

  const setActive = async () => {
    if (
      role.isActive &&
      !(await confirmDialog({
        title: "Vô hiệu hóa vai trò",
        message: `Vô hiệu hóa vai trò "${role.roleName}"? Người dùng có vai trò này sẽ không đăng nhập được bằng vai trò đó.`,
        danger: true,
      }))
    )
      return;
    try {
      await api.patch(`/roles/${role.id}/status`, { isActive: !role.isActive });
      toast.success("Đã cập nhật trạng thái");
      roles.reload();
      detail.reload();
    } catch (e) {
      toast.error(e);
    }
  };

  const remove = async () => {
    if (!(await confirmDialog({ title: "Xóa vai trò", message: `Xóa vai trò "${role.roleName}"?`, danger: true, confirmText: "Xóa" }))) return;
    try {
      await api.del(`/roles/${role.id}`);
      toast.success("Đã xóa vai trò");
      setSelectedId(null);
      roles.reload();
    } catch (e) {
      toast.error(e);
    }
  };

  return (
    <Page>
      <PageHeader
        title="Vai trò và phân quyền"
        subtitle="Mỗi vai trò gồm một tập quyền chức năng (RBAC). Thay đổi có hiệu lực ngay, không cần người dùng đăng nhập lại."
        crumbs={["Quản trị hệ thống"]}
        actions={
          <Button icon={Plus} onClick={() => setModal({ mode: "create", values: {}, errors: {} })}>
            Thêm vai trò
          </Button>
        }
      />
      <ErrorBox error={roles.error} onRetry={roles.reload} />
      <div className="ui-split" style={{ gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.3fr)" }}>
        <Card title="Danh sách vai trò">
          <DataTable
            minWidth={420}
            loading={roles.loading}
            rows={roles.data || []}
            activeKey={selectedId}
            onRowClick={(r) => setSelectedId(r.id)}
            columns={[
              {
                key: "roleName",
                title: "Vai trò",
                render: (r) => (
                  <>
                    <div className="ui-cell-main">{r.roleName}</div>
                    <div className="ui-cell-sub ui-code">{r.roleCode}</div>
                  </>
                ),
              },
              { key: "perm", title: "Số quyền", num: true, render: (r) => r.permissions?.length ?? 0 },
              { key: "users", title: "Người dùng", num: true, render: (r) => r.userCount ?? 0 },
              { key: "st", title: "Trạng thái", render: (r) => <StatusBadge group="active" value={String(r.isActive)} /> },
            ]}
          />
        </Card>

        <Card
          title={role ? `Phân quyền: ${role.roleName}` : "Phân quyền"}
          actions={
            role && (
              <>
                <Button size="sm" variant="secondary" icon={Pencil} onClick={() => setModal({ mode: "edit", values: { roleName: role.roleName, description: role.description || "" }, errors: {} })}>
                  Sửa
                </Button>
                <Button size="sm" variant="secondary" icon={Power} onClick={setActive}>
                  {role.isActive ? "Vô hiệu hóa" : "Kích hoạt"}
                </Button>
                {!role.isSystem && (
                  <Button size="sm" variant="danger" icon={Trash2} onClick={remove}>
                    Xóa
                  </Button>
                )}
              </>
            )
          }
        >
          {!role ? (
            detail.loading ? <Loading /> : <div className="ui-muted">Chọn một vai trò.</div>
          ) : (
            <>
              <InfoGrid
                items={[
                  { label: "Mã vai trò", value: <span className="ui-code">{role.roleCode}</span> },
                  { label: "Loại", value: role.isSystem ? <Badge tone="info">Vai trò hệ thống</Badge> : <Badge>Tự tạo</Badge> },
                  { label: "Mô tả", value: role.description, wide: true },
                ]}
              />
              {role.roleCode === "ADMIN" && (
                <Alert tone="info" style={{ marginTop: 14 }}>
                  Vai trò ADMIN luôn giữ quyền &quot;Quản lý vai trò và phân quyền&quot; để tránh tự khóa hệ thống.
                </Alert>
              )}
              <hr className="ui-divider" />
              {!perms.data ? (
                <Loading />
              ) : (
                Object.entries(perms.data).map(([mod, list]) => {
                  const on = list.filter((p) => checked.has(p.permissionCode)).length;
                  return (
                    <div className="perm-group" key={mod}>
                      <div className="perm-group-head">
                        <span>
                          {MODULES[mod] || mod}{" "}
                          <span className="ui-muted" style={{ fontWeight: 500 }}>
                            ({on}/{list.length})
                          </span>
                        </span>
                        <span className="ui-row">
                          <Button size="sm" variant="ghost" onClick={() => toggleModule(list, true)}>
                            Chọn hết
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => toggleModule(list, false)}>
                            Bỏ hết
                          </Button>
                        </span>
                      </div>
                      <div className="perm-list">
                        {list.map((p) => (
                          <label key={p.permissionCode} className="perm-item">
                            <input type="checkbox" checked={checked.has(p.permissionCode)} onChange={() => toggle(p.permissionCode)} />
                            <span>
                              {p.permissionName}
                              <code>{p.permissionCode}</code>
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
              <div className="ui-between">
                <span className="ui-muted" style={{ fontSize: 12.5 }}>
                  {dirty ? "Có thay đổi chưa lưu" : `${checked.size} quyền`}
                </span>
                <Button icon={Save} disabled={!dirty} loading={busy} onClick={savePerms}>
                  Lưu phân quyền
                </Button>
              </div>
              {role.users?.length > 0 && (
                <>
                  <hr className="ui-divider" />
                  <div className="ui-label" style={{ marginBottom: 8 }}>
                    Người dùng có vai trò này ({role.users.length})
                  </div>
                  <div className="ui-chips">
                    {role.users.map((u) => (
                      <span key={u.id} className="ui-chip" title={u.email}>
                        {u.fullName}
                      </span>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </Card>
      </div>

      <Modal
        open={!!modal}
        title={modal?.mode === "edit" ? "Sửa vai trò" : "Thêm vai trò"}
        width={560}
        onClose={() => setModal(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(null)}>
              Hủy
            </Button>
            <Button loading={busy} onClick={saveRole}>
              Lưu
            </Button>
          </>
        }
      >
        {modal && (
          <SchemaForm
            fields={modal.mode === "edit" ? fields.filter((x) => !x.createOnly) : fields}
            values={modal.values}
            errors={modal.errors}
            onChange={(values) => setModal((m) => ({ ...m, values }))}
          />
        )}
        {modal?.mode === "create" && <div className="ui-hint ui-mt">Sau khi tạo, chọn quyền cho vai trò ở bảng phân quyền.</div>}
      </Modal>
    </Page>
  );
}

