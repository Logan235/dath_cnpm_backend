"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { api, fileUrl } from "@/lib/api";
import { useAction, useApi, useOptions, usePaged, useSession } from "@/lib/hooks";
import { label, options } from "@/lib/labels";
import { fmtDateTime } from "@/lib/format";
import {
  Alert,
  Badge,
  Button,
  Card,
  Field,
  FilterBar,
  FilterSelect,
  InfoGrid,
  Inbox,
  Loading,
  Page,
  PageHeader,
  Select,
  StatusBadge,
  TextArea,
  promptDialog,
  toast,
} from "@/components/ui";

function Detail({ id, onDone, canGrantAll }) {
  const d = useApi(`/role-requests/${id}`);
  const orgs = useOptions("/organizations/options", (o) => ({ value: o.id, label: o.name }));
  const [roleCode, setRoleCode] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [note, setNote] = useState("");
  const [busy, run] = useAction();

  useEffect(() => {
    if (d.data) {
      setRoleCode(d.data.requestedRoleCode);
      setDepartmentId(d.data.departmentId ?? "");
      setNote("");
    }
  }, [d.data]);

  if (d.loading && !d.data) return <Loading />;
  if (d.error) return <Alert tone="danger">{d.error.message}</Alert>;
  const r = d.data;
  if (!r) return null;
  const grantable = canGrantAll ? ["SPECIALIST", "MANAGER", "CYBER_POLICE", "ADMIN"] : ["SPECIALIST", "CYBER_POLICE"];

  const approve = () =>
    run(async () => {
      try {
        await api.post(`/role-requests/${r.id}/approve`, {
          roleCode,
          departmentId: departmentId ? Number(departmentId) : undefined,
          note: note || undefined,
        });
        toast.success(`Đã cấp vai trò "${label("role", roleCode)}" cho ${r.user?.email}`);
        d.reload();
        onDone();
      } catch (e) {
        toast.error(e);
      }
    });

  const reject = async () => {
    const reason = await promptDialog({ title: "Từ chối form", label: "Lý do từ chối (gửi cho người xin)", required: true, confirmText: "Từ chối", danger: true });
    if (!reason) return;
    try {
      await api.post(`/role-requests/${r.id}/reject`, { note: reason });
      toast.success("Đã từ chối form");
      d.reload();
      onDone();
    } catch (e) {
      toast.error(e);
    }
  };

  const ac = r.autoCheck || {};
  return (
    <Card title={`Form xin cấp quyền #${r.id}`} actions={<StatusBadge group="roleRequestStatus" value={r.status} />}>
      <InfoGrid
        items={[
          { label: "Người gửi", value: r.user?.fullName },
          { label: "Email", value: r.user?.email },
          { label: "Loại tài khoản", value: label("accountType", r.user?.accountType) },
          { label: "Ngày gửi", value: fmtDateTime(r.createdAt) },
          { label: "Vai trò xin cấp", value: label("role", r.requestedRoleCode) },
          { label: "Đơn vị công tác", value: r.department?.name },
          { label: "Chức vụ", value: r.position },
          { label: "Mã số cán bộ", value: r.staffCode },
          { label: "Số điện thoại", value: r.phone },
          {
            label: "File đính kèm",
            value: r.attachmentPath ? (
              <a className="ui-link" href={fileUrl(r.attachmentPath)} target="_blank" rel="noreferrer">
                Mở file
              </a>
            ) : null,
          },
          { label: "Lý do / nhiệm vụ được phân công", value: r.reason, wide: true },
        ]}
      />
      <hr className="ui-divider" />
      <div className="ui-label" style={{ marginBottom: 8 }}>
        Hệ thống tự kiểm tra
      </div>
      <div className="ui-row">
        <Badge tone={ac.officialEmail ? "success" : "danger"}>{ac.officialEmail ? "✓ Email cơ quan" : "✗ Không phải email cơ quan"}</Badge>
        <Badge tone={ac.departmentActive === false ? "danger" : "success"}>
          {ac.departmentActive === false ? "✗ Đơn vị không hoạt động" : "✓ Đơn vị hợp lệ"}
        </Badge>
        <Badge tone={(ac.previousRequests || []).length ? "warning" : "neutral"}>Đã gửi trước đó: {(ac.previousRequests || []).length} form</Badge>
      </div>

      {r.status === "PENDING" ? (
        <>
          <hr className="ui-divider" />
          <div className="ui-form">
            <Field label="Cấp vai trò" hint={canGrantAll ? undefined : "Lãnh đạo chỉ cấp được vai trò Chuyên viên và An ninh mạng"}>
              <Select value={roleCode} onChange={(e) => setRoleCode(e.target.value)} options={options("role", grantable)} />
            </Field>
            <Field label="Đơn vị công tác">
              <Select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} options={orgs} placeholder="— Giữ như form —" />
            </Field>
            <Field label="Ghi chú gửi người xin" span="all">
              <TextArea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
            </Field>
          </div>
          <div className="ui-row ui-mt">
            <Button variant="success" icon={CheckCircle2} loading={busy} onClick={approve}>
              Duyệt và cấp quyền
            </Button>
            <Button variant="danger" icon={XCircle} onClick={reject}>
              Từ chối
            </Button>
          </div>
        </>
      ) : (
        <Alert tone={r.status === "APPROVED" ? "success" : "info"} style={{ marginTop: 14 }}>
          Đã xử lý lúc {fmtDateTime(r.reviewedAt)}
          {r.reviewNote ? ` — ${r.reviewNote}` : ""}
        </Alert>
      )}
    </Card>
  );
}

/** Hộp thư duyệt form xin cấp quyền cán bộ (Admin + Lãnh đạo) */
export default function RoleRequestsPage() {
  const list = usePaged("/role-requests", { status: "PENDING" });
  const { role } = useSession();
  const [activeId, setActiveId] = useState(null);

  return (
    <Page>
      <PageHeader
        title="Duyệt form xin cấp quyền"
        subtitle="Cán bộ đăng ký bằng email cơ quan gửi form xin vai trò. Kiểm tra thông tin, chọn vai trò phù hợp rồi duyệt hoặc từ chối."
        crumbs={["Quản trị hệ thống"]}
      />
      <FilterBar list={list} searchPlaceholder="Tên, email người gửi">
        <FilterSelect list={list} name="status" label="Trạng thái" options={options("roleRequestStatus")} />
      </FilterBar>
      <Inbox
        list={list}
        activeId={activeId}
        onSelect={setActiveId}
        emptyList="Không có form nào"
        renderItem={(r) => (
          <>
            <div className="ui-inbox-item-top">
              <span className="ui-inbox-item-title">{r.user?.fullName || r.user?.email}</span>
              <StatusBadge group="roleRequestStatus" value={r.status} />
            </div>
            <div style={{ fontSize: 12.5, color: "#3b4459" }}>Xin vai trò: {label("role", r.requestedRoleCode)}</div>
            <div className="ui-inbox-item-meta">
              {r.user?.email} · {fmtDateTime(r.createdAt)}
            </div>
          </>
        )}
        detail={activeId && <Detail key={activeId} id={activeId} canGrantAll={role === "ADMIN"} onDone={list.reload} />}
      />
    </Page>
  );
}
