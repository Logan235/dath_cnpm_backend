"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Hand, ClipboardCheck } from "lucide-react";
import Tabs from "@/components/Tabs";
import { api } from "@/lib/api";
import { usePaged, useQueryParam } from "@/lib/hooks";
import { portalPath } from "@/lib/auth";
import { label, options } from "@/lib/labels";
import { fmtDateTime, truncate } from "@/lib/format";
import { Alert, Button, Card, FilterBar, FilterSelect, PagedTable, Page, PageHeader, StatusBadge, Steps, promptDialog, toast } from "@/components/ui";
import { AiBadge, ViolationTypeChips, useViolationTypes } from "./common";

function QueueTab({ scope }) {
  const router = useRouter();
  const types = useViolationTypes();
  const list = usePaged("/review-queue", { scope });
  const open = (r) => router.push(portalPath(`/review?id=${r.id}`));

  const claim = async () => {
    const n = await promptDialog({
      title: "Nhận mẫu tin để đánh giá",
      message: "Hệ thống giao cho bạn các mẫu tin có điểm ưu tiên cao nhất chưa có người nhận.",
      label: "Số mẫu tin muốn nhận",
      defaultValue: "5",
      rows: 1,
      required: true,
      confirmText: "Nhận",
    });
    if (!n) return;
    try {
      const r = await api.post("/review-queue/claim", { count: Math.max(1, Math.min(50, Number(n) || 5)) });
      toast.success(r.claimed ? `Đã nhận ${r.claimed} mẫu tin` : "Không còn mẫu tin nào chưa có người nhận");
      list.reload();
    } catch (e) {
      toast.error(e);
    }
  };

  return (
    <Card
      title={`Hàng đợi đánh giá (${list.total})`}
      actions={
        <Button icon={Hand} onClick={claim}>
          Nhận việc tự động
        </Button>
      }
    >
      <p className="ui-card-sub">Sắp xếp theo điểm ưu tiên (độ tin cậy AI + mức nghiêm trọng + mức lan truyền). Mẫu tin bạn đã đánh giá không hiện lại (đánh giá chéo cần người khác).</p>
      <FilterBar list={list} searchPlaceholder="Mã, tiêu đề, nội dung" />
      <PagedTable
        list={list}
        minWidth={980}
        onRowClick={open}
        empty="Không có mẫu tin chờ đánh giá"
        columns={[
          { key: "p", title: "Ưu tiên", num: true, render: (r) => <strong style={{ color: r.priority >= 80 ? "#b42318" : r.priority >= 50 ? "#9a5b00" : "#333" }}>{r.priority}</strong> },
          {
            key: "c",
            title: "Mẫu tin",
            render: (r) => (
              <>
                <div>
                  <span className="ui-code">{r.code}</span> <span className="ui-muted" style={{ fontSize: 12 }}>· {label("adSource", r.sourceType)} · {fmtDateTime(r.collectedAt)}</span>
                </div>
                <div style={{ fontSize: 13, marginTop: 3 }}>{truncate(r.content, 150)}</div>
              </>
            ),
          },
          { key: "ai", title: "Kết quả AI", render: (r) => <AiBadge ai={r.ai} /> },
          { key: "t", title: "Loại vi phạm gợi ý", render: (r) => <ViolationTypeChips codes={r.ai?.violationTypes} types={types} /> },
          { key: "s", title: "Trạng thái", render: (r) => <StatusBadge group="adStatus" value={r.status} /> },
          { key: "a", title: "Người xử lý", render: (r) => r.assignee?.fullName || <span className="ui-muted">Chưa nhận</span> },
          {
            key: "x",
            title: "",
            render: (r) => (
              <Button size="sm" icon={ClipboardCheck} onClick={(e) => (e.stopPropagation(), open(r))}>
                Đánh giá
              </Button>
            ),
          },
        ]}
      />
    </Card>
  );
}

function DecidedTab() {
  const router = useRouter();
  const list = usePaged("/ad-items", { status: "CONFIRMED_VIOLATION,NOT_VIOLATION", sort: "collectedAt" });
  return (
    <Card title={`Mẫu tin đã kết luận (${list.total})`}>
      <FilterBar list={list} searchPlaceholder="Mã, tiêu đề, nội dung">
        <FilterSelect
          list={list}
          name="status"
          label="Kết luận"
          allLabel={null}
          options={[
            { value: "CONFIRMED_VIOLATION,NOT_VIOLATION", label: "Tất cả" },
            { value: "CONFIRMED_VIOLATION", label: "Vi phạm" },
            { value: "NOT_VIOLATION", label: "Không vi phạm" },
          ]}
        />
        <FilterSelect list={list} name="field" label="Lĩnh vực" options={options("field").filter((o) => o.value !== "CHUA_PHAN_LOAI")} />
      </FilterBar>
      <PagedTable
        list={list}
        minWidth={860}
        onRowClick={(r) => router.push(portalPath(`/review?id=${r.id}`))}
        columns={[
          {
            key: "c",
            title: "Mẫu tin",
            render: (r) => (
              <>
                <span className="ui-code">{r.code}</span>
                <div style={{ fontSize: 13, marginTop: 3 }}>{truncate(r.content, 150)}</div>
              </>
            ),
          },
          { key: "f", title: "Lĩnh vực", render: (r) => label("field", r.field) },
          { key: "s", title: "Kết luận", render: (r) => <StatusBadge group="adStatus" value={r.status} /> },
          { key: "d", title: "Thời điểm", nowrap: true, render: (r) => fmtDateTime(r.decidedAt) },
          { key: "fa", title: "Cơ sở", render: (r) => r.facility?.name },
        ]}
      />
    </Card>
  );
}

/** Đánh giá kết quả AI (Human-in-the-loop): hàng đợi ưu tiên, nhận việc, mở trang đánh giá */
export default function ReviewQueuePage() {
  const scopeParam = useQueryParam("scope");
  const [tab, setTab] = useState("all");
  useEffect(() => {
    if (scopeParam === "mine") setTab("mine");
  }, [scopeParam]);

  return (
    <Page>
      <PageHeader
        title="Đánh giá kết quả AI"
        subtitle="Chuyên viên xem kết quả AI, đối chiếu giấy phép / văn bản pháp lý rồi xác nhận vi phạm, bác bỏ hoặc yêu cầu bổ sung. Xác nhận vi phạm sẽ tự lập hồ sơ vi phạm."
        crumbs={["Xử lý thông tin QC"]}
      />
      <Steps steps={["Thu thập", "Kiểm tra nhanh / lọc", "AI phân tích", "Chuyên viên đánh giá", "Kết luận"]} current={3} />
      <Tabs
        tabs={[
          { key: "all", label: "Tất cả chờ đánh giá" },
          { key: "mine", label: "Tôi đã nhận" },
          { key: "unassigned", label: "Chưa có người nhận" },
          { key: "decided", label: "Đã kết luận" },
        ]}
        active={tab}
        onChange={setTab}
      />
      {tab === "decided" ? <DecidedTab /> : <QueueTab key={tab} scope={tab === "all" ? "" : tab} />}
      <Alert tone="info">
        Hệ thống AI hiện là bộ luật (rule-based) dò cụm từ vi phạm và đối chiếu CSDL cơ sở, giấy phép, chứng chỉ hành nghề. Mọi kết luận cuối cùng do chuyên viên quyết định.
      </Alert>
    </Page>
  );
}
