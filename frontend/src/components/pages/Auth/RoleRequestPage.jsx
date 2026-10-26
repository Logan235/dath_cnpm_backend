"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Send, XCircle, LayoutDashboard } from "lucide-react";
import { LOGO_SRC } from "@/assets/icons";
import { homeFor } from "@/config/portals";
import { api, fileUrl } from "@/lib/api";
import { getSession, logout, refreshWithRole } from "@/lib/auth";
import { useApi, useAction } from "@/lib/hooks";
import { label, options } from "@/lib/labels";
import { fmtDateTime } from "@/lib/format";
import {
  Alert,
  Button,
  Card,
  FilePicker,
  InfoGrid,
  SchemaForm,
  StatusBadge,
  cleanPayload,
  confirmDialog,
  toast,
  validateRequired,
} from "@/components/ui";

/**
 * Trang dành cho cán bộ đăng ký bằng email cơ quan: gửi form xin cấp quyền, theo dõi kết quả duyệt.
 * Admin / lãnh đạo duyệt ở "Duyệt form xin cấp quyền".
 */
export default function RoleRequestPage() {
  const router = useRouter();
  const [session, setSession] = useState(undefined);
  useEffect(() => setSession(getSession()), []);

  const me = useApi(session?.accessToken ? "/auth/me" : null);
  const mine = useApi(session?.accessToken ? "/role-requests/mine" : null);
  const orgs = useApi(session?.accessToken ? "/organizations/options" : null);
  const [values, setValues] = useState({ requestedRoleCode: "SPECIALIST" });
  const [errors, setErrors] = useState({});
  const [file, setFile] = useState(null);
  const [busy, run] = useAction();

  if (session === undefined) return null;

  const requests = Array.isArray(mine.data) ? mine.data : [];
  const latest = requests[0] || null;
  const roles = me.data?.user?.roles || [];
  const isOfficial = me.data?.user?.accountType === "OFFICIAL" || me.data?.isOfficialEmail;

  const fields = [
    {
      name: "requestedRoleCode",
      label: "Vai trò xin cấp",
      type: "select",
      required: true,
      placeholder: false,
      options: options("role", ["SPECIALIST", "MANAGER", "CYBER_POLICE"]),
      hint: "Admin hoặc lãnh đạo có thể cấp vai trò khác phù hợp hơn khi duyệt.",
    },
    {
      name: "departmentId",
      label: "Đơn vị công tác",
      type: "select",
      numeric: true,
      options: (orgs.data || []).map((o) => ({ value: o.id, label: o.name })),
    },
    { name: "position", label: "Chức vụ" },
    { name: "staffCode", label: "Mã số cán bộ / số thẻ công chức" },
    { name: "phone", label: "Số điện thoại" },
    { name: "reason", label: "Lý do / nhiệm vụ được phân công", type: "textarea", required: true, span: "all", rows: 4 },
  ];

  const submit = () =>
    run(async () => {
      const errs = validateRequired(fields, values);
      setErrors(errs);
      if (Object.keys(errs).length) return;
      try {
        const created = await api.post("/role-requests", cleanPayload(fields, values));
        if (file) {
          try {
            await api.upload(`/role-requests/${created.id}/attachment`, file);
          } catch (e) {
            toast.error(`Đã gửi form nhưng chưa tải được file: ${e.message}`);
          }
        }
        toast.success("Đã gửi form xin cấp quyền. Vui lòng chờ quản trị viên / lãnh đạo duyệt.");
        setFile(null);
        mine.reload();
        me.reload();
      } catch (e) {
        toast.error(e);
      }
    });

  const cancel = async () => {
    if (!(await confirmDialog({ title: "Hủy form", message: "Hủy form xin cấp quyền đang chờ duyệt?", danger: true, confirmText: "Hủy form" }))) return;
    try {
      await api.post(`/role-requests/${latest.id}/cancel`);
      toast.success("Đã hủy form");
      mine.reload();
    } catch (e) {
      toast.error(e);
    }
  };

  const uploadMore = (files) =>
    run(async () => {
      try {
        await api.upload(`/role-requests/${latest.id}/attachment`, files[0]);
        toast.success("Đã đính kèm file");
        mine.reload();
      } catch (e) {
        toast.error(e);
      }
    });

  const enter = () =>
    run(async () => {
      const r = await refreshWithRole();
      if (r.ok && r.session.role) router.replace(homeFor(r.session));
      else toast.error("Chưa nhận được vai trò mới. Hãy đăng xuất rồi đăng nhập lại.");
    });

  const signOut = async () => {
    await logout();
    router.replace("/login");
  };

  const canSubmit = !latest || ["REJECTED", "CANCELLED"].includes(latest.status) || (latest.status === "APPROVED" && roles.length > 0);

  return (
    <div className="solo-page">
      <div className="solo-box" style={{ maxWidth: 760 }}>
        <div className="ui-between" style={{ marginBottom: 16 }}>
          <Link href="/citizen/pre-check" className="solo-brand" style={{ marginBottom: 0 }}>
            <img src={LOGO_SRC} alt="" />
            <strong>Sở Y tế TP. Hồ Chí Minh</strong>
          </Link>
          {session?.accessToken && (
            <Button variant="secondary" size="sm" icon={LogOut} onClick={signOut}>
              Đăng xuất
            </Button>
          )}
        </div>

        {!session?.accessToken ? (
          <Card title="Xin cấp quyền cán bộ">
            <Alert tone="info">Hãy đăng nhập bằng tài khoản email cơ quan trước khi gửi form xin cấp quyền.</Alert>
            <Button onClick={() => router.push("/login?next=/role-request")}>Đăng nhập</Button>
          </Card>
        ) : (
          <>
            <Card title="Xin cấp quyền cán bộ">
              <InfoGrid
                items={[
                  { label: "Họ và tên", value: me.data?.user?.fullName },
                  { label: "Email", value: me.data?.user?.email },
                  { label: "Loại tài khoản", value: label("accountType", me.data?.user?.accountType) },
                  { label: "Vai trò hiện có", value: roles.length ? roles.map((r) => label("role", r)).join(", ") : "Chưa có" },
                ]}
              />
              {me.data && !isOfficial && (
                <Alert tone="warning" style={{ marginTop: 14, marginBottom: 0 }}>
                  Chỉ tài khoản đăng ký bằng email cơ quan mới gửi được form xin cấp quyền cán bộ.
                </Alert>
              )}
              {roles.length > 0 && (
                <div className="ui-mt">
                  <Button icon={LayoutDashboard} onClick={enter} loading={busy}>
                    Vào khu vực làm việc
                  </Button>
                </div>
              )}
            </Card>

            {latest && (
              <Card title="Form gần nhất">
                {latest.status === "PENDING" && (
                  <Alert tone="warning">Form đang chờ quản trị viên / lãnh đạo duyệt. Bạn sẽ nhận thông báo khi có kết quả.</Alert>
                )}
                {latest.status === "APPROVED" && (
                  <Alert tone="success">
                    Form đã được duyệt. Bấm <strong>Vào khu vực làm việc</strong> để dùng vai trò mới.
                    {roles.length === 0 && " (Nếu chưa thấy vai trò, hãy đăng xuất và đăng nhập lại.)"}
                  </Alert>
                )}
                {latest.status === "REJECTED" && <Alert tone="danger">Form bị từ chối. Bạn có thể bổ sung thông tin và gửi lại.</Alert>}
                <InfoGrid
                  items={[
                    { label: "Trạng thái", value: <StatusBadge group="roleRequestStatus" value={latest.status} /> },
                    { label: "Ngày gửi", value: fmtDateTime(latest.createdAt) },
                    { label: "Vai trò xin cấp", value: label("role", latest.requestedRoleCode) },
                    { label: "Đơn vị công tác", value: latest.department?.name },
                    { label: "Chức vụ", value: latest.position },
                    { label: "Mã số cán bộ", value: latest.staffCode },
                    { label: "Lý do", value: latest.reason, wide: true },
                    {
                      label: "File đính kèm",
                      value: latest.attachmentPath ? (
                        <a className="ui-link" href={fileUrl(latest.attachmentPath)} target="_blank" rel="noreferrer">
                          Xem file
                        </a>
                      ) : null,
                    },
                    { label: "Ý kiến người duyệt", value: latest.reviewNote, wide: true, hidden: !latest.reviewNote },
                  ]}
                />
                {latest.status === "PENDING" && (
                  <div className="ui-row ui-mt">
                    <FilePicker accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" onFiles={uploadMore} loading={busy}>
                      Đính kèm quyết định / thẻ công chức
                    </FilePicker>
                    <Button variant="danger" icon={XCircle} onClick={cancel}>
                      Hủy form
                    </Button>
                  </div>
                )}
              </Card>
            )}

            {isOfficial && canSubmit && (
              <Card title={latest ? "Gửi form mới" : "Thông tin xin cấp quyền"}>
                <SchemaForm fields={fields} values={values} errors={errors} onChange={setValues} />
                <div className="ui-row ui-mt">
                  <FilePicker accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" onFiles={(f) => setFile(f[0])}>
                    {file ? `Đã chọn: ${file.name}` : "Đính kèm file (không bắt buộc)"}
                  </FilePicker>
                  <Button icon={Send} loading={busy} onClick={submit}>
                    Gửi form
                  </Button>
                </div>
              </Card>
            )}

            {requests.length > 1 && (
              <Card title="Các form đã gửi">
                {requests.slice(1).map((r) => (
                  <div key={r.id} className="ui-between" style={{ padding: "8px 0", borderTop: "1px solid #eef0f4", fontSize: 13 }}>
                    <span>
                      {fmtDateTime(r.createdAt)} — {label("role", r.requestedRoleCode)}
                    </span>
                    <StatusBadge group="roleRequestStatus" value={r.status} />
                  </div>
                ))}
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
