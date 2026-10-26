const p2 = (n: number) => String(n).padStart(2, '0');

/** Ngày hôm nay (yyyy-mm-dd) theo giờ địa phương của máy chạy backend — không dùng toISOString (giờ UTC) */
export function todayLocal(d: Date = new Date()): string {
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
}
