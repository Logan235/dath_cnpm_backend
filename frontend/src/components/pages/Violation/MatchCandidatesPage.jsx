"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, X } from "lucide-react";
import { api } from "@/lib/api";
import { portalPath } from "@/lib/auth";
import { usePaged } from "@/lib/hooks";
import { options } from "@/lib/labels";
import { fmtDateTime, fmtPercent } from "@/lib/format";
import { Alert, Button, Card, FilterSelect, Modal, PagedTable, Page, PageHeader, StatusBadge, confirmDialog, toast } from "@/components/ui";

/** Đối soát đối tượng: các cặp (vi phạm mới ↔ đối tượng có sẵn) có độ tương đồng 0,7 – 0,9 chờ cán bộ xác nhận */
export default function MatchCandidatesPage() {
  const list = usePaged("/suspects/match-candidates", { status: "PENDING" });
  const [rejecting, setRejecting] = useState(null);

  const confirm = async (c) => {
    if (!(await confirmDialog({ title: "Xác nhận cùng đối tượng", message: `Gắn vi phạm vào đối tượng ${c.suspect?.code} — ${c.suspect?.name}?`, confirmText: "Đúng, cùng đối tượng" }))) return;
    try {
      await api.post(`/suspects/match-candidates/${c.id}/confirm`);
      toast.success("Đã gộp vào đối tượng có sẵn");
      list.reload();
    } catch (e) {
      toast.error(e);
    }
  };
  const reject = async (c, createNew) => {
    try {
      await api.post(`/suspects/match-candidates/${c.id}/reject${createNew ? "?createNew=true" : ""}`);
      toast.success(createNew ? "Đã tạo đối tượng mới cho vi phạm" : "Đã đánh dấu không trùng");
      setRejecting(null);
      list.reload();
    } catch (e) {
      toast.error(e);
    }
  };

  return (
    <Page>
      <PageHeader
        title="Đối soát đối tượng vi phạm"
        subtitle="Điểm khớp = β × (1 − Levenshtein) + (1 − β) × Jaccard. Trên 0,9 hệ thống tự gộp; từ 0,7 đến 0,9 chờ cán bộ xác nhận tại đây."
        crumbs={["Điều tra xác minh"]}
      />
      <Alert tone="info">Các tham số β, ngưỡng tự gộp và ngưỡng xem xét do quản trị viên chỉnh ở Tham số hệ thống (MATCH_BETA, MATCH_AUTO_MERGE, MATCH_REVIEW_MIN).</Alert>
      <Card title={`Cặp cần đối soát (${list.total})`}>
        <div className="ui-filters">
          <FilterSelect list={list} name="status" label="Trạng thái" options={options("matchStatus")} allLabel="Tất cả" />
        </div>
        <PagedTable
          list={list}
          minWidth={980}
          empty="Không có cặp nào cần đối soát"
          columns={[
            {
              key: "e",
              title: "Thông tin trích xuất từ vi phạm",
              render: (c) => {
                const ids = c.extractedIdentifiers || {};
                return (
                  <>
                    <div className="ui-cell-main">{c.extractedName || (ids.names || []).join(", ") || "—"}</div>
                    <div className="ui-cell-sub">
                      {[...(ids.phones || []), ...(ids.accounts || []).map((a) => (typeof a === "string" ? a : a.platformUid || a.uid))].filter(Boolean).join(" · ")}
                    </div>
                    {c.violationId && (
                      <Link className="ui-link" style={{ fontSize: 12 }} href={portalPath(`/violations/detail?id=${c.violationId}`)}>
                        Xem hồ sơ vi phạm
                      </Link>
                    )}
                  </>
                );
              },
            },
            {
              key: "s",
              title: "Đối tượng có sẵn",
              render: (c) =>
                c.suspect ? (
                  <Link className="ui-link" href={portalPath(`/suspects/detail?id=${c.suspect.id}`)}>
                    {c.suspect.code} — {c.suspect.name}
                  </Link>
                ) : (
                  `#${c.suspectId}`
                ),
            },
            { key: "sc", title: "Độ tương đồng", num: true, render: (c) => <strong>{fmtPercent(c.score, 1)}</strong> },
            { key: "st", title: "Trạng thái", render: (c) => <StatusBadge group="matchStatus" value={c.status} /> },
            { key: "t", title: "Thời gian", nowrap: true, render: (c) => fmtDateTime(c.createdAt) },
            {
              key: "x",
              title: "",
              render: (c) =>
                c.status === "PENDING" && (
                  <div className="ui-row" style={{ flexWrap: "nowrap" }}>
                    <Button size="sm" variant="success" icon={Check} onClick={() => confirm(c)}>
                      Cùng đối tượng
                    </Button>
                    <Button size="sm" variant="secondary" icon={X} onClick={() => setRejecting(c)}>
                      Khác
                    </Button>
                  </div>
                ),
            },
          ]}
        />
      </Card>
      <Modal
        open={!!rejecting}
        width={520}
        title="Không phải cùng đối tượng"
        onClose={() => setRejecting(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setRejecting(null)}>
              Hủy
            </Button>
            <Button variant="secondary" onClick={() => reject(rejecting, false)}>
              Chỉ đánh dấu không trùng
            </Button>
            <Button onClick={() => reject(rejecting, true)}>Tạo đối tượng mới</Button>
          </>
        }
      >
        Vi phạm này không thuộc đối tượng {rejecting?.suspect?.code}. Bạn muốn tạo đối tượng mới từ thông tin trích xuất, hay chỉ đánh dấu không trùng?
      </Modal>
    </Page>
  );
}
