"use client";

import { useState } from "react";
import { Filter, Send, Trash2, XCircle } from "lucide-react";
import Tabs from "@/components/Tabs";
import { api } from "@/lib/api";
import { useAction } from "@/lib/hooks";
import { label, options } from "@/lib/labels";
import { Alert, Button, Field, Modal, Page, PageHeader, Select, Steps, TextArea, confirmDialog, toast } from "@/components/ui";
import AdItemsBoard from "./AdItemsBoard";

const PIPELINE = ["Thu thập", "Kiểm tra nhanh / lọc", "AI phân tích", "Chuyên viên đánh giá", "Kết luận"];

function analyzedText(a) {
  if (!a?.analyzed) return "";
  return ` AI đã phân tích ngay ${a.analyzed} mẫu tin — xem ở "Đánh giá kết quả AI".`;
}

/** Kết quả thu thập tin: kiểm tra nhanh (chuyển tiếp / loại bỏ), lọc tự động */
export default function CollectResultsPage() {
  const [tab, setTab] = useState("pending");
  const [discard, setDiscard] = useState(null); // { ids, reason, note, ctx }
  const [result, setResult] = useState(null);
  const [busy, run] = useAction();

  const forward = async (ctx, ids) => {
    if (!ids.length) return toast.error("Chọn ít nhất một mẫu tin.");
    if (!(await confirmDialog({ title: "Chuyển tiếp xử lý", message: `Chuyển ${ids.length} mẫu tin sang bước lọc và AI phân tích? Thao tác không hoàn tác được.`, confirmText: "Chuyển tiếp" }))) return;
    try {
      const r = await api.post("/ad-items/qc/decision", { ids, action: "FORWARD", confirm: true });
      setResult({ tone: "success", text: `Đã chuyển tiếp ${r.processed.length} mẫu tin.${r.skipped.length ? ` Bỏ qua ${r.skipped.length} mẫu tin không ở trạng thái chờ kiểm tra.` : ""}${analyzedText(r.autoAnalyzed)}` });
      ctx.reload();
    } catch (e) {
      toast.error(e);
    }
  };

  const doDiscard = () =>
    run(async () => {
      if (!discard.reason) return toast.error("Chọn lý do loại bỏ.");
      try {
        const r = await api.post("/ad-items/qc/decision", { ids: discard.ids, action: "DISCARD", reason: discard.reason, note: discard.note || undefined, confirm: true });
        setResult({ tone: "info", text: `Đã loại ${r.processed.length} mẫu tin (${label("rejectReason", discard.reason)}).` });
        discard.ctx.reload();
        setDiscard(null);
      } catch (e) {
        toast.error(e);
      }
    });

  const autoFilter = async (ctx) => {
    const ids = ctx.selected;
    const msg = ids.length
      ? `Chạy bộ lọc tự động cho ${ids.length} mẫu tin đã chọn?`
      : "Chạy bộ lọc tự động cho TẤT CẢ mẫu tin đang chờ kiểm tra? Bộ lọc loại tin trùng lặp, thuộc whitelist, không liên quan y tế, quá ngắn; tin còn lại chuyển sang AI.";
    if (!(await confirmDialog({ title: "Tự động lọc", message: msg, confirmText: "Chạy bộ lọc" }))) return;
    try {
      const r = await api.post("/ad-items/auto-filter", ids.length ? { ids } : {});
      const s = r.summary || {};
      setResult({
        tone: "success",
        text: `Bộ lọc đã xử lý ${s.total} mẫu tin: ${s.passed} đạt, ${s.duplicate} trùng lặp, ${s.whitelisted} thuộc whitelist, ${s.irrelevant} không liên quan, ${s.tooShort} quá ngắn.${analyzedText(r.autoAnalyzed)}`,
      });
      ctx.reload();
    } catch (e) {
      toast.error(e);
    }
  };

  const remove = async (ctx, ids) => {
    if (!ids.length) return toast.error("Chọn ít nhất một mẫu tin.");
    if (!(await confirmDialog({ title: "Xóa mẫu tin", message: `Xóa vĩnh viễn ${ids.length} mẫu tin?`, danger: true, confirmText: "Xóa" }))) return;
    try {
      const r = await api.post("/ad-items/delete", { ids, confirm: true });
      toast.success(`Đã xóa ${r.deleted ?? ids.length} mẫu tin`);
      ctx.reload();
    } catch (e) {
      toast.error(e);
    }
  };

  return (
    <Page>
      <PageHeader
        title="Kết quả thu thập tin"
        subtitle="Mẫu tin do crawler, đơn vị phối hợp, người dân phản ánh hoặc cán bộ nhập. Kiểm tra nhanh: chuyển tiếp mẫu tin có dấu hiệu sang AI, loại bỏ tin rác / không liên quan."
        crumbs={["Xử lý thông tin QC"]}
      />
      <Steps steps={PIPELINE} current={1} />
      <Tabs
        tabs={[
          { key: "pending", label: "Chờ kiểm tra" },
          { key: "rejected", label: "Đã loại" },
        ]}
        active={tab}
        onChange={(t) => {
          setTab(t);
          setResult(null);
        }}
      />
      {tab === "pending" ? (
        <AdItemsBoard
          key="pending"
          title="Mẫu tin chờ kiểm tra"
          status="COLLECTED"
          notice={result && <Alert tone={result.tone}>{result.text}</Alert>}
          toolbar={(ctx) => (
            <>
              <Button variant="success" icon={Filter} onClick={() => autoFilter(ctx)}>
                {ctx.selected.length ? "Lọc tự động mục đã chọn" : "Tự động lọc tất cả"}
              </Button>
              <Button icon={Send} disabled={!ctx.selected.length} onClick={() => forward(ctx, ctx.selected)}>
                Chuyển tiếp
              </Button>
              <Button variant="danger" icon={XCircle} disabled={!ctx.selected.length} onClick={() => setDiscard({ ids: ctx.selected, reason: "", note: "", ctx })}>
                Loại bỏ
              </Button>
              <Button variant="danger" icon={Trash2} disabled={!ctx.selected.length} onClick={() => remove(ctx, ctx.selected)} aria-label="Xóa" title="Xóa" />
            </>
          )}
          modalActions={(it, ctx) =>
            it.status === "COLLECTED" && (
              <>
                <Button variant="danger" icon={XCircle} onClick={() => (ctx.close(), setDiscard({ ids: [it.id], reason: "", note: "", ctx }))}>
                  Loại bỏ
                </Button>
                <Button icon={Send} onClick={() => (ctx.close(), forward(ctx, [it.id]))}>
                  Chuyển tiếp xử lý
                </Button>
              </>
            )
          }
        />
      ) : (
        <AdItemsBoard
          key="rejected"
          title="Mẫu tin đã bị loại"
          status="QC_REJECTED,FILTER_REJECTED"
          showStatusFilter={[
            { value: "QC_REJECTED,FILTER_REJECTED", label: "Tất cả mẫu tin bị loại" },
            { value: "QC_REJECTED", label: label("adStatus", "QC_REJECTED") },
            { value: "FILTER_REJECTED", label: label("adStatus", "FILTER_REJECTED") },
          ]}
          toolbar={(ctx) => (
            <Button variant="danger" icon={Trash2} disabled={!ctx.selected.length} onClick={() => remove(ctx, ctx.selected)}>
              Xóa
            </Button>
          )}
        />
      )}

      <Modal
        open={!!discard}
        width={520}
        title={`Loại bỏ ${discard?.ids.length || 0} mẫu tin`}
        onClose={() => setDiscard(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDiscard(null)}>
              Hủy
            </Button>
            <Button variant="danger-solid" loading={busy} onClick={doDiscard}>
              Loại bỏ
            </Button>
          </>
        }
      >
        {discard && (
          <div className="ui-form ui-form-1">
            <Field label="Lý do loại bỏ" required>
              <Select value={discard.reason} onChange={(e) => setDiscard({ ...discard, reason: e.target.value })} options={options("rejectReason")} placeholder="-- Chọn lý do --" />
            </Field>
            <Field label="Ghi chú">
              <TextArea rows={2} value={discard.note} onChange={(e) => setDiscard({ ...discard, note: e.target.value })} />
            </Field>
            <div className="ui-hint">Thao tác không hoàn tác được. Mẫu tin bị loại vẫn được lưu để thống kê.</div>
          </div>
        )}
      </Modal>
    </Page>
  );
}
