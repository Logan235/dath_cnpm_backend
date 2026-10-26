// =====================================================================
// CHUYỂN NỘI DUNG FILE (PDF/Word) THÀNH THÔNG TIN CÓ CẤU TRÚC
// Hỗ trợ 2 kiểu file:
//   1) File theo mẫu "Nhãn: Giá trị" (VD "Số giấy phép: 00234/HCM-GPHĐ")
//   2) Văn bản pháp lý chuẩn thể thức (QUỐC HỘI ... Luật số ... ngày ... tháng ... năm ...)
// Kết quả là bản nháp (draft) để người dùng kiểm tra lại trên form trước khi lưu.
// =====================================================================
import { extractLicenseNumbers, extractPhones, normalizeText, splitKeywords } from '../common/utils/text';

type KV = Map<string, string>;

function lines(text: string): string[] {
  return text.split('\n').map((l) => l.trim()).filter(Boolean);
}

/** Thu thập các cặp "nhãn: giá trị" (nhãn đã chuẩn hóa không dấu) */
function keyValues(text: string): KV {
  const kv: KV = new Map();
  const ls = lines(text);
  for (let i = 0; i < ls.length; i++) {
    const m = ls[i].match(/^([^:：]{2,60})[:：]\s*(.*)$/);
    if (m) {
      const key = normalizeText(m[1]);
      let val = m[2].trim();
      if (!val && ls[i + 1] && !/[:：]/.test(ls[i + 1])) val = ls[i + 1];
      if (key && val && !kv.has(key)) kv.set(key, val);
    }
  }
  // Dạng bảng Word: dòng nhãn, dòng kế tiếp là giá trị
  for (let i = 0; i < ls.length - 1; i++) {
    const key = normalizeText(ls[i]);
    if (key.length <= 50 && !kv.has(key) && !/[:：]/.test(ls[i + 1])) kv.set(`__row__${key}`, ls[i + 1]);
  }
  return kv;
}

function pick(kv: KV, synonyms: string[]): string | undefined {
  const syn = synonyms.map(normalizeText);
  for (const s of syn) {
    if (kv.has(s)) return kv.get(s);
  }
  for (const s of syn) {
    if (kv.has(`__row__${s}`)) return kv.get(`__row__${s}`);
  }
  for (const [k, v] of kv) {
    if (!k.startsWith('__row__') && syn.some((s) => k.startsWith(s))) return v;
  }
  return undefined;
}

/** "ngày 21 tháng 6 năm 2012" | "21/06/2012" | "21-06-2012" | "2012-06-21" -> "2012-06-21" */
export function parseViDate(s?: string | null): string | undefined {
  if (!s) return undefined;
  let m = s.match(/(\d{1,2})\s*tháng\s*(\d{1,2})\s*năm\s*(\d{4})/i);
  if (!m) m = s.match(/\b(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})\b/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  const iso = s.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  return iso ? iso[0] : undefined;
}

function sentenceCase(s: string): string {
  const low = s.toLocaleLowerCase('vi');
  return low.charAt(0).toLocaleUpperCase('vi') + low.slice(1);
}

const LEGAL_TYPES: { code: string; heading: RegExp; suffix: RegExp; name: string }[] = [
  { code: 'LUAT', heading: /^LUẬT$/u, suffix: /QH\d*/i, name: 'Luật' },
  { code: 'NGHI_DINH', heading: /^NGHỊ ĐỊNH$/u, suffix: /NĐ-CP|ND-CP/i, name: 'Nghị định' },
  { code: 'THONG_TU', heading: /^THÔNG TƯ$/u, suffix: /TT-/i, name: 'Thông tư' },
  { code: 'QUYET_DINH', heading: /^QUYẾT ĐỊNH$/u, suffix: /QĐ|QD-/i, name: 'Quyết định' },
  { code: 'CONG_VAN', heading: /^CÔNG VĂN$/u, suffix: /CV|\/[A-Z]+-[A-Z]+$/i, name: 'Công văn' },
];

const ISSUERS = [
  'QUỐC HỘI',
  'CHÍNH PHỦ',
  'THỦ TƯỚNG CHÍNH PHỦ',
  'BỘ Y TẾ',
  'BỘ THÔNG TIN VÀ TRUYỀN THÔNG',
  'ỦY BAN NHÂN DÂN',
  'UỶ BAN NHÂN DÂN',
  'SỞ Y TẾ',
];

export function extractLegalDocument(text: string) {
  const kv = keyValues(text);
  const ls = lines(text);
  const head = ls.slice(0, 40);

  let documentNumber =
    pick(kv, ['số văn bản', 'số hiệu', 'số ký hiệu', 'luật số', 'số']) ||
    text.match(/\b\d{1,4}\/\d{4}\/[A-ZĐ0-9-]{2,}\b/u)?.[0];
  if (documentNumber) documentNumber = documentNumber.split(/\s/)[0].replace(/[.,;]$/, '');

  let typeCode: string | undefined;
  const typeText = pick(kv, ['loại văn bản']);
  if (typeText) typeCode = LEGAL_TYPES.find((t) => normalizeText(t.name) === normalizeText(typeText))?.code;
  let headingIdx = -1;
  if (!typeCode) {
    headingIdx = head.findIndex((l) => LEGAL_TYPES.some((t) => t.heading.test(l)));
    if (headingIdx >= 0) typeCode = LEGAL_TYPES.find((t) => t.heading.test(head[headingIdx]))?.code;
  }
  if (!typeCode && documentNumber) typeCode = LEGAL_TYPES.find((t) => t.suffix.test(documentNumber!))?.code;

  let title = pick(kv, ['tên văn bản', 'trích yếu', 'tiêu đề']);
  if (!title && headingIdx >= 0) {
    const parts: string[] = [];
    for (let i = headingIdx + 1; i < Math.min(head.length, headingIdx + 4); i++) {
      if (/^(Căn cứ|Theo đề nghị|Chương|Điều)/u.test(head[i])) break;
      parts.push(head[i]);
    }
    const typeName = LEGAL_TYPES.find((t) => t.code === typeCode)?.name ?? '';
    if (parts.length) title = `${typeName} ${sentenceCase(parts.join(' '))}`.trim();
    else title = typeName;
  }

  const issuer =
    pick(kv, ['cơ quan ban hành', 'nơi ban hành']) ||
    head.find((l) => ISSUERS.some((x) => l.toUpperCase().startsWith(x)))?.replace(/\s{2,}.*/, '');

  const issuedDate =
    parseViDate(pick(kv, ['ngày ban hành', 'ngày ký'])) ||
    parseViDate(text.match(/ngày\s*\d{1,2}\s*tháng\s*\d{1,2}\s*năm\s*\d{4}/i)?.[0]);

  const effMatch = text.match(/hiệu lực(?: thi hành)?(?: kể)? từ ngày\s*([^\n.;]{6,40})/i);
  const effectiveDate = parseViDate(pick(kv, ['ngày hiệu lực', 'ngày có hiệu lực'])) || parseViDate(effMatch?.[1]);

  const field =
    pick(kv, ['lĩnh vực', 'lĩnh vực điều chỉnh']) ||
    (/quảng cáo/i.test(text) ? 'Quảng cáo' : /khám bệnh|chữa bệnh|y tế/i.test(text) ? 'Y tế' : undefined);

  const code =
    pick(kv, ['mã văn bản']) ||
    (documentNumber ? normalizeText(documentNumber.replace(/\//g, ' ')).toUpperCase().replace(/\s+/g, '-') : undefined);

  const summary = pick(kv, ['tóm tắt', 'nội dung chính']) || ls.find((l) => l.length > 80)?.slice(0, 500);

  return {
    code,
    documentNumber,
    title,
    typeCode,
    issuer,
    issuedDate,
    effectiveDate,
    field,
    summary,
    content: text.slice(0, 200000),
  };
}

export function extractFacility(text: string) {
  const kv = keyValues(text);
  const techniquesText = pick(kv, [
    'danh mục kỹ thuật được phép thực hiện',
    'danh mục kỹ thuật',
    'kỹ thuật được phép',
    'kỹ thuật chuyên môn',
  ]);
  const name = pick(kv, ['tên cơ sở khám bệnh chữa bệnh', 'tên cơ sở', 'tên đơn vị', 'tên cơ sở kcb']);
  const licenseNumber =
    pick(kv, ['số giấy phép hoạt động', 'giấy phép hoạt động số', 'số giấy phép']) || extractLicenseNumbers(text)[0];
  return {
    code: pick(kv, ['mã đơn vị', 'mã cơ sở']),
    name,
    typeCode: guessFacilityType(name || text),
    organizationForm: pick(kv, ['hình thức tổ chức']),
    address: pick(kv, ['địa chỉ', 'địa điểm hoạt động', 'trụ sở']),
    ward: pick(kv, ['phường/xã', 'phường', 'xã']),
    district: pick(kv, ['quận/huyện', 'quận', 'huyện']),
    province: pick(kv, ['tỉnh/thành phố', 'tỉnh thành phố', 'thành phố']),
    phone: pick(kv, ['điện thoại', 'số điện thoại', 'hotline']) || extractPhones(text)[0],
    email: pick(kv, ['email', 'thư điện tử']),
    website: pick(kv, ['website', 'trang web']),
    representative: pick(kv, ['người chịu trách nhiệm chuyên môn', 'người phụ trách chuyên môn', 'người đại diện']),
    professionalScope: pick(kv, ['phạm vi hoạt động chuyên môn', 'phạm vi hoạt động']),
    workingHours: pick(kv, ['thời gian làm việc', 'thời gian hoạt động', 'giờ làm việc']),
    licenseNumber,
    licenseIssuedDate: parseViDate(pick(kv, ['ngày cấp giấy phép', 'ngày cấp'])),
    licensedTechniques: splitKeywords(techniquesText?.replace(/[-•]/g, ',')),
  };
}

export function extractLicense(text: string) {
  const kv = keyValues(text);
  const upper = text.toUpperCase();
  let licenseType = 'OTHER';
  if (/CHỨNG CHỈ HÀNH NGHỀ|GIẤY PHÉP HÀNH NGHỀ/u.test(upper)) licenseType = 'CCHN';
  else if (/XÁC NHẬN NỘI DUNG QUẢNG CÁO/u.test(upper)) licenseType = 'XNQC';
  else if (/GIẤY PHÉP HOẠT ĐỘNG/u.test(upper)) licenseType = 'GPHD';
  const typeText = pick(kv, ['loại giấy phép']);
  if (typeText) {
    const t = normalizeText(typeText);
    if (t.includes('chung chi') || t.includes('hanh nghe') || t === 'cchn') licenseType = 'CCHN';
    else if (t.includes('xac nhan') || t === 'xnqc') licenseType = 'XNQC';
    else if (t.includes('hoat dong') || t === 'gphd') licenseType = 'GPHD';
  }
  return {
    licenseNumber:
      pick(kv, ['số giấy phép', 'số chứng chỉ hành nghề', 'số chứng chỉ', 'số giấy xác nhận', 'số']) ||
      extractLicenseNumbers(text)[0],
    licenseType,
    facilityCode: pick(kv, ['mã đơn vị', 'mã cơ sở']),
    facilityName: pick(kv, ['tên cơ sở', 'tên đơn vị', 'nơi làm việc', 'cơ sở']),
    holderName: pick(kv, ['họ và tên', 'họ tên', 'người được cấp', 'cấp cho']),
    holderTitle: pick(kv, ['văn bằng chuyên môn', 'chức danh', 'chuyên khoa']),
    issuedDate: parseViDate(pick(kv, ['ngày cấp'])),
    expiryDate: parseViDate(pick(kv, ['ngày hết hạn', 'có giá trị đến', 'hiệu lực đến'])),
    issuer: pick(kv, ['cơ quan cấp', 'nơi cấp', 'đơn vị cấp']),
    scope: pick(kv, ['phạm vi hoạt động chuyên môn', 'phạm vi hoạt động', 'phạm vi', 'nội dung xác nhận']),
  };
}

export function guessFacilityType(s: string): string | undefined {
  const t = normalizeText(s);
  if (t.startsWith('benh vien')) return 'BENH_VIEN';
  if (t.includes('nha khoa') || t.includes('rang ham mat')) return 'NHA_KHOA';
  if (t.includes('tham my') || t.includes('spa')) return 'THAM_MY';
  if (t.includes('nha thuoc')) return 'NHA_THUOC';
  if (t.includes('phong kham da khoa')) return 'PHONG_KHAM_DK';
  if (t.includes('phong kham')) return 'PHONG_KHAM_CK';
  return undefined;
}

/** Liệt kê các trường bắt buộc còn thiếu */
export function missingFields(draft: Record<string, any>, required: string[]): string[] {
  return required.filter((k) => {
    const v = draft[k];
    return v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length);
  });
}
