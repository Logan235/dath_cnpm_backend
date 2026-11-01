"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MessageSquareReply, Plus, Send } from "lucide-react";
import Tabs from "@/components/Tabs";
import { api, externalUrl, fileUrl } from "@/lib/api";
import { useAction, useApi, usePaged, useQueryParam } from "@/lib/hooks";
import { label, options } from "@/lib/labels";
import { fmtDate, fmtDateTime, fmtMoney, truncate } from "@/lib/format";
import {
  Alert,
  Button,
  Card,
  DataTable,
  ErrorBox,
  Field,
  FilePicker,
  InfoGrid,
  Inbox,
  Loading,
  Modal,
  PagedTable,
  Page,
  PageHeader,
  Select,
  StatCard,
  StatusBadge,
  TextArea,
  TextInput,
  toast,
} from "@/components/ui";
import { PrecheckForm, PrecheckResult } from "../Violation/precheck";
import { PenaltyActions } from "../Violation/penalty";

/* ------------------------------------------------------------------ */
/* Gửi giải trình / khiếu nại / bằng chứng khắc phục                    */
/* ------------------------------------------------------------------ */
export function FeedbackModal({ violation, onClose, onDone }) {
  const [v, setV] = useState({ feedbackType: violation ? "EXPLANATION" : "COMPLAINT", subject: violation ? `Giải trình hồ sơ ${violation.code}` : "", content: "", target: "" });
  const [files, setFiles] = useState([]);
  const [busy, run] = useAction();
  // Phản hồi phải gắn với một hồ sơ vi phạm hoặc một phiếu kiểm tra trước của cơ sở
  const myViolations = useApi(violation ? null : "/facility-portal/violations");
  const myPrechecks = useApi(violation ? null : "/prechecks/mine", { pageSize: 50 });
  const targets = [
    ...(Array.isArray(myViolations.data) ? myViolations.data : []).map((x) => ({ value: `v:${x.id}`, label: `Hồ sơ vi phạm ${x.code} — ${truncate(x.title, 50)}` })),
    ...(myPrechecks.data?.data || []).map((x) => ({ value: `p:${x.id}`, label: `Kiểm tra trước ${x.code} — ${label("precheckResult", x.finalResult || x.aiResult)}` })),
  ];
  const submit = () =>
    run(async () => {
      if (!violation && !v.target) return toast.error("Chọn hồ sơ vi phạm hoặc phiếu kiểm tra trước liên quan.");
      if (!v.subject.trim() || !v.content.trim()) return toast.error("Nhập tiêu đề và nội dung.");
      const [kind, tid] = (v.target || "").split(":");
      try {
        const f = await api.post("/facility-feedbacks", {
          violationId: violation?.id ?? (kind === "v" ? Number(tid) : undefined),
          precheckId: kind === "p" ? Number(tid) : undefined,
          feedbackType: v.feedbackType,
          subject: v.subject.trim(),
          content: v.content.trim(),
        });
        if (files.length) {
          try {
            await api.upload(`/facility-feedbacks/${f.id}/attachments`, files, { field: "files" });
          } catch (e) {
            toast.error(`Đã gửi phản hồi nhưng chưa tải được tệp: ${e.message}`);
          }
        }
        toast.success(`Đã gửi phản hồi ${f.code}. Sở Y tế sẽ trả lời qua hệ thống.`);
        onDone?.(f);
      } catch (e) {
        toast.error(e);
      }
    });
  return (
    <Modal
      open
      width={700}
      title={violation ? `Phản hồi về hồ sơ ${violation.code}` : "Gửi phản hồi cho Sở Y tế"}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Hủy
          </Button>
          <Button icon={Send} loading={busy} onClick={submit}>
            Gửi
          </Button>
        </>
      }
    >
      <div className="ui-form ui-form-1">
        {!violation && (
          <Field label="Liên quan đến" required hint="Khiếu nại kết quả kiểm tra trước, hoặc giải trình / bằng chứng khắc phục cho một hồ sơ vi phạm.">
            <Select value={v.target} onChange={(e) => setV({ ...v, target: e.target.value })} options={targets} placeholder={targets.length ? "-- Chọn --" : "Cơ sở chưa có hồ sơ vi phạm / phiếu kiểm tra nào"} />
          </Field>
        )}
        <Field label="Loại phản hồi" required>
          <Select value={v.feedbackType} onChange={(e) => setV({ ...v, feedbackType: e.target.value })} options={options("feedbackType")} />
        </Field>
        <Field label="Tiêu đề" required>
          <TextInput value={v.subject} onChange={(e) => setV({ ...v, subject: e.target.value })} />
        </Field>
        <Field label="Nội dung" required>
          <TextArea rows={5} value={v.content} onChange={(e) => setV({ ...v, content: e.target.value })} placeholder="Trình bày nội dung giải trình, khiếu nại hoặc kết quả khắc phục..." />
        </Field>
        <div className="ui-row">
          <FilePicker multiple accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg" onFiles={(f) => setFiles((x) => [...x, ...f])}>
            Đính kèm tài liệu / ảnh
          </FilePicker>
          {files.map((f, i) => (
            <span key={i} className="ui-chip">
              📎 {f.name}
            </span>
          ))}
        </div>
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Hồ sơ cơ sở                                                          */
/* ------------------------------------------------------------------ */
export function FacilityProfilePage() {
  const router = useRouter();
  const p = useApi("/facility-portal/profile");
  const tasks = useApi("/statistics/my-tasks");
  const f = p.data;
  return (
    <Page>
      <PageHeader title={f?.name || "Hồ sơ cơ sở"} subtitle="Thông tin cơ sở và giấy phép do Sở Y tế quản lý. Cần điều chỉnh, vui lòng liên hệ Sở Y tế hoặc gửi phản hồi." />
      <ErrorBox error={p.error} onRetry={p.reload} />
      {!f ? (
        p.loading && <Loading />
      ) : (
        <>
          <div className="ui-grid ui-grid-4 ui-mb">
            <StatCard label="Tình trạng hoạt động" value={label("facilityOperatingStatus", f.operatingStatus)} tone={f.operatingStatus === "ACTIVE" ? "success" : "danger"} />
            <StatCard label="Hồ sơ vi phạm đang xử lý" value={tasks.data?.myOpenViolations ?? "…"} tone={tasks.data?.myOpenViolations ? "warning" : undefined} onClick={() => router.push("/facility/violations")} />
            <StatCard label="Mức rủi ro" value={label("riskLevel", f.riskLevel)} hint={`Điểm ${Number(f.riskScore || 0).toFixed(0)}/100 · ${f.violationCount} lần vi phạm`} tone={f.riskLevel === "HIGH" ? "danger" : f.riskLevel === "MEDIUM" ? "warning" : "success"} />
            <StatCard label="Thông báo chưa đọc" value={tasks.data?.unreadNotifications ?? "…"} onClick={() => router.push("/facility/notifications")} />
          </div>
          {f.isBlacklisted && <Alert tone="danger">Cơ sở đang nằm trong danh sách cảnh báo của Sở Y tế.</Alert>}
          <Card title="Thông tin cơ sở">
            <InfoGrid
              items={[
                { label: "Mã cơ sở", value: <span className="ui-code">{f.code}</span> },
                { label: "Loại hình", value: f.type?.name },
                { label: "Hình thức tổ chức", value: f.organizationForm },
                { label: "Người đại diện", value: f.representative },
                { label: "Địa chỉ", value: f.address, wide: true },
                { label: "Điện thoại", value: f.phone },
                { label: "Email", value: f.email },
                { label: "Website", value: f.website ? <a className="ui-link" href={externalUrl(f.website)} target="_blank" rel="noreferrer">{f.website}</a> : null },
                { label: "Thời gian làm việc", value: f.workingHours },
                { label: "Số giấy phép hoạt động", value: f.licenseNumber },
                { label: "Ngày cấp", value: fmtDate(f.licenseIssuedDate) },
                { label: "Phạm vi chuyên môn", value: f.professionalScope, wide: true },
                {
                  label: "Kỹ thuật được cấp phép (chỉ được quảng cáo các kỹ thuật này)",
                  wide: true,
                  value: (
                    <div className="ui-chips">
                      {(f.licensedTechniques || []).map((t) => (
                        <span key={t} className="ui-chip">
                          {t}
                        </span>
                      ))}
                    </div>
                  ),
                },
              ]}
            />
          </Card>
          <Card title="Giấy phép và chứng chỉ hành nghề">
            <DataTable
              minWidth={720}
              rows={f.licenses || []}
              empty="Chưa có giấy phép"
              columns={[
                { key: "n", title: "Số", render: (l) => <span className="ui-code">{l.licenseNumber}</span> },
                { key: "t", title: "Loại", render: (l) => label("licenseType", l.licenseType) },
                { key: "h", title: "Người được cấp", render: (l) => [l.holderName, l.holderTitle].filter(Boolean).join(" — ") },
                { key: "i", title: "Ngày cấp", nowrap: true, render: (l) => fmtDate(l.issuedDate) },
                { key: "e", title: "Hết hạn", nowrap: true, render: (l) => fmtDate(l.expiryDate) || "Không thời hạn" },
                { key: "s", title: "Trạng thái", render: (l) => <StatusBadge group="recordStatus" value={l.status} /> },
              ]}
            />
          </Card>
        </>
      )}
    </Page>
  );
}

/* ------------------------------------------------------------------ */
/* Vi phạm của cơ sở                                                    */
/* ------------------------------------------------------------------ */
function FacilityViolationDetail({ id, onChanged }) {
  const d = useApi(`/facility-portal/violations/${id}`);
  const [fb, setFb] = useState(false);
  const v = d.data;
  if (!v) return d.error ? <Alert tone="danger">{d.error.message}</Alert> : <Loading />;
  const closed = ["RESOLVED", "DISMISSED"].includes(v.status);
  return (
    <Card
      title={`${v.code} — ${truncate(v.title, 60)}`}
      actions={
        <>
          <StatusBadge group="violationStatus" value={v.status} />
          <Button size="sm" icon={MessageSquareReply} onClick={() => setFb(true)}>
            {closed ? "Gửi phản hồi" : "Giải trình / khiếu nại"}
          </Button>
        </>
      }
    >
      <InfoGrid
        items={[
          { label: "Ngày phát hiện", value: fmtDateTime(v.detectedAt) },
          { label: "Mức độ", value: <StatusBadge group="severity" value={v.severity} /> },
          { label: "Loại vi phạm", value: (v.types || []).map((t) => t.name).join("; "), wide: true },
          { label: "Căn cứ pháp lý", value: (v.types || []).map((t) => [t.legalBasis, t.legalDocument?.documentNumber].filter(Boolean).join(" - ")).filter(Boolean).join("; "), wide: true },
          { label: "Kết quả xử lý", value: label("handlingResult", v.handlingResult) },
          { label: "Khắc phục hậu quả", value: <StatusBadge group="remediationStatus" value={v.remediationStatus} /> },
          { label: "Đường dẫn quảng cáo", value: v.contentUrl ? <a className="ui-link" href={externalUrl(v.contentUrl)} target="_blank" rel="noreferrer">{v.contentUrl}</a> : null, wide: true },
        ]}
      />
      <div className="ui-label ui-mt" style={{ marginBottom: 6 }}>
        Nội dung quảng cáo
      </div>
      <div className="ui-quote">{v.contentSnapshot}</div>
      {(v.penalties || []).length > 0 && (
        <>
          <div className="ui-label ui-mt" style={{ marginBottom: 6 }}>
            Quyết định xử phạt
          </div>
          <DataTable
            minWidth={620}
            showIndex={false}
            rows={v.penalties}
            columns={[
              { key: "n", title: "Số QĐ", render: (p) => <span className="ui-code">{p.decisionNumber}</span> },
              { key: "f", title: "Tiền phạt", num: true, render: (p) => fmtMoney(p.fineAmount) },
              { key: "e", title: "Thi hành", render: (p) => <StatusBadge group="executionStatus" value={p.executionStatus} /> },
              { key: "d", title: "Hạn", render: (p) => fmtDate(p.dueDate) },
              { key: "a", title: "", render: (p) => <PenaltyActions p={p} /> },
            ]}
          />
        </>
      )}
      {(v.feedbacks || []).length > 0 && (
        <>
          <div className="ui-label ui-mt" style={{ marginBottom: 6 }}>
            Phản hồi đã gửi
          </div>
          {v.feedbacks.map((f) => (
            <div key={f.id} className="ui-note" style={{ marginBottom: 8 }}>
              <div className="ui-between">
                <strong>
                  {f.code} · {label("feedbackType", f.feedbackType)}: {f.subject}
                </strong>
                <StatusBadge group="feedbackStatus" value={f.status} />
              </div>
              <div style={{ marginTop: 4 }}>{f.content}</div>
              {f.responseNote && (
                <div style={{ marginTop: 6, color: "#1d4f9c" }}>
                  <strong>Sở Y tế trả lời:</strong> {f.responseNote}
                </div>
              )}
            </div>
          ))}
        </>
      )}
      {fb && (
        <FeedbackModal
          violation={v}
          onClose={() => setFb(false)}
          onDone={() => {
            setFb(false);
            d.reload();
            onChanged?.();
          }}
        />
      )}
    </Card>
  );
}

export function FacilityViolationsPage() {
  const qId = useQueryParam("id");
  const raw = useApi("/facility-portal/violations");
  const [activeId, setActiveId] = useState(null);
  useEffect(() => {
    if (qId) setActiveId(qId);
  }, [qId]);
  const rows = Array.isArray(raw.data) ? raw.data : [];
  const list = { rows, total: rows.length, page: 1, pageSize: Math.max(rows.length, 1), setPage: () => {}, loading: raw.loading, error: raw.error };
  return (
    <Page>
      <PageHeader
        title="Vi phạm của cơ sở"
        subtitle="Hồ sơ vi phạm quảng cáo của cơ sở do Sở Y tế lập. Cơ sở có thể gửi giải trình, khiếu nại hoặc bằng chứng đã khắc phục."
      />
      <Inbox
        list={list}
        activeId={activeId}
        onSelect={setActiveId}
        emptyList="Cơ sở chưa có hồ sơ vi phạm nào."
        renderItem={(v) => (
          <>
            <div className="ui-inbox-item-top">
              <span className="ui-inbox-item-title">{v.code}</span>
              <StatusBadge group="violationStatus" value={v.status} />
            </div>
            <div style={{ fontSize: 12.5, color: "#3b4459" }}>{truncate(v.title, 90)}</div>
            <div className="ui-inbox-item-meta">
              {fmtDate(v.detectedAt)} · {label("severity", v.severity)}
            </div>
          </>
        )}
        detail={activeId && <FacilityViolationDetail key={activeId} id={activeId} onChanged={raw.reload} />}
      />
    </Page>
  );
}

/* ------------------------------------------------------------------ */
/* Giải trình / khiếu nại đã gửi                                        */
/* ------------------------------------------------------------------ */
function MyFeedbackDetail({ id }) {
  const d = useApi(`/facility-feedbacks/${id}`);
  const f = d.data;
  if (!f) return <Loading />;
  return (
    <Card title={`${f.code} — ${f.subject}`} actions={<StatusBadge group="feedbackStatus" value={f.status} />}>
      <InfoGrid
        items={[
          { label: "Loại", value: label("feedbackType", f.feedbackType) },
          { label: "Ngày gửi", value: fmtDateTime(f.createdAt) },
          { label: "Hồ sơ liên quan", value: f.violation ? `${f.violation.code} (${label("violationStatus", f.violation.status)})` : null },
        ]}
      />
      <div className="ui-quote ui-mt">{f.content}</div>
      {(f.attachments || []).length > 0 && (
        <div className="ui-row ui-mt">
          {f.attachments.map((a, i) => (
            <a key={i} className="ui-chip" href={fileUrl(a.url)} target="_blank" rel="noreferrer">
              📎 {a.name}
            </a>
          ))}
        </div>
      )}
      {f.responseNote ? (
        <Alert tone={f.status === "ACCEPTED" ? "success" : f.status === "REJECTED" ? "danger" : "info"} style={{ marginTop: 14, marginBottom: 0 }}>
          <strong>Sở Y tế trả lời ({fmtDateTime(f.handledAt)}):</strong> {f.responseNote}
        </Alert>
      ) : (
        <Alert tone="info" style={{ marginTop: 14, marginBottom: 0 }}>
          Đang chờ Sở Y tế xem xét.
        </Alert>
      )}
    </Card>
  );
}

export function FacilityFeedbacksPage() {
  const qId = useQueryParam("id");
  const list = usePaged("/facility-feedbacks/mine", {});
  const [activeId, setActiveId] = useState(null);
  const [create, setCreate] = useState(false);
  useEffect(() => {
    if (qId) setActiveId(qId);
  }, [qId]);
  return (
    <Page>
      <PageHeader
        title="Giải trình / khiếu nại"
        subtitle="Giải trình, khiếu nại, bằng chứng khắc phục cơ sở đã gửi Sở Y tế và kết quả trả lời. Mỗi phản hồi gắn với một hồ sơ vi phạm hoặc một phiếu kiểm tra trước."
        actions={
          <Button icon={Plus} onClick={() => setCreate(true)}>
            Gửi phản hồi mới
          </Button>
        }
      />
      <Inbox
        list={list}
        activeId={activeId}
        onSelect={setActiveId}
        emptyList="Chưa gửi phản hồi nào"
        renderItem={(f) => (
          <>
            <div className="ui-inbox-item-top">
              <span className="ui-inbox-item-title">{f.subject}</span>
              <StatusBadge group="feedbackStatus" value={f.status} />
            </div>
            <div className="ui-inbox-item-meta">
              {f.code} · {label("feedbackType", f.feedbackType)} · {fmtDateTime(f.createdAt)}
            </div>
          </>
        )}
        detail={activeId && <MyFeedbackDetail key={activeId} id={activeId} />}
      />
      {create && (
        <FeedbackModal
          onClose={() => setCreate(false)}
          onDone={(f) => {
            setCreate(false);
            list.reload();
            setActiveId(f.id);
          }}
        />
      )}
    </Page>
  );
}

/* ------------------------------------------------------------------ */
/* Kiểm tra trước nội dung quảng cáo (cơ sở)                            */
/* ------------------------------------------------------------------ */
export function MyPrechecks({ title = "Lịch sử kiểm tra" }) {
  const list = usePaged("/prechecks/mine", {});
  const [view, setView] = useState(null);
  return (
    <Card title={`${title} (${list.total})`}>
      <PagedTable
        list={list}
        minWidth={720}
        onRowClick={setView}
        empty="Chưa có lần kiểm tra nào"
        columns={[
          { key: "c", title: "Mã tra cứu", nowrap: true, render: (p) => <span className="ui-code">{p.code}</span> },
          { key: "t", title: "Nội dung", render: (p) => truncate(p.contentText, 100) },
          { key: "r", title: "Kết quả", render: (p) => <StatusBadge group="precheckResult" value={p.finalResult || p.aiResult} /> },
          { key: "s", title: "Trạng thái", render: (p) => <StatusBadge group="precheckStatus" value={p.status} /> },
          { key: "d", title: "Thời gian", nowrap: true, render: (p) => fmtDateTime(p.createdAt) },
        ]}
      />
      <Modal open={!!view} width={860} title={view ? `Kết quả kiểm tra ${view.code}` : ""} onClose={() => setView(null)}>
        {view && (
          <>
            <div className="ui-quote ui-mb">{view.contentText}</div>
            <PrecheckResult data={view} />
          </>
        )}
      </Modal>
    </Card>
  );
}

export function FacilityPrecheckPage() {
  const [res, setRes] = useState(null);
  const [tab, setTab] = useState("new");
  return (
    <Page>
      <PageHeader
        title="Kiểm tra trước nội dung quảng cáo"
        subtitle="Gửi nội dung quảng cáo dự kiến để hệ thống đối chiếu với giấy phép, phạm vi kỹ thuật được cấp phép và quy định pháp luật trước khi đăng. Chuyên viên Sở Y tế xác minh kết quả cuối cùng."
      />
      <Tabs
        tabs={[
          { key: "new", label: "Kiểm tra mới" },
          { key: "history", label: "Lịch sử kiểm tra" },
        ]}
        active={tab}
        onChange={setTab}
      />
      {tab === "new" ? (
        <>
          <PrecheckForm isFacility onResult={setRes} />
          {res && (
            <Card title="Kết quả sơ bộ">
              <PrecheckResult data={res} />
            </Card>
          )}
        </>
      ) : (
        <MyPrechecks />
      )}
    </Page>
  );
}
