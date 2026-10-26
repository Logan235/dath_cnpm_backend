"use client";

import { useApi } from "@/lib/hooks";
import { externalUrl } from "@/lib/api";
import { label } from "@/lib/labels";
import { fmtDateTime, fmtNumber, fmtPercent, truncate } from "@/lib/format";
import { Badge, DataTable, InfoGrid, Loading, Modal, StatusBadge } from "@/components/ui";

/** Liên kết ngoài an toàn */
export function ExtLink({ href, children, max = 70 }) {
  if (!href) return <span className="ui-muted">—</span>;
  return (
    <a className="ui-link" href={externalUrl(href)} target="_blank" rel="noreferrer noopener" onClick={(e) => e.stopPropagation()}>
      {children || truncate(href, max)}
    </a>
  );
}

/** Nhãn AI + độ tin cậy */
export function AiBadge({ ai }) {
  if (!ai) return <span className="ui-muted">Chưa phân tích</span>;
  return (
    <span className="ui-row" style={{ gap: 6 }}>
      <StatusBadge group="aiLabel" value={ai.label} />
      <span style={{ fontSize: 12, color: "#555c6b", fontVariantNumeric: "tabular-nums" }}>{fmtPercent(ai.confidence)}</span>
    </span>
  );
}

/** Danh sách mã loại vi phạm -> chip (tên lấy từ /violation-types nếu có) */
export function ViolationTypeChips({ codes = [], types }) {
  if (!codes?.length) return <span className="ui-muted">—</span>;
  return (
    <div className="ui-chips">
      {codes.map((c) => (
        <span key={c} className="ui-chip" title={c} style={{ background: "#fdecea", color: "#9b1c12", borderColor: "#f6c6c1" }}>
          {types?.find((t) => t.code === c)?.name || c}
        </span>
      ))}
    </div>
  );
}

export function useViolationTypes() {
  const d = useApi("/violation-types");
  return Array.isArray(d.data) ? d.data : d.data?.data || [];
}

/** Một mẫu tin trong danh sách (giữ kiểu "STT | Nội dung" của thiết kế gốc) */
export function AdItemBlock({ item }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div className="ui-between" style={{ marginBottom: 6, alignItems: "flex-start" }}>
        <div style={{ minWidth: 0 }}>
          <span className="ui-code" style={{ marginRight: 8 }}>
            {item.code}
          </span>
          <span style={{ fontWeight: 700, color: "#071437", fontSize: 14 }}>{item.title || item.authorName || label("adSource", item.sourceType)}</span>
        </div>
        <StatusBadge group="adStatus" value={item.status} />
      </div>
      <div style={{ fontSize: 12.5, color: "#555c6b", marginBottom: 6, display: "flex", flexWrap: "wrap", gap: "2px 14px" }}>
        <span>{fmtDateTime(item.collectedAt)}</span>
        <span>Nguồn: {label("adSource", item.sourceType)}</span>
        {item.platform && <span>Nền tảng: {label("platform", item.platform)}</span>}
        {item.topic?.name && <span>Chủ đề: {item.topic.name}</span>}
        {item.authorName && <span>Tác giả: {item.authorName}</span>}
        {(item.views || item.shares) > 0 && (
          <span>
            Lan truyền: {fmtNumber(item.views)} xem · {fmtNumber(item.shares)} chia sẻ
          </span>
        )}
      </div>
      {item.sourceUrl && (
        <div style={{ fontSize: 12.5, marginBottom: 6 }}>
          URL: <ExtLink href={item.sourceUrl} />
        </div>
      )}
      <div style={{ fontSize: 13, color: "#3b4459", lineHeight: 1.55 }}>{truncate(item.content, 320)}</div>
      {item.rejectReason && (
        <div style={{ fontSize: 12.5, color: "#9b1c12", marginTop: 6 }}>
          Lý do loại: {label("rejectReason", item.rejectReason)}
          {item.rejectNote ? ` — ${item.rejectNote}` : ""}
        </div>
      )}
      {item.ai && (
        <div className="ui-row" style={{ marginTop: 8 }}>
          <AiBadge ai={item.ai} />
          <ViolationTypeChips codes={item.ai.violationTypes} />
        </div>
      )}
    </div>
  );
}

/** Kết quả AI: nhãn, độ tin cậy, căn cứ, đối chiếu CSDL, văn bản pháp lý */
export function AiResultBox({ ai, types }) {
  if (!ai) return <div className="ui-muted">Mẫu tin chưa được AI phân tích.</div>;
  const ex = ai.extractedEntities || ai.extracted || {};
  const checks = [
    ...(ex.matchedFacility
      ? [
          {
            type: "Cơ sở KCB",
            value: ex.matchedFacility.name,
            result: `${label("facilityOperatingStatus", ex.matchedFacility.operatingStatus)} (khớp theo ${ex.matchedFacility.matchedBy})`,
            ok: ex.matchedFacility.operatingStatus === "ACTIVE",
          },
        ]
      : (ex.facilityNames || []).map((n) => ({ type: "Cơ sở KCB", value: n, result: "Không có trong CSDL cơ sở được cấp phép", ok: false }))),
    ...(ex.licenseChecks || []).map((c) => ({ type: "Giấy phép", value: c.number, result: `${label("licenseStatus", c.status)}${c.detail ? ` — ${c.detail}` : ""}`, ok: c.status === "VALID" })),
    ...(ex.doctorChecks || []).map((c) => ({ type: "Bác sĩ (CCHN)", value: c.name, result: `${label("licenseStatus", c.status)}${c.detail ? ` — ${c.detail}` : ""}`, ok: c.status === "VALID" })),
  ];
  return (
    <>
      <InfoGrid
        cols={3}
        items={[
          { label: "Kết luận của AI", value: <StatusBadge group="aiLabel" value={ai.label} /> },
          { label: "Độ tin cậy", value: fmtPercent(ai.confidence, 1) },
          { label: "Điểm ưu tiên", value: ai.priorityScore ?? "—" },
          { label: "Loại vi phạm gợi ý", value: <ViolationTypeChips codes={ai.violationTypes} types={types} />, wide: true },
        ]}
      />
      {ai.explanation && (
        <div className="ui-note ui-mt" style={{ whiteSpace: "pre-wrap" }}>
          {ai.explanation}
        </div>
      )}
      {(ai.matchedRules || []).length > 0 && (
        <>
          <div className="ui-label ui-mt" style={{ marginBottom: 6 }}>
            Căn cứ phát hiện
          </div>
          <DataTable
            minWidth={520}
            showIndex={false}
            rows={ai.matchedRules}
            rowKey={(r, i) => i}
            columns={[
              { key: "t", title: "Loại vi phạm", render: (r) => types?.find((x) => x.code === r.type)?.name || r.type },
              { key: "p", title: "Cụm từ / dấu hiệu", render: (r) => <strong>{r.phrase}</strong> },
              { key: "d", title: "Chi tiết", render: (r) => r.detail || "" },
              { key: "s", title: "Điểm", num: true, render: (r) => r.score },
            ]}
          />
        </>
      )}
      {checks.length > 0 && (
        <>
          <div className="ui-label ui-mt" style={{ marginBottom: 6 }}>
            Đối chiếu cơ sở dữ liệu (GPHĐ, CCHN, cơ sở)
          </div>
          <DataTable
            minWidth={520}
            showIndex={false}
            rows={checks}
            rowKey={(r, i) => i}
            columns={[
              { key: "t", title: "Loại", render: (r) => r.type },
              { key: "v", title: "Thông tin trích xuất", render: (r) => <strong>{r.value}</strong> },
              { key: "r", title: "Kết quả tra cứu", render: (r) => <span style={{ color: r.ok ? "#1f7a45" : "#b42318" }}>{r.result}</span> },
            ]}
          />
        </>
      )}
      {(ex.claims || ex.techniques || ex.phones) && (
        <div className="ui-row ui-mt" style={{ fontSize: 12.5 }}>
          {(ex.claims || []).length > 0 && <span>Cam kết / tuyên bố: {(ex.claims || []).join(", ")}</span>}
          {(ex.techniques || []).length > 0 && <span>· Kỹ thuật: {(ex.techniques || []).join(", ")}</span>}
          {(ex.phones || []).length > 0 && <span>· SĐT: {(ex.phones || []).join(", ")}</span>}
        </div>
      )}
      {(ai.legalRefs || []).length > 0 && (
        <>
          <div className="ui-label ui-mt" style={{ marginBottom: 6 }}>
            Căn cứ pháp lý
          </div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.6 }}>
            {ai.legalRefs.map((r, i) => (
              <li key={i}>
                <strong>{r.documentNumber || r.code}</strong> — {r.title}
                {r.legalBasis ? ` (${r.legalBasis})` : ""}
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}

/** Xem nhanh một mẫu tin */
export function AdItemModal({ id, onClose, actions }) {
  const d = useApi(id ? `/ad-items/${id}` : null);
  const types = useViolationTypes();
  const it = d.data;
  const ai = it?.analyses?.find((a) => a.isLatest) || it?.analyses?.[0] || it?.ai;
  return (
    <Modal open={!!id} title={it ? `Mẫu tin ${it.code}` : "Mẫu tin"} width={900} onClose={onClose} footer={actions?.(it)}>
      {!it ? (
        <Loading />
      ) : (
        <>
          <InfoGrid
            cols={3}
            items={[
              { label: "Trạng thái", value: <StatusBadge group="adStatus" value={it.status} /> },
              { label: "Nguồn", value: label("adSource", it.sourceType) },
              { label: "Nền tảng", value: label("platform", it.platform) },
              { label: "Thu thập lúc", value: fmtDateTime(it.collectedAt) },
              { label: "Chủ đề", value: it.topic?.name },
              { label: "Lịch thu thập", value: it.schedule?.name },
              { label: "Tác giả / tài khoản", value: [it.authorName, it.authorAccount].filter(Boolean).join(" — ") },
              { label: "Lĩnh vực", value: label("field", it.field) },
              { label: "Mức nghi vấn", value: it.suspicionLevel ? label("riskLevel", it.suspicionLevel) : null },
              { label: "URL", value: <ExtLink href={it.sourceUrl} />, wide: true },
              { label: "Người phản ánh", value: it.reporterName ? `${it.reporterName} (${it.reporterContact || ""})` : null, hidden: !it.reporterName },
              { label: "Cơ sở liên quan", value: it.facility?.name },
              { label: "Hồ sơ vi phạm", value: it.violation ? `${it.violation.code} — ${label("violationStatus", it.violation.status)}` : null },
            ]}
          />
          <div className="ui-label ui-mt" style={{ marginBottom: 6 }}>
            Nội dung
          </div>
          <div className="ui-quote" style={{ maxHeight: 260, overflowY: "auto" }}>
            {it.content}
          </div>
          {(it.media || []).length > 0 && (
            <div className="ui-row ui-mt">
              {it.media.map((m, i) => (
                <ExtLink key={i} href={m.url}>
                  {m.type || "Tệp"} {i + 1}
                </ExtLink>
              ))}
            </div>
          )}
          {it.rejectReason && (
            <div className="ui-alert ui-alert-warning ui-mt">
              Bị loại: {label("rejectReason", it.rejectReason)}
              {it.rejectNote ? ` — ${it.rejectNote}` : ""}
            </div>
          )}
          {ai && (
            <>
              <hr className="ui-divider" />
              <div className="ui-card-title" style={{ marginBottom: 12 }}>
                Kết quả AI
              </div>
              <AiResultBox ai={ai} types={types} />
            </>
          )}
          {(it.reviews || []).length > 0 && (
            <>
              <hr className="ui-divider" />
              <div className="ui-card-title" style={{ marginBottom: 12 }}>
                Đánh giá của chuyên viên
              </div>
              <ReviewsList reviews={it.reviews} types={types} />
            </>
          )}
        </>
      )}
    </Modal>
  );
}

export function ReviewsList({ reviews = [], types }) {
  if (!reviews.length) return <div className="ui-muted">Chưa có đánh giá.</div>;
  return (
    <DataTable
      minWidth={680}
      showIndex={false}
      rows={reviews}
      columns={[
        {
          key: "who",
          title: "Người đánh giá",
          render: (r) => (
            <>
              <div className="ui-cell-main">{r.reviewer?.fullName || `#${r.reviewerId}`}</div>
              <div className="ui-cell-sub">{fmtDateTime(r.createdAt)}</div>
            </>
          ),
        },
        {
          key: "d",
          title: "Kết luận",
          render: (r) => (
            <div className="ui-row" style={{ gap: 4 }}>
              <StatusBadge group="reviewDecision" value={r.decision} text={label("reviewDecision", r.decision)} />
              {r.isResolution && <Badge tone="purple">Lãnh đạo quyết định</Badge>}
              {r.agreesWithAi === false && <Badge tone="warning">Khác AI</Badge>}
            </div>
          ),
        },
        { key: "t", title: "Loại vi phạm", render: (r) => <ViolationTypeChips codes={r.correctedViolationTypes} types={types} /> },
        { key: "r", title: "Lý do", render: (r) => r.reason },
      ]}
    />
  );
}
