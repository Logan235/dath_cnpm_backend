"use client";

import { useState } from "react";
import { useOptions, usePaged } from "@/lib/hooks";
import { options } from "@/lib/labels";
import { Card, FilterBar, FilterSelect, PagedTable } from "@/components/ui";
import { AdItemBlock, AdItemModal } from "./common";

/**
 * Danh sách mẫu tin dạng "STT | Nội dung" (giữ bố cục thiết kế gốc), có chọn nhiều dòng.
 * toolbar(ctx): các nút thao tác; ctx = { list, selected, setSelected, clear }
 */
export default function AdItemsBoard({ title, status, extraFilters = {}, toolbar, notice, modalActions, empty = "Không có mẫu tin", showStatusFilter }) {
  const list = usePaged("/ad-items", { status, ...extraFilters });
  const topics = useOptions("/topics", (t) => ({ value: t.id, label: t.name }));
  const schedules = useOptions("/crawl-schedules", (s) => ({ value: s.id, label: s.name }));
  const [selected, setSelected] = useState([]);
  const [viewId, setViewId] = useState(null);
  const ctx = { list, selected, setSelected, clear: () => setSelected([]), reload: () => (setSelected([]), list.reload()) };

  return (
    <>
      {notice}
      <Card title={`${title} (${list.total})`} actions={toolbar?.(ctx)}>
        <FilterBar list={list} searchPlaceholder="Mã mẫu tin, tiêu đề, nội dung">
          {showStatusFilter && <FilterSelect list={list} name="status" label="Trạng thái" options={showStatusFilter} allLabel={null} />}
          <FilterSelect list={list} name="sourceType" label="Nguồn" options={options("adSource")} />
          <FilterSelect list={list} name="platform" label="Nền tảng" options={options("platform").filter((o) => o.value !== "CHUA_PHAN_LOAI")} />
          <FilterSelect list={list} name="topicId" label="Chủ đề" options={topics} />
          <FilterSelect list={list} name="scheduleId" label="Lịch thu thập" options={schedules} />
        </FilterBar>
        {selected.length > 0 && (
          <div className="ui-alert ui-alert-info" style={{ padding: "8px 12px" }}>
            Đã chọn <strong>{selected.length}</strong> mẫu tin.{" "}
            <button type="button" className="ui-btn ui-btn-link" onClick={() => setSelected([])}>
              Bỏ chọn
            </button>
          </div>
        )}
        <PagedTable
          list={list}
          selectable
          selected={selected}
          onSelect={setSelected}
          onRowClick={(r) => setViewId(r.id)}
          minWidth={560}
          empty={empty}
          columns={[{ key: "c", title: "Nội dung", render: (r) => <AdItemBlock item={r} /> }]}
        />
      </Card>
      {viewId && <AdItemModal id={viewId} onClose={() => setViewId(null)} actions={(it) => it && modalActions?.(it, { ...ctx, close: () => setViewId(null) })} />}
    </>
  );
}
