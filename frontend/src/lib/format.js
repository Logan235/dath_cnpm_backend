/** Định dạng hiển thị dùng chung */

function toDate(v) {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

const pad = (n) => String(n).padStart(2, "0");

/** 2026-03-15 -> 15/03/2026 */
export function fmtDate(v) {
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
    const [y, m, d] = v.split("-");
    return `${d}/${m}/${y}`;
  }
  const d = toDate(v);
  return d ? `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}` : "";
}

/** -> 15/03/2026 09:30 */
export function fmtDateTime(v) {
  const d = toDate(v);
  return d ? `${fmtDate(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}` : "";
}

export function fmtMoney(v) {
  if (v === null || v === undefined || v === "") return "";
  const n = Number(v);
  if (Number.isNaN(n)) return String(v);
  return n.toLocaleString("vi-VN") + " đ";
}

export function fmtNumber(v) {
  if (v === null || v === undefined || v === "") return "";
  const n = Number(v);
  return Number.isNaN(n) ? String(v) : n.toLocaleString("vi-VN");
}

export function fmtPercent(v, digits = 0) {
  if (v === null || v === undefined || v === "") return "";
  return (Number(v) * 100).toFixed(digits) + "%";
}

export function truncate(text, max = 160) {
  if (!text) return "";
  const s = String(text);
  return s.length > max ? s.slice(0, max).trimEnd() + "…" : s;
}

/** Ngày hôm nay dạng yyyy-mm-dd cho <input type="date"> */
export function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Chuỗi ngày bất kỳ -> yyyy-mm-dd (dùng điền form) */
export function toDateInput(v) {
  if (!v) return "";
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
  const d = toDate(v);
  return d ? `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` : "";
}

/** "a, b ,c" -> ["a","b","c"] */
export function splitList(v) {
  if (Array.isArray(v)) return v.filter(Boolean);
  return String(v || "")
    .split(/[,\n;]/)
    .map((s) => s.trim())
    .filter(Boolean);
}
