"use client";

import { useState } from "react";
import { History, KeyRound, Lock, Unlock } from "lucide-react";
import { api } from "@/lib/api";
import { usePaged } from "@/lib/hooks";
import { label, options } from "@/lib/labels";
import { fmtDateTime } from "@/lib/format";
import {
  Alert,
  Button,
  Card,
  FilterBar,
  FilterSelect,
  Modal,
  PagedTable,
  Page,
  PageHeader,
  StatusBadge,
  confirmDialog,
  promptDialog,
  toast,
} from "@/components/ui";

function LoginHistory({ user }) {
  const list = usePaged(`/users/${user.id}/login-history`, {}, { pageSize: 10 });
  return (
    <PagedTable
      list={list}
      minWidth={560}
      columns={[
        { key: "t", title: "Thời gian", nowrap: true, render: (r) => fmtDateTime(r.createdAt) },
        { key: "a", title: "Hoạt động", render: (r) => <StatusBadge group="x" value={r.action} text={r.action === "LOGIN" ? "Đăng nhập" : r.action === "LOGOUT" ? "Đăng xuất" : r.action === "LOGIN_FAILED" ? "Sai mật khẩu" : r.action} /> },
        { key: "r", title: "Vai trò", render: (r) => label("role", r.role) || "—" },
        { key: "ip", title: "Địa chỉ IP", render: (r) => r.ipAddress },
      ]}
    />
  );
}

export default function AccountsPage() {
  const list = usePaged("/users", {});
  const [history, setHistory] = useState(null);
  const [tempPass, setTempPass] = useState(null);

  const lock = async (u) => {
    if (!(await confirmDialog({ title: "Khóa tài khoản", message: `Khóa tài khoản ${u.email}? Người dùng bị đăng xuất ngay.`, danger: true, confirmText: "Khóa" }))) return;
    try {
      await api.post(`/users/${u.id}/lock`);
      toast.success("Đã khóa tài khoản");
      list.reload();
    } catch (e) {
      toast.error(e);
    }
  };
  const unlock = async (u) => {
    try {
      await api.post(`/users/${u.id}/unlock`);
      toast.success("Đã mở khóa tài khoản");
      list.reload();
    } catch (e) {
      toast.error(e);
    }
  };
  const reset = async (u) => {
    const pwd = await promptDialog({
      title: `Đặt lại mật khẩu: ${u.email}`,
      label: "Mật khẩu mới",
      placeholder: "Bỏ trống để hệ thống sinh mật khẩu tạm",
      rows: 1,
      confirmText: "Đặt lại",
    });
    if (pwd === null) return;
    try {
      const r = await api.post(`/users/${u.id}/reset-password`, pwd ? { newPassword: pwd } : {});
      setTempPass({ email: u.email, password: r.temporaryPassword || pwd });
      toast.success("Đã đặt lại mật khẩu");
    } catch (e) {
      toast.error(e);
    }
  };

  return (
    <Page>
      <PageHeader
        title="Tài khoản đăng nhập"
        subtitle="Khóa / mở khóa, đặt lại mật khẩu và xem lịch sử đăng nhập. Khóa tài khoản có hiệu lực ngay ở thao tác tiếp theo của người dùng."
        crumbs={["Quản trị hệ thống"]}
      />
      {tempPass && (
        <Alert tone="success">
          Mật khẩu mới của <strong>{tempPass.email}</strong>: <span className="ui-code">{tempPass.password}</span> — gửi cho người dùng và yêu cầu đổi
          mật khẩu sau khi đăng nhập.
          <Button size="sm" variant="ghost" onClick={() => setTempPass(null)} style={{ marginLeft: 8 }}>
            Đóng
          </Button>
        </Alert>
      )}
      <Card title="Danh sách tài khoản">
        <FilterBar list={list} searchPlaceholder="Email, tên đăng nhập, họ tên">
          <FilterSelect list={list} name="accountType" label="Loại tài khoản" options={options("accountType")} />
          <FilterSelect list={list} name="status" label="Trạng thái" options={options("userStatus")} />
        </FilterBar>
        <PagedTable
          list={list}
          minWidth={960}
          columns={[
            { key: "username", title: "Tên đăng nhập", render: (u) => <span className="ui-code">{u.username}</span> },
            {
              key: "email",
              title: "Email / họ tên",
              render: (u) => (
                <>
                  <div className="ui-cell-main">{u.email}</div>
                  <div className="ui-cell-sub">{u.fullName}</div>
                </>
              ),
            },
            { key: "type", title: "Loại tài khoản", render: (u) => label("accountType", u.accountType) },
            { key: "last", title: "Đăng nhập gần nhất", nowrap: true, render: (u) => fmtDateTime(u.lastLoginAt) || <span className="ui-muted">Chưa đăng nhập</span> },
            { key: "status", title: "Trạng thái", render: (u) => <StatusBadge group="userStatus" value={u.status} /> },
            {
              key: "act",
              title: "Thao tác",
              nowrap: true,
              render: (u) => (
                <div className="ui-row" style={{ flexWrap: "nowrap" }}>
                  {u.status === "LOCKED" ? (
                    <Button size="sm" variant="secondary" icon={Unlock} onClick={() => unlock(u)}>
                      Mở khóa
                    </Button>
                  ) : (
                    <Button size="sm" variant="danger" icon={Lock} onClick={() => lock(u)}>
                      Khóa
                    </Button>
                  )}
                  <Button size="sm" variant="secondary" icon={KeyRound} onClick={() => reset(u)}>
                    Đặt lại MK
                  </Button>
                  <Button size="sm" variant="secondary" icon={History} onClick={() => setHistory(u)}>
                    Lịch sử
                  </Button>
                </div>
              ),
            },
          ]}
        />
      </Card>
      <Modal open={!!history} width={760} title={history ? `Lịch sử đăng nhập: ${history.email}` : ""} onClose={() => setHistory(null)}>
        {history && <LoginHistory user={history} />}
      </Modal>
    </Page>
  );
}
