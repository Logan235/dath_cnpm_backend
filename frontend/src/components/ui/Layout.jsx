"use client";

import { useState } from "react";
import { ICON_HOME } from "@/assets/icons";
import { label as L, tone as T } from "@/lib/labels";
import Button from "./Button";
import { TextInput } from "./Form";
import { Search, RotateCcw } from "lucide-react";

export function Page({ children }) {
  return <div className="ui-page">{children}</div>;
}

/** Tiêu đề trang: breadcrumb + tên trang + mô tả + nút thao tác */
export function PageHeader({ title, subtitle, crumbs = [], actions }) {
  return (
    <div className="ui-page-head">
      <div style={{ minWidth: 0 }}>
        <div className="ui-crumb">
          <img src={ICON_HOME} alt="" />
          <span>Trang chủ</span>
          {crumbs.map((c) => (
            <span key={c} style={{ display: "contents" }}>
              <span className="ui-crumb-sep">|</span>
              <span>{c}</span>
            </span>
          ))}
        </div>
        <h1 className="ui-title">{title}</h1>
        {subtitle && <p className="ui-subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="ui-actions">{actions}</div>}
    </div>
  );
}

export function Card({ title, subtitle, actions, children, style, className = "" }) {
  return (
    <section className={`ui-card ${className}`} style={style}>
      {(title || actions) && (
        <div className="ui-card-head">
          {title ? <h2 className="ui-card-title">{title}</h2> : <span />}
          {actions && <div className="ui-actions">{actions}</div>}
        </div>
      )}
      {subtitle && <p className="ui-card-sub">{subtitle}</p>}
      {children}
    </section>
  );
}

export function Badge({ tone = "neutral", children, title }) {
  return (
    <span className={`ui-badge ui-tone-${tone}`} title={title}>
      {children}
    </span>
  );
}

/** Nhãn trạng thái theo nhóm mã: <StatusBadge group="violationStatus" value="NEW" /> */
export function StatusBadge({ group, value, text }) {
  if (value === null || value === undefined || value === "") return <span className="ui-muted">—</span>;
  return <Badge tone={T(group, value)}>{text || L(group, value)}</Badge>;
}

export function Alert({ tone = "info", children, style }) {
  return (
    <div className={`ui-alert ui-alert-${tone}`} style={style} role={tone === "danger" ? "alert" : undefined}>
      {children}
    </div>
  );
}

/** Lưới thông tin: items = [{ label, value, wide }] */
export function InfoGrid({ items, cols = 2 }) {
  return (
    <div className={`ui-info ${cols === 3 ? "ui-info-3" : cols === 1 ? "ui-info-1" : ""}`}>
      {items
        .filter((x) => x && !x.hidden)
        .map((x) => (
          <div key={x.label} className={`ui-info-item${x.wide ? " is-wide" : ""}`}>
            <div className="ui-info-label">{x.label}</div>
            <div className="ui-info-value">
              {x.value === null || x.value === undefined || x.value === "" ? <span className="ui-muted">—</span> : x.value}
            </div>
          </div>
        ))}
    </div>
  );
}

export function StatCard({ label, value, hint, tone, onClick }) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag type={onClick ? "button" : undefined} className={`ui-stat${tone ? ` is-${tone}` : ""}`} onClick={onClick}>
      <div className="ui-stat-label">{label}</div>
      <div className="ui-stat-value">{value ?? "—"}</div>
      {hint && <div className="ui-stat-hint">{hint}</div>}
    </Tag>
  );
}

/** Biểu đồ thanh ngang đơn giản: items = [{ label, value }] */
export function BarList({ items = [], format = (v) => v, empty = "Chưa có dữ liệu" }) {
  const max = Math.max(1, ...items.map((i) => Number(i.value) || 0));
  if (!items.length) return <div className="ui-muted" style={{ fontSize: 13 }}>{empty}</div>;
  return (
    <div className="ui-bars">
      {items.map((i) => (
        <div className="ui-bar-row" key={i.label}>
          <span className="ui-bar-label" title={i.label}>
            {i.label}
          </span>
          <span className="ui-bar-track">
            <span className="ui-bar-fill" style={{ width: `${((Number(i.value) || 0) / max) * 100}%`, background: i.color }} />
          </span>
          <span className="ui-bar-value">{format(i.value)}</span>
        </div>
      ))}
    </div>
  );
}

/** Ô tìm kiếm: chỉ áp dụng khi bấm Enter hoặc nút Tìm */
export function SearchBox({ value = "", onSearch, placeholder = "Nhập từ khóa rồi nhấn Enter" }) {
  const [text, setText] = useState(value);
  return (
    <div className="ui-searchbox">
      <TextInput
        value={text}
        placeholder={placeholder}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onSearch?.(text.trim())}
        aria-label="Tìm kiếm"
      />
      <Button variant="secondary" icon={Search} onClick={() => onSearch?.(text.trim())}>
        Tìm
      </Button>
    </div>
  );
}

/** Thanh bộ lọc gắn với usePaged(): search + các <Select> con */
export function FilterBar({ list, searchPlaceholder, children, showSearch = true }) {
  return (
    <div className="ui-filters">
      {showSearch && (
        <div className="ui-field ui-search">
          <span className="ui-label">Tìm kiếm</span>
          <SearchBox key={list.filters.search || ""} value={list.filters.search || ""} onSearch={(v) => list.setFilter("search", v)} placeholder={searchPlaceholder} />
        </div>
      )}
      {children}
      <Button variant="ghost" icon={RotateCcw} onClick={list.resetFilters} title="Bỏ lọc">
        Bỏ lọc
      </Button>
    </div>
  );
}

/** Ô chọn lọc gắn với usePaged(): <FilterSelect list={list} name="status" label="Trạng thái" options={...} /> */
export function FilterSelect({ list, name, label, options, allLabel = "Tất cả" }) {
  return (
    <div className="ui-field">
      <span className="ui-label">{label}</span>
      <select className="ui-select" value={list.filters[name] ?? ""} onChange={(e) => list.setFilter(name, e.target.value)} aria-label={label}>
        {allLabel !== null && <option value="">{allLabel}</option>}
        {options.map((o) => (
          <option key={String(o.value)} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function Loading({ text = "Đang tải dữ liệu…" }) {
  return <div className="ui-skeleton">{text}</div>;
}

export function ErrorBox({ error, onRetry }) {
  if (!error) return null;
  return (
    <Alert tone="danger">
      <div className="ui-between">
        <span>{error.message || String(error)}</span>
        {onRetry && (
          <Button size="sm" variant="secondary" onClick={onRetry}>
            Thử lại
          </Button>
        )}
      </div>
    </Alert>
  );
}

/** Các bước quy trình: steps = ["Tiếp nhận", ...], current = chỉ số bước hiện tại */
export function Steps({ steps, current }) {
  return (
    <div className="ui-steps" aria-label="Tiến trình">
      {steps.map((s, i) => (
        <span key={s} className={`ui-step${i < current ? " is-done" : i === current ? " is-current" : ""}`}>
          <span className="ui-step-num">{i + 1}</span>
          {s}
        </span>
      ))}
    </div>
  );
}

export function Timeline({ items = [], empty = "Chưa có lịch sử" }) {
  if (!items.length) return <div className="ui-muted" style={{ fontSize: 13 }}>{empty}</div>;
  return (
    <ul className="ui-timeline">
      {items.map((it, i) => (
        <li key={it.key ?? i}>
          <div className="ui-timeline-time">{it.time}</div>
          <div>{it.content}</div>
        </li>
      ))}
    </ul>
  );
}
