"use client";

import { useState } from "react";
import { ScanSearch } from "lucide-react";
import { api } from "@/lib/api";
import { useAction } from "@/lib/hooks";
import { label } from "@/lib/labels";
import { fmtPercent } from "@/lib/format";
import { Alert, Badge, Button, Card, DataTable, Field, FilePicker, InfoGrid, Steps, TextArea, TextInput, toast } from "@/components/ui";

const RESULT_TONE = { PASS: "success", WARNING: "warning", FAIL: "danger" };

/** Chuẩn hóa kết quả kiểm tra trước: nhận cả kết quả vừa gửi (có steps) lẫn bản ghi đã lưu */
export function normalizePrecheck(r) {
  if (!r) return null;
  const s = r.steps || {};
  const kq = s["4_ket_qua"] || {};
  const extracted = s["2_ai_trich_xuat"] || r.extracted || {};
  return {
    id: r.id,
    code: r.code,
    status: r.status,
    result: r.finalResult || r.result || kq.aiResult || r.aiResult,
    aiResult: kq.aiResult || r.aiResult,
    riskScore: r.riskScore ?? kq.riskScore,
    matchingRate: r.matchingRate ?? kq.matchingRate,
    checks: s["3_doi_chieu_csdl"] || r.checks || [],
    extracted,
    reasons: kq.reasons || r.reasons || [],
    recommendations: kq.recommendations || r.recommendations || [],
    legalRefs: kq.legalRefs || extracted.legalRefs || [],
    violationTypes: kq.violationTypes || extracted.violationTypes || [],
    reviewNote: r.reviewNote,
    note: s["5_luu_lich_su"]?.note,
  };
}

export function PrecheckResult({ data, showSteps = true }) {
  const p = normalizePrecheck(data);
  if (!p) return null;
  const tone = RESULT_TONE[p.result] || "info";
  return (
    <>
      {showSteps && <Steps steps={["Tiếp nhận", "AI trích xuất", "Đối chiếu CSDL", "Kết quả", "Lưu lịch sử"]} current={5} />}
      <Alert tone={tone}>
        <div className="ui-between">
          <span style={{ fontSize: 15 }}>
            Kết quả: <strong>{label("precheckResult", p.result)}</strong>
            {p.status && <> · {label("precheckStatus", p.status)}</>}
          </span>
          {p.code && (
            <span>
              Mã tra cứu: <span className="ui-code" style={{ fontSize: 14 }}>{p.code}</span>
            </span>
          )}
        </div>
        {p.reviewNote && (
          <div style={{ marginTop: 6 }}>
            <strong>Ý kiến chuyên viên:</strong> {p.reviewNote}
          </div>
        )}
      </Alert>
      <InfoGrid
        cols={3}
        items={[
          { label: "Điểm rủi ro", value: p.riskScore !== undefined ? `${Number(p.riskScore).toFixed(0)} / 100` : null },
          { label: "Mức khớp với CSDL", value: p.matchingRate !== undefined ? fmtPercent(p.matchingRate) : null },
          { label: "Cơ sở khớp", value: p.extracted?.matchedFacility ? `${p.extracted.matchedFacility.name} (${label("facilityOperatingStatus", p.extracted.matchedFacility.operatingStatus)})` : "Không tìm thấy" },
        ]}
      />
      {p.checks.length > 0 && (
        <>
          <div className="ui-label ui-mt" style={{ marginBottom: 6 }}>
            Đối chiếu cơ sở dữ liệu
          </div>
          <DataTable
            minWidth={520}
            showIndex={false}
            rows={p.checks}
            rowKey={(r, i) => i}
            columns={[
              { key: "c", title: "Tiêu chí", render: (c) => c.check },
              { key: "r", title: "Kết quả", render: (c) => <Badge tone={c.passed ? "success" : c.severity === "BLOCK" ? "danger" : "warning"}>{c.passed ? "Đạt" : "Không đạt"}</Badge> },
              { key: "d", title: "Chi tiết", render: (c) => c.detail },
            ]}
          />
        </>
      )}
      {p.reasons.length > 0 && (
        <>
          <div className="ui-label ui-mt" style={{ marginBottom: 6 }}>
            Lý do
          </div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.6 }}>
            {p.reasons.map((r, i) => (
              <li key={i}>
                <strong>{r.check}</strong>
                {r.detail ? `: ${r.detail}` : ""}
              </li>
            ))}
          </ul>
        </>
      )}
      {p.recommendations.length > 0 && (
        <>
          <div className="ui-label ui-mt" style={{ marginBottom: 6 }}>
            Khuyến nghị
          </div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.6 }}>
            {p.recommendations.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </>
      )}
      {p.legalRefs.length > 0 && (
        <>
          <div className="ui-label ui-mt" style={{ marginBottom: 6 }}>
            Căn cứ pháp lý
          </div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.6 }}>
            {p.legalRefs.map((r, i) => (
              <li key={i}>
                <strong>{r.documentNumber || r.code}</strong> — {r.title}
              </li>
            ))}
          </ul>
        </>
      )}
      {p.note && <div className="ui-hint ui-mt">{p.note}</div>}
    </>
  );
}

/**
 * Form kiểm tra trước nội dung quảng cáo (5 bước). Dùng cho người dân (không cần đăng nhập) và cơ sở KCB.
 * Cơ sở KCB gửi -> chờ chuyên viên xác minh; người dân / khách -> kết quả sơ bộ của AI.
 */
export function PrecheckForm({ isFacility = false, onResult }) {
  const [v, setV] = useState({ contentText: "", contentUrl: "", facilityName: "", licenseNumber: "", representative: "", submitterName: "", submitterContact: "" });
  const [files, setFiles] = useState([]);
  const [busy, run] = useAction();
  const set = (k) => (e) => setV({ ...v, [k]: e.target.value });

  const readFile = (fs) =>
    run(async () => {
      try {
        const r = await api.upload("/prechecks/extract-file", fs[0]);
        setFiles((x) => [...x, r.attachment].filter(Boolean));
        const t = (r.contentText || "").trim();
        if (t) setV((cur) => ({ ...cur, contentText: cur.contentText ? `${cur.contentText}\n${t}` : t }));
        toast.success(r.note || "Đã đọc nội dung file");
      } catch (e) {
        toast.error(e);
      }
    });

  const submit = () =>
    run(async () => {
      if (!v.contentText.trim()) return toast.error("Nhập nội dung quảng cáo cần kiểm tra.");
      const body = Object.fromEntries(Object.entries(v).filter(([, x]) => x && String(x).trim()).map(([k, x]) => [k, String(x).trim()]));
      if (files.length) body.attachments = files.map((f) => ({ url: f.url, name: f.name }));
      try {
        const r = await api.post("/prechecks", body);
        onResult?.(r);
        toast.success(`Đã kiểm tra — mã tra cứu ${r.code}`);
      } catch (e) {
        toast.error(e);
      }
    });

  return (
    <Card title="Thông tin quảng cáo cần kiểm tra">
      <div className="ui-form">
        <Field label="Nội dung quảng cáo" required span="all" hint="Dán nội dung bài đăng / kịch bản quảng cáo. Có thể tải file Word, PDF để đọc nội dung.">
          <TextArea rows={6} value={v.contentText} onChange={set("contentText")} placeholder="VD: Phòng khám ABC chuyên điều trị... cam kết khỏi hẳn..." />
        </Field>
        <Field label="Đường dẫn quảng cáo (nếu có)" span="all">
          <TextInput value={v.contentUrl} onChange={set("contentUrl")} placeholder="https://..." />
        </Field>
        {!isFacility && (
          <>
            <Field label="Tên cơ sở quảng cáo">
              <TextInput value={v.facilityName} onChange={set("facilityName")} />
            </Field>
            <Field label="Số giấy phép hoạt động">
              <TextInput value={v.licenseNumber} onChange={set("licenseNumber")} />
            </Field>
            <Field label="Người đại diện / bác sĩ">
              <TextInput value={v.representative} onChange={set("representative")} />
            </Field>
            <Field label="Họ tên người gửi (không bắt buộc)">
              <TextInput value={v.submitterName} onChange={set("submitterName")} />
            </Field>
            <Field label="Email / SĐT liên hệ (không bắt buộc)" span="all">
              <TextInput value={v.submitterContact} onChange={set("submitterContact")} />
            </Field>
          </>
        )}
      </div>
      <div className="ui-row ui-mt">
        <FilePicker accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg" onFiles={readFile} loading={busy}>
          Tải file nội dung / ảnh
        </FilePicker>
        {files.map((f) => (
          <span key={f.url} className="ui-chip">
            📎 {f.name}
          </span>
        ))}
        <Button icon={ScanSearch} loading={busy} onClick={submit} size="lg">
          Kiểm tra
        </Button>
      </div>
      {isFacility && <div className="ui-hint ui-mt">Kết quả của cơ sở KCB được chuyên viên Sở Y tế xác minh lại; bạn nhận thông báo khi có kết quả cuối cùng.</div>}
    </Card>
  );
}

