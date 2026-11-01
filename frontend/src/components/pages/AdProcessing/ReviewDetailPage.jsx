"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, BrainCircuit, CheckCircle2, Gavel, Hand, LogOut } from "lucide-react";
import { api } from "@/lib/api";
import { portalPath } from "@/lib/auth";
import { useAction, useApi, useQueryParam, useSession } from "@/lib/hooks";
import { label, options } from "@/lib/labels";
import { fmtDate, fmtDateTime, fmtNumber } from "@/lib/format";
import {
  Alert,
  Badge,
  Button,
  Card,
  ChipSelect,
  DataTable,
  ErrorBox,
  Field,
  InfoGrid,
  Loading,
  Page,
  PageHeader,
  Select,
  StatusBadge,
  TextArea,
  confirmDialog,
  toast,
} from "@/components/ui";
import { AiResultBox, ExtLink, ReviewsList, useViolationTypes } from "./common";
import { FileLink } from "../InfoSourceV2/shared";

const REVIEWABLE = ["AI_ANALYZED", "IN_REVIEW", "NEED_MORE_INFO"];

function ReviewForm({ item, ai, types, onDone }) {
  const started = useRef(Date.now());
  const [v, setV] = useState({
    decision: "",
    types: ai?.violationTypes || [],
    severity: "",
    licenseStatus: "",
    compliantStatus: "",
    reason: "",
    wrongParts: "",
  });
  const [err, setErr] = useState({});
  const [busy, run] = useAction();
  const typeOpts = types.filter((t) => t.isActive !== false).map((t) => ({ value: t.code, label: t.name }));
  const aiPositive = ["VIOLATION", "SUSPECTED"].includes(ai?.label);
  const disagrees = v.decision && ((v.decision === "VIOLATION") !== aiPositive || (v.decision === "VIOLATION" && [...v.types].sort().join() !== [...(ai?.violationTypes || [])].sort().join()));

  const submit = () =>
    run(async () => {
      const e = {};
      if (!v.decision) e.decision = "Chọn kết luận";
      if (!v.reason.trim()) e.reason = "Nhập lý do / nhận xét";
      if (v.decision === "VIOLATION" && !v.types.length) e.types = "Chọn ít nhất một loại vi phạm";
      setErr(e);
      if (Object.keys(e).length) return;
      if (
        v.decision === "VIOLATION" &&
        !(await confirmDialog({ title: "Xác nhận vi phạm", message: "Xác nhận vi phạm sẽ lập hồ sơ vi phạm và chuyển sang bước xử lý. Tiếp tục?", confirmText: "Xác nhận vi phạm" }))
      )
        return;
      try {
        const r = await api.post(`/ad-items/${item.id}/reviews`, {
          decision: v.decision,
          correctedViolationTypes: v.decision === "VIOLATION" ? v.types : [],
          severity: v.severity || undefined,
          licenseStatus: v.licenseStatus || undefined,
          compliantStatus: v.compliantStatus || undefined,
          reason: v.reason.trim(),
          wrongParts: v.wrongParts.trim() || undefined,
          durationSeconds: Math.round((Date.now() - started.current) / 1000),
        });
        toast.success(r.message || "Đã ghi nhận đánh giá");
        onDone(r);
      } catch (e2) {
        toast.error(e2);
      }
    });

  return (
    <Card title="Đánh giá của chuyên viên">
      <div className="ui-form">
        <Field label="Kết luận" required error={err.decision} span="all">
          <div className="ui-row">
            {[
              { value: "VIOLATION", label: "Xác nhận vi phạm", variant: "danger-solid" },
              { value: "NOT_VIOLATION", label: "Không vi phạm", variant: "success" },
              { value: "NEED_MORE_INFO", label: "Yêu cầu bổ sung căn cứ", variant: "secondary" },
            ].map((o) => (
              <Button key={o.value} variant={v.decision === o.value ? o.variant : "secondary"} onClick={() => setV({ ...v, decision: o.value })} aria-pressed={v.decision === o.value}>
                {v.decision === o.value ? "✓ " : ""}
                {o.label}
              </Button>
            ))}
          </div>
        </Field>
        {v.decision === "VIOLATION" && (
          <>
            <Field label="Loại vi phạm" required error={err.types} span="all" hint="Mặc định theo gợi ý của AI — bấm để thêm / bỏ.">
              <ChipSelect options={typeOpts} value={v.types} onChange={(types2) => setV({ ...v, types: types2 })} />
            </Field>
            <Field label="Mức độ">
              <Select value={v.severity} onChange={(e) => setV({ ...v, severity: e.target.value })} options={options("severity")} placeholder="Theo loại vi phạm" />
            </Field>
          </>
        )}
        <Field label="Tình trạng giấy phép">
          <Select value={v.licenseStatus} onChange={(e) => setV({ ...v, licenseStatus: e.target.value })} options={options("licenseStatus")} placeholder="— Không đánh giá —" />
        </Field>
        <Field label="Phạm vi chuyên môn">
          <Select value={v.compliantStatus} onChange={(e) => setV({ ...v, compliantStatus: e.target.value })} options={options("compliantStatus")} placeholder="— Không đánh giá —" />
        </Field>
        <Field label="Lý do / nhận xét" required error={err.reason} span="all">
          <TextArea rows={3} value={v.reason} onChange={(e) => setV({ ...v, reason: e.target.value })} placeholder="Căn cứ kết luận: điều khoản vi phạm, giấy phép đã đối chiếu..." />
        </Field>
        {disagrees && (
          <Field label="Phần AI dự đoán sai / thiếu căn cứ" span="all" hint="Dùng làm dữ liệu phản hồi để tái huấn luyện AI.">
            <TextArea rows={2} value={v.wrongParts} onChange={(e) => setV({ ...v, wrongParts: e.target.value })} />
          </Field>
        )}
      </div>
      {disagrees && <Alert tone="warning" style={{ marginTop: 12, marginBottom: 0 }}>Kết luận của bạn khác với AI — sẽ được ghi lại làm dữ liệu tái huấn luyện.</Alert>}
      <div className="ui-row ui-mt">
        <Button icon={CheckCircle2} loading={busy} onClick={submit} size="lg">
          Gửi đánh giá
        </Button>
      </div>
    </Card>
  );
}

function ResolveForm({ item, ai, types, onDone }) {
  const [v, setV] = useState({ decision: "", types: ai?.violationTypes || [], severity: "", reason: "" });
  const [busy, run] = useAction();
  const typeOpts = types.map((t) => ({ value: t.code, label: t.name }));
  const submit = () =>
    run(async () => {
      if (!v.decision || !v.reason.trim()) return toast.error("Chọn kết luận và nhập lý do.");
      try {
        const r = await api.post(`/ad-items/${item.id}/resolve-conflict`, {
          decision: v.decision,
          correctedViolationTypes: v.decision === "VIOLATION" ? v.types : [],
          severity: v.severity || undefined,
          reason: v.reason.trim(),
        });
        toast.success(r.violation ? `Đã quyết định: vi phạm, lập hồ sơ ${r.violation.code}` : "Đã quyết định: không vi phạm");
        onDone(r);
      } catch (e) {
        toast.error(e);
      }
    });
  return (
    <Card title="Lãnh đạo giải quyết xung đột">
      <Alert tone="warning">Các chuyên viên đưa ra kết luận khác nhau. Xem các đánh giá bên dưới rồi đưa ra quyết định cuối cùng.</Alert>
      <div className="ui-form">
        <Field label="Quyết định" required span="all">
          <div className="ui-row">
            <Button variant={v.decision === "VIOLATION" ? "danger-solid" : "secondary"} onClick={() => setV({ ...v, decision: "VIOLATION" })}>
              Vi phạm
            </Button>
            <Button variant={v.decision === "NOT_VIOLATION" ? "success" : "secondary"} onClick={() => setV({ ...v, decision: "NOT_VIOLATION" })}>
              Không vi phạm
            </Button>
          </div>
        </Field>
        {v.decision === "VIOLATION" && (
          <>
            <Field label="Loại vi phạm" span="all">
              <ChipSelect options={typeOpts} value={v.types} onChange={(t) => setV({ ...v, types: t })} />
            </Field>
            <Field label="Mức độ">
              <Select value={v.severity} onChange={(e) => setV({ ...v, severity: e.target.value })} options={options("severity")} placeholder="Theo loại vi phạm" />
            </Field>
          </>
        )}
        <Field label="Lý do quyết định" required span="all">
          <TextArea rows={3} value={v.reason} onChange={(e) => setV({ ...v, reason: e.target.value })} />
        </Field>
      </div>
      <div className="ui-row ui-mt">
        <Button icon={Gavel} loading={busy} onClick={submit}>
          Ra quyết định
        </Button>
      </div>
    </Card>
  );
}

/** Màn hình hỗ trợ ra quyết định cho một mẫu tin */
export default function ReviewDetailPage() {
  const router = useRouter();
  const id = useQueryParam("id");
  const { session, can } = useSession();
  const ds = useApi(id ? `/ad-items/${id}/decision-support` : null);
  const detail = useApi(id ? `/ad-items/${id}` : null);
  const types = useViolationTypes();
  const [result, setResult] = useState(null);
  const [busy, run] = useAction();

  useEffect(() => setResult(null), [id]);

  if (!id) return <Page><Loading /></Page>;
  const d = ds.data;
  const it = d?.item;
  const full = detail.data;
  const me = session?.user?.id;
  const assignedToOther = full?.assignedTo && String(full.assignedTo) !== String(me);
  const reviewedByMe = (d?.reviews || []).some((r) => String(r.reviewerId) === String(me) && r.decision !== "NEED_MORE_INFO");
  const reload = () => {
    ds.reload();
    detail.reload();
  };

  const takeOver = () =>
    run(async () => {
      try {
        await api.post(`/ad-items/${id}/assign`, { userId: me });
        toast.success("Bạn đã nhận mẫu tin này");
        reload();
      } catch (e) {
        toast.error(e);
      }
    });
  const release = () =>
    run(async () => {
      try {
        await api.post(`/ad-items/${id}/release`);
        toast.success("Đã trả mẫu tin về hàng đợi");
        reload();
      } catch (e) {
        toast.error(e);
      }
    });
  const reAnalyze = () =>
    run(async () => {
      try {
        await api.post("/ad-items/analyze", { ids: [id] });
        toast.success("AI đã phân tích lại");
        reload();
      } catch (e) {
        toast.error(e);
      }
    });

  const violation = result?.violation || full?.violation;
  return (
    <Page>
      <PageHeader
        title={it ? `Đánh giá mẫu tin ${it.code}` : "Đánh giá mẫu tin"}
        subtitle="Nội dung gốc, kết quả AI, dữ liệu giấy phép và lịch sử vi phạm của cơ sở để chuyên viên ra quyết định."
        crumbs={["Xử lý thông tin QC", "Đánh giá kết quả AI"]}
        actions={
          <>
            <Button variant="secondary" icon={ArrowLeft} onClick={() => router.back()}>
              Quay lại
            </Button>
            {it && REVIEWABLE.includes(it.status) && can("ai.run") && (
              <Button variant="secondary" icon={BrainCircuit} loading={busy} onClick={reAnalyze}>
                AI phân tích lại
              </Button>
            )}
            {it && REVIEWABLE.includes(it.status) && can("review.submit") && String(full?.assignedTo || "") !== String(me) && (
              <Button variant="secondary" icon={Hand} loading={busy} onClick={takeOver}>
                Nhận xử lý
              </Button>
            )}
            {it && full?.assignedTo && (String(full.assignedTo) === String(me) || can("review.resolve")) && REVIEWABLE.includes(it.status) && (
              <Button variant="secondary" icon={LogOut} loading={busy} onClick={release}>
                Trả về hàng đợi
              </Button>
            )}
          </>
        }
      />
      <ErrorBox error={ds.error} onRetry={reload} />
      {!d ? (
        ds.loading && <Loading />
      ) : (
        <>
          {result?.message && <Alert tone={result.violation ? "danger" : "success"}>{result.message}</Alert>}
          {violation && (
            <Alert tone="danger">
              Mẫu tin đã có hồ sơ vi phạm <strong>{violation.code}</strong>.{" "}
              {can("violation.view") && (
                <Link className="ui-link" href={portalPath(`/violations/detail?id=${violation.id}`)}>
                  Mở hồ sơ vi phạm →
                </Link>
              )}
            </Alert>
          )}
          {assignedToOther && <Alert tone="warning">Mẫu tin đang được giao cho {full.assignee?.fullName || "chuyên viên khác"}.</Alert>}

          <div className="ui-split">
            <div style={{ minWidth: 0 }}>
              <Card title="Nội dung quảng cáo" actions={<StatusBadge group="adStatus" value={it.status} />}>
                <InfoGrid
                  cols={3}
                  items={[
                    { label: "Nguồn", value: label("adSource", it.sourceType) },
                    { label: "Nền tảng", value: label("platform", it.platform) },
                    { label: "Thu thập", value: fmtDateTime(it.collectedAt) },
                    { label: "Tác giả", value: it.authorName },
                    { label: "Lĩnh vực", value: label("field", it.field) },
                    { label: "Lan truyền", value: `${fmtNumber(it.views)} xem · ${fmtNumber(it.shares)} chia sẻ · ${fmtNumber(it.likes)} thích` },
                    { label: "URL", value: <ExtLink href={it.sourceUrl} />, wide: true },
                  ]}
                />
                <div className="ui-quote ui-mt">{it.content}</div>
              </Card>
              <Card title="Kết quả phân tích của AI" actions={d.ai?.model && <Badge tone="info">{d.ai.model.name?.split("(")[0]} v{d.ai.model.version}</Badge>}>
                <AiResultBox ai={d.ai} types={types} />
              </Card>
              {(d.reviews || []).length > 0 && (
                <Card title={`Đánh giá đã có (${d.reviews.length}) — cần ${d.requiredReviews} chuyên viên`}>
                  <ReviewsList reviews={d.reviews} types={types} />
                </Card>
              )}
            </div>
            <div style={{ minWidth: 0 }}>
              {it.status === "CONFLICT" && can("review.resolve") && (
                <ResolveForm item={it} ai={d.ai} types={types} onDone={(r) => (setResult(r), reload())} />
              )}
              {REVIEWABLE.includes(it.status) && can("review.submit") && !reviewedByMe && !assignedToOther && (
                <ReviewForm key={it.status} item={it} ai={d.ai} types={types} onDone={(r) => (setResult(r), reload())} />
              )}
              {reviewedByMe && REVIEWABLE.includes(it.status) && (
                <Alert tone="info">Bạn đã đánh giá mẫu tin này. Đánh giá chéo cần chuyên viên khác.</Alert>
              )}
              <Card title="Cơ sở liên quan">
                {!d.facility ? (
                  <div className="ui-muted" style={{ fontSize: 13 }}>
                    Không xác định được cơ sở trong CSDL (có thể là cơ sở / cá nhân không phép).
                  </div>
                ) : (
                  <>
                    <InfoGrid
                      items={[
                        { label: "Tên cơ sở", value: d.facility.name, wide: true },
                        { label: "Tình trạng", value: <StatusBadge group="facilityOperatingStatus" value={d.facility.operatingStatus} /> },
                        { label: "Mức rủi ro", value: <StatusBadge group="riskLevel" value={d.facility.riskLevel} /> },
                        { label: "Phạm vi chuyên môn", value: d.facility.professionalScope, wide: true },
                        { label: "Kỹ thuật được cấp phép", value: (d.facility.licensedTechniques || []).join(", "), wide: true },
                      ]}
                    />
                    <div className="ui-label ui-mt" style={{ marginBottom: 6 }}>
                      Giấy phép
                    </div>
                    <DataTable
                      minWidth={360}
                      showIndex={false}
                      rows={d.facilityLicenses || []}
                      empty="Không có giấy phép"
                      columns={[
                        { key: "n", title: "Số", render: (l) => <span className="ui-code">{l.licenseNumber}</span> },
                        { key: "t", title: "Loại", render: (l) => l.licenseType },
                        { key: "e", title: "Hết hạn", render: (l) => fmtDate(l.expiryDate) || "—" },
                        { key: "s", title: "TT", render: (l) => <StatusBadge group="recordStatus" value={l.status} /> },
                      ]}
                    />
                  </>
                )}
              </Card>
              <Card title="Vi phạm trước đây của cơ sở">
                <DataTable
                  minWidth={360}
                  showIndex={false}
                  rows={d.pastViolations || []}
                  empty="Chưa có vi phạm"
                  columns={[
                    { key: "c", title: "Hồ sơ", render: (x) => <span className="ui-code">{x.code}</span> },
                    { key: "d", title: "Ngày", render: (x) => fmtDate(x.detectedAt) },
                    { key: "s", title: "Trạng thái", render: (x) => <StatusBadge group="violationStatus" value={x.status} /> },
                  ]}
                />
              </Card>
              <Card title="Văn bản pháp lý liên quan">
                {(d.legalDocuments || []).length === 0 ? (
                  <div className="ui-muted" style={{ fontSize: 13 }}>
                    Không có
                  </div>
                ) : (
                  <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.6 }}>
                    {d.legalDocuments.map((l) => (
                      <li key={l.id}>
                        <strong>{l.documentNumber}</strong> — {l.title} {l.attachmentPath && <FileLink path={l.attachmentPath} name="(file)" />}
                        {l.summary && <div className="ui-muted" style={{ fontSize: 12 }}>{l.summary}</div>}
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
              {(d.similarItems || []).length > 0 && (
                <Card title="Mẫu tin trùng nội dung">
                  {d.similarItems.map((s) => (
                    <div key={s.id} className="ui-between" style={{ fontSize: 13, padding: "4px 0" }}>
                      <Link className="ui-link" href={portalPath(`/review?id=${s.id}`)}>
                        {s.code}
                      </Link>
                      <StatusBadge group="adStatus" value={s.status} />
                    </div>
                  ))}
                </Card>
              )}
            </div>
          </div>
        </>
      )}
    </Page>
  );
}
