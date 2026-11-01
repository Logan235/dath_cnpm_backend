"use client";

import { ArrowLeft } from "lucide-react";
import Button from "./Button";
import { Pager } from "./DataTable";

/**
 * Bố cục hộp thư: danh sách bên trái, chi tiết bên phải (điện thoại: lần lượt từng màn).
 *   <Inbox list={list} activeId={id} onSelect={setId} renderItem={(row) => ...} detail={<Chi tiết />} />
 */
export default function Inbox({ list, activeId, onSelect, renderItem, detail, emptyDetail = "Chọn một mục ở danh sách để xem chi tiết.", emptyList = "Không có dữ liệu" }) {
  const hasDetail = activeId !== null && activeId !== undefined && activeId !== "";
  return (
    <div className={`ui-inbox${hasDetail ? " has-detail" : ""}`}>
      <div className="ui-inbox-list-col">
        <div className="ui-inbox-list">
          {list.error ? (
            <div className="ui-inbox-empty" style={{ border: "none", color: "#b42318" }}>
              {list.error.message}
            </div>
          ) : list.loading && !list.rows.length ? (
            <div className="ui-inbox-empty" style={{ border: "none" }}>
              Đang tải…
            </div>
          ) : !list.rows.length ? (
            <div className="ui-inbox-empty" style={{ border: "none" }}>
              {emptyList}
            </div>
          ) : (
            list.rows.map((row) => (
              <button
                type="button"
                key={row.id}
                className={`ui-inbox-item${String(row.id) === String(activeId) ? " is-active" : ""}`}
                onClick={() => onSelect(row.id)}
              >
                {renderItem(row)}
              </button>
            ))
          )}
        </div>
        <Pager total={list.total} page={list.page} pageSize={list.pageSize} onPage={list.setPage} />
      </div>
      <div className="ui-inbox-detail-col" style={{ minWidth: 0 }}>
        <Button className="ui-inbox-back" variant="secondary" size="sm" icon={ArrowLeft} onClick={() => onSelect(null)}>
          Về danh sách
        </Button>
        {hasDetail ? detail : <div className="ui-inbox-empty">{emptyDetail}</div>}
      </div>
    </div>
  );
}
