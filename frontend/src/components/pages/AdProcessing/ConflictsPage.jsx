"use client";

import { useRouter } from "next/navigation";
import { Gavel } from "lucide-react";
import { usePaged } from "@/lib/hooks";
import { portalPath } from "@/lib/auth";
import { label } from "@/lib/labels";
import { fmtDateTime, truncate } from "@/lib/format";
import Tabs from "@/components/Tabs";
import { useState } from "react";
import { Alert, Button, Card, FilterBar, PagedTable, Page, PageHeader, StatusBadge } from "@/components/ui";

function List({ status, empty }) {
  const router = useRouter();
  const list = usePaged("/ad-items", { status, sort: "priority" });
  const open = (r) => router.push(portalPath(`/review?id=${r.id}`));
  return (
    <Card title={`Mẫu tin (${list.total})`}>
      <FilterBar list={list} searchPlaceholder="Mã, nội dung" />
      <PagedTable
        list={list}
        minWidth={860}
        onRowClick={open}
        empty={empty}
        columns={[
          { key: "p", title: "Ưu tiên", num: true, render: (r) => r.priority },
          {
            key: "c",
            title: "Mẫu tin",
            render: (r) => (
              <>
                <span className="ui-code">{r.code}</span> <span className="ui-muted" style={{ fontSize: 12 }}>· {label("adSource", r.sourceType)}</span>
                <div style={{ fontSize: 13, marginTop: 3 }}>{truncate(r.content, 160)}</div>
              </>
            ),
          },
          { key: "f", title: "Cơ sở", render: (r) => r.facility?.name },
          { key: "s", title: "Trạng thái", render: (r) => <StatusBadge group="adStatus" value={r.status} /> },
          { key: "t", title: "Thu thập", nowrap: true, render: (r) => fmtDateTime(r.collectedAt) },
          {
            key: "x",
            title: "",
            render: (r) => (
              <Button size="sm" icon={Gavel} onClick={(e) => (e.stopPropagation(), open(r))}>
                Xem và quyết định
              </Button>
            ),
          },
        ]}
      />
    </Card>
  );
}

/** Lãnh đạo: giải quyết các mẫu tin mà chuyên viên đánh giá khác nhau (đánh giá chéo) */
export default function ConflictsPage() {
  const [tab, setTab] = useState("conflict");
  return (
    <Page>
      <PageHeader
        title="Giải quyết xung đột đánh giá"
        subtitle="Khi tham số REVIEW_REQUIRED_COUNT ≥ 2, mỗi mẫu tin cần nhiều chuyên viên đánh giá. Nếu kết luận khác nhau, lãnh đạo ra quyết định cuối cùng."
        crumbs={["Phê duyệt"]}
      />
      <Tabs
        tabs={[
          { key: "conflict", label: "Đang xung đột" },
          { key: "waiting", label: "Đang chờ chuyên viên" },
        ]}
        active={tab}
        onChange={setTab}
      />
      {tab === "conflict" ? (
        <List key="c" status="CONFLICT" empty="Không có mẫu tin nào đang xung đột" />
      ) : (
        <>
          <Alert tone="info">Mẫu tin AI đã phân tích, đang chờ chuyên viên đánh giá. Lãnh đạo cũng có thể tự đánh giá.</Alert>
          <List key="w" status="AI_ANALYZED,IN_REVIEW,NEED_MORE_INFO" empty="Không có mẫu tin chờ đánh giá" />
        </>
      )}
    </Page>
  );
}
