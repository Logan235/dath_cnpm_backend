"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Archive, CheckCheck, ClipboardList, FileSearch, Inbox as InboxIcon, MessageSquarePlus, Undo2 } from "lucide-react";
import { api } from "@/lib/api";
import { portalPath } from "@/lib/auth";
import { useAction, useApi, useOptions, usePaged, useQueryParam, useSession } from "@/lib/hooks";
import { label, options } from "@/lib/labels";
import { fmtDateTime, splitList } from "@/lib/format";
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
  Modal,
  Page,
  PageHeader,
  Select,
  StatusBadge,
  Steps,
  TextArea,
  TextInput,
  Timeline,
  confirmDialog,
  promptDialog,
  toast,
} from "@/components/ui";
import { ExtLink } from "../AdProcessing/common";

const STEPS = ["Sở Y tế chuyển", "Tiếp nhận", "Điều tra xác minh", "Xác định đối tượng", "Có kết quả", "Lưu trữ"];
const STEP_INDEX = { TRANSFERRED: 1, INVESTIGATING: 2, IDENTIFIED: 3, HANDLED: 4, RETURNED: 4, CLOSED: 5 };

function IdentifyModal({ c, onClose, onDone }) {
  const suspects = useOptions("/suspects", (s) => ({ value: s.id, label: `${s.code} — ${s.name}` }));
  const [mode, setMode] = useState(c.suspectId ? "existing" : "new");
  const [v, setV] = useState({ suspectId: c.suspectId || "", name: c.violation?.adItem?.authorName || "", phones: "", taxCode: "", address: "", representative: "", findings: "" });
  const [busy, run] = useAction();
  const save = () =>
    run(async () => {
      if (!v.findings.trim()) return toast.error("Nhập kết quả xác minh");
      const body = { findings: v.findings.trim() };
      if (mode === "existing") {
        if (!v.suspectId) return toast.error("Chọn đối tượng");
        body.suspectId = Number(v.suspectId);
      } else {
        if (!v.name.trim()) return toast.error("Nhập tên đối tượng");
        body.newSuspect = {
          name: v.name.trim(),
          phones: splitList(v.phones),
          taxCode: v.taxCode.trim() || undefined,
          address: v.address.trim() || undefined,
          representative: v.representative.trim() || undefined,
        };
      }
      try {
        await api.post(`/investigation-cases/${c.id}/identify`, body);
        toast.success("Đã xác định đối tượng vi phạm");
        onDone();
      } catch (e) {
        toast.error(e);
      }
    });
  return (
    <Modal
      open
      width={700}
      title="Xác định đối tượng vi phạm"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Hủy
          </Button>
          <Button loading={busy} onClick={save}>
            Lưu kết quả
          </Button>
        </>
      }
    >
      <div className="ui-row ui-mb">
        <Button variant={mode === "existing" ? "primary" : "secondary"} size="sm" onClick={() => setMode("existing")}>
          Đối tượng đã có
        </Button>
        <Button variant={mode === "new" ? "primary" : "secondary"} size="sm" onClick={() => setMode("new")}>
          Tạo đối tượng mới
        </Button>
      </div>
      <div className="ui-form">
        {mode === "existing" ? (
          <Field label="Đối tượng" required span="all">
            <Select value={v.suspectId} onChange={(e) => setV({ ...v, suspectId: e.target.value })} options={suspects} placeholder="-- Chọn đối tượng --" />
          </Field>
        ) : (
          <>
            <Field label="Họ tên / tên tổ chức" required span="all">
              <TextInput value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} />
            </Field>
            <Field label="Số điện thoại" hint="Cách nhau dấu phẩy">
              <TextInput value={v.phones} onChange={(e) => setV({ ...v, phones: e.target.value })} />
            </Field>
            <Field label="Mã số thuế / CCCD">
              <TextInput value={v.taxCode} onChange={(e) => setV({ ...v, taxCode: e.target.value })} />
            </Field>
            <Field label="Người đại diện">
              <TextInput value={v.representative} onChange={(e) => setV({ ...v, representative: e.target.value })} />
            </Field>
            <Field label="Địa chỉ">
              <TextInput value={v.address} onChange={(e) => setV({ ...v, address: e.target.value })} />
            </Field>
          </>
        )}
        <Field label="Kết quả xác minh" required span="all">
          <TextArea rows={3} value={v.findings} onChange={(e) => setV({ ...v, findings: e.target.value })} placeholder="VD: Chủ tài khoản là hộ kinh doanh..., đã làm việc ngày..." />
        </Field>
      </div>
    </Modal>
  );
}

function CompleteModal({ c, onClose, onDone }) {
  const [v, setV] = useState({ outcome: c.suspectId ? "HANDLED" : "NOT_IDENTIFIED", resultSummary: "", handlingMeasures: "", closeViolation: true });
  const [busy, run] = useAction();
  const save = () =>
    run(async () => {
      if (!v.resultSummary.trim()) return toast.error("Nhập tóm tắt kết quả");
      try {
        await api.post(`/investigation-cases/${c.id}/complete`, {
          outcome: v.outcome,
          resultSummary: v.resultSummary.trim(),
          handlingMeasures: v.handlingMeasures.trim() || undefined,
          closeViolation: v.closeViolation,
        });
        toast.success("Đã cập nhật kết quả xử lý — Sở Y tế nhận được thông báo");
        onDone();
      } catch (e) {
        toast.error(e);
      }
    });
  return (
    <Modal
      open
      width={640}
      title="Cập nhật kết quả xử lý"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Hủy
          </Button>
          <Button loading={busy} onClick={save}>
            Hoàn tất
          </Button>
        </>
      }
    >
      <div className="ui-form ui-form-1">
        <Field label="Kết quả">
          <Select value={v.outcome} onChange={(e) => setV({ ...v, outcome: e.target.value })} options={options("caseOutcome")} />
        </Field>
        <Field label="Tóm tắt kết quả" required>
          <TextArea rows={3} value={v.resultSummary} onChange={(e) => setV({ ...v, resultSummary: e.target.value })} />
        </Field>
        <Field label="Biện pháp đã áp dụng">
          <TextArea rows={2} value={v.handlingMeasures} onChange={(e) => setV({ ...v, handlingMeasures: e.target.value })} placeholder="VD: yêu cầu gỡ bài, khóa tài khoản, xử phạt theo thẩm quyền..." />
        </Field>
        <Checkbox label="Kết thúc hồ sơ vi phạm gốc tại Sở Y tế" checked={v.closeViolation} onChange={(x) => setV({ ...v, closeViolation: x })} />
      </div>
    </Modal>
  );
}

function CaseDetail({ id, onChanged }) {
  const { can } = useSession();
  const d = useApi(`/investigation-cases/${id}`);
  const [modal, setModal] = useState(null);
  const [busy, run] = useAction();
  const c = d.data;
  if (!c) return d.error ? <Alert tone="danger">{d.error.message}</Alert> : <Loading />;
  const handle = can("case.handle") || can("violation.manage");
  const refresh = () => {
    setModal(null);
    d.reload();
    onChanged();
  };
  const act = (path, body, ok) =>
    run(async () => {
      try {
        await api.post(`/investigation-cases/${c.id}/${path}`, body);
        toast.success(ok);
        refresh();
      } catch (e) {
        toast.error(e);
      }
    });
  const note = async () => {
    const n = await promptDialog({ title: "Cập nhật tiến độ điều tra", label: "Nội dung", required: true, confirmText: "Ghi nhận" });
    if (n) act("updates", { note: n }, "Đã ghi nhận tiến độ");
  };
  const ret = async () => {
    const n = await promptDialog({ title: "Trả hồ sơ về Sở Y tế", label: "Lý do trả hồ sơ", required: true, danger: true, confirmText: "Trả hồ sơ" });
    if (n) act("return", { note: n }, "Đã trả hồ sơ về Sở Y tế");
  };
  const close = async () => {
    if (await confirmDialog({ title: "Lưu trữ hồ sơ", message: `Lưu trữ hồ sơ ${c.code}?`, confirmText: "Lưu trữ" })) act("close", {}, "Đã lưu trữ hồ sơ");
  };
  const v = c.violation;
  return (
    <>
      <Steps steps={STEPS} current={STEP_INDEX[c.status] ?? 0} />
      <Card title={`Hồ sơ phối hợp ${c.code}`} actions={<StatusBadge group="caseStatus" value={c.status} />}>
        {handle && (
          <div className="ui-row ui-mb">
            {c.status === "TRANSFERRED" && (
              <Button icon={InboxIcon} loading={busy} onClick={() => act("accept", {}, "Đã tiếp nhận hồ sơ")}>
                Tiếp nhận
              </Button>
            )}
            {["INVESTIGATING", "IDENTIFIED"].includes(c.status) && (
              <>
                <Button variant="secondary" icon={MessageSquarePlus} onClick={note}>
                  Cập nhật tiến độ
                </Button>
                <Button variant="secondary" icon={FileSearch} onClick={() => setModal("identify")}>
                  Xác định đối tượng
                </Button>
                <Button icon={CheckCheck} onClick={() => setModal("complete")}>
                  Cập nhật kết quả
                </Button>
              </>
            )}
            {["TRANSFERRED", "INVESTIGATING"].includes(c.status) && (
              <Button variant="danger" icon={Undo2} onClick={ret}>
                Trả hồ sơ
              </Button>
            )}
            {["HANDLED", "RETURNED"].includes(c.status) && (
              <Button variant="secondary" icon={Archive} onClick={close}>
                Lưu trữ
              </Button>
            )}
          </div>
        )}
        <InfoGrid
          items={[
            { label: "Cơ quan tiếp nhận", value: label("caseAgency", c.targetAgency) },
            { label: "Mức độ", value: <StatusBadge group="severity" value={c.severity} /> },
            { label: "Chuyển lúc", value: fmtDateTime(c.transferredAt) },
            { label: "Cán bộ thụ lý", value: c.assignedOfficer?.fullName },
            { label: "Lý do chuyển", value: c.reason, wide: true },
            { label: "Nội dung đề nghị", value: c.requestContent, wide: true },
            { label: "Kết quả xác minh", value: c.findings, wide: true },
            { label: "Kết quả xử lý", value: c.resultSummary ? `${label("caseOutcome", c.outcome) || ""} — ${c.resultSummary}` : null, wide: true },
            { label: "Biện pháp", value: c.handlingMeasures, wide: true },
          ]}
        />
      </Card>
      <div className="ui-grid ui-grid-2">
        <Card title="Hồ sơ vi phạm gốc">
          {v ? (
            <>
              <InfoGrid
                items={[
                  {
                    label: "Mã hồ sơ",
                    value: can("violation.view") ? (
                      <Link className="ui-link" href={portalPath(`/violations/detail?id=${v.id}`)}>
                        {v.code}
                      </Link>
                    ) : (
                      v.code
                    ),
                  },
                  { label: "Trạng thái", value: <StatusBadge group="violationStatus" value={v.status} /> },
                  { label: "Loại vi phạm", value: (v.types || []).map((t) => t.name).join("; "), wide: true },
                  { label: "Đường dẫn", value: <ExtLink href={v.contentUrl} />, wide: true },
                  { label: "Tài khoản đăng", value: [v.adItem?.authorName, v.adItem?.authorAccount].filter(Boolean).join(" — "), wide: true },
                ]}
              />
              <div className="ui-quote ui-mt">{v.contentSnapshot}</div>
            </>
          ) : (
            <span className="ui-muted">—</span>
          )}
        </Card>
        <Card title="Đối tượng">
          {c.suspect ? (
            <>
              <InfoGrid
                items={[
                  { label: "Đối tượng", value: `${c.suspect.code} — ${c.suspect.name}`, wide: true },
                  { label: "Số điện thoại", value: (c.suspect.phones || []).join(", ") },
                  { label: "Trạng thái", value: <StatusBadge group="suspectStatus" value={c.suspect.status} /> },
                  { label: "Tài khoản", value: (c.suspect.accounts || []).map((a) => `${label("platform", a.platform)}: ${a.displayName || a.platformUid}`).join("; "), wide: true },
                ]}
              />
              {can("suspect.view") && (
                <div className="ui-mt">
                  <Link className="ui-link" href={portalPath(`/suspects/detail?id=${c.suspect.id}`)}>
                    Hồ sơ đối tượng →
                  </Link>
                </div>
              )}
            </>
          ) : (
            <span className="ui-muted" style={{ fontSize: 13 }}>
              Chưa xác định đối tượng.
            </span>
          )}
        </Card>
      </div>
      <Card title="Tiến độ xử lý">
        <Timeline
          items={(c.updates || []).map((u) => ({
            key: u.id,
            time: `${fmtDateTime(u.createdAt)} · ${label("role", u.authorRole)}`,
            content: u.note,
          }))}
        />
      </Card>
      {modal === "identify" && <IdentifyModal c={c} onClose={() => setModal(null)} onDone={refresh} />}
      {modal === "complete" && <CompleteModal c={c} onClose={() => setModal(null)} onDone={refresh} />}
    </>
  );
}

/** Hồ sơ chuyển phối hợp điều tra (An ninh mạng xử lý; lãnh đạo theo dõi) */
export default function CasesPage() {
  const { can } = useSession();
  const qId = useQueryParam("id");
  const list = usePaged("/investigation-cases", {});
  const [activeId, setActiveId] = useState(null);
  useEffect(() => {
    if (qId) setActiveId(qId);
  }, [qId]);
  return (
    <Page>
      <PageHeader
        title={can("case.handle") ? "Hồ sơ được chuyển" : "Hồ sơ chuyển phối hợp"}
        subtitle="Sở Y tế chuyển hồ sơ khi hành vi vượt thẩm quyền hoặc chưa xác định được đối tượng. Cơ quan phối hợp tiếp nhận, điều tra xác minh, xác định đối tượng và cập nhật kết quả."
        crumbs={["Điều tra xác minh"]}
      />
      <FilterBar list={list} searchPlaceholder="Mã hồ sơ, lý do">
        <FilterSelect list={list} name="status" label="Trạng thái" options={options("caseStatus")} />
        <FilterSelect list={list} name="targetAgency" label="Cơ quan" options={options("caseAgency")} />
      </FilterBar>
      <Inbox
        list={list}
        activeId={activeId}
        onSelect={setActiveId}
        emptyList="Chưa có hồ sơ nào"
        renderItem={(c) => (
          <>
            <div className="ui-inbox-item-top">
              <span className="ui-inbox-item-title">
                <ClipboardList size={13} style={{ verticalAlign: -2, marginRight: 4 }} />
                {c.code}
              </span>
              <StatusBadge group="caseStatus" value={c.status} />
            </div>
            <div style={{ fontSize: 12.5, color: "#3b4459" }}>{c.reason}</div>
            <div className="ui-inbox-item-meta">
              {label("caseAgency", c.targetAgency)} · {fmtDateTime(c.transferredAt)}
            </div>
          </>
        )}
        detail={activeId && <CaseDetail key={activeId} id={activeId} onChanged={list.reload} />}
      />
    </Page>
  );
}
