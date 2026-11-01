"use client";

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import Button from "./Button";

/**
 * Bảng dữ liệu.
 * columns: [{ key, title, render(row, index), width, nowrap, num, className }]
 * selectable: hiện ô chọn nhiều; selected: mảng id; onSelect(ids)
 * onRowClick(row): bấm vào dòng; activeKey: id dòng đang chọn (tô sáng)
 */
export default function DataTable({
  columns,
  rows,
  rowKey = "id",
  loading,
  error,
  onRetry,
  empty = "Không có dữ liệu",
  onRowClick,
  activeKey,
  selectable,
  selected = [],
  onSelect,
  startIndex = 0,
  showIndex = true,
  minWidth = 640,
}) {
  const keyOf = (r, i) => (typeof rowKey === "function" ? rowKey(r, i) : r?.[rowKey] ?? i);
  const allKeys = (rows || []).map(keyOf);
  const sel = new Set((selected || []).map(String));
  const allOn = allKeys.length > 0 && allKeys.every((k) => sel.has(String(k)));
  const colCount = columns.length + (selectable ? 1 : 0) + (showIndex ? 1 : 0);

  const toggle = (k) => {
    const next = new Set(sel);
    next.has(String(k)) ? next.delete(String(k)) : next.add(String(k));
    onSelect?.([...next]);
  };

  let body;
  if (error) {
    body = (
      <tr>
        <td className="ui-table-state" colSpan={colCount}>
          <div style={{ color: "#b42318", marginBottom: onRetry ? 10 : 0 }}>{error.message || String(error)}</div>
          {onRetry && (
            <Button size="sm" variant="secondary" onClick={onRetry}>
              Thử lại
            </Button>
          )}
        </td>
      </tr>
    );
  } else if (loading && !(rows || []).length) {
    body = (
      <tr>
        <td className="ui-table-state" colSpan={colCount}>
          Đang tải dữ liệu…
        </td>
      </tr>
    );
  } else if (!(rows || []).length) {
    body = (
      <tr>
        <td className="ui-table-state" colSpan={colCount}>
          {empty}
        </td>
      </tr>
    );
  } else {
    body = rows.map((r, i) => {
      const k = keyOf(r, i);
      const cls = [onRowClick ? "is-clickable" : "", activeKey !== undefined && String(activeKey) === String(k) ? "is-active" : ""]
        .filter(Boolean)
        .join(" ");
      return (
        <tr key={k} className={cls} onClick={onRowClick ? () => onRowClick(r) : undefined}>
          {selectable && (
            <td className="ui-td-check" onClick={(e) => e.stopPropagation()}>
              <input type="checkbox" checked={sel.has(String(k))} onChange={() => toggle(k)} aria-label="Chọn dòng" />
            </td>
          )}
          {showIndex && <td className="ui-td-nowrap ui-muted">{startIndex + i + 1}</td>}
          {columns.map((c) => (
            <td
              key={c.key}
              className={[c.nowrap ? "ui-td-nowrap" : "", c.num ? "ui-td-num" : "", c.className || ""].join(" ")}
              style={c.width ? { width: c.width } : undefined}
            >
              {c.render ? c.render(r, i) : r?.[c.key] ?? ""}
            </td>
          ))}
        </tr>
      );
    });
  }

  return (
    <div className="ui-table-wrap" style={{ opacity: loading && (rows || []).length ? 0.6 : 1 }}>
      <table className="ui-table" style={{ minWidth }}>
        <thead>
          <tr>
            {selectable && (
              <th className="ui-td-check">
                <input
                  type="checkbox"
                  checked={allOn}
                  onChange={() => onSelect?.(allOn ? [] : allKeys.map(String))}
                  aria-label="Chọn tất cả"
                />
              </th>
            )}
            {showIndex && <th style={{ width: 48 }}>STT</th>}
            {columns.map((c) => (
              <th key={c.key} style={c.width ? { width: c.width, textAlign: c.num ? "right" : undefined } : c.num ? { textAlign: "right" } : undefined}>
                {c.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{body}</tbody>
      </table>
    </div>
  );
}

/** Phân trang: dùng chung với usePaged() */
export function Pager({ total = 0, page = 1, pageSize = 20, onPage, onPageSize, sizes = [10, 20, 50, 100] }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total ? (page - 1) * pageSize + 1 : 0;
  const to = Math.min(total, page * pageSize);
  const nums = [];
  const start = Math.max(1, Math.min(page - 2, pages - 4));
  for (let p = start; p <= Math.min(pages, start + 4); p++) nums.push(p);
  return (
    <div className="ui-pager">
      <div>
        {total ? `Hiển thị ${from}–${to} / ${total} dòng` : "Tổng số dòng 0"}
      </div>
      <div className="ui-pager-btns">
        <button type="button" className="ui-pager-btn" disabled={page <= 1} onClick={() => onPage?.(1)} aria-label="Trang đầu">
          <ChevronsLeft size={14} />
        </button>
        <button type="button" className="ui-pager-btn" disabled={page <= 1} onClick={() => onPage?.(page - 1)} aria-label="Trang trước">
          <ChevronLeft size={14} />
        </button>
        {nums.map((p) => (
          <button
            type="button"
            key={p}
            className={`ui-pager-btn${p === page ? " is-current" : ""}`}
            onClick={() => onPage?.(p)}
            aria-current={p === page ? "page" : undefined}
          >
            {p}
          </button>
        ))}
        <button type="button" className="ui-pager-btn" disabled={page >= pages} onClick={() => onPage?.(page + 1)} aria-label="Trang sau">
          <ChevronRight size={14} />
        </button>
        <button type="button" className="ui-pager-btn" disabled={page >= pages} onClick={() => onPage?.(pages)} aria-label="Trang cuối">
          <ChevronsRight size={14} />
        </button>
        {onPageSize && (
          <select value={pageSize} onChange={(e) => onPageSize(Number(e.target.value))} aria-label="Số dòng mỗi trang" style={{ marginLeft: 4 }}>
            {sizes.map((s) => (
              <option key={s} value={s}>
                {s} / trang
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}

/** Bảng + phân trang nối thẳng với kết quả usePaged() */
export function PagedTable({ list, columns, ...rest }) {
  return (
    <>
      <DataTable
        columns={columns}
        rows={list.rows}
        loading={list.loading}
        error={list.error}
        onRetry={list.reload}
        startIndex={(list.page - 1) * list.pageSize}
        {...rest}
      />
      <Pager total={list.total} page={list.page} pageSize={list.pageSize} onPage={list.setPage} onPageSize={list.setPageSize} />
    </>
  );
}
