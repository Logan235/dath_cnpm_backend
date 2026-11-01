"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, BadgeCheck, GitMerge, Pencil, Plus, Trash2, UserCheck } from "lucide-react";
import { api } from "@/lib/api";
import { portalPath } from "@/lib/auth";
import { useAction, useApi, useQueryParam, useSession } from "@/lib/hooks";
import { label, options } from "@/lib/labels";
import { fmtDate, fmtDateTime } from "@/lib/format";
import {
  Alert,
  Badge,
  Button,
  Card,
  DataTable,
  ErrorBox,
  Field,
  InfoGrid,
  Loading,
  Modal,
  Page,
  PageHeader,
  SchemaForm,
  Select,
  StatusBadge,
  TextArea,
  TextInput,
  cleanPayload,
  confirmDialog,
  toast,
  validateRequired,
} from "@/components/ui";
import { ExtLink } from "../AdProcessing/common";
import { useSuspectFields } from "./SuspectsPage";

const ACCOUNT_FIELDS = [
  { name: "platform", label: "Nền tảng", type: "select", required: true, options: options("platform").filter((o) => o.value !== "CHUA_PHAN_LOAI"), placeholder: false },
  { name: "platformUid", label: "ID / tên tài khoản", required: true },
  { name: "displayName", label: "Tên hiển thị" },
  { name: "url", label: "Đường dẫn" },
];

/** Hồ sơ một đối tượng vi phạm: thông tin định danh, tài khoản MXH, dòng thời gian vi phạm, điểm rủi ro */
export default function SuspectDetailPage() {
  const router = useRouter();
  const id = useQueryParam("id");
  const { can } = useSession();
  const d = useApi(id ? `/suspects/${id}` : null);
  const fields = useSuspectFields();
  const [modal, setModal] = useState(null);
  const [busy, run] = useAction();
  if (!id) return <Page><Loading /></Page>;
  const s = d.data;
  const manage = can("suspect.manage");

  const call = (fn, ok) =>
    run(async () => {
      try {
        await fn();
        toast.success(ok);
        setModal(null);
        d.reload();
      } catch (e) {
        toast.error(e);
      }
    });

  const saveEdit = () => {
    const errors = validateRequired(fields, modal.values);
    if (Object.keys(errors).length) return setModal((m) => ({ ...m, errors }));
    call(() => api.patch(`/suspects/${s.id}`, cleanPayload(fields, modal.values, { keepEmpty: true })), "Đã cập nhật đối tượng");
  };
  const saveAccount = () => {
    const errors = validateRequired(ACCOUNT_FIELDS, modal.values);
    if (Object.keys(errors).length) return setModal((m) => ({ ...m, errors }));
    call(() => api.post(`/suspects/${s.id}/accounts`, cleanPayload(ACCOUNT_FIELDS, modal.values)), "Đã thêm tài khoản");
  };
  const removeAccount = async (a) => {
    if (!(await confirmDialog({ title: "Gỡ tài khoản", message: `Gỡ tài khoản ${a.platformUid} khỏi đối tượng?`, danger: true, confirmText: "Gỡ" }))) return;
    call(() => api.del(`/suspects/accounts/${a.id}`), "Đã gỡ tài khoản");
  };
  const merge = async () => {
    const target = Number(modal.values.targetSuspectId);
    if (!target) return toast.error("Nhập mã số (ID) đối tượng đích");
    if (!(await confirmDialog({ title: "Gộp đối tượng", message: `Gộp ${s.code} vào đối tượng #${target}? Vi phạm, tài khoản, số điện thoại sẽ chuyển sang đối tượng đích.`, danger: true, confirmText: "Gộp" }))) return;
    run(async () => {
      try {
        const r = await api.post(`/suspects/${s.id}/merge`, { targetSuspectId: target });
        toast.success("Đã gộp đối tượng");
        setModal(null);
        router.replace(portalPath(`/suspects/detail?id=${r?.id || target}`));
      } catch (e) {
        toast.error(e);
      }
    });
  };

  return (
    <Page>
      <PageHeader
        title={s ? `${s.code} — ${s.name}` : "Đối tượng vi phạm"}
        crumbs={["Đối tượng vi phạm"]}
        actions={
          <>
            <Button variant="secondary" icon={ArrowLeft} onClick={() => router.push(portalPath("/suspects"))}>
              Về danh sách
            </Button>
            {s && manage && (
              <>
                <Button
                  variant="secondary"
                  icon={Pencil}
                  onClick={() =>
                    setModal({
                      kind: "edit",
                      values: { ...Object.fromEntries(fields.map((f) => [f.name, s[f.name] ?? ""])), phones: s.phones || [], emails: s.emails || [], websites: s.websites || [] },
                      errors: {},
                    })
                  }
                >
                  Sửa
                </Button>
                <Button variant="secondary" icon={UserCheck} onClick={() => setModal({ kind: "status", values: { status: s.status === "VERIFIED" ? "VERIFIED" : "VERIFIED", note: "" } })}>
                  Cập nhật xác minh
                </Button>
                <Button variant="secondary" icon={GitMerge} onClick={() => setModal({ kind: "merge", values: { targetSuspectId: "" } })}>
                  Gộp vào đối tượng khác
                </Button>
              </>
            )}
          </>
        }
      />
      <ErrorBox error={d.error} onRetry={d.reload} />
      {!s ? (
        d.loading && <Loading />
      ) : (
        <>
          {(s.pendingCandidates || []).length > 0 && manage && (
            <Alert tone="warning">
              Có {s.pendingCandidates.length} trường hợp nghi trùng với đối tượng này đang chờ xác nhận.{" "}
              <Link className="ui-link" href={portalPath("/match-candidates")}>
                Mở đối soát →
              </Link>
            </Alert>
          )}
          <div className="ui-split">
            <Card title="Thông tin định danh" actions={<StatusBadge group="suspectStatus" value={s.status} />}>
              <InfoGrid
                items={[
                  { label: "Mã đối tượng", value: <span className="ui-code">{s.code}</span> },
                  { label: "Người đại diện", value: s.representative },
                  { label: "Mã số thuế / CCCD", value: s.taxCode },
                  { label: "Cơ sở KCB", value: s.facility?.name },
                  { label: "Địa chỉ", value: s.address, wide: true },
                  { label: "Số điện thoại", value: (s.phones || []).join(", ") },
                  { label: "Email", value: (s.emails || []).join(", ") },
                  { label: "Website / trang", value: (s.websites || []).join(", "), wide: true },
                  { label: "Ghi chú", value: s.notes, wide: true },
                ]}
              />
            </Card>
            <Card title="Điểm rủi ro">
              <div className="ui-row" style={{ alignItems: "baseline", gap: 12 }}>
                <span style={{ fontSize: 34, fontWeight: 700, color: s.riskLevel === "HIGH" ? "#b42318" : s.riskLevel === "MEDIUM" ? "#9a5b00" : "#1f7a45" }}>
                  {Number(s.riskScore || 0).toFixed(0)}
                </span>
                <span className="ui-muted">/ 100</span>
                <StatusBadge group="riskLevel" value={s.riskLevel} />
              </div>
              <div className="ui-hint" style={{ margin: "6px 0 12px" }}>
                RS = Σ trọng số × hệ số lan truyền × α^(số tháng) + điểm tái phạm. Thấp 0–30, Trung bình 31–70, Cao 71–100.
              </div>
              <DataTable
                minWidth={360}
                showIndex={false}
                rows={s.riskBreakdown || []}
                rowKey={(r, i) => i}
                empty="Chưa có vi phạm"
                columns={[
                  { key: "c", title: "Hồ sơ", render: (r) => <span className="ui-code">{r.code}</span> },
                  { key: "w", title: "Trọng số", num: true, render: (r) => r.weight },
                  { key: "f", title: "Hệ số", num: true, render: (r) => r.factor },
                  { key: "m", title: "Tháng", num: true, render: (r) => r.months },
                  { key: "p", title: "Điểm", num: true, render: (r) => <strong>{r.points}</strong> },
                ]}
              />
            </Card>
          </div>

          <Card
            title={`Tài khoản mạng xã hội (${(s.accounts || []).length})`}
            actions={
              manage && (
                <Button size="sm" icon={Plus} onClick={() => setModal({ kind: "account", values: { platform: "FACEBOOK" }, errors: {} })}>
                  Thêm tài khoản
                </Button>
              )
            }
          >
            <DataTable
              minWidth={640}
              rows={s.accounts || []}
              empty="Chưa có tài khoản"
              columns={[
                { key: "p", title: "Nền tảng", render: (a) => label("platform", a.platform) },
                { key: "u", title: "Tài khoản", render: (a) => <span className="ui-cell-main">{a.displayName || a.platformUid}</span> },
                { key: "l", title: "Đường dẫn", render: (a) => <ExtLink href={a.url} /> },
                { key: "v", title: "Xác minh", render: (a) => (a.isVerified ? <Badge tone="success">Đã xác minh {fmtDate(a.verifiedAt)}</Badge> : <Badge>Chưa xác minh</Badge>) },
                {
                  key: "x",
                  title: "",
                  render: (a) =>
                    manage && (
                      <div className="ui-row" style={{ flexWrap: "nowrap" }}>
                        {!a.isVerified && (
                          <Button size="sm" variant="secondary" icon={BadgeCheck} onClick={() => call(() => api.patch(`/suspects/accounts/${a.id}/verify`), "Đã xác minh tài khoản")}>
                            Xác minh
                          </Button>
                        )}
                        <Button size="sm" variant="danger" icon={Trash2} onClick={() => removeAccount(a)} aria-label="Gỡ" title="Gỡ" />
                      </div>
                    ),
                },
              ]}
            />
          </Card>

          <Card title={`Dòng thời gian vi phạm (${(s.timeline || []).length})`}>
            <DataTable
              minWidth={760}
              rows={s.timeline || []}
              empty="Chưa có hồ sơ vi phạm"
              onRowClick={can("violation.view") ? (t) => router.push(portalPath(`/violations/detail?id=${t.id}`)) : undefined}
              columns={[
                { key: "d", title: "Ngày", nowrap: true, render: (t) => fmtDate(t.detectedAt) },
                { key: "c", title: "Hồ sơ", nowrap: true, render: (t) => <span className="ui-code">{t.code}</span> },
                { key: "t", title: "Nội dung", render: (t) => t.title },
                { key: "ty", title: "Loại", render: (t) => (t.types || []).join(", ") },
                { key: "s", title: "Trạng thái", render: (t) => <StatusBadge group="violationStatus" value={t.status} /> },
              ]}
            />
          </Card>

          {(s.cases || []).length > 0 && (
            <Card title="Hồ sơ phối hợp điều tra">
              <DataTable
                minWidth={640}
                rows={s.cases}
                onRowClick={can("case.view") ? (c) => router.push(portalPath(`/cases?id=${c.id}`)) : undefined}
                columns={[
                  { key: "c", title: "Mã", render: (c) => <span className="ui-code">{c.code}</span> },
                  { key: "a", title: "Cơ quan", render: (c) => label("caseAgency", c.targetAgency) },
                  { key: "s", title: "Trạng thái", render: (c) => <StatusBadge group="caseStatus" value={c.status} /> },
                  { key: "r", title: "Kết quả", render: (c) => c.resultSummary },
                  { key: "t", title: "Chuyển lúc", nowrap: true, render: (c) => fmtDateTime(c.transferredAt) },
                ]}
              />
            </Card>
          )}

          <Modal
            open={!!modal}
            width={modal?.kind === "edit" ? 820 : 560}
            title={{ edit: "Sửa thông tin đối tượng", account: "Thêm tài khoản mạng xã hội", status: "Cập nhật kết quả xác minh", merge: "Gộp vào đối tượng khác" }[modal?.kind] || ""}
            onClose={() => setModal(null)}
            footer={
              <>
                <Button variant="secondary" onClick={() => setModal(null)}>
                  Hủy
                </Button>
                <Button
                  loading={busy}
                  variant={modal?.kind === "merge" ? "danger-solid" : "primary"}
                  onClick={() => {
                    if (modal.kind === "edit") saveEdit();
                    else if (modal.kind === "account") saveAccount();
                    else if (modal.kind === "status") call(() => api.post(`/suspects/${s.id}/status`, { status: modal.values.status, note: modal.values.note || undefined }), "Đã cập nhật trạng thái");
                    else merge();
                  }}
                >
                  Lưu
                </Button>
              </>
            }
          >
            {modal?.kind === "edit" && <SchemaForm fields={fields} values={modal.values} errors={modal.errors} onChange={(values) => setModal((m) => ({ ...m, values }))} />}
            {modal?.kind === "account" && <SchemaForm fields={ACCOUNT_FIELDS} values={modal.values} errors={modal.errors} onChange={(values) => setModal((m) => ({ ...m, values }))} />}
            {modal?.kind === "status" && (
              <div className="ui-form ui-form-1">
                <Field label="Kết quả xác minh">
                  <Select
                    value={modal.values.status}
                    onChange={(e) => setModal((m) => ({ ...m, values: { ...m.values, status: e.target.value } }))}
                    options={options("suspectStatus", ["VERIFIED", "CLEARED", "MONITORING"])}
                  />
                </Field>
                <Field label="Ghi chú">
                  <TextArea rows={2} value={modal.values.note} onChange={(e) => setModal((m) => ({ ...m, values: { ...m.values, note: e.target.value } }))} />
                </Field>
              </div>
            )}
            {modal?.kind === "merge" && (
              <Field label="ID đối tượng đích" hint="Mở danh sách đối tượng để xem ID (số trong mã DT-xxxx).">
                <TextInput type="number" value={modal.values.targetSuspectId} onChange={(e) => setModal((m) => ({ ...m, values: { targetSuspectId: e.target.value } }))} />
              </Field>
            )}
          </Modal>
        </>
      )}
    </Page>
  );
}
