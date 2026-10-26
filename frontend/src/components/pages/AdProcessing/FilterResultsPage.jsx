"use client";

import { useState } from "react";
import Link from "next/link";
import { BrainCircuit } from "lucide-react";
import { api } from "@/lib/api";
import { label } from "@/lib/labels";
import { Alert, Button, Page, PageHeader, Steps, confirmDialog, toast } from "@/components/ui";
import AdItemsBoard from "./AdItemsBoard";

/** Kết quả lọc: mẫu tin đã qua bộ lọc, chờ AI phân tích (khi tắt tự động gửi AI) */
export default function FilterResultsPage() {
  const [result, setResult] = useState(null);

  const analyze = async (ctx) => {
    const ids = ctx.selected;
    if (!(await confirmDialog({ title: "Gửi AI phân tích", message: ids.length ? `Gửi ${ids.length} mẫu tin cho AI phân tích?` : "Gửi tất cả mẫu tin đã lọc cho AI phân tích?", confirmText: "Gửi AI" }))) return;
    try {
      const r = await api.post("/ad-items/analyze", ids.length ? { ids } : {});
      const counts = (r.results || []).reduce((acc, x) => ({ ...acc, [x.label]: (acc[x.label] || 0) + 1 }), {});
      setResult(
        `AI đã phân tích ${r.analyzed} mẫu tin: ${Object.entries(counts)
          .map(([k, v]) => `${v} ${label("aiLabel", k).toLowerCase()}`)
          .join(", ") || "không có"}. Các mẫu tin đã vào hàng đợi đánh giá.`,
      );
      ctx.reload();
    } catch (e) {
      toast.error(e);
    }
  };

  return (
    <Page>
      <PageHeader
        title="Kết quả lọc"
        subtitle="Mẫu tin đã qua kiểm tra nhanh và bộ lọc tự động. Khi tham số PIPELINE_AUTO_AI = true, mẫu tin được gửi AI ngay nên danh sách này thường trống."
        crumbs={["Xử lý thông tin QC"]}
      />
      <Steps steps={["Thu thập", "Kiểm tra nhanh / lọc", "AI phân tích", "Chuyên viên đánh giá", "Kết luận"]} current={2} />
      {result && (
        <Alert tone="success">
          {result} <Link className="ui-link" href="/specialist/extract-results">Mở hàng đợi đánh giá →</Link>
        </Alert>
      )}
      <AdItemsBoard
        title="Mẫu tin chờ AI phân tích"
        status="FILTERED"
        empty="Không có mẫu tin chờ AI. Mẫu tin đã lọc được AI phân tích tự động."
        toolbar={(ctx) => (
          <Button variant="success" icon={BrainCircuit} onClick={() => analyze(ctx)}>
            {ctx.selected.length ? "Gửi AI mục đã chọn" : "Gửi AI tất cả"}
          </Button>
        )}
      />
    </Page>
  );
}
