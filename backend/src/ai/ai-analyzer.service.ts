// =====================================================================
// AI MODULE (bản tích hợp sẵn — rule-based)
// Mô phỏng các mô hình trong báo cáo:
//   - NER: trích xuất tên cơ sở, SĐT, URL, số giấy phép, tên bác sĩ, kỹ thuật, cam kết
//   - Phát hiện vi phạm: bộ luật từ khóa + đối chiếu CSDL (cơ sở, giấy phép, CCHN, phạm vi)
//   - Trả về: nhãn, độ tin cậy, loại vi phạm gợi ý, căn cứ, văn bản pháp lý, điểm ưu tiên
// Muốn dùng mô hình AI thật: đặt AI_SERVICE_URL trong .env (xem callExternal()).
// =====================================================================
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { AiModel, Facility, License, ViolationType } from '../entities';
import { ParamsService } from '../core/core.services';
import {
  domainOf,
  extractDoctorNames,
  extractFacilityNames,
  extractLicenseNumbers,
  extractPhones,
  extractUrls,
  matchScore,
  normalizeText,
} from '../common/utils/text';
import { todayLocal } from '../common/utils/date';

export interface AnalyzeInput {
  text: string;
  title?: string;
  sourceUrl?: string;
  authorAccount?: string;
  reach?: number;
  /** Cơ sở do người gửi khai báo (kiểm tra trước) */
  facilityId?: number | null;
  facilityName?: string;
  licenseNumber?: string;
}

export interface MatchedRule {
  type: string;
  phrase: string;
  score: number;
  detail?: string;
}

export interface AnalysisResult {
  modelCode: string;
  modelId: number | null;
  label: 'VIOLATION' | 'SUSPECTED' | 'NO_VIOLATION';
  confidence: number;
  violationTypes: string[];
  typeScores: Record<string, number>;
  matchedRules: MatchedRule[];
  extracted: {
    facilityNames: string[];
    phones: string[];
    urls: string[];
    licenseNumbers: string[];
    doctorNames: string[];
    techniques: string[];
    claims: string[];
    matchedFacility: null | {
      id: number;
      code: string;
      name: string;
      operatingStatus: string;
      matchedBy: string;
      score: number;
    };
    licenseChecks: { number: string; status: string; detail: string }[];
    doctorChecks: { name: string; status: string; detail: string }[];
  };
  legalRefs: { id: number; code: string; documentNumber: string; title: string; legalBasis?: string }[];
  severity: string;
  field: string;
  adSubject: string;
  suspicionLevel: string;
  isMedicalRelated: boolean;
  priorityScore: number;
  explanation: string;
  processingMs: number;
}

/** [mẫu không dấu, điểm, nhãn hiển thị] */
type Rule = [RegExp, number, string];

const RULES: Record<string, Rule[]> = {
  FALSE_CLAIM: [
    [/khoi han/, 0.55, 'khỏi hẳn'],
    [/khoi (?:benh )?100|100 ?% ?khoi/, 0.6, 'khỏi 100%'],
    [/dut diem/, 0.6, 'dứt điểm'],
    [/cam ket/, 0.45, 'cam kết'],
    [/hieu qua 100|100 ?% ?hieu qua/, 0.65, 'hiệu quả 100%'],
    [/tot nhat|so 1 (?:viet nam|thanh pho)|hang dau/, 0.35, 'tốt nhất / số 1'],
    [/than duoc|than duoc/, 0.7, 'thần dược'],
    [/than ky|ky dieu/, 0.5, 'thần kỳ'],
    [/an toan tuyet doi|tuyet doi an toan/, 0.6, 'an toàn tuyệt đối'],
    [/khong (?:co )?tac dung phu/, 0.6, 'không tác dụng phụ'],
    [/vinh vien/, 0.45, 'vĩnh viễn'],
    [/bao hanh tron doi/, 0.5, 'bảo hành trọn đời'],
    [/chi sau (?:1|mot) (?:lan|lieu trinh|buoi)/, 0.5, 'chỉ sau 1 lần'],
    [/giam \d+ ?kg/, 0.6, 'giảm ... kg'],
    [/tre ra \d+ tuoi/, 0.5, 'trẻ ra ... tuổi'],
    [/dieu tri tan goc|chua tan goc/, 0.55, 'điều trị tận gốc'],
    [/khong tai phat/, 0.5, 'không tái phát'],
  ],
  UNLICENSED_DRUG_AD: [
    [/thuoc ke don/, 0.6, 'thuốc kê đơn'],
    [/khang sinh/, 0.45, 'kháng sinh'],
    [/thuoc giam can/, 0.55, 'thuốc giảm cân'],
    [/thuoc tang can/, 0.5, 'thuốc tăng cân'],
    [/corticoid/, 0.5, 'corticoid'],
    [/ban thuoc online|ship thuoc|giao thuoc tan nha/, 0.45, 'bán thuốc online'],
    [/thuoc dac tri|thuoc gia truyen|bai thuoc gia truyen/, 0.55, 'thuốc đặc trị / gia truyền'],
  ],
  MISSING_ORIGIN: [
    [/xach tay/, 0.5, 'hàng xách tay'],
    [/khong ro nguon goc|khong nguon goc/, 0.6, 'không rõ nguồn gốc'],
  ],
};

/** Kỹ thuật chuyên môn: [mẫu không dấu, tên hiển thị, xâm lấn?] */
const TECHNIQUES: [RegExp, string, boolean][] = [
  [/nang mui/, 'nâng mũi', true],
  [/nang nguc/, 'nâng ngực', true],
  [/hut mo/, 'hút mỡ', true],
  [/cat mi/, 'cắt mí', true],
  [/tiem filler|filler/, 'tiêm filler', true],
  [/botox/, 'tiêm botox', true],
  [/tiem tan mo/, 'tiêm tan mỡ', true],
  [/cay chi/, 'cấy chỉ', true],
  [/phau thuat/, 'phẫu thuật', true],
  [/cay ghep implant|implant/, 'cấy ghép implant', true],
  [/nieng rang/, 'niềng răng', false],
  [/boc rang su|boc su/, 'bọc răng sứ', false],
  [/nho rang/, 'nhổ răng', false],
  [/tay trang rang/, 'tẩy trắng răng', false],
  [/sieu am/, 'siêu âm', false],
  [/noi soi/, 'nội soi', false],
  [/xet nghiem/, 'xét nghiệm', false],
  [/benh tri\b|cat tri\b/, 'điều trị bệnh trĩ', true],
  [/pha thai/, 'phá thai', true],
  [/triet long|laser/, 'laser / triệt lông', false],
  [/phun xam/, 'phun xăm thẩm mỹ', false],
];

const MEDICAL_WORDS =
  /thuoc|benh|bac si|phong kham|benh vien|nha khoa|tham my|kham|chua|dieu tri|y te|duoc|suc khoe|giam can|rang|da lieu|spa|tiem|phau thuat|implant|thuc pham chuc nang|vien uong/;

const SEV_RANK: Record<string, number> = { LOW: 1, MEDIUM: 2, HIGH: 3 };

@Injectable()
export class AiAnalyzerService {
  private readonly logger = new Logger('AI');
  constructor(
    @InjectRepository(Facility) private readonly facilities: Repository<Facility>,
    @InjectRepository(License) private readonly licenses: Repository<License>,
    @InjectRepository(ViolationType) private readonly vtypes: Repository<ViolationType>,
    @InjectRepository(AiModel) private readonly models: Repository<AiModel>,
    private readonly params: ParamsService,
    private readonly config: ConfigService,
  ) {}

  async analyze(input: AnalyzeInput): Promise<AnalysisResult> {
    const started = Date.now();
    const raw = `${input.title ?? ''}\n${input.text ?? ''}`;
    const norm = normalizeText(raw);
    const rules: MatchedRule[] = [];
    const add = (type: string, phrase: string, score: number, detail?: string) =>
      rules.push({ type, phrase, score, detail });

    // ---------- 1. Bộ luật từ khóa ----------
    const claims: string[] = [];
    for (const [type, list] of Object.entries(RULES)) {
      for (const [re, score, label] of list) {
        if (re.test(norm)) {
          add(type, label, score);
          if (type === 'FALSE_CLAIM') claims.push(label);
        }
      }
    }

    // ---------- 2. Trích xuất thực thể (NER) ----------
    const facilityNames = extractFacilityNames(raw);
    if (input.facilityName && !facilityNames.includes(input.facilityName)) facilityNames.unshift(input.facilityName);
    const phones = extractPhones(raw);
    const urls = [...new Set([...extractUrls(raw), ...(input.sourceUrl ? [input.sourceUrl] : [])])];
    const licenseNumbers = extractLicenseNumbers(raw);
    if (input.licenseNumber && !licenseNumbers.includes(input.licenseNumber)) licenseNumbers.unshift(input.licenseNumber);
    const doctorNames = extractDoctorNames(raw);
    const techniques = TECHNIQUES.filter(([re]) => re.test(norm));

    // ---------- 3. Đối chiếu cơ sở KCB ----------
    const allFacilities = await this.facilities.find({ where: { isActive: true } });
    let matched: AnalysisResult['extracted']['matchedFacility'] = null;
    const setMatch = (f: Facility, by: string, score: number) => {
      if (!matched || score > matched.score)
        matched = { id: f.id, code: f.code, name: f.name, operatingStatus: f.operatingStatus, matchedBy: by, score };
    };
    if (input.facilityId) {
      const f = allFacilities.find((x) => x.id === Number(input.facilityId));
      if (f) setMatch(f, 'Khai báo của người gửi', 1);
    }
    for (const ln of licenseNumbers) {
      const f = allFacilities.find((x) => normalizeText(x.licenseNumber) === normalizeText(ln));
      if (f) setMatch(f, `Số giấy phép ${ln}`, 0.99);
    }
    const domains = [...urls, input.authorAccount ?? ''].map(domainOf).filter(Boolean);
    for (const f of allFacilities) {
      if (f.website && domains.includes(domainOf(f.website))) setMatch(f, `Website ${f.website}`, 0.95);
      for (const n of facilityNames) {
        const s = matchScore(n, f.name, 0.6);
        if (s >= 0.8) setMatch(f, `Tên "${n}"`, s);
      }
    }
    const m = matched as AnalysisResult['extracted']['matchedFacility'];

    if (!m && facilityNames.length) {
      add(
        'UNLICENSED_OPERATION',
        facilityNames[0],
        0.65,
        `"${facilityNames[0]}" không có trong CSDL cơ sở được cấp phép`,
      );
    }
    if (m && m.operatingStatus !== 'ACTIVE') {
      add(
        'UNLICENSED_OPERATION',
        m.name,
        0.85,
        `Cơ sở đang ở trạng thái ${m.operatingStatus === 'SUSPENDED' ? 'TẠM ĐÌNH CHỈ' : 'RÚT GIẤY PHÉP'}`,
      );
    }

    // ---------- 4. Phạm vi chuyên môn ----------
    const fullFacility = m ? allFacilities.find((f) => f.id === m.id) : undefined;
    const licensedNorm = (fullFacility?.licensedTechniques ?? []).map(normalizeText);
    for (const [re, label, invasive] of techniques) {
      if (fullFacility) {
        const ok = licensedNorm.some((t) => re.test(t) || t.includes(normalizeText(label)));
        if (!ok) add('OUT_OF_SCOPE', label, 0.75, `"${label}" không có trong danh mục kỹ thuật được cấp phép của ${fullFacility.name}`);
      } else if (invasive) {
        add('UNLICENSED_OPERATION', label, 0.55, `Quảng cáo kỹ thuật xâm lấn "${label}" nhưng không xác định được cơ sở được cấp phép`);
      }
    }

    // ---------- 5. Giấy phép nêu trong quảng cáo ----------
    const today = todayLocal();
    const licenseChecks: AnalysisResult['extracted']['licenseChecks'] = [];
    for (const ln of licenseNumbers) {
      const lic = await this.licenses
        .createQueryBuilder('l')
        .where('LOWER(l.licenseNumber) = LOWER(:ln)', { ln })
        .getOne();
      if (!lic) {
        licenseChecks.push({ number: ln, status: 'NOT_FOUND', detail: 'Không có trong CSDL giấy phép' });
        add('FAKE_LICENSE', ln, 0.7, `Số giấy phép ${ln} không tồn tại trong CSDL`);
      } else if (lic.status !== 'ACTIVE' || (lic.expiryDate && lic.expiryDate < today)) {
        licenseChecks.push({ number: ln, status: 'EXPIRED', detail: 'Giấy phép hết hiệu lực / bị vô hiệu hóa' });
        add('FAKE_LICENSE', ln, 0.6, `Giấy phép ${ln} đã hết hiệu lực`);
      } else if (m && lic.facilityId && lic.facilityId !== m.id) {
        licenseChecks.push({ number: ln, status: 'MISMATCH', detail: 'Giấy phép thuộc cơ sở khác' });
        add('FAKE_LICENSE', ln, 0.6, `Giấy phép ${ln} không thuộc ${m.name}`);
      } else {
        licenseChecks.push({ number: ln, status: 'VALID', detail: `Hợp lệ (${lic.licenseType})` });
      }
    }

    // ---------- 6. Bác sĩ nêu tên trong quảng cáo ----------
    const doctorChecks: AnalysisResult['extracted']['doctorChecks'] = [];
    if (doctorNames.length) {
      const cchn = await this.licenses.find({ where: { licenseType: 'CCHN' } });
      for (const name of doctorNames) {
        let best: License | undefined;
        let bestScore = 0;
        for (const l of cchn) {
          const s = matchScore(name, l.holderName ?? '', 0.6);
          if (s > bestScore) [best, bestScore] = [l, s];
        }
        if (!best || bestScore < 0.85) {
          doctorChecks.push({ name, status: 'NOT_FOUND', detail: 'Không có chứng chỉ hành nghề trong CSDL' });
          add('UNAUTHORIZED_DOCTOR', name, 0.5, `Bác sĩ "${name}" không có CCHN trong CSDL`);
        } else if (best.status !== 'ACTIVE' || (best.expiryDate && best.expiryDate < today)) {
          doctorChecks.push({ name, status: 'EXPIRED', detail: `CCHN ${best.licenseNumber} hết hiệu lực` });
          add('UNAUTHORIZED_DOCTOR', name, 0.55, `CCHN của bác sĩ "${name}" đã hết hiệu lực`);
        } else if (m && best.facilityId && best.facilityId !== m.id) {
          doctorChecks.push({ name, status: 'OTHER_FACILITY', detail: 'Đăng ký hành nghề tại cơ sở khác' });
          add('UNAUTHORIZED_DOCTOR', name, 0.4, `Bác sĩ "${name}" đăng ký hành nghề tại cơ sở khác`);
        } else {
          doctorChecks.push({ name, status: 'VALID', detail: `CCHN ${best.licenseNumber}` });
        }
      }
    }

    // ---------- 7. Giấy xác nhận nội dung quảng cáo ----------
    const isPromo = /uu dai|giam gia|khuyen mai|giam \d+ ?%|dang ky ngay|lien he/.test(norm);
    if (fullFacility && isPromo && (techniques.length || claims.length)) {
      const xn = await this.licenses
        .createQueryBuilder('l')
        .where('l.facilityId = :id AND l.licenseType = :t AND l.status = :s', { id: fullFacility.id, t: 'XNQC', s: 'ACTIVE' })
        .andWhere('(l.expiryDate IS NULL OR l.expiryDate >= :today)', { today })
        .getCount();
      if (!xn) add('NO_AD_CONFIRMATION', fullFacility.name, 0.35, 'Cơ sở chưa có giấy xác nhận nội dung quảng cáo còn hiệu lực');
    }

    // ---------- 8. Tổng hợp điểm ----------
    const typeScores: Record<string, number> = {};
    for (const r of rules) typeScores[r.type] = 1 - (1 - (typeScores[r.type] ?? 0)) * (1 - r.score);
    let confidence = 1 - Object.values(typeScores).reduce((acc, p) => acc * (1 - p), 1);
    confidence = Math.min(0.99, Math.round(confidence * 1000) / 1000);
    let violationTypes = Object.entries(typeScores)
      .filter(([, p]) => p >= 0.3)
      .sort((a, b) => b[1] - a[1])
      .map(([t]) => t);

    let explanationExtra = '';
    const external = await this.callExternal(raw);
    if (external) {
      confidence = external.confidence ?? confidence;
      if (external.violationTypes?.length) violationTypes = external.violationTypes;
      explanationExtra = external.explanation ? `\nMô hình ngoài: ${external.explanation}` : '';
    }

    const vt = await this.vtypes.find({ where: { isActive: true }, relations: { legalDocument: true } });
    const used = vt.filter((t) => violationTypes.includes(t.code));
    const severity = used.reduce((s, t) => (SEV_RANK[t.severity] > SEV_RANK[s] ? t.severity : s), 'LOW');
    const legalRefs = used
      .filter((t) => t.legalDocument && t.legalDocument.status === 'ACTIVE')
      .map((t) => ({
        id: t.legalDocument!.id,
        code: t.legalDocument!.code,
        documentNumber: t.legalDocument!.documentNumber,
        title: t.legalDocument!.title,
        legalBasis: t.legalBasis,
      }))
      .filter((r, i, arr) => arr.findIndex((x) => x.id === r.id) === i);

    const violTh = await this.params.num('AI_VIOLATION_THRESHOLD', 0.7);
    const suspTh = await this.params.num('AI_SUSPECT_THRESHOLD', 0.4);
    const label = confidence >= violTh ? 'VIOLATION' : confidence >= suspTh ? 'SUSPECTED' : 'NO_VIOLATION';
    if (label === 'NO_VIOLATION') violationTypes = violationTypes.filter((t) => (typeScores[t] ?? 0) >= 0.5);

    // ---------- 9. Phân loại tin ----------
    const field = /nha khoa|implant|rang/.test(norm)
      ? 'NHA_KHOA'
      : /nang mui|nang nguc|tham my|filler|botox|hut mo|spa|tre hoa|cat mi/.test(norm)
        ? 'THAM_MY'
        : /thuc pham chuc nang|vien uong/.test(norm)
          ? 'TPCN'
          : /thuoc|duoc/.test(norm)
            ? 'DUOC_PHAM'
            : /phong kham|benh vien|kham|chua|dieu tri|benh/.test(norm)
              ? 'KHAM_CHUA_BENH'
              : 'KHAC';
    const adSubject = typeScores.UNLICENSED_DRUG_AD
      ? 'THUOC'
      : facilityNames.length || m
        ? 'CO_SO_KCB'
        : techniques.length
          ? 'DICH_VU'
          : 'KHAC';
    const suspicionLevel = confidence >= violTh ? 'HIGH' : confidence >= suspTh ? 'MEDIUM' : 'LOW';
    const isMedicalRelated = MEDICAL_WORDS.test(norm);

    const sevNorm = { LOW: 0.33, MEDIUM: 0.66, HIGH: 1 }[severity] ?? 0.33;
    const reachNorm = Math.min(1, Math.log10(1 + (input.reach ?? 0)) / 5);
    const priorityScore = Math.round(100 * (0.6 * confidence + 0.25 * (violationTypes.length ? sevNorm : 0) + 0.15 * reachNorm));

    const model = await this.models.findOne({ where: { code: 'AI-VD-RULES' } });
    const explanation = rules.length
      ? 'Căn cứ phát hiện:\n' +
        rules.map((r) => `- [${r.type}] ${r.detail ?? `Cụm từ "${r.phrase}"`} (điểm ${r.score})`).join('\n') +
        explanationExtra
      : 'Không phát hiện dấu hiệu vi phạm theo bộ luật hiện tại.' + explanationExtra;

    return {
      modelCode: model?.code ?? 'AI-VD-RULES',
      modelId: model?.id ?? null,
      label,
      confidence,
      violationTypes,
      typeScores,
      matchedRules: rules,
      extracted: {
        facilityNames,
        phones,
        urls,
        licenseNumbers,
        doctorNames,
        techniques: techniques.map(([, l]) => l),
        claims,
        matchedFacility: m,
        licenseChecks,
        doctorChecks,
      },
      legalRefs,
      severity: violationTypes.length ? severity : 'LOW',
      field,
      adSubject,
      suspicionLevel,
      isMedicalRelated,
      priorityScore,
      explanation,
      processingMs: Date.now() - started,
    };
  }

  /**
   * Gọi mô hình AI bên ngoài (nếu cấu hình AI_SERVICE_URL).
   * API cần nhận POST {text} và trả {confidence:number, violationTypes:string[], explanation?:string}
   */
  private async callExternal(text: string): Promise<null | { confidence?: number; violationTypes?: string[]; explanation?: string }> {
    const url = this.config.get<string>('AI_SERVICE_URL');
    if (!url) return null;
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 8000);
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
        signal: ctrl.signal,
      });
      clearTimeout(t);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.json()) as any;
    } catch (e) {
      this.logger.warn(`AI_SERVICE_URL lỗi, dùng bộ luật tích hợp: ${(e as Error).message}`);
      return null;
    }
  }
}
