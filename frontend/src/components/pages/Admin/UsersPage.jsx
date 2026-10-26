"use client";

import { useState } from "react";
import { KeyRound, Pencil, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { useAction, useApi, useOptions, usePaged } from "@/lib/hooks";
import { label, options } from "@/lib/labels";
import { fmtDateTime } from "@/lib/format";
import {
  Alert,
  Button,
  Card,
  ChipSelect,
  Field,
  FilterBar,
  FilterSelect,
  Modal,
  PagedTable,
  Page,
  PageHeader,
  SchemaForm,
  StatusBadge,
  cleanPayload,
  confirmDialog,
  toast,
  validateRequired,
} from "@/components/ui";

export default function UsersPage() {
  const list = usePaged("/users", {});
  const roles = useApi("/roles");
  const orgs = useOptions("/organizations/options", (o) => ({ value: o.id, label: o.name }));
  const facilities = useOptions("/facilities", (f) => ({ value: f.id, label: `${f.name} (${f.code})` }));
  const roleOpts = (roles.data || []).filter((r) => r.isActive).map((r) => ({ value: r.roleCode, label: r.roleName }));
  const [modal, setModal] = useState(null);
  const [roleModal, setRoleModal] = useState(null);
  const [created, setCreated] = useState(null);
  const [busy, run] = useAction();

  const fields = [
    { name: "fullName", label: "Họ và tên", required: true },
    { name: "email", label: "Email", type: "email", required: true, createOnly: true },
    { name: "username", label: "Tên đăng nhập", createOnly: true, hint: "Bỏ trống: lấy phần trước @ của email" },
    { name: "password", label: "Mật khẩu", type: "password", createOnly: true, hint: "Bỏ trống: hệ thống sinh mật khẩu tạm" },
    { name: "phoneNumber", label: "Số điện thoại" },
    { name: "position", label: "Chức vụ" },
    { name: "departmentId", label: "Đơn vị công tác", type: "select", numeric: true, options: orgs, placeholder: "— Không —" },
    {
      name: "facilityId",
      label: "Cơ sở KCB (tài khoản cơ sở)",
      type: "select",
      numeric: true,
      options: facilities,
      placeholder: "— Không —",
      show: (v) => (v.roleCodes || []).includes("FACILITY") || !!v.facilityId,
    },
    { name: "roleCodes", label: "Vai trò", type: "chips", options: roleOpts, span: "all", createOnly: true },
  ];

  const openCreate = () => setModal({ mode: "create", values: { roleCodes: ["SPECIALIST"] }, errors: {} });
  const openEdit = (u) =>
    setModal({
      mode: "edit",
      row: u,
      values: {
        fullName: u.fullName || "",
        phoneNumber: u.phoneNumber || "",
        position: u.position || "",
        departmentId: u.departmentId ?? "",
        facilityId: u.facilityId ?? "",
        roleCodes: u.roles || [],
      },
      errors: {},
    });

  const save = () =>
    run(async () => {
      const f = modal.mode === "edit" ? fields.filter((x) => !x.createOnly) : fields;
      const errors = validateRequired(f, modal.values);
      if (Object.keys(errors).length) return setModal((m) => ({ ...m, errors }));
      try {
        if (modal.mode === "edit") {
          const body = cleanPayload(f, modal.values, { keepEmpty: true });
          body.departmentId = body.departmentId ?? null;
          body.facilityId = body.facilityId ?? null;
          await api.patch(`/users/${modal.row.id}`, body);
          toast.success("Đã cập nhật người dùng");
        } else {
          const res = await api.post("/users", cleanPayload(f, modal.values));
          if (res?.temporaryPassword) setCreated({ email: res.user?.email, password: res.temporaryPassword });
          toast.success("Đã tạo người dùng");
        }
        setModal(null);
        list.reload();
      } catch (e) {
        toast.error(e);
      }
    });

  const saveRoles = () =>
    run(async () => {
      try {
        await api.put(`/users/${roleModal.user.id}/roles`, { roleCodes: roleModal.roles });
        toast.success("Đã cập nhật vai trò");
        setRoleModal(null);
        list.reload();
      } catch (e) {
        toast.error(e);
      }
    });

  const remove = async (u) => {
    if (!(await confirmDialog({ title: "Xóa người dùng", message: `Xóa tài khoản ${u.email}?`, danger: true, confirmText: "Xóa" }))) return;
    try {
      await api.del(`/users/${u.id}`);
      toast.success("Đã xóa");
      list.reload();
    } catch (e) {
      toast.error(e);
    }
  };

  return (
    <Page>
      <PageHeader
        title="Người dùng"
        subtitle="Thêm cán bộ, cập nhật thông tin và gán vai trò. Tài khoản người dân tự đăng ký; cán bộ đăng ký bằng email cơ quan được cấp quyền qua form xin cấp quyền."
        crumbs={["Quản trị hệ thống"]}
        actions={
          <Button icon={Plus} onClick={openCreate}>
            Thêm người dùng
          </Button>
        }
      />
      {created && (
        <Alert tone="success">
          Đã tạo tài khoản <strong>{created.email}</strong>. Mật khẩu tạm (chỉ hiện 1 lần): <span className="ui-code">{created.password}</span>
          <Button size="sm" variant="ghost" onClick={() => setCreated(null)} style={{ marginLeft: 8 }}>
            Đóng
          </Button>
        </Alert>
      )}
      <Card title="Danh sách người dùng">
        <FilterBar list={list} searchPlaceholder="Tên, email, tên đăng nhập">
          <FilterSelect list={list} name="role" label="Vai trò" options={roleOpts} />
          <FilterSelect list={list} name="accountType" label="Loại tài khoản" options={options("accountType")} />
          <FilterSelect list={list} name="departmentId" label="Đơn vị" options={orgs} />
          <FilterSelect list={list} name="status" label="Trạng thái" options={options("userStatus")} />
        </FilterBar>
        <PagedTable
          list={list}
          minWidth={980}
          columns={[
            {
              key: "name",
              title: "Người dùng",
              render: (u) => (
                <>
                  <div className="ui-cell-main">{u.fullName}</div>
                  <div className="ui-cell-sub">{u.email}</div>
                </>
              ),
            },
            { key: "pos", title: "Chức vụ / đơn vị", render: (u) => [u.position, u.department?.name].filter(Boolean).join(" — ") || <span className="ui-muted">—</span> },
            {
              key: "roles",
              title: "Vai trò",
              render: (u) =>
                u.roles?.length ? (
                  <div className="ui-chips">
                    {u.roles.map((r) => (
                      <span key={r} className="ui-chip">
                        {label("role", r)}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="ui-muted">Chưa có</span>
                ),
            },
            { key: "type", title: "Loại tài khoản", render: (u) => label("accountType", u.accountType) },
            { key: "status", title: "Trạng thái", render: (u) => <StatusBadge group="userStatus" value={u.status} /> },
            {
              key: "act",
              title: "Thao tác",
              nowrap: true,
              render: (u) => (
                <div className="ui-row" style={{ flexWrap: "nowrap" }}>
                  <Button size="sm" variant="secondary" icon={Pencil} onClick={() => openEdit(u)}>
                    Sửa
                  </Button>
                  <Button size="sm" variant="secondary" icon={ShieldCheck} onClick={() => setRoleModal({ user: u, roles: u.roles || [] })}>
                    Vai trò
                  </Button>
                  <Button size="sm" variant="danger" icon={Trash2} onClick={() => remove(u)} aria-label="Xóa" title="Xóa" />
                </div>
              ),
            },
          ]}
        />
      </Card>

      <Modal
        open={!!modal}
        title={modal?.mode === "edit" ? `Cập nhật: ${modal.row.email}` : "Thêm người dùng"}
        onClose={() => setModal(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(null)}>
              Hủy
            </Button>
            <Button loading={busy} onClick={save} icon={modal?.mode === "edit" ? Pencil : KeyRound}>
              {modal?.mode === "edit" ? "Lưu" : "Tạo tài khoản"}
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
      </Modal>

      <Modal
        open={!!roleModal}
        width={560}
        title={roleModal ? `Vai trò của ${roleModal.user.fullName}` : ""}
        onClose={() => setRoleModal(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setRoleModal(null)}>
              Hủy
            </Button>
            <Button loading={busy} onClick={saveRoles}>
              Lưu vai trò
            </Button>
          </>
        }
      >
        {roleModal && (
          <>
            <Field label="Chọn vai trò (bấm để bật / tắt)">
              <ChipSelect options={roleOpts} value={roleModal.roles} onChange={(roles) => setRoleModal((m) => ({ ...m, roles }))} />
            </Field>
            <div className="ui-hint ui-mt">
              Tài khoản có nhiều vai trò sẽ chọn vai trò khi đăng nhập, hoặc đổi vai trò ở góc trên bên phải. Lần đăng nhập gần nhất:{" "}
              {fmtDateTime(roleModal.user.lastLoginAt) || "chưa đăng nhập"}.
            </div>
          </>
        )}
      </Modal>
    </Page>
  );
}
