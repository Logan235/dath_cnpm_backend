"use client";

import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { api, fileUrl } from "@/lib/api";
import { useAction, useApi, usePaged, useQueryParam } from "@/lib/hooks";
import { label, options } from "@/lib/labels";
import { fmtDateTime, truncate } from "@/lib/format";
import { Alert, Button, Card, Field, FilterBar, FilterSelect, InfoGrid, Inbox, Loading, Page, PageHeader, Select, StatusBadge, TextArea, toast } from "@/components/ui";
import { PrecheckResult } from "./precheck";

function Detail({ id, onChanged }) {
  const d = useApi(`/prechecks/${id}`);
  const [v, setV] = useState({ finalResult: "", reviewNote: "" });
  const [busy, run] = useAction();
  const p = d.data;
  useEffect(() => {
    if (p) setV({ finalResult: p.finalResult || p.aiResult || "", reviewNote: "" });
  }, [p]);
  if (!p) return d.error ? <Alert tone="danger">{d.error.message}</Alert> : <Loading />;

  const review = () =>
    run(async () => {
      if (!v.finalResult || !v.reviewNote.trim()) return toast.error("Chọn kết quả cuối cùng và nhập nhận xét.");
      try {
        await api.post(`/prechecks/${p.id}/review`, { finalResult: v.finalResult, reviewNote: v.reviewNote.trim() });
        toast.success("Đã xác minh kết quả kiểm tra");
        d.reload();
        onChanged();
      } catch (e) {
        toast.error(e);
      }
    });

  return (
    <Card title={`Kiểm tra trước ${p.code}`} actions={<StatusBadge group="precheckStatus" value={p.status} />}>
      <InfoGrid
        items={[
          { label: "Người gửi", value: `${label("submitterType", p.submitterType)}${p.submitterName ? ` — ${p.submitterName}` : ""}` },
          { label: "Liên hệ", value: p.submitterContact },
          { label: "Thời gian", value: fmtDateTime(p.createdAt) },
          { label: "Cơ sở", value: p.facility?.name || p.facilityNameInput },
          { label: "Số giấy phép khai báo", value: p.licenseNumberInput },
          { label: "Người đại diện khai báo", value: p.representativeInput },
        ]}
      />
      <div className="ui-label ui-mt" style={{ marginBottom: 6 }}>
        Nội dung quảng cáo
      </div>
      <div className="ui-quote">{p.contentText}</div>
      {(p.attachments || []).length > 0 && (
        <div className="ui-row ui-mt">
          {p.attachments.map((a, i) => (
            <a key={i} className="ui-chip" href={fileUrl(a.url)} target="_blank" rel="noreferrer">
              📎 {a.name || `Tệp ${i + 1}`}
            </a>
          ))}
        </div>
      )}
      <hr className="ui-divider" />
      <div className="ui-card-title" style={{ marginBottom: 12 }}>
        Kết quả AI
      </div>
      <PrecheckResult data={{ ...p, finalResult: p.aiResult, reviewNote: null, status: null }} showSteps={false} />
      <hr className="ui-divider" />
      {p.status === "REVIEWED" ? (
        <Alert tone="success">
          Đã xác minh lúc {fmtDateTime(p.reviewedAt)}: <strong>{label("precheckResult", p.finalResult)}</strong> — {p.reviewNote}
        </Alert>
      ) : (
        <>
          <div className="ui-form">
            <Field label="Kết quả cuối cùng" required>
              <Select value={v.finalResult} onChange={(e) => setV({ ...v, finalResult: e.target.value })} options={options("precheckResult")} placeholder="-- Chọn --" />
            </Field>
            <Field label="Nhận xét gửi người kiểm tra" required span="all">
              <TextArea rows={3} value={v.reviewNote} onChange={(e) => setV({ ...v, reviewNote: e.target.value })} />
            </Field>
          </div>
          <div className="ui-row ui-mt">
            <Button icon={ShieldCheck} loading={busy} onClick={review}>
              Xác minh kết quả
            </Button>
          </div>
        </>
      )}
    </Card>
  );
}

/** Chuyên viên / lãnh đạo xác minh kết quả kiểm tra trước nội dung quảng cáo */
export default function PrechecksReviewPage() {
  const qId = useQueryParam("id");
  const list = usePaged("/prechecks", { status: "PENDING_REVIEW" });
  const [activeId, setActiveId] = useState(null);
  useEffect(() => {
    if (qId) setActiveId(qId);
  }, [qId]);
  return (
    <Page>
      <PageHeader
        title="Kiểm tra trước thông tin quảng cáo"
        subtitle="Cơ sở KCB gửi nội dung quảng cáo dự kiến để kiểm tra trước khi đăng; người dân kiểm tra quảng cáo đã gặp. AI cho kết quả sơ bộ, chuyên viên xác minh kết quả cuối cùng."
        crumbs={["Quản lý thông tin vi phạm"]}
      />
      <FilterBar list={list} searchPlaceholder="Mã tra cứu, nội dung">
        <FilterSelect list={list} name="status" label="Trạng thái" options={options("precheckStatus")} />
        <FilterSelect list={list} name="result" label="Kết quả" options={options("precheckResult")} />
        <FilterSelect list={list} name="submitterType" label="Người gửi" options={options("submitterType")} />
      </FilterBar>
      <Inbox
        list={list}
        activeId={activeId}
        onSelect={setActiveId}
        emptyList="Không có yêu cầu kiểm tra"
        renderItem={(p) => (
          <>
            <div className="ui-inbox-item-top">
              <span className="ui-inbox-item-title">
                <span className="ui-code">{p.code}</span> {p.facility?.name || p.facilityNameInput || ""}
              </span>
              <StatusBadge group="precheckResult" value={p.finalResult || p.aiResult} />
            </div>
            <div style={{ fontSize: 12.5, color: "#3b4459" }}>{truncate(p.contentText, 90)}</div>
            <div className="ui-inbox-item-meta">
              {label("submitterType", p.submitterType)} · {label("precheckStatus", p.status)} · {fmtDateTime(p.createdAt)}
            </div>
          </>
        )}
        detail={activeId && <Detail key={activeId} id={activeId} onChanged={list.reload} />}
      />
    </Page>
  );
}
