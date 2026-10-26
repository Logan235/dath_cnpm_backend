import { createHash } from 'crypto';

/** Bỏ dấu tiếng Việt: "Phòng khám Đa khoa" -> "Phong kham Da khoa" */
export function removeDiacritics(s: string): string {
  return (s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

/** Chuẩn hóa để so khớp: thường, bỏ dấu, bỏ ký tự đặc biệt, gộp khoảng trắng */
export function normalizeText(s: string): string {
  return removeDiacritics(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function sha256(s: string): string {
  return createHash('sha256').update(s).digest('hex');
}

export function contentHash(s: string): string {
  return sha256(normalizeText(s));
}

/** Khoảng cách Levenshtein */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(cur[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    prev = cur;
  }
  return prev[b.length];
}

/** Độ tương đồng Jaccard trên tập từ */
export function jaccard(a: string, b: string): number {
  const A = new Set(normalizeText(a).split(' ').filter(Boolean));
  const B = new Set(normalizeText(b).split(' ').filter(Boolean));
  if (!A.size && !B.size) return 1;
  let inter = 0;
  A.forEach((x) => B.has(x) && inter++);
  return inter / (A.size + B.size - inter);
}

/**
 * Hàm so khớp tổng hợp (mục 12.13.1 báo cáo):
 * Score = β·(1 − d_lev / max(|s1|,|s2|)) + (1 − β)·J(S1,S2)
 */
export function matchScore(s1: string, s2: string, beta = 0.6): number {
  const a = normalizeText(s1);
  const b = normalizeText(s2);
  if (!a || !b) return 0;
  const lev = 1 - levenshtein(a, b) / Math.max(a.length, b.length);
  return Math.round((beta * lev + (1 - beta) * jaccard(a, b)) * 1000) / 1000;
}

/** Chuẩn hóa số điện thoại VN về dạng 0xxxxxxxxx */
export function normalizePhone(p: string): string {
  let d = (p || '').replace(/[^\d+]/g, '');
  if (d.startsWith('+84')) d = '0' + d.slice(3);
  else if (d.startsWith('84') && d.length >= 11) d = '0' + d.slice(2);
  return d;
}

export function extractPhones(text: string): string[] {
  const out = new Set<string>();
  const re = /(?:\+?84|0)(?:[\s.-]?\d){8,10}/g;
  for (const m of text.match(re) || []) {
    const p = normalizePhone(m);
    if (p.length >= 10 && p.length <= 11) out.add(p);
  }
  return [...out];
}

export function extractUrls(text: string): string[] {
  const out = new Set<string>();
  const re = /\b((?:https?:\/\/)?(?:www\.)?[a-z0-9][a-z0-9-]*(?:\.[a-z0-9-]+)*\.(?:vn|com|net|org|info|io|me|asia|shop|store)(?:\/[^\s,;)]*)?)/gi;
  for (const m of text.match(re) || []) out.add(m.replace(/[.,]+$/, ''));
  return [...out];
}

export function domainOf(url: string): string {
  return (url || '')
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split(/[/?#]/)[0];
}

/** Số giấy phép / chứng chỉ, VD: 00234/HCM-GPHĐ, 12345-ABC/2020/SYT, 000123/HCM-CCHN */
export function extractLicenseNumbers(text: string): string[] {
  const out = new Set<string>();
  const re = /(?<![\w/])\d{2,6}(?:[-/][A-Za-z0-9ĐđÀ-ỹ]{2,10}){1,3}(?=$|[\s,.;:)\]])/gu;
  for (const m of text.match(re) || []) {
    // bỏ ngày tháng (12/05/2024) và số điện thoại
    if (/^\d{1,2}\/\d{1,2}(\/\d{2,4})?$/.test(m)) continue;
    if (!/[A-Za-zĐđ]/.test(m)) continue;
    out.add(m);
  }
  return [...out];
}

const NAME_WORD = "\\p{Lu}\\p{Ll}+";

/** Tên bác sĩ: "BS. Nguyễn Văn A", "bác sĩ Trần Thị Bình" */
export function extractDoctorNames(text: string): string[] {
  const out = new Set<string>();
  const re = new RegExp(
    `(?:BS\\.?|Bs\\.?|ThS\\.?\\s*BS\\.?|TS\\.?\\s*BS\\.?|[Bb]ác sĩ|[Bb]ác sỹ)\\s+((?:${NAME_WORD}\\s?){2,4})`,
    'gu',
  );
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) out.add(m[1].trim());
  return [...out];
}

const FACILITY_PREFIX =
  '(?:[Bb]ệnh viện(?: [Đđ]a khoa| [Cc]huyên khoa| [Rr]ăng [Hh]àm [Mm]ặt)?|[Pp]hòng khám(?: [Đđ]a khoa| [Cc]huyên khoa| [Nn]ha khoa)?|[Tt]hẩm mỹ viện|[Nn]ha khoa(?: [Qq]uốc tế)?|[Nn]hà thuốc|[Tt]rung tâm(?: [Yy] tế| [Tt]hẩm mỹ)?|[Vv]iện [Tt]hẩm mỹ|[Ss]pa|[Pp]hòng [Cc]hẩn trị)';

/** Tên cơ sở y tế: "Phòng khám Hồng Phúc", "Nha khoa Sài Gòn Smile" */
export function extractFacilityNames(text: string): string[] {
  const out = new Set<string>();
  const re = new RegExp(`${FACILITY_PREFIX}\\s+((?:[\\p{Lu}0-9][\\p{L}\\p{N}&'-]*\\s?){1,5})`, 'gu');
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const full = m[0].trim().replace(/[\s,.;:-]+$/, '');
    out.add(full);
  }
  return [...out];
}

/** Kiểm tra từ khóa có chứa ký tự đặc biệt không hợp lệ (mục 10.11.2) */
export function hasInvalidKeywordChars(s: string): boolean {
  return /[<>{}[\]\\^~`|@#$%*=+;"]/.test(s);
}

export function splitKeywords(s?: string | null): string[] {
  return (s || '')
    .split(/[,;\n]/)
    .map((x) => x.trim())
    .filter(Boolean);
}

export function pad(n: number | string, width = 4): string {
  return String(n).padStart(width, '0');
}

/** Sinh mã hiển thị: makeCode('VP', 12) -> VP-2026-0012 */
export function makeCode(prefix: string, id: number | string, withYear = true): string {
  return withYear ? `${prefix}-${new Date().getFullYear()}-${pad(id, 4)}` : `${prefix}-${pad(id, 6)}`;
}
