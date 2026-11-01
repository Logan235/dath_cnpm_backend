"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Inbox as InboxIcon, Reply, XCircle } from "lucide-react";
import { api, fileUrl } from "@/lib/api";
import { portalPath } from "@/lib/auth";
import { useAction, useApi, usePaged, useQueryParam } from "@/lib/hooks";
import { label, options } from "@/lib/labels";
import { fmtDateTime } from "@/lib/format";
import {
  Alert,
  Button,
  Card,
  Checkbox,
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
  toast,
} from "@/components/ui";

function Detail({ id, onChanged }) {
  const d = useApi(`/facility-feedbacks/${id}`);
  const [form, setForm] = useState({ decision: "", responseNote: "", dismissViolation: false, markRemediated: false, newPrecheckResult: "" });
  const [busy, run] = useAction();
  const f = d.data;

  useEffect(() => {
    setForm({ decision: "", responseNote: "", dismissViolation: false, markRemediated: false, newPrecheckResult: "" });
  }, [id]);

  if (!f) return d.error ? <Alert tone="danger">{d.error.message}</Alert> : <Loading />;
  const open = ["RECEIVED", "PROCESSING"].includes(f.status);

  const process = () =>
    run(async () => {
      try {
        await api.post(`/facility-feedbacks/${f.id}/process`);
        toast.success("Đã tiếp nhận xử lý");
        d.reload();
        onChanged();
      } catch (e) {
        toast.error(e);
      }
    });

  const respond = () =>
    run(async () => {
      if (!form.decision || !form.responseNote.trim()) return toast.error("Chọn kết quả và nhập nội dung trả lời.");
      try {
        await api.post(`/facility-feedbacks/${f.id}/respond`, {
          decision: form.decision,
          responseNote: form.responseNote.trim(),
          dismissViolation: form.decision === "ACCEPTED" && f.violationId ? form.dismissViolation : undefined,
          markRemediated: form.decision === "ACCEPTED" && f.feedbackType === "REMEDIATION_PROOF" ? form.markRemediated : undefined,
          newPrecheckResult: f.precheckId && form.newPrecheckResult ? form.newPrecheckResult : undefined,
        });
        toast.success("Đã gửi trả lời cho cơ sở");
        d.reload();
        onChanged();
      } catch (e) {
        toast.error(e);
      }
    });

  return (
    <Card title={`${f.code} — ${f.subject}`} actions={<StatusBadge group="feedbackStatus" value={f.status} />}>
      <InfoGrid
        items={[
          { label: "Cơ sở gửi", value: f.facility?.name },
          { label: "Loại phản hồi", value: label("feedbackType", f.feedbackType) },
          { label: "Ngày gửi", value: fmtDateTime(f.createdAt) },
          {
            label: "Liên quan",
            value: f.violation ? (
              <Link className="ui-link" href={portalPath(`/violations/detail?id=${f.violation.id}`)}>
                Hồ sơ {f.violation.code} ({label("violationStatus", f.violation.status)})
              </Link>
            ) : f.precheck ? (
              `Kiểm tra trước ${f.precheck.code} (${label("precheckResult", f.precheck.finalResult || f.precheck.aiResult)})`
            ) : null,
          },
        ]}
      />
      <div className="ui-label ui-mt" style={{ marginBottom: 6 }}>
        Nội dung
      </div>
      <div className="ui-quote">{f.content}</div>
      {(f.attachments || []).length > 0 && (
        <div className="ui-row ui-mt">
          {f.attachments.map((a, i) => (
            <a key={i} className="ui-chip" href={fileUrl(a.url)} target="_blank" rel="noreferrer">
              📎 {a.name || `Tệp ${i + 1}`}
            </a>
          ))}
        </div>
      )}

      {f.responseNote && (
        <Alert tone={f.status === "ACCEPTED" ? "success" : f.status === "REJECTED" ? "danger" : "info"} style={{ marginTop: 14 }}>
          <strong>Trả lời ({fmtDateTime(f.handledAt)}):</strong> {f.responseNote}
        </Alert>
      )}

      {open && (
        <>
          <hr className="ui-divider" />
          {f.status === "RECEIVED" && (
            <div className="ui-mb">
              <Button variant="secondary" icon={InboxIcon} loading={busy} onClick={process}>
                Tiếp nhận xử lý
              </Button>
            </div>
          )}
          <div className="ui-form ui-form-1">
            <Field label="Kết quả xem xét" required>
              <div className="ui-row">
                <Button variant={form.decision === "ACCEPTED" ? "success" : "secondary"} icon={CheckCircle2} onClick={() => setForm({ ...form, decision: "ACCEPTED" })}>
                  Chấp nhận
                </Button>
                <Button variant={form.decision === "REJECTED" ? "danger-solid" : "secondary"} icon={XCircle} onClick={() => setForm({ ...form, decision: "REJECTED" })}>
                  Không chấp nhận
                </Button>
              </div>
            </Field>
            {form.decision === "ACCEPTED" && f.violationId && (
              <Checkbox label="Bác bỏ hồ sơ vi phạm (giải trình hợp lý, không vi phạm)" checked={form.dismissViolation} onChange={(x) => setForm({ ...form, dismissViolation: x })} />
            )}
            {form.decision === "ACCEPTED" && f.feedbackType === "REMEDIATION_PROOF" && (
              <Checkbox label="Xác nhận cơ sở đã khắc phục hậu quả" checked={form.markRemediated} onChange={(x) => setForm({ ...form, markRemediated: x })} />
            )}
            {f.precheckId && (
              <Field label="Cập nhật kết quả kiểm tra trước">
                <Select value={form.newPrecheckResult} onChange={(e) => setForm({ ...form, newPrecheckResult: e.target.value })} options={options("precheckResult")} placeholder="— Giữ nguyên —" />
              </Field>
            )}
            <Field label="Nội dung trả lời cơ sở" required>
              <TextArea rows={3} value={form.responseNote} onChange={(e) => setForm({ ...form, responseNote: e.target.value })} placeholder="Ý kiến kết luận hoặc yêu cầu bổ sung hồ sơ..." />
            </Field>
          </div>
          <div className="ui-row ui-mt">
            <Button icon={Reply} loading={busy} onClick={respond}>
              Gửi trả lời
            </Button>
          </div>
        </>
      )}
    </Card>
  );
}

/** Hộp thư tiếp nhận giải trình / khiếu nại / bằng chứng khắc phục từ cơ sở KCB */
export default function FacilityFeedbackInboxPage() {
  const qId = useQueryParam("id");
  const list = usePaged("/facility-feedbacks", {});
  const [activeId, setActiveId] = useState(null);
  useEffect(() => {
    if (qId) setActiveId(qId);
  }, [qId]);

  return (
    <Page>
      <PageHeader
        title="Phản hồi từ đơn vị KCB"
        subtitle="Cơ sở gửi giải trình, khiếu nại kết quả xử lý hoặc bằng chứng đã khắc phục. Chuyên viên xem xét và trả lời; có thể bác bỏ hồ sơ vi phạm nếu giải trình hợp lý."
        crumbs={["Quản lý thông tin vi phạm"]}
      />
      <FilterBar list={list} searchPlaceholder="Mã, tiêu đề, cơ sở">
        <FilterSelect list={list} name="status" label="Trạng thái" options={options("feedbackStatus")} />
        <FilterSelect list={list} name="feedbackType" label="Loại" options={options("feedbackType")} />
      </FilterBar>
      <Inbox
        list={list}
        activeId={activeId}
        onSelect={setActiveId}
        emptyList="Chưa có phản hồi nào"
        renderItem={(f) => (
          <>
            <div className="ui-inbox-item-top">
              <span className="ui-inbox-item-title">{f.subject}</span>
              <StatusBadge group="feedbackStatus" value={f.status} />
            </div>
            <div style={{ fontSize: 12.5, color: "#3b4459" }}>
              {f.facility?.name} · {label("feedbackType", f.feedbackType)}
            </div>
            <div className="ui-inbox-item-meta">
              {f.code} · {fmtDateTime(f.createdAt)}
              {f.violation ? ` · ${f.violation.code}` : ""}
            </div>
          </>
        )}
        detail={activeId && <Detail key={activeId} id={activeId} onChanged={list.reload} />}
      />
    </Page>
  );
}
