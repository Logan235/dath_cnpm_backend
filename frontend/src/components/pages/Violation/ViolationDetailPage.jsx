"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Ban, BellRing, Gavel, Hand, Pencil, Scale, Send, ShieldCheck, Wrench } from "lucide-react";
import { api, fileUrl } from "@/lib/api";
import { portalPath } from "@/lib/auth";
import { useAction, useApi, useQueryParam, useSession } from "@/lib/hooks";
import { label, options } from "@/lib/labels";
import { fmtDate, fmtDateTime, fmtMoney, fmtNumber, fmtPercent } from "@/lib/format";
import Tabs from "@/components/Tabs";
import {
  Alert,
  Button,
  Card,
  Checkbox,
  DataTable,
  ErrorBox,
  Field,
  FilePicker,
  InfoGrid,
  Loading,
  Modal,
  Page,
  PageHeader,
  SchemaForm,
  Select,
  StatusBadge,
  Steps,
  TextArea,
  TextInput,
  Timeline,
  cleanPayload,
  promptDialog,
  toast,
  validateRequired,
} from "@/components/ui";
import { AiResultBox, ExtLink, ViolationTypeChips, useViolationTypes } from "../AdProcessing/common";
import { useViolationFormFields } from "./ViolationsListPage";
import { PenaltyActions } from "./penalty";

const FLOW = ["Tiếp nhận", "Kiểm tra thẩm quyền", "Xử lý / chuyển phối hợp", "Phê duyệt", "Ra quyết định", "Hoàn thành"];
const FLOW_INDEX = { NEW: 1, PROCESSING: 2, TRANSFERRED: 2, PENDING_APPROVAL: 3, PENALIZED: 4, RESOLVED: 5, DISMISSED: 5 };

function AssessModal({ v, onClose, onDone }) {
  const [s, setS] = useState({ withinAuthority: true, hasEnoughInfo: true, note: "", transferTo: "CYBER_POLICE" });
  const [busy, run] = useAction();
  const willTransfer = !s.withinAuthority || !s.hasEnoughInfo;
  const save = () =>
    run(async () => {
      try {
        await api.post(`/violations/${v.id}/assess`, {
          withinAuthority: s.withinAuthority,
          hasEnoughInfo: s.hasEnoughInfo,
          note: s.note || undefined,
          transferTo: willTransfer ? s.transferTo : undefined,
        });
        toast.success(willTransfer ? "Đã chuyển hồ sơ sang cơ quan phối hợp" : "Hồ sơ chuyển sang bước xử lý tại Sở Y tế");
        onDone();
      } catch (e) {
        toast.error(e);
      }
    });
  return (
    <Modal
      open
      width={600}
      title="Kiểm tra thẩm quyền"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Hủy
          </Button>
          <Button loading={busy} onClick={save}>
            Xác nhận
          </Button>
        </>
      }
    >
      <div className="ui-form ui-form-1">
        <Checkbox label="Hành vi thuộc thẩm quyền xử lý của Sở Y tế" checked={s.withinAuthority} onChange={(x) => setS({ ...s, withinAuthority: x })} />
        <Checkbox label="Đã đủ thông tin xác định đối tượng vi phạm" checked={s.hasEnoughInfo} onChange={(x) => setS({ ...s, hasEnoughInfo: x })} />
        {willTransfer && (
          <>
            <Alert tone="warning" style={{ marginBottom: 0 }}>
              Hồ sơ sẽ được chuyển cơ quan phối hợp để điều tra xác minh (lập hồ sơ phối hợp).
            </Alert>
            <Field label="Chuyển tới">
              <Select value={s.transferTo} onChange={(e) => setS({ ...s, transferTo: e.target.value })} options={options("caseAgency")} />
            </Field>
          </>
        )}
        <Field label="Ghi chú">
          <TextArea rows={2} value={s.note} onChange={(e) => setS({ ...s, note: e.target.value })} />
        </Field>
      </div>
    </Modal>
  );
}

function TransferModal({ v, onClose, onDone }) {
  const [s, setS] = useState({ targetAgency: "CYBER_POLICE", reason: "", requestContent: "" });
  const [busy, run] = useAction();
  const save = () =>
    run(async () => {
      if (!s.reason.trim()) return toast.error("Nhập lý do chuyển");
      try {
        await api.post(`/violations/${v.id}/transfer`, { targetAgency: s.targetAgency, reason: s.reason.trim(), requestContent: s.requestContent.trim() || undefined });
        toast.success("Đã chuyển hồ sơ phối hợp");
        onDone();
      } catch (e) {
        toast.error(e);
      }
    });
  return (
    <Modal
      open
      width={600}
      title="Chuyển hồ sơ phối hợp điều tra"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Hủy
          </Button>
          <Button icon={Send} loading={busy} onClick={save}>
            Chuyển hồ sơ
          </Button>
        </>
      }
    >
      <div className="ui-form ui-form-1">
        <Field label="Đơn vị tiếp nhận" required>
          <Select value={s.targetAgency} onChange={(e) => setS({ ...s, targetAgency: e.target.value })} options={options("caseAgency")} />
        </Field>
        <Field label="Lý do chuyển" required>
          <TextArea rows={2} value={s.reason} onChange={(e) => setS({ ...s, reason: e.target.value })} placeholder="VD: không xác định được chủ tài khoản, cần xác minh danh tính" />
        </Field>
        <Field label="Nội dung đề nghị phối hợp">
          <TextArea rows={3} value={s.requestContent} onChange={(e) => setS({ ...s, requestContent: e.target.value })} />
        </Field>
      </div>
    </Modal>
  );
}

function PenaltyModal({ v, onClose, onDone }) {
  const fineMin = Math.max(0, ...(v.types || []).map((t) => Number(t.fineMin) || 0));
  const fineMax = Math.max(0, ...(v.types || []).map((t) => Number(t.fineMax) || 0));
  const [vals, setVals] = useState({
    decisionNumber: `${new Date().getFullYear()}/QĐ-XPHC-${v.code.split("-").pop()}`,
    offenderName: v.facility?.name || v.suspect?.name || "",
    violationBehavior: (v.types || []).map((t) => t.name).join("; "),
    legalBasis: (v.types || [])
      .map((t) => [t.legalBasis, t.legalDocument?.documentNumber].filter(Boolean).join(" - "))
      .filter(Boolean)
      .join("; "),
    fineAmount: fineMin || "",
    additionalPenalty: "",
    remedialMeasures: "Gỡ bỏ quảng cáo vi phạm",
    dueDate: "",
  });
  const [errors, setErrors] = useState({});
  const [busy, run] = useAction();
  const fields = [
    { name: "decisionNumber", label: "Số quyết định", required: true },
    { name: "fineAmount", label: "Số tiền phạt (VNĐ)", type: "number", required: true, hint: fineMax ? `Khung theo loại vi phạm: ${fmtMoney(fineMin)} – ${fmtMoney(fineMax)}` : undefined },
    { name: "offenderName", label: "Tổ chức / cá nhân vi phạm", span: "all" },
    { name: "violationBehavior", label: "Hành vi vi phạm", type: "textarea", span: "all", rows: 2 },
    { name: "legalBasis", label: "Căn cứ pháp lý", type: "textarea", span: "all", rows: 2 },
    { name: "additionalPenalty", label: "Hình thức xử phạt bổ sung" },
    { name: "dueDate", label: "Hạn chấp hành", type: "date" },
    { name: "remedialMeasures", label: "Biện pháp khắc phục hậu quả", type: "textarea", span: "all", rows: 2 },
  ];
  const save = () =>
    run(async () => {
      const e = validateRequired(fields, vals);
      setErrors(e);
      if (Object.keys(e).length) return;
      try {
        const r = await api.post(`/violations/${v.id}/penalty-decisions`, cleanPayload(fields, vals));
        toast.success(r.requiresApproval ? `Đã lập quyết định — chờ lãnh đạo phê duyệt (${r.reason})` : "Đã ban hành quyết định xử phạt");
        onDone();
      } catch (e2) {
        toast.error(e2);
      }
    });
  return (
    <Modal
      open
      width={820}
      title="Lập quyết định xử phạt vi phạm hành chính"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Hủy
          </Button>
          <Button icon={Gavel} loading={busy} onClick={save}>
            Lập quyết định
          </Button>
        </>
      }
    >
      <Alert tone="info">Vi phạm nghiêm trọng hoặc mức phạt từ ngưỡng PENALTY_APPROVAL_THRESHOLD (mặc định 20.000.000đ) trở lên phải được lãnh đạo phê duyệt trước khi ban hành.</Alert>
      <SchemaForm fields={fields} values={vals} errors={errors} onChange={setVals} />
    </Modal>
  );
}

function UpdateModal({ v, onClose, onDone }) {
  const { fields } = useViolationFormFields("edit");
  const [vals, setVals] = useState({
    title: v.title,
    facilityId: v.facilityId ?? "",
    severity: v.severity || "",
    typeCodes: (v.types || []).map((t) => t.code),
    priority: v.priority ?? "",
    conclusion: v.specialistConclusion || "",
  });
  const [errors, setErrors] = useState({});
  const [busy, run] = useAction();
  const save = () =>
    run(async () => {
      const e = validateRequired(fields, vals);
      setErrors(e);
      if (Object.keys(e).length) return;
      const body = cleanPayload(fields, vals, { keepEmpty: true });
      if (body.facilityId === null) delete body.facilityId;
      try {
        await api.patch(`/violations/${v.id}`, body);
        toast.success("Đã cập nhật hồ sơ");
        onDone();
      } catch (e2) {
        toast.error(e2);
      }
    });
  return (
    <Modal
      open
      width={820}
      title={`Cập nhật hồ sơ ${v.code}`}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Hủy
          </Button>
          <Button loading={busy} onClick={save}>
            Lưu
          </Button>
        </>
      }
    >
      <SchemaForm fields={fields} values={vals} errors={errors} onChange={setVals} />
    </Modal>
  );
}

function RemediationModal({ v, onClose, onDone }) {
  const [s, setS] = useState({ status: v.remediationStatus === "NONE" ? "REQUIRED" : v.remediationStatus, note: "" });
  const [busy, run] = useAction();
  const save = () =>
    run(async () => {
      try {
        await api.post(`/violations/${v.id}/remediation`, { remediationStatus: s.status, note: s.note || undefined });
        toast.success("Đã cập nhật khắc phục hậu quả");
        onDone();
      } catch (e) {
        toast.error(e);
      }
    });
  return (
    <Modal
      open
      width={520}
      title="Khắc phục hậu quả"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Hủy
          </Button>
          <Button loading={busy} onClick={save}>
            Lưu
          </Button>
        </>
      }
    >
      <div className="ui-form ui-form-1">
        <Field label="Tình trạng khắc phục">
          <Select value={s.status} onChange={(e) => setS({ ...s, status: e.target.value })} options={options("remediationStatus")} />
        </Field>
        <Field label="Ghi chú">
          <TextArea rows={2} value={s.note} onChange={(e) => setS({ ...s, note: e.target.value })} />
        </Field>
      </div>
    </Modal>
  );
}

/** Chi tiết hồ sơ vi phạm + các bước xử lý theo trạng thái (allowedActions do backend trả về) */
export default function ViolationDetailPage() {
  const router = useRouter();
  const id = useQueryParam("id");
  const { can, session } = useSession();
  const d = useApi(id ? `/violations/${id}` : null);
  const types = useViolationTypes();
  const [modal, setModal] = useState(null);
  const [tab, setTab] = useState("info");
  const [evNote, setEvNote] = useState("");
  const [busy, run] = useAction();

  if (!id) return <Page><Loading /></Page>;
  const v = d.data;
  const canManage = can("violation.manage");
  const allowed = canManage ? v?.allowedActions || [] : [];
  const done = () => {
    setModal(null);
    d.reload();
  };

  const simple = async (action, title, labelText, confirmText, danger) => {
    const note = await promptDialog({ title, label: labelText, required: true, confirmText, danger });
    if (!note) return;
    try {
      await api.post(`/violations/${v.id}/${action}`, { note });
      toast.success("Đã cập nhật hồ sơ");
      d.reload();
    } catch (e) {
      toast.error(e);
    }
  };

  const takeOver = () =>
    run(async () => {
      try {
        await api.post(`/violations/${v.id}/assign`, { userId: session?.user?.id });
        toast.success("Bạn là người xử lý hồ sơ này");
        d.reload();
      } catch (e) {
        toast.error(e);
      }
    });

  const addEvidence = (files) =>
    run(async () => {
      try {
        await api.upload(`/violations/${v.id}/evidence`, files, { fields: { note: evNote || undefined }, field: "files" });
        toast.success(`Đã bổ sung ${files.length} bằng chứng`);
        setEvNote("");
        d.reload();
      } catch (e) {
        toast.error(e);
      }
    });

  const detectSuspect = () =>
    run(async () => {
      try {
        const r = await api.post("/suspects/detect", { violationId: v.id });
        const msg = {
          ALREADY_LINKED: `Hồ sơ đã gắn đối tượng ${r.suspect?.code || ""}`,
          MERGED: `Trùng khớp ${Math.round((r.score || 0) * 100)}% với đối tượng ${r.suspect?.code} — đã gộp tự động`,
          CREATED: `Đã tạo đối tượng mới ${r.suspect?.code}`,
          CANDIDATES: `Có ${(r.candidates || []).length} đối tượng gần giống — vào "Đối soát đối tượng" để xác nhận`,
          NO_IDENTIFIERS: "Không trích xuất được tên / số điện thoại / tài khoản để đối soát",
        }[r.action];
        toast.success(msg || "Đã chạy đối soát đối tượng");
        d.reload();
      } catch (e) {
        toast.error(e);
      }
    });

  return (
    <Page>
      <PageHeader
        title={v ? `Hồ sơ vi phạm ${v.code}` : "Hồ sơ vi phạm"}
        subtitle={v?.title}
        crumbs={["Quản lý thông tin vi phạm", "Hồ sơ vi phạm"]}
        actions={
          <Button variant="secondary" icon={ArrowLeft} onClick={() => router.push(portalPath("/violations"))}>
            Về danh sách
          </Button>
        }
      />
      <ErrorBox error={d.error} onRetry={d.reload} />
      {!v ? (
        d.loading && <Loading />
      ) : (
        <>
          <Steps steps={FLOW} current={FLOW_INDEX[v.status] ?? 0} />
          <Card
            title="Thao tác xử lý"
            actions={
              <span className="ui-row">
                <StatusBadge group="violationStatus" value={v.status} />
                <StatusBadge group="severity" value={v.severity} />
              </span>
            }
          >
            {v.status === "PENDING_APPROVAL" && <Alert tone="warning">Quyết định xử phạt đang chờ lãnh đạo phê duyệt.</Alert>}
            {v.status === "TRANSFERRED" && <Alert tone="info">Hồ sơ đã chuyển cơ quan phối hợp, chờ kết quả điều tra xác minh (xem tab Hồ sơ phối hợp).</Alert>}
            {allowed.length === 0 && !["PENDING_APPROVAL", "TRANSFERRED"].includes(v.status) && (
              <div className="ui-muted" style={{ fontSize: 13 }}>
                {canManage ? "Hồ sơ đã kết thúc — không còn thao tác." : "Bạn chỉ có quyền xem hồ sơ."}
              </div>
            )}
            <div className="ui-row">
              {allowed.includes("assess") && (
                <Button icon={Scale} onClick={() => setModal("assess")}>
                  Kiểm tra thẩm quyền
                </Button>
              )}
              {allowed.includes("penalty") && can("penalty.manage") && (
                <Button icon={Gavel} onClick={() => setModal("penalty")}>
                  Lập quyết định xử phạt
                </Button>
              )}
              {allowed.includes("warn") && (
                <Button variant="secondary" icon={BellRing} onClick={() => simple("warn", "Xử lý bằng hình thức nhắc nhở", "Nội dung nhắc nhở gửi cơ sở", "Gửi nhắc nhở")}>
                  Nhắc nhở
                </Button>
              )}
              {allowed.includes("transfer") && (
                <Button variant="secondary" icon={Send} onClick={() => setModal("transfer")}>
                  Chuyển phối hợp
                </Button>
              )}
              {allowed.includes("remediation") && (
                <Button variant="secondary" icon={Wrench} onClick={() => setModal("remediation")}>
                  Khắc phục hậu quả
                </Button>
              )}
              {allowed.includes("update") && (
                <Button variant="secondary" icon={Pencil} onClick={() => setModal("update")}>
                  Cập nhật
                </Button>
              )}
              {allowed.includes("assign") && String(v.assignedTo || "") !== String(session?.user?.id || "") && (
                <Button variant="secondary" icon={Hand} loading={busy} onClick={takeOver}>
                  Nhận xử lý
                </Button>
              )}
              {can("suspect.manage") && !v.suspectId && !v.facilityId && (
                <Button variant="secondary" icon={ShieldCheck} loading={busy} onClick={detectSuspect}>
                  Đối soát đối tượng
                </Button>
              )}
              {allowed.includes("dismiss") && (
                <Button variant="danger" icon={Ban} onClick={() => simple("dismiss", "Bác bỏ hồ sơ", "Lý do bác bỏ", "Bác bỏ", true)}>
                  Bác bỏ
                </Button>
              )}
            </div>
          </Card>

          <Tabs
            tabs={[
              { key: "info", label: "Thông tin chung" },
              { key: "evidence", label: `Bằng chứng (${(v.evidence || []).length})` },
              { key: "ai", label: "Kết quả AI" },
              { key: "penalties", label: `Xử phạt (${(v.penalties || []).length})` },
              { key: "cases", label: `Hồ sơ phối hợp (${(v.cases || []).length})` },
              { key: "feedbacks", label: `Phản hồi của cơ sở (${(v.feedbacks || []).length})` },
              { key: "history", label: "Lịch sử xử lý" },
            ]}
            active={tab}
            onChange={setTab}
          />

          {tab === "info" && (
            <div className="ui-split">
              <Card title="Thông tin hồ sơ">
                <InfoGrid
                  items={[
                    { label: "Mã hồ sơ", value: <span className="ui-code">{v.code}</span> },
                    { label: "Nguồn", value: label("adSource", v.source) },
                    { label: "Ngày phát hiện", value: fmtDateTime(v.detectedAt) },
                    { label: "Người xử lý", value: v.assignee?.fullName },
                    { label: "Loại vi phạm", value: <ViolationTypeChips codes={(v.types || []).map((t) => t.code)} types={types} />, wide: true },
                    { label: "Thuộc thẩm quyền Sở Y tế", value: v.withinAuthority === null || v.withinAuthority === undefined ? "Chưa kiểm tra" : v.withinAuthority ? "Có" : "Không" },
                    { label: "Kết quả xử lý", value: label("handlingResult", v.handlingResult) },
                    { label: "Khắc phục hậu quả", value: <StatusBadge group="remediationStatus" value={v.remediationStatus} /> },
                    { label: "Điểm ưu tiên", value: v.priority },
                    { label: "Lượt tiếp cận", value: fmtNumber(v.reach) },
                    { label: "Độ tin cậy AI", value: v.aiConfidence ? fmtPercent(v.aiConfidence, 1) : null },
                    { label: "Kết luận của chuyên viên", value: v.specialistConclusion, wide: true },
                    { label: "Đường dẫn quảng cáo", value: <ExtLink href={v.contentUrl} />, wide: true },
                    { label: "Nhật ký xử lý", value: v.handlingNote, wide: true },
                  ]}
                />
                <div className="ui-label ui-mt" style={{ marginBottom: 6 }}>
                  Nội dung quảng cáo
                </div>
                <div className="ui-quote">{v.contentSnapshot}</div>
                {v.adItem && can("ad_item.view") && (
                  <div className="ui-mt" style={{ fontSize: 13 }}>
                    Từ mẫu tin{" "}
                    <Link className="ui-link" href={portalPath(`/review?id=${v.adItem.id}`)}>
                      {v.adItem.code}
                    </Link>
                  </div>
                )}
              </Card>
              <div>
                <Card title="Cơ sở vi phạm">
                  {v.facility ? (
                    <InfoGrid
                      items={[
                        { label: "Tên cơ sở", value: v.facility.name, wide: true },
                        { label: "Địa chỉ", value: v.facility.address, wide: true },
                        { label: "Giấy phép", value: v.facility.licenseNumber },
                        { label: "Tình trạng", value: <StatusBadge group="facilityOperatingStatus" value={v.facility.operatingStatus} /> },
                        { label: "Điểm rủi ro", value: `${Number(v.facility.riskScore || 0).toFixed(0)} — ${label("riskLevel", v.facility.riskLevel)}` },
                        { label: "Số lần vi phạm", value: v.facility.violationCount },
                      ]}
                    />
                  ) : (
                    <div className="ui-muted" style={{ fontSize: 13 }}>
                      Chưa xác định cơ sở trong CSDL.
                    </div>
                  )}
                </Card>
                <Card title="Đối tượng vi phạm">
                  {v.suspect ? (
                    <>
                      <InfoGrid
                        items={[
                          { label: "Đối tượng", value: `${v.suspect.code} — ${v.suspect.name}`, wide: true },
                          { label: "Trạng thái", value: <StatusBadge group="suspectStatus" value={v.suspect.status} /> },
                          { label: "Rủi ro", value: <StatusBadge group="riskLevel" value={v.suspect.riskLevel} /> },
                        ]}
                      />
                      {can("suspect.view") && (
                        <div className="ui-mt">
                          <Link className="ui-link" href={portalPath(`/suspects/detail?id=${v.suspect.id}`)}>
                            Xem hồ sơ đối tượng →
                          </Link>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="ui-muted" style={{ fontSize: 13 }}>
                      Chưa gắn đối tượng (cá nhân / tài khoản mạng xã hội).
                    </div>
                  )}
                </Card>
              </div>
            </div>
          )}

          {tab === "evidence" && (
            <Card title="Bằng chứng">
              <DataTable
                minWidth={640}
                rows={v.evidence || []}
                rowKey={(r, i) => i}
                empty="Chưa có bằng chứng"
                columns={[
                  { key: "t", title: "Loại", render: (e) => e.type },
                  {
                    key: "u",
                    title: "Tệp / đường dẫn",
                    render: (e) =>
                      e.url?.startsWith("/uploads") ? (
                        <a className="ui-link" href={fileUrl(e.url)} target="_blank" rel="noreferrer">
                          {e.name || "Mở tệp"}
                        </a>
                      ) : (
                        <ExtLink href={e.url} />
                      ),
                  },
                  { key: "n", title: "Ghi chú", render: (e) => e.note },
                  { key: "b", title: "Người bổ sung", render: (e) => [e.addedBy, fmtDateTime(e.addedAt)].filter(Boolean).join(" · ") },
                ]}
              />
              {canManage && !["RESOLVED", "DISMISSED"].includes(v.status) && (
                <div className="ui-filters ui-mt" style={{ marginBottom: 0 }}>
                  <Field label="Ghi chú cho bằng chứng mới">
                    <TextInput value={evNote} onChange={(e) => setEvNote(e.target.value)} placeholder="VD ảnh chụp màn hình ngày 20/10" />
                  </Field>
                  <FilePicker multiple accept=".png,.jpg,.jpeg,.gif,.webp,.mp4,.mov,.mp3,.wav,.pdf,.doc,.docx,.txt" onFiles={addEvidence} loading={busy}>
                    Tải bằng chứng lên
                  </FilePicker>
                </div>
              )}
            </Card>
          )}

          {tab === "ai" && (
            <Card title="Kết quả phân tích của AI">
              <AiResultBox ai={v.aiAnalysis} types={types} />
            </Card>
          )}

          {tab === "penalties" && (
            <Card title="Quyết định xử phạt">
              <DataTable
                minWidth={900}
                rows={v.penalties || []}
                empty="Chưa có quyết định xử phạt"
                columns={[
                  { key: "n", title: "Số QĐ", render: (p) => <span className="ui-code">{p.decisionNumber}</span> },
                  { key: "o", title: "Đối tượng", render: (p) => p.offenderName },
                  { key: "f", title: "Tiền phạt", num: true, render: (p) => fmtMoney(p.fineAmount) },
                  { key: "s", title: "Trạng thái", render: (p) => <StatusBadge group="penaltyStatus" value={p.status} /> },
                  { key: "e", title: "Thi hành", render: (p) => <StatusBadge group="executionStatus" value={p.executionStatus} /> },
                  { key: "d", title: "Ban hành", nowrap: true, render: (p) => fmtDate(p.issuedAt) },
                  { key: "a", title: "", render: (p) => <PenaltyActions p={p} onChanged={d.reload} /> },
                ]}
              />
              {(v.penalties || []).some((p) => p.approvalNote) && (
                <div className="ui-note ui-mt">
                  {(v.penalties || [])
                    .filter((p) => p.approvalNote)
                    .map((p) => (
                      <div key={p.id}>
                        {p.decisionNumber}: {p.approvalNote}
                      </div>
                    ))}
                </div>
              )}
            </Card>
          )}

          {tab === "cases" && (
            <Card title="Hồ sơ chuyển phối hợp điều tra">
              <DataTable
                minWidth={760}
                rows={v.cases || []}
                empty="Chưa chuyển phối hợp"
                onRowClick={can("case.view") ? (c) => router.push(portalPath(`/cases?id=${c.id}`)) : undefined}
                columns={[
                  { key: "c", title: "Mã", render: (c) => <span className="ui-code">{c.code}</span> },
                  { key: "a", title: "Cơ quan", render: (c) => label("caseAgency", c.targetAgency) },
                  { key: "r", title: "Lý do", render: (c) => c.reason },
                  { key: "s", title: "Trạng thái", render: (c) => <StatusBadge group="caseStatus" value={c.status} /> },
                  { key: "k", title: "Kết quả", render: (c) => c.resultSummary },
                ]}
              />
            </Card>
          )}

          {tab === "feedbacks" && (
            <Card title="Giải trình / khiếu nại của cơ sở">
              <DataTable
                minWidth={760}
                rows={v.feedbacks || []}
                empty="Cơ sở chưa gửi phản hồi"
                onRowClick={can("feedback.handle") ? (f) => router.push(portalPath(`/facility-feedback?id=${f.id}`)) : undefined}
                columns={[
                  { key: "c", title: "Mã", render: (f) => <span className="ui-code">{f.code}</span> },
                  { key: "t", title: "Loại", render: (f) => label("feedbackType", f.feedbackType) },
                  { key: "s", title: "Tiêu đề", render: (f) => f.subject },
                  { key: "st", title: "Trạng thái", render: (f) => <StatusBadge group="feedbackStatus" value={f.status} /> },
                  { key: "r", title: "Trả lời", render: (f) => f.responseNote },
                ]}
              />
            </Card>
          )}

          {tab === "history" && (
            <Card title="Lịch sử xử lý">
              <Timeline
                items={(v.history || []).map((h, i) => ({
                  key: i,
                  time: `${fmtDateTime(h.at)} · ${h.by || "Hệ thống"}${h.role ? ` (${label("role", h.role)})` : ""}`,
                  content: h.description || h.action,
                }))}
              />
            </Card>
          )}

          {modal === "assess" && <AssessModal v={v} onClose={() => setModal(null)} onDone={done} />}
          {modal === "transfer" && <TransferModal v={v} onClose={() => setModal(null)} onDone={done} />}
          {modal === "penalty" && <PenaltyModal v={v} onClose={() => setModal(null)} onDone={done} />}
          {modal === "update" && <UpdateModal v={v} onClose={() => setModal(null)} onDone={done} />}
          {modal === "remediation" && <RemediationModal v={v} onClose={() => setModal(null)} onDone={done} />}
        </>
      )}
    </Page>
  );
}

