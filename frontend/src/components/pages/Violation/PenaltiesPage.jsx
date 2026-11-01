"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Tabs from "@/components/Tabs";
import { portalPath } from "@/lib/auth";
import { usePaged, useSession } from "@/lib/hooks";
import { options } from "@/lib/labels";
import { fmtDate, fmtMoney, truncate } from "@/lib/format";
import { Alert, Card, FilterBar, FilterSelect, PagedTable, Page, PageHeader, StatusBadge } from "@/components/ui";
import { PenaltyActions } from "./penalty";

function PenaltyTable({ path, initial = {}, showFilters = true }) {
  const router = useRouter();
  const list = usePaged(path, initial);
  return (
    <Card title={`Quyết định xử phạt (${list.total})`}>
      {showFilters ? (
        <FilterBar list={list} searchPlaceholder="Số quyết định, đối tượng">
          <FilterSelect list={list} name="status" label="Trạng thái" options={options("penaltyStatus")} />
          <FilterSelect list={list} name="executionStatus" label="Thi hành" options={options("executionStatus")} />
        </FilterBar>
      ) : (
        <FilterBar list={list} searchPlaceholder="Số quyết định, đối tượng" />
      )}
      <PagedTable
        list={list}
        minWidth={1100}
        onRowClick={(p) => router.push(portalPath(`/violations/detail?id=${p.violationId}`))}
        empty="Không có quyết định nào"
        columns={[
          { key: "n", title: "Số quyết định", nowrap: true, render: (p) => <span className="ui-code">{p.decisionNumber}</span> },
          {
            key: "o",
            title: "Đối tượng / hành vi",
            render: (p) => (
              <>
                <div className="ui-cell-main">{p.offenderName}</div>
                <div className="ui-cell-sub">{truncate(p.violationBehavior, 90)}</div>
              </>
            ),
          },
          { key: "v", title: "Hồ sơ", nowrap: true, render: (p) => <span className="ui-code">{p.violation?.code}</span> },
          { key: "f", title: "Tiền phạt", num: true, render: (p) => fmtMoney(p.fineAmount) },
          { key: "s", title: "Trạng thái", render: (p) => <StatusBadge group="penaltyStatus" value={p.status} /> },
          { key: "e", title: "Thi hành", render: (p) => <StatusBadge group="executionStatus" value={p.executionStatus} /> },
          { key: "d", title: "Hạn", nowrap: true, render: (p) => fmtDate(p.dueDate) },
          { key: "a", title: "Thao tác", render: (p) => <PenaltyActions p={p} onChanged={list.reload} /> },
        ]}
      />
    </Card>
  );
}

/** Quyết định xử phạt: chuyên viên theo dõi thi hành; lãnh đạo phê duyệt quyết định cấp cao */
export default function PenaltiesPage() {
  const { can } = useSession();
  const approver = can("penalty.approve");
  const [tab, setTab] = useState(approver ? "pending" : "all");
  return (
    <Page>
      <PageHeader
        title={approver ? "Phê duyệt quyết định xử phạt" : "Quyết định xử phạt hành chính"}
        subtitle="Quyết định có mức phạt lớn hoặc vi phạm nghiêm trọng phải được lãnh đạo phê duyệt trước khi ban hành. Người lập quyết định không được tự phê duyệt."
        crumbs={["Quản lý thông tin vi phạm"]}
      />
      {approver && (
        <Tabs
          tabs={[
            { key: "pending", label: "Chờ phê duyệt" },
            { key: "all", label: "Tất cả quyết định" },
          ]}
          active={tab}
          onChange={setTab}
        />
      )}
      {tab === "pending" ? (
        <>
          <Alert tone="info">Phê duyệt: quyết định được ban hành ngay. Từ chối: hồ sơ quay lại chuyên viên để lập lại quyết định.</Alert>
          <PenaltyTable key="p" path="/penalty-decisions/pending-approval" showFilters={false} />
        </>
      ) : (
        <PenaltyTable key="a" path="/penalty-decisions" />
      )}
    </Page>
  );
}
