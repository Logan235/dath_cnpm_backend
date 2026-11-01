// =====================================================================
// MODULE QUẢN LÝ THÔNG TIN VI PHẠM (tiếp) — kiểm tra trước, đối tượng vi phạm,
// hồ sơ phối hợp điều tra, thống kê báo cáo, tra cứu công khai
// =====================================================================
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import {
  AdItem,
  CaseUpdate,
  Facility,
  FacilityFeedback,
  InvestigationCase,
  License,
  PenaltyDecision,
  PlatformAccount,
  PrecheckRequest,
  Suspect,
  SuspectMatchCandidate,
  Violation,
} from '../entities';
import { Actor, hasPermission } from '../common/auth';
import { AuditService, NotificationService, ParamsService, RiskService } from '../core/core.services';
import { SuspectMatchingService } from '../core/violation-intake.service';
import { AiAnalyzerService } from '../ai/ai-analyzer.service';
import { applySearch, paginate } from '../common/utils/paging';
import { makeCode, matchScore, normalizeText } from '../common/utils/text';
import { createAdItems } from '../ad-processing/ad-intake';
import { CASE_STATUS, LABELS, ROLE, VIOLATION_STATUS as VS } from '../common/constants';
import * as D from './violations.dto';
import { todayLocal } from '../common/utils/date';

const RECOMMEND: Record<string, string> = {
  FALSE_CLAIM: 'Bỏ các cụm từ cam kết / tuyệt đối / thổi phồng công dụng (VD "khỏi hẳn", "100%", "không tác dụng phụ", "tốt nhất").',
  OUT_OF_SCOPE: 'Chỉ quảng cáo các kỹ thuật có trong danh mục kỹ thuật được cấp phép của cơ sở.',
  UNLICENSED_OPERATION: 'Cơ sở phải có giấy phép hoạt động còn hiệu lực và không bị đình chỉ trước khi quảng cáo.',
  FAKE_LICENSE: 'Kiểm tra lại số giấy phép nêu trong quảng cáo — chỉ sử dụng số giấy phép hợp lệ, còn hiệu lực của chính cơ sở.',
  UNAUTHORIZED_DOCTOR: 'Chỉ nêu tên / hình ảnh bác sĩ có chứng chỉ hành nghề hợp lệ, đăng ký hành nghề tại cơ sở và đã đồng ý.',
  UNLICENSED_DRUG_AD: 'Không quảng cáo thuốc kê đơn / thuốc chưa được cấp phép quảng cáo.',
  MISSING_ORIGIN: 'Ghi rõ nguồn gốc, xuất xứ sản phẩm; không dùng hàng "xách tay", không rõ nguồn gốc.',
  NO_AD_CONFIRMATION: 'Nộp hồ sơ xin xác nhận nội dung quảng cáo dịch vụ y tế (Thông tư 09/2015/TT-BYT) trước khi đăng.',
};
const HARD_FAIL = ['UNLICENSED_OPERATION', 'FAKE_LICENSE', 'UNLICENSED_DRUG_AD'];

// ---------------------------------------------------------------------
// Kiểm tra trước thông tin quảng cáo (Mục 12.4.2.1 — 5 bước)
// ---------------------------------------------------------------------
@Injectable()
export class PrecheckService {
  constructor(
    @InjectRepository(PrecheckRequest) private readonly repo: Repository<PrecheckRequest>,
    @InjectRepository(Facility) private readonly facilities: Repository<Facility>,
    @InjectRepository(License) private readonly licenses: Repository<License>,
    @InjectRepository(Violation) private readonly violations: Repository<Violation>,
    private readonly ai: AiAnalyzerService,
    private readonly params: ParamsService,
    private readonly notify: NotificationService,
    private readonly audit: AuditService,
  ) {}

  async create(dto: D.CreatePrecheckDto, actor: Actor | null) {
    // Bước 1: tiếp nhận nội dung + thông tin người gửi
    const submitterType = !actor ? 'ANONYMOUS' : actor.role === ROLE.FACILITY ? 'FACILITY' : actor.role === ROLE.CITIZEN || !actor.role ? 'CITIZEN' : 'STAFF';
    const facilityId = submitterType === 'FACILITY' ? actor!.facilityId : null;
    const own = facilityId ? await this.facilities.findOne({ where: { id: facilityId } }) : null;

    // Bước 2: AI trích xuất thông tin (NER) + phát hiện dấu hiệu
    const r = await this.ai.analyze({
      text: dto.contentText,
      sourceUrl: dto.contentUrl,
      facilityId,
      facilityName: dto.facilityName || own?.name,
      licenseNumber: dto.licenseNumber || own?.licenseNumber,
    });
    const m = r.extracted.matchedFacility;
    const facility = m ? await this.facilities.findOne({ where: { id: m.id } }) : null;

    // Bước 3: đối chiếu với CSDL
    const checks: { check: string; passed: boolean | null; detail: string; severity: 'BLOCK' | 'WARN' }[] = [];
    const add = (check: string, passed: boolean | null, detail: string, severity: 'BLOCK' | 'WARN' = 'BLOCK') => checks.push({ check, passed, detail, severity });
    add('Cơ sở có trong CSDL cơ sở KCB được cấp phép', !!facility, facility ? `${facility.name} (${facility.code}) — khớp theo ${m!.matchedBy}` : 'Không tìm thấy cơ sở trong CSDL');
    if (facility) {
      add('Cơ sở đang hoạt động (không bị đình chỉ / rút giấy phép)', facility.operatingStatus === 'ACTIVE', LABELS.facilityOperatingStatus[facility.operatingStatus]);
      const gphd = await this.licenses.findOne({ where: { facilityId: facility.id, licenseType: 'GPHD' } });
      const today = todayLocal();
      const gphdOk = !!gphd && gphd.status === 'ACTIVE' && (!gphd.expiryDate || gphd.expiryDate >= today);
      add('Giấy phép hoạt động còn hiệu lực', gphdOk, gphd ? `${gphd.licenseNumber} (${gphd.status}${gphd.expiryDate ? `, hết hạn ${gphd.expiryDate}` : ''})` : 'Không có GPHĐ trong CSDL');
      if (dto.facilityName) {
        const s = matchScore(dto.facilityName, facility.name);
        add('Tên cơ sở khai báo khớp CSDL', s >= 0.8, `"${dto.facilityName}" ~ "${facility.name}" (${s})`, 'WARN');
      }
      if (dto.representative && facility.representative) {
        const s = matchScore(dto.representative, facility.representative);
        add('Người đại diện khai báo khớp CSDL', s >= 0.7, `"${dto.representative}" ~ "${facility.representative}" (${s})`, 'WARN');
      }
      const openV = await this.violations.count({ where: { facilityId: facility.id, status: In([VS.NEW, VS.PROCESSING, VS.TRANSFERRED, VS.PENDING_APPROVAL, VS.PENALIZED]) } });
      add('Lịch sử vi phạm của cơ sở', openV === 0, openV ? `Có ${openV} hồ sơ vi phạm đang xử lý` : 'Không có hồ sơ vi phạm đang xử lý', 'WARN');
    }
    for (const c of r.extracted.licenseChecks) add(`Giấy phép nêu trong quảng cáo: ${c.number}`, c.status === 'VALID', c.detail);
    const techniques = r.extracted.techniques;
    if (techniques.length) {
      const out = r.matchedRules.filter((x) => x.type === 'OUT_OF_SCOPE').map((x) => x.phrase);
      add('Kỹ thuật quảng cáo nằm trong phạm vi được cấp phép', facility ? !out.length : null, facility ? (out.length ? `Ngoài phạm vi: ${out.join(', ')}` : `Hợp lệ: ${techniques.join(', ')}`) : 'Không xác định được cơ sở để đối chiếu');
    }
    for (const d of r.extracted.doctorChecks) add(`Bác sĩ "${d.name}" có CCHN hợp lệ tại cơ sở`, d.status === 'VALID', d.detail);
    const claims = r.matchedRules.filter((x) => x.type === 'FALSE_CLAIM');
    add('Không có cam kết / tuyên bố sai sự thật', !claims.length, claims.length ? `Cụm từ: ${claims.map((x) => x.phrase).join(', ')}` : 'Không phát hiện');
    const drug = r.matchedRules.filter((x) => x.type === 'UNLICENSED_DRUG_AD');
    if (drug.length) add('Không quảng cáo thuốc chưa được phép', false, drug.map((x) => x.phrase).join(', '));
    if (facility) {
      const noConfirm = r.matchedRules.some((x) => x.type === 'NO_AD_CONFIRMATION');
      add('Có giấy xác nhận nội dung quảng cáo còn hiệu lực', !noConfirm, noConfirm ? 'Chưa có / đã hết hạn' : 'Có hoặc không bắt buộc', 'WARN');
    }
    const applicable = checks.filter((c) => c.passed !== null);
    const matchingRate = applicable.length ? Math.round((applicable.filter((c) => c.passed).length / applicable.length) * 1000) / 1000 : 0;

    // Bước 4: chấm điểm rủi ro + phân loại Đạt / Cảnh báo / Không đạt
    const blockFails = checks.filter((c) => c.passed === false && c.severity === 'BLOCK').length;
    let riskScore = Math.round(r.confidence * 70 + (1 - matchingRate) * 20 + Math.min(blockFails, 3) * 5);
    riskScore = Math.max(0, Math.min(100, riskScore));
    const warnMin = await this.params.num('PRECHECK_WARNING_MIN_RISK', 31);
    const failMin = await this.params.num('PRECHECK_FAIL_MIN_RISK', 71);
    let aiResult = riskScore >= failMin ? 'FAIL' : riskScore >= warnMin ? 'WARNING' : 'PASS';
    if (r.violationTypes.some((t) => HARD_FAIL.includes(t))) aiResult = 'FAIL';
    if (aiResult === 'PASS' && checks.some((c) => c.passed === false)) aiResult = 'WARNING';
    const reasons = [
      ...checks.filter((c) => c.passed === false).map((c) => ({ check: c.check, detail: c.detail })),
      ...r.matchedRules.map((x) => ({ check: LABELS.aiLabel[r.label], detail: x.detail ?? `Cụm từ "${x.phrase}"`, type: x.type })),
    ];
    const recommendations = r.violationTypes.map((t) => RECOMMEND[t]).filter(Boolean);
    if (!recommendations.length && aiResult === 'PASS') recommendations.push('Nội dung chưa phát hiện dấu hiệu vi phạm. Vẫn cần tuân thủ thủ tục xác nhận nội dung quảng cáo theo quy định.');

    // Bước 5: lưu lịch sử kiểm tra (liên kết hồ sơ cơ sở)
    const status = submitterType === 'FACILITY' ? 'PENDING_REVIEW' : 'AUTO_ASSESSED';
    let p = await this.repo.save(
      this.repo.create({
        submitterId: actor?.userId ?? null,
        submitterType,
        submitterName: dto.submitterName || actor?.fullName,
        submitterContact: dto.submitterContact || actor?.email,
        facilityId: facility?.id ?? null,
        facilityNameInput: dto.facilityName,
        licenseNumberInput: dto.licenseNumber,
        representativeInput: dto.representative,
        contentText: dto.contentText,
        contentUrl: dto.contentUrl,
        attachments: dto.attachments ?? [],
        extracted: { ...r.extracted, violationTypes: r.violationTypes, confidence: r.confidence, legalRefs: r.legalRefs },
        checks,
        matchingRate,
        riskScore,
        aiResult,
        reasons,
        recommendations,
        status,
        finalResult: status === 'AUTO_ASSESSED' ? aiResult : null,
      }),
    );
    p.code = makeCode('KT', p.id);
    await this.repo.update(p.id, { code: p.code });
    if (status === 'PENDING_REVIEW') {
      await this.notify.toRoles([ROLE.SPECIALIST], { title: `Phiếu kiểm tra trước ${p.code} chờ xác minh`, message: `${facility?.name ?? dto.facilityName ?? ''}: kết quả sơ bộ ${LABELS.precheckResult[aiResult]}`, type: 'TASK', entityType: 'precheck', entityId: p.id });
    }
    await this.audit.log(actor, { action: 'PRECHECK', module: 'VIOLATION', entityType: 'precheck', entityId: p.id, description: `Kiểm tra trước ${p.code}: ${LABELS.precheckResult[aiResult]} (rủi ro ${riskScore})` });

    return {
      id: p.id,
      code: p.code,
      status,
      statusLabel: LABELS.precheckStatus[status],
      result: aiResult,
      resultLabel: LABELS.precheckResult[aiResult],
      riskScore,
      matchingRate,
      steps: {
        '1_tiep_nhan': { submitterType, facility: facility ? { id: facility.id, name: facility.name } : null, submittedAt: p.createdAt },
        '2_ai_trich_xuat': r.extracted,
        '3_doi_chieu_csdl': checks,
        '4_ket_qua': { aiResult, riskScore, matchingRate, violationTypes: r.violationTypes, reasons, recommendations, legalRefs: r.legalRefs },
        '5_luu_lich_su': { code: p.code, note: status === 'PENDING_REVIEW' ? 'Đã gửi chuyên viên Sở Y tế xác minh kết quả cuối cùng' : 'Kết quả sơ bộ do AI đánh giá — tra cứu lại bằng mã phiếu' },
      },
      next: submitterType === 'FACILITY' ? 'Không đồng ý kết quả: gửi giải trình POST /facility-feedbacks với precheckId' : undefined,
    };
  }

  async get(id: number, actor: Actor) {
    const p = await this.repo.findOne({ where: { id }, relations: { facility: true } });
    if (!p) throw new NotFoundException('Không tìm thấy phiếu kiểm tra');
    const own = p.submitterId === actor.userId || (!!actor.facilityId && p.facilityId === actor.facilityId && actor.role === ROLE.FACILITY);
    if (!own && !hasPermission(actor, 'precheck.review')) throw new ForbiddenException('Không có quyền xem phiếu này');
    return p;
  }

  async lookup(code: string) {
    const p = await this.repo.findOne({ where: { code } });
    if (!p) throw new NotFoundException('Không tìm thấy phiếu kiểm tra');
    return {
      code: p.code,
      createdAt: p.createdAt,
      status: p.status,
      statusLabel: LABELS.precheckStatus[p.status],
      aiResult: p.aiResult,
      finalResult: p.finalResult,
      finalResultLabel: p.finalResult ? LABELS.precheckResult[p.finalResult] : null,
      riskScore: p.riskScore,
      reasons: p.reasons,
      recommendations: p.recommendations,
      reviewNote: p.reviewNote,
    };
  }

  mine(actor: Actor, q: D.PrecheckQueryDto) {
    const qb = this.repo.createQueryBuilder('p').leftJoinAndSelect('p.facility', 'f').orderBy('p.createdAt', 'DESC');
    if (actor.role === ROLE.FACILITY && actor.facilityId) qb.where('(p.submitterId = :u OR p.facilityId = :f)', { u: actor.userId, f: actor.facilityId });
    else qb.where('p.submitterId = :u', { u: actor.userId });
    return paginate(qb, q);
  }

  list(q: D.PrecheckQueryDto) {
    const qb = this.repo.createQueryBuilder('p').leftJoinAndSelect('p.facility', 'f').orderBy('p.createdAt', 'DESC');
    if (q.status) qb.andWhere('p.status = :s', { s: q.status });
    if (q.result) qb.andWhere('COALESCE(p.finalResult, p.aiResult) = :r', { r: q.result });
    if (q.facilityId) qb.andWhere('p.facilityId = :fid', { fid: q.facilityId });
    if (q.submitterType) qb.andWhere('p.submitterType = :st', { st: q.submitterType });
    applySearch(qb, q.search, ['p.code', 'p.contentText', 'p.facilityNameInput', 'f.name']);
    return paginate(qb, q);
  }

  /** Chuyên viên xác minh và đưa ra kết quả cuối cùng */
  async review(id: number, dto: D.ReviewPrecheckDto, actor: Actor) {
    const p = await this.repo.findOne({ where: { id } });
    if (!p) throw new NotFoundException('Không tìm thấy phiếu kiểm tra');
    if (p.status === 'REVIEWED') throw new BadRequestException('Phiếu đã được xác minh');
    Object.assign(p, { status: 'REVIEWED', finalResult: dto.finalResult, reviewNote: dto.reviewNote, reviewerId: actor.userId, reviewedAt: new Date() });
    await this.repo.save(p);
    if (p.submitterId) {
      await this.notify.toUsers([p.submitterId], { title: `Kết quả kiểm tra trước ${p.code}: ${LABELS.precheckResult[dto.finalResult]}`, message: dto.reviewNote, type: dto.finalResult === 'PASS' ? 'INFO' : 'WARNING', entityType: 'precheck', entityId: id });
    }
    await this.audit.log(actor, { action: 'REVIEW', module: 'VIOLATION', entityType: 'precheck', entityId: id, description: `Xác minh phiếu ${p.code}: ${LABELS.precheckResult[dto.finalResult]} (AI: ${LABELS.precheckResult[p.aiResult]})` });
    return p;
  }
}

// ---------------------------------------------------------------------
// Đối tượng vi phạm (Entity Profiling) — Cán bộ an ninh mạng
// ---------------------------------------------------------------------
@Injectable()
export class SuspectsService {
  constructor(
    @InjectRepository(Suspect) private readonly repo: Repository<Suspect>,
    @InjectRepository(PlatformAccount) private readonly accounts: Repository<PlatformAccount>,
    @InjectRepository(SuspectMatchCandidate) private readonly candidates: Repository<SuspectMatchCandidate>,
    @InjectRepository(Violation) private readonly violations: Repository<Violation>,
    @InjectRepository(AdItem) private readonly adItems: Repository<AdItem>,
    @InjectRepository(InvestigationCase) private readonly cases: Repository<InvestigationCase>,
    private readonly ds: DataSource,
    private readonly matching: SuspectMatchingService,
    private readonly risk: RiskService,
    private readonly audit: AuditService,
  ) {}

  list(q: D.SuspectQueryDto) {
    const qb = this.repo.createQueryBuilder('s').leftJoinAndSelect('s.accounts', 'a');
    if (q.status) qb.andWhere('s.status = :st', { st: q.status });
    if (q.riskLevel) qb.andWhere('s.riskLevel = :rl', { rl: q.riskLevel });
    if (q.search) {
      qb.andWhere('(s.name ILIKE :kw OR s.code ILIKE :kw OR s.taxCode ILIKE :kw OR s.normalizedName ILIKE :kwn OR s.phones::text ILIKE :kw OR a.platformUid ILIKE :kw)', {
        kw: `%${q.search}%`,
        kwn: `%${normalizeText(q.search)}%`,
      });
    }
    if (q.sort === 'violations') qb.orderBy('s.violationCount', 'DESC');
    else if (q.sort === 'recent') qb.orderBy('s.updatedAt', 'DESC');
    else qb.orderBy('s.riskScore', 'DESC').addOrderBy('s.id', 'ASC');
    return paginate(qb, q);
  }

  async get(id: number) {
    const s = await this.repo.findOne({ where: { id }, relations: { accounts: true, facility: true } });
    if (!s) throw new NotFoundException('Không tìm thấy đối tượng');
    const violations = await this.violations.find({ where: { suspectId: id }, relations: { types: true }, order: { detectedAt: 'ASC' } });
    const cases = await this.cases.find({ where: { suspectId: id }, order: { createdAt: 'DESC' } });
    const pending = await this.candidates.find({ where: { suspectId: id, status: 'PENDING' } });
    const risk = await this.risk.compute(violations);
    return {
      ...s,
      riskBreakdown: risk.breakdown,
      timeline: violations.map((v) => ({ id: v.id, code: v.code, title: v.title, detectedAt: v.detectedAt, status: v.status, types: (v.types ?? []).map((t) => t.code), evidence: v.evidence, contentUrl: v.contentUrl })),
      cases,
      pendingCandidates: pending,
    };
  }

  async create(dto: D.CreateSuspectDto, actor: Actor) {
    if (dto.taxCode && (await this.repo.findOne({ where: { taxCode: dto.taxCode } }))) throw new ConflictException('Mã số thuế đã tồn tại');
    const { accounts, ...rest } = dto;
    const s = await this.matching.createSuspect({ names: [dto.name], phones: dto.phones ?? [], urls: dto.websites ?? [], accounts: accounts ?? [] }, actor, { ...rest });
    await this.audit.log(actor, { action: 'CREATE', module: 'VIOLATION', entityType: 'suspect', entityId: s.id, description: `Tạo hồ sơ đối tượng ${s.code}` });
    return this.get(s.id);
  }

  async update(id: number, dto: D.UpdateSuspectDto, actor: Actor) {
    const s = await this.repo.findOne({ where: { id } });
    if (!s) throw new NotFoundException('Không tìm thấy đối tượng');
    if (dto.taxCode && dto.taxCode !== s.taxCode && (await this.repo.findOne({ where: { taxCode: dto.taxCode } }))) throw new ConflictException('Mã số thuế đã tồn tại');
    Object.assign(s, dto);
    if (dto.name) s.normalizedName = normalizeText(dto.name);
    await this.repo.save(s);
    await this.audit.log(actor, { action: 'UPDATE', module: 'VIOLATION', entityType: 'suspect', entityId: id, metadata: dto });
    return this.get(id);
  }

  async addAccount(id: number, dto: D.AccountDto, actor: Actor) {
    await this.get(id);
    const exists = await this.accounts.findOne({ where: { platform: dto.platform, platformUid: dto.platformUid } });
    if (exists) throw new ConflictException(`Tài khoản đã thuộc đối tượng #${exists.suspectId}`);
    const a = await this.accounts.save(this.accounts.create({ ...dto, suspectId: id }));
    await this.audit.log(actor, { action: 'CREATE', module: 'VIOLATION', entityType: 'suspect', entityId: id, description: `Thêm tài khoản ${dto.platform}/${dto.platformUid}` });
    return a;
  }

  async verifyAccount(accountId: number, actor: Actor) {
    const a = await this.accounts.findOne({ where: { id: accountId } });
    if (!a) throw new NotFoundException('Không tìm thấy tài khoản');
    Object.assign(a, { isVerified: true, verifiedBy: actor.userId, verifiedAt: new Date() });
    await this.audit.log(actor, { action: 'VERIFY', module: 'VIOLATION', entityType: 'suspect', entityId: a.suspectId, description: `Xác minh chính chủ tài khoản ${a.platform}/${a.platformUid}` });
    return this.accounts.save(a);
  }

  async removeAccount(accountId: number, actor: Actor) {
    const a = await this.accounts.findOne({ where: { id: accountId } });
    if (!a) throw new NotFoundException('Không tìm thấy tài khoản');
    await this.accounts.delete(accountId);
    await this.audit.log(actor, { action: 'DELETE', module: 'VIOLATION', entityType: 'suspect', entityId: a.suspectId, description: `Gỡ tài khoản ${a.platform}/${a.platformUid}` });
    return { deleted: true };
  }

  async setStatus(id: number, dto: D.VerifySuspectDto, actor: Actor) {
    const s = await this.repo.findOne({ where: { id } });
    if (!s) throw new NotFoundException('Không tìm thấy đối tượng');
    s.status = dto.status;
    if (dto.note) s.notes = [s.notes, `[${todayLocal()}] ${dto.note}`].filter(Boolean).join('\n');
    await this.repo.save(s);
    await this.audit.log(actor, { action: 'STATUS_CHANGE', module: 'VIOLATION', entityType: 'suspect', entityId: id, description: `Đối tượng ${s.code}: ${LABELS.suspectStatus[dto.status]}` });
    return s;
  }

  /** Gộp hồ sơ trùng (chống lẩn tránh bằng nhiều tên / tài khoản) */
  async merge(id: number, targetId: number, actor: Actor) {
    if (id === targetId) throw new BadRequestException('Không thể gộp vào chính nó');
    const src = await this.repo.findOne({ where: { id } });
    const dst = await this.repo.findOne({ where: { id: targetId } });
    if (!src || !dst) throw new NotFoundException('Không tìm thấy đối tượng');
    await this.ds.transaction(async (m) => {
      await m.update(PlatformAccount, { suspectId: id }, { suspectId: targetId });
      await m.update(Violation, { suspectId: id }, { suspectId: targetId });
      await m.update(InvestigationCase, { suspectId: id }, { suspectId: targetId });
      await m.query('UPDATE penalty_decisions SET suspect_id = $1 WHERE suspect_id = $2', [targetId, id]);
      await m.delete(SuspectMatchCandidate, { suspectId: id });
      dst.phones = [...new Set([...(dst.phones ?? []), ...(src.phones ?? [])])];
      dst.emails = [...new Set([...(dst.emails ?? []), ...(src.emails ?? [])])];
      dst.websites = [...new Set([...(dst.websites ?? []), ...(src.websites ?? [])])];
      dst.notes = [dst.notes, `Gộp từ ${src.code} (${src.name})`].filter(Boolean).join('\n');
      await m.save(dst);
      await m.delete(Suspect, id);
    });
    await this.risk.recalcSuspect(targetId);
    await this.audit.log(actor, { action: 'MERGE', module: 'VIOLATION', entityType: 'suspect', entityId: targetId, description: `Gộp đối tượng ${src.code} vào ${dst.code}` });
    return this.get(targetId);
  }

  /** AI khoanh vùng đối tượng từ một hồ sơ vi phạm */
  async detect(violationId: number, actor: Actor) {
    const v = await this.violations.findOne({ where: { id: violationId } });
    if (!v) throw new NotFoundException('Không tìm thấy hồ sơ vi phạm');
    if (v.suspectId) return { action: 'ALREADY_LINKED', suspect: await this.get(v.suspectId) };
    const item = v.adItemId ? await this.adItems.findOne({ where: { id: v.adItemId } }) : null;
    return this.matching.detectForViolation(v, item, actor);
  }

  listCandidates(q: D.ListQueryDto & { status?: string }) {
    const qb = this.candidates.createQueryBuilder('c').leftJoinAndSelect('c.suspect', 's').orderBy('c.score', 'DESC');
    qb.where('c.status = :st', { st: q.status || 'PENDING' });
    return paginate(qb, q);
  }

  async confirmCandidate(id: number, actor: Actor) {
    const c = await this.candidates.findOne({ where: { id }, relations: { suspect: true } });
    if (!c || c.status !== 'PENDING') throw new NotFoundException('Không tìm thấy ứng viên đang chờ');
    if (c.violationId) await this.violations.update(c.violationId, { suspectId: c.suspectId });
    await this.matching.mergeIdentifiers(c.suspect!, c.extractedIdentifiers);
    await this.candidates.update(id, { status: 'MERGED', reviewedBy: actor.userId, reviewedAt: new Date() });
    if (c.violationId) await this.candidates.update({ violationId: c.violationId, status: 'PENDING' }, { status: 'REJECTED', reviewedBy: actor.userId, reviewedAt: new Date() });
    await this.risk.recalcSuspect(c.suspectId);
    await this.audit.log(actor, { action: 'MATCH_MERGE', module: 'VIOLATION', entityType: 'violation', entityId: c.violationId, description: `Cán bộ xác nhận khớp đối tượng ${c.suspect?.code} (điểm ${c.score})` });
    return this.get(c.suspectId);
  }

  /** Từ chối khớp (dữ liệu này là phản hồi cho mô hình đối soát). createNew: tạo đối tượng mới cho vi phạm */
  async rejectCandidate(id: number, createNew: boolean, actor: Actor) {
    const c = await this.candidates.findOne({ where: { id } });
    if (!c || c.status !== 'PENDING') throw new NotFoundException('Không tìm thấy ứng viên đang chờ');
    await this.candidates.update(id, { status: 'REJECTED', reviewedBy: actor.userId, reviewedAt: new Date() });
    let created: Suspect | null = null;
    if (createNew && c.violationId) {
      const left = await this.candidates.count({ where: { violationId: c.violationId, status: 'PENDING' } });
      if (!left) {
        created = await this.matching.createSuspect(c.extractedIdentifiers, actor);
        await this.violations.update(c.violationId, { suspectId: created.id });
        await this.risk.recalcSuspect(created.id);
      }
    }
    await this.audit.log(actor, { action: 'MATCH_REJECT', module: 'VIOLATION', entityType: 'violation', entityId: c.violationId, description: `Từ chối khớp ứng viên #${c.suspectId}` });
    return { rejected: id, createdSuspect: created };
  }

  async dashboard() {
    const [k] = await this.ds.query(`
      SELECT (SELECT count(*) FROM suspects)::int AS "totalEntities",
             (SELECT count(*) FROM suspects WHERE risk_score > 70)::int AS "highRiskEntities",
             (SELECT count(*) FROM violations WHERE facility_id IS NULL AND suspect_id IS NULL AND status NOT IN ('DISMISSED','RESOLVED'))::int AS "violationsPendingIdentification",
             (SELECT count(*) FROM suspect_match_candidates WHERE status = 'PENDING')::int AS "matchCandidatesPending",
             (SELECT count(*) FROM investigation_cases WHERE status IN ('TRANSFERRED','INVESTIGATING','IDENTIFIED'))::int AS "openCases"`);
    const heatmap = await this.ds.query(`
      SELECT COALESCE(f.district, 'Chưa xác định') AS district, count(*)::int AS violations
      FROM violations v LEFT JOIN facilities f ON f.id = v.facility_id
      WHERE v.status <> 'DISMISSED' GROUP BY 1 ORDER BY 2 DESC`);
    const top = await this.repo.find({ order: { riskScore: 'DESC' }, take: 10 });
    return { kpi: k, violationHeatmapByDistrict: heatmap, topRiskEntities: top };
  }
}

// ---------------------------------------------------------------------
// Hồ sơ phối hợp điều tra (Bảng 12.3 — 7 bước)
// ---------------------------------------------------------------------
@Injectable()
export class CasesService {
  constructor(
    @InjectRepository(InvestigationCase) private readonly repo: Repository<InvestigationCase>,
    @InjectRepository(CaseUpdate) private readonly updates: Repository<CaseUpdate>,
    @InjectRepository(Violation) private readonly violations: Repository<Violation>,
    @InjectRepository(Suspect) private readonly suspects: Repository<Suspect>,
    private readonly matching: SuspectMatchingService,
    private readonly risk: RiskService,
    private readonly notify: NotificationService,
    private readonly audit: AuditService,
  ) {}

  /** Hồ sơ gửi Công an: chỉ cán bộ an ninh mạng xử lý; hồ sơ gửi Sở TT&TT: chuyên viên Sở Y tế cập nhật kết quả */
  private assertHandle(c: InvestigationCase, actor: Actor) {
    const ok = c.targetAgency === 'CYBER_POLICE' ? hasPermission(actor, 'case.handle') : hasPermission(actor, 'case.handle') || hasPermission(actor, 'violation.manage');
    if (!ok) throw new ForbiddenException('Bạn không có quyền xử lý hồ sơ phối hợp này');
  }

  private async log(c: InvestigationCase, actor: Actor, action: string, note?: string) {
    await this.updates.save(this.updates.create({ caseId: c.id, authorId: actor.userId, authorRole: actor.role, action, note }));
  }

  list(q: D.CaseQueryDto, actor: Actor) {
    const qb = this.repo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.violation', 'v')
      .leftJoinAndSelect('c.suspect', 's')
      .leftJoin('c.assignedOfficer', 'o')
      .addSelect(['o.id', 'o.fullName'])
      .orderBy('c.transferredAt', 'DESC');
    if (actor.role === ROLE.CYBER_POLICE) qb.andWhere("c.targetAgency = 'CYBER_POLICE'");
    if (q.status) qb.andWhere('c.status IN (:...st)', { st: q.status.split(',') });
    if (q.targetAgency) qb.andWhere('c.targetAgency = :ag', { ag: q.targetAgency });
    if (q.assignedTo === 'me') qb.andWhere('c.assignedOfficerId = :me', { me: actor.userId });
    applySearch(qb, q.search, ['c.code', 'v.code', 'v.title', 's.name']);
    return paginate(qb, q);
  }

  async get(id: number, actor: Actor) {
    const c = await this.repo.findOne({
      where: { id },
      relations: { violation: { types: true, facility: true, adItem: true }, suspect: { accounts: true }, assignedOfficer: true, updates: true },
    });
    if (!c) throw new NotFoundException('Không tìm thấy hồ sơ phối hợp');
    if (actor.role === ROLE.CYBER_POLICE && c.targetAgency !== 'CYBER_POLICE') throw new ForbiddenException('Hồ sơ không thuộc cơ quan của bạn');
    c.updates = (c.updates ?? []).sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt));
    return { ...c, assignedOfficer: c.assignedOfficer ? { id: c.assignedOfficer.id, fullName: c.assignedOfficer.fullName } : null, statusLabel: LABELS.caseStatus[c.status] };
  }

  private async load(id: number) {
    const c = await this.repo.findOne({ where: { id }, relations: { violation: true } });
    if (!c) throw new NotFoundException('Không tìm thấy hồ sơ phối hợp');
    return c;
  }

  private notifyRequester(c: InvestigationCase, title: string, message?: string) {
    return this.notify.toUsers([c.requestedBy], { title, message, type: 'INFO', entityType: 'investigation_case', entityId: c.id });
  }

  async accept(id: number, actor: Actor) {
    const c = await this.load(id);
    this.assertHandle(c, actor);
    if (c.status !== CASE_STATUS.TRANSFERRED) throw new BadRequestException('Hồ sơ không ở trạng thái chờ tiếp nhận');
    Object.assign(c, { status: CASE_STATUS.INVESTIGATING, assignedOfficerId: actor.userId, acceptedAt: new Date() });
    delete (c as any).violation;
    await this.repo.save(c);
    await this.log(c, actor, 'ACCEPT', 'Tiếp nhận hồ sơ, bắt đầu điều tra xác minh');
    await this.notifyRequester(c, `Hồ sơ ${c.code} đã được tiếp nhận`, `Cán bộ thụ lý: ${actor.fullName}`);
    await this.audit.log(actor, { action: 'ACCEPT', module: 'VIOLATION', entityType: 'violation', entityId: c.violationId, description: `${LABELS.caseAgency[c.targetAgency]} tiếp nhận hồ sơ ${c.code}` });
    return this.get(id, actor);
  }

  async addUpdate(id: number, dto: D.CaseNoteDto, actor: Actor) {
    const c = await this.load(id);
    if (!(hasPermission(actor, 'case.handle') || hasPermission(actor, 'violation.manage'))) throw new ForbiddenException('Không có quyền');
    if (c.status === CASE_STATUS.CLOSED) throw new BadRequestException('Hồ sơ đã lưu trữ');
    await this.log(c, actor, dto.action || 'NOTE', dto.note);
    return this.get(id, actor);
  }

  /** Xác minh được đối tượng (gắn đối tượng có sẵn hoặc tạo mới) */
  async identify(id: number, dto: D.IdentifyDto, actor: Actor) {
    const c = await this.load(id);
    this.assertHandle(c, actor);
    if (![CASE_STATUS.INVESTIGATING, CASE_STATUS.IDENTIFIED].includes(c.status as any)) throw new BadRequestException('Phải tiếp nhận hồ sơ trước');
    let suspect: Suspect | null = null;
    if (dto.suspectId) {
      suspect = await this.suspects.findOne({ where: { id: dto.suspectId } });
      if (!suspect) throw new BadRequestException('Đối tượng không tồn tại');
    } else if (dto.newSuspect) {
      const { accounts, ...rest } = dto.newSuspect;
      suspect = await this.matching.createSuspect({ names: [rest.name], phones: rest.phones ?? [], urls: rest.websites ?? [], accounts: accounts ?? [] }, actor, rest);
    } else {
      throw new BadRequestException('Cần suspectId hoặc newSuspect');
    }
    suspect.status = 'VERIFIED';
    await this.suspects.save(suspect);
    Object.assign(c, { status: CASE_STATUS.IDENTIFIED, suspectId: suspect.id, findings: dto.findings });
    delete (c as any).violation;
    await this.repo.save(c);
    await this.violations.update(c.violationId, { suspectId: suspect.id });
    await this.risk.recalcSuspect(suspect.id);
    await this.log(c, actor, 'IDENTIFY', `Xác định đối tượng ${suspect.code} - ${suspect.name}. ${dto.findings}`);
    await this.notifyRequester(c, `Hồ sơ ${c.code}: đã xác định đối tượng`, `${suspect.name}`);
    await this.audit.log(actor, { action: 'IDENTIFY', module: 'VIOLATION', entityType: 'violation', entityId: c.violationId, description: `Xác định đối tượng ${suspect.code}` });
    return this.get(id, actor);
  }

  /** Hoàn tất xử lý, cập nhật kết quả về hệ thống (bước 5-6) */
  async complete(id: number, dto: D.CompleteCaseDto, actor: Actor) {
    const c = await this.load(id);
    this.assertHandle(c, actor);
    if (![CASE_STATUS.INVESTIGATING, CASE_STATUS.IDENTIFIED].includes(c.status as any)) throw new BadRequestException('Hồ sơ chưa được tiếp nhận / đã hoàn tất');
    Object.assign(c, { status: CASE_STATUS.HANDLED, outcome: dto.outcome, resultSummary: dto.resultSummary, handlingMeasures: dto.handlingMeasures ?? null, completedAt: new Date() });
    delete (c as any).violation;
    await this.repo.save(c);
    const v = await this.violations.findOne({ where: { id: c.violationId } });
    if (v && v.status === VS.TRANSFERRED) {
      if (dto.closeViolation) {
        await this.violations.update(v.id, { status: VS.RESOLVED, resolvedAt: new Date(), handlingNote: [v.handlingNote, `Cơ quan phối hợp đã xử lý: ${dto.resultSummary}`].filter(Boolean).join('\n') });
      } else {
        await this.violations.update(v.id, { status: VS.PROCESSING, handlingNote: [v.handlingNote, `Kết quả phối hợp: ${dto.resultSummary}`].filter(Boolean).join('\n') });
      }
      await this.risk.recalcMany([v.facilityId], [v.suspectId]);
    }
    await this.log(c, actor, 'COMPLETE', `${dto.outcome}: ${dto.resultSummary}`);
    await this.notifyRequester(c, `Hồ sơ ${c.code} đã có kết quả phối hợp`, dto.resultSummary);
    await this.audit.log(actor, { action: 'COMPLETE', module: 'VIOLATION', entityType: 'violation', entityId: c.violationId, description: `Kết quả phối hợp ${c.code}: ${dto.resultSummary}` });
    return this.get(id, actor);
  }

  async returnCase(id: number, reason: string, actor: Actor) {
    const c = await this.load(id);
    this.assertHandle(c, actor);
    if (![CASE_STATUS.TRANSFERRED, CASE_STATUS.INVESTIGATING].includes(c.status as any)) throw new BadRequestException('Không thể trả hồ sơ ở trạng thái này');
    Object.assign(c, { status: CASE_STATUS.RETURNED, outcome: 'RETURNED', resultSummary: reason, completedAt: new Date() });
    delete (c as any).violation;
    await this.repo.save(c);
    await this.violations.update({ id: c.violationId, status: VS.TRANSFERRED }, { status: VS.PROCESSING });
    await this.log(c, actor, 'RETURN', reason);
    await this.notifyRequester(c, `Hồ sơ ${c.code} bị trả lại`, reason);
    await this.audit.log(actor, { action: 'RETURN', module: 'VIOLATION', entityType: 'violation', entityId: c.violationId, description: `Trả hồ sơ ${c.code}: ${reason}` });
    return this.get(id, actor);
  }

  async close(id: number, actor: Actor) {
    const c = await this.load(id);
    if (!(hasPermission(actor, 'case.handle') || hasPermission(actor, 'violation.manage'))) throw new ForbiddenException('Không có quyền');
    if (![CASE_STATUS.HANDLED, CASE_STATUS.RETURNED].includes(c.status as any)) throw new BadRequestException('Chỉ lưu trữ hồ sơ đã có kết quả / đã trả');
    Object.assign(c, { status: CASE_STATUS.CLOSED, closedAt: new Date() });
    delete (c as any).violation;
    await this.repo.save(c);
    await this.log(c, actor, 'CLOSE', 'Lưu trữ hồ sơ điều tra');
    return this.get(id, actor);
  }
}

// ---------------------------------------------------------------------
// Thống kê, báo cáo, việc cần làm
// ---------------------------------------------------------------------
@Injectable()
export class StatisticsService {
  constructor(private readonly ds: DataSource) {}

  private range(q: D.StatsQueryDto, col: string, params: any[]) {
    const w: string[] = [];
    if (q.from) (params.push(q.from), w.push(`${col} >= $${params.length}`));
    if (q.to) (params.push(q.to), w.push(`${col} < ($${params.length}::date + interval '1 day')`));
    return w.length ? ' AND ' + w.join(' AND ') : '';
  }

  async overview(q: D.StatsQueryDto) {
    const p1: any[] = [];
    const rv = this.range(q, 'v.detected_at', p1);
    const p2: any[] = [];
    const ra = this.range(q, 'a.collected_at', p2);
    const g = (sql: string, params: any[]) => this.ds.query(sql, params);
    const [totals] = await g(
      `SELECT count(*)::int AS total,
              count(*) FILTER (WHERE status NOT IN ('RESOLVED','DISMISSED'))::int AS open,
              count(*) FILTER (WHERE status = 'RESOLVED')::int AS resolved,
              count(*) FILTER (WHERE status = 'DISMISSED')::int AS dismissed,
              count(*) FILTER (WHERE severity = 'HIGH')::int AS high,
              ROUND(AVG(EXTRACT(EPOCH FROM (resolved_at - detected_at)) / 86400) FILTER (WHERE resolved_at IS NOT NULL)::numeric, 1)::float AS "avgDaysToResolve"
       FROM violations v WHERE 1=1 ${rv}`,
      p1,
    );
    return {
      violations: {
        totals,
        byStatus: await g(`SELECT status AS key, count(*)::int AS count FROM violations v WHERE 1=1 ${rv} GROUP BY 1 ORDER BY 2 DESC`, p1),
        bySeverity: await g(`SELECT severity AS key, count(*)::int AS count FROM violations v WHERE 1=1 ${rv} GROUP BY 1`, p1),
        bySource: await g(`SELECT source AS key, count(*)::int AS count FROM violations v WHERE 1=1 ${rv} GROUP BY 1`, p1),
        byType: await g(
          `SELECT t.code AS key, t.name, count(*)::int AS count FROM violations v JOIN violation_type_links l ON l.violation_id = v.id JOIN violation_types t ON t.id = l.violation_type_id WHERE v.status <> 'DISMISSED' ${rv} GROUP BY 1, 2 ORDER BY 3 DESC`,
          p1,
        ),
        byField: await g(`SELECT COALESCE(a.field, 'KHAC') AS key, count(*)::int AS count FROM violations v LEFT JOIN ad_items a ON a.id = v.ad_item_id WHERE v.status <> 'DISMISSED' ${rv} GROUP BY 1 ORDER BY 2 DESC`, p1),
        byDistrict: await g(`SELECT COALESCE(f.district, 'Chưa xác định') AS key, count(*)::int AS count FROM violations v LEFT JOIN facilities f ON f.id = v.facility_id WHERE v.status <> 'DISMISSED' ${rv} GROUP BY 1 ORDER BY 2 DESC`, p1),
        byMonth: await g(`SELECT to_char(date_trunc('month', v.detected_at), 'YYYY-MM') AS key, count(*)::int AS count FROM violations v WHERE v.detected_at > now() - interval '12 months' ${rv} GROUP BY 1 ORDER BY 1`, p1),
      },
      adItems: {
        byStatus: await g(`SELECT status AS key, count(*)::int AS count FROM ad_items a WHERE 1=1 ${ra} GROUP BY 1 ORDER BY 2 DESC`, p2),
        byPlatform: await g(`SELECT COALESCE(platform, 'KHAC') AS key, count(*)::int AS count FROM ad_items a WHERE 1=1 ${ra} GROUP BY 1 ORDER BY 2 DESC`, p2),
        byDay: await g(`SELECT to_char(date_trunc('day', a.collected_at), 'YYYY-MM-DD') AS key, count(*)::int AS count FROM ad_items a WHERE a.collected_at > now() - interval '30 days' ${ra} GROUP BY 1 ORDER BY 1`, p2),
      },
      penalties: (
        await g(`SELECT count(*)::int AS decisions, COALESCE(sum(fine_amount) FILTER (WHERE status = 'ISSUED'), 0)::bigint AS "totalFine", count(*) FILTER (WHERE status = 'PENDING_APPROVAL')::int AS pending FROM penalty_decisions`, [])
      )[0],
      prechecks: await g(`SELECT COALESCE(final_result, ai_result) AS key, count(*)::int AS count FROM precheck_requests GROUP BY 1`, []),
      topRiskFacilities: await g(`SELECT id, code, name, district, risk_score AS "riskScore", risk_level AS "riskLevel", violation_count AS "violationCount" FROM facilities WHERE risk_score > 0 ORDER BY risk_score DESC LIMIT 10`, []),
      generatedAt: new Date(),
    };
  }

  /** Việc cần làm của người đang đăng nhập (theo quyền) */
  async myTasks(actor: Actor) {
    const can = (p: string) => actor.permissions.includes(p);
    const n = async (sql: string, params: any[] = []) => (await this.ds.query(sql, params))[0].n as number;
    const out: Record<string, number> = {};
    out.unreadNotifications = await n('SELECT count(*)::int AS n FROM notifications WHERE user_id = $1 AND NOT is_read', [actor.userId]);
    if (can('ad_item.qc')) out.itemsWaitingQc = await n("SELECT count(*)::int AS n FROM ad_items WHERE status = 'COLLECTED'");
    if (can('review.submit')) {
      out.reviewQueue = await n("SELECT count(*)::int AS n FROM ad_items WHERE status IN ('AI_ANALYZED','IN_REVIEW','NEED_MORE_INFO')");
      out.assignedToMe = await n("SELECT count(*)::int AS n FROM ad_items WHERE assigned_to = $1 AND status = 'IN_REVIEW'", [actor.userId]);
    }
    if (can('review.resolve')) out.reviewConflicts = await n("SELECT count(*)::int AS n FROM ad_items WHERE status = 'CONFLICT'");
    if (can('violation.manage')) out.violationsToProcess = await n("SELECT count(*)::int AS n FROM violations WHERE status IN ('NEW','PROCESSING')");
    if (can('penalty.approve')) out.penaltiesPendingApproval = await n("SELECT count(*)::int AS n FROM penalty_decisions WHERE status = 'PENDING_APPROVAL'");
    if (can('feedback.handle')) out.feedbacksToHandle = await n("SELECT count(*)::int AS n FROM facility_feedbacks WHERE status IN ('RECEIVED','PROCESSING')");
    if (can('precheck.review')) out.prechecksToReview = await n("SELECT count(*)::int AS n FROM precheck_requests WHERE status = 'PENDING_REVIEW'");
    if (can('case.handle')) out.casesToHandle = await n("SELECT count(*)::int AS n FROM investigation_cases WHERE status IN ('TRANSFERRED','INVESTIGATING','IDENTIFIED')" + (actor.role === ROLE.CYBER_POLICE ? " AND target_agency = 'CYBER_POLICE'" : ''));
    if (can('suspect.manage')) out.matchCandidates = await n("SELECT count(*)::int AS n FROM suspect_match_candidates WHERE status = 'PENDING'");
    if (can('role_request.review')) out.roleRequestsPending = await n("SELECT count(*)::int AS n FROM role_requests WHERE status = 'PENDING'");
    if (actor.role === ROLE.FACILITY && actor.facilityId) {
      out.myOpenViolations = await n("SELECT count(*)::int AS n FROM violations WHERE facility_id = $1 AND status NOT IN ('RESOLVED','DISMISSED')", [actor.facilityId]);
    }
    return out;
  }
}

// ---------------------------------------------------------------------
// Tra cứu công khai (người dân) + cổng cơ sở KCB
// ---------------------------------------------------------------------
@Injectable()
export class PublicService {
  constructor(
    @InjectRepository(Facility) private readonly facilities: Repository<Facility>,
    @InjectRepository(License) private readonly licenses: Repository<License>,
    @InjectRepository(Violation) private readonly violations: Repository<Violation>,
    @InjectRepository(PenaltyDecision) private readonly penalties: Repository<PenaltyDecision>,
    @InjectRepository(AdItem) private readonly adItems: Repository<AdItem>,
    @InjectRepository(PrecheckRequest) private readonly prechecks: Repository<PrecheckRequest>,
    @InjectRepository(FacilityFeedback) private readonly feedbacks: Repository<FacilityFeedback>,
    private readonly ds: DataSource,
    private readonly audit: AuditService,
    private readonly notify: NotificationService,
  ) {}

  private trust(f: Facility, openViolations: number) {
    if (f.operatingStatus !== 'ACTIVE') return { trustLevel: 'KHONG_HOAT_DONG', trustLabel: 'Không được phép hoạt động' };
    if (f.isBlacklisted || f.riskLevel === 'HIGH') return { trustLevel: 'CANH_BAO', trustLabel: 'Cảnh báo: nhiều vi phạm' };
    if (openViolations || f.riskLevel === 'MEDIUM') return { trustLevel: 'CAN_LUU_Y', trustLabel: 'Cần lưu ý' };
    return { trustLevel: 'UY_TIN', trustLabel: 'Được cấp phép, không có vi phạm đang xử lý' };
  }

  /** Tra cứu cơ sở KCB được cấp phép (uy tín) */
  async facilitiesList(q: D.PublicFacilityQueryDto) {
    const qb = this.facilities.createQueryBuilder('f').leftJoinAndSelect('f.type', 't').where('f.isActive = true').orderBy('f.riskScore', 'ASC').addOrderBy('f.name', 'ASC');
    applySearch(qb, q.search, ['f.name', 'f.address', 'f.licenseNumber', 'f.code']);
    if (q.district) qb.andWhere('f.district ILIKE :d', { d: `%${q.district}%` });
    if (q.typeCode) qb.andWhere('t.code = :tc', { tc: q.typeCode });
    if (q.technique) qb.andWhere('f.licensedTechniques::text ILIKE :tq', { tq: `%${q.technique}%` });
    const res = await paginate(qb, q);
    const ids = res.data.map((f) => f.id);
    const open = ids.length
      ? await this.ds.query(`SELECT facility_id, count(*)::int AS n FROM violations WHERE facility_id = ANY($1) AND status NOT IN ('RESOLVED','DISMISSED') GROUP BY 1`, [ids])
      : [];
    return {
      ...res,
      data: res.data.map((f) => ({
        id: f.id,
        name: f.name,
        type: f.type?.name,
        address: f.address,
        district: f.district,
        phone: f.phone,
        website: f.website,
        licenseNumber: f.licenseNumber,
        professionalScope: f.professionalScope,
        workingHours: f.workingHours,
        licensedTechniques: f.licensedTechniques,
        operatingStatus: f.operatingStatus,
        ...this.trust(f, open.find((o: any) => o.facility_id === f.id)?.n ?? 0),
      })),
    };
  }

  async facilityDetail(id: number) {
    const f = await this.facilities.findOne({ where: { id, isActive: true }, relations: { type: true } });
    if (!f) throw new NotFoundException('Không tìm thấy cơ sở');
    const lic = await this.licenses.find({ where: { facilityId: id } });
    const today = todayLocal();
    const [{ n }] = await this.ds.query(`SELECT count(*)::int AS n FROM violations WHERE facility_id = $1 AND status NOT IN ('RESOLVED','DISMISSED')`, [id]);
    const confirmed = await this.violations.find({ where: { facilityId: id, status: In([VS.PENALIZED, VS.RESOLVED]) }, relations: { types: true }, order: { detectedAt: 'DESC' } });
    return {
      id: f.id,
      name: f.name,
      type: f.type?.name,
      address: f.address,
      district: f.district,
      phone: f.phone,
      website: f.website,
      representative: f.representative,
      professionalScope: f.professionalScope,
      workingHours: f.workingHours,
      licensedTechniques: f.licensedTechniques,
      operatingStatus: f.operatingStatus,
      ...this.trust(f, n),
      licenses: lic.filter((l) => l.licenseType === 'GPHD' || l.licenseType === 'XNQC').map((l) => ({ type: LABELS.licenseType[l.licenseType], number: l.licenseNumber, issuedDate: l.issuedDate, expiryDate: l.expiryDate, valid: l.status === 'ACTIVE' && (!l.expiryDate || l.expiryDate >= today) })),
      doctors: lic.filter((l) => l.licenseType === 'CCHN').map((l) => ({ name: l.holderName, title: l.holderTitle, certificate: l.licenseNumber, valid: l.status === 'ACTIVE' && (!l.expiryDate || l.expiryDate >= today) })),
      confirmedViolations: confirmed.map((v) => ({ code: v.code, detectedAt: v.detectedAt, types: (v.types ?? []).map((t) => t.name), status: LABELS.violationStatus[v.status] })),
    };
  }

  /** Tra cứu đơn vị vi phạm (chỉ công bố vi phạm đã có kết luận xử lý) */
  async violators(q: D.PublicViolatorQueryDto) {
    const params: any[] = [];
    const w: string[] = [`v.status IN ('PENALIZED','RESOLVED')`, `v.handling_result IN ('PENALTY','WARNING')`];
    const p = (val: any) => (params.push(val), `$${params.length}`);
    if (q.status) w.push(`v.status = ${p(q.status)}`);
    if (q.search) w.push(`(f.name ILIKE ${p(`%${q.search}%`)} OR f.address ILIKE $${params.length})`);
    if (q.licenseNumber) w.push(`f.license_number ILIKE ${p(`%${q.licenseNumber}%`)}`);
    if (q.district) w.push(`f.district ILIKE ${p(`%${q.district}%`)}`);
    if (q.typeCode) w.push(`EXISTS (SELECT 1 FROM violation_type_links l JOIN violation_types t ON t.id = l.violation_type_id WHERE l.violation_id = v.id AND t.code = ${p(q.typeCode)})`);
    if (q.from) w.push(`v.detected_at >= ${p(q.from)}`);
    if (q.to) w.push(`v.detected_at < (${p(q.to)}::date + interval '1 day')`);
    const page = Math.max(1, Number(q.page) || 1);
    const size = Math.min(100, Number(q.pageSize) || 20);
    const base = `FROM violations v JOIN facilities f ON f.id = v.facility_id WHERE ${w.join(' AND ')}`;
    const [{ total }] = await this.ds.query(`SELECT count(DISTINCT f.id)::int AS total ${base}`, params);
    const rows = await this.ds.query(
      `SELECT f.id, f.name, f.address, f.district, f.license_number AS "licenseNumber", f.operating_status AS "operatingStatus",
              f.risk_level AS "riskLevel", count(DISTINCT v.id)::int AS "violationCount", max(v.detected_at) AS "lastViolationAt",
              array_agg(DISTINCT t.name) FILTER (WHERE t.name IS NOT NULL) AS "violationTypes"
       ${base.replace('WHERE', 'LEFT JOIN violation_type_links l ON l.violation_id = v.id LEFT JOIN violation_types t ON t.id = l.violation_type_id WHERE')}
       GROUP BY f.id ORDER BY "violationCount" DESC, "lastViolationAt" DESC
       LIMIT ${size} OFFSET ${(page - 1) * size}`,
      params,
    );
    return { data: rows, total, page, pageSize: size };
  }

  /** Người dân phản ánh quảng cáo nghi vấn -> vào pipeline xử lý (bước kiểm tra nhanh QC) */
  async report(dto: D.CitizenReportDto, actor: Actor | null) {
    const [item] = await createAdItems(this.adItems, [{ content: dto.content, sourceUrl: dto.sourceUrl, platform: dto.platform, title: 'Phản ánh của người dân' }], {
      sourceType: 'CITIZEN_REPORT',
      reportedBy: actor?.userId ?? null,
      reporterName: dto.reporterName || actor?.fullName,
      reporterContact: dto.reporterContact || actor?.email,
    });
    await this.audit.log(actor, { action: 'REPORT', module: 'AD_PROCESSING', entityType: 'ad_item', entityId: item.id, description: `Người dân phản ánh quảng cáo ${item.code}` });
    await this.notify.toRoles([ROLE.SPECIALIST], { title: `Phản ánh mới từ người dân ${item.code}`, message: dto.content.slice(0, 120), type: 'TASK', entityType: 'ad_item', entityId: item.id });
    return { code: item.code, message: 'Cảm ơn bạn đã phản ánh. Sở Y tế sẽ kiểm tra nội dung này.', trackingNote: actor ? 'Theo dõi kết quả tại GET /public/reports/mine' : 'Đăng nhập để nhận thông báo kết quả' };
  }

  myReports(actor: Actor) {
    return this.adItems.find({ where: { reportedBy: actor.userId }, order: { createdAt: 'DESC' }, select: { id: true, code: true, content: true, sourceUrl: true, status: true, finalLabel: true, createdAt: true } }).then((rows) =>
      rows.map((r) => ({ ...r, statusLabel: LABELS.adStatus[r.status] })),
    );
  }

  // ----- Cổng cơ sở KCB -----
  private facilityOf(actor: Actor) {
    if (actor.role !== ROLE.FACILITY || !actor.facilityId) throw new ForbiddenException('Chức năng dành cho tài khoản cơ sở KCB');
    return actor.facilityId;
  }

  async portalProfile(actor: Actor) {
    const id = this.facilityOf(actor);
    const f = await this.facilities.findOne({ where: { id }, relations: { type: true, licenses: true } });
    return f;
  }

  async portalViolations(actor: Actor) {
    const id = this.facilityOf(actor);
    const list = await this.violations.find({ where: { facilityId: id }, relations: { types: true }, order: { detectedAt: 'DESC' } });
    const pens = list.length ? await this.penalties.find({ where: { violationId: In(list.map((v) => v.id)) } }) : [];
    return list.map((v) => ({
      id: v.id,
      code: v.code,
      title: v.title,
      contentUrl: v.contentUrl,
      detectedAt: v.detectedAt,
      severity: v.severity,
      status: v.status,
      statusLabel: LABELS.violationStatus[v.status],
      types: (v.types ?? []).map((t) => ({ code: t.code, name: t.name })),
      remediationStatus: v.remediationStatus,
      penalties: pens.filter((p) => p.violationId === v.id && p.status === 'ISSUED').map((p) => ({ id: p.id, decisionNumber: p.decisionNumber, fineAmount: p.fineAmount, dueDate: p.dueDate, executionStatus: p.executionStatus })),
    }));
  }

  async portalViolation(actor: Actor, vid: number) {
    const id = this.facilityOf(actor);
    const v = await this.violations.findOne({ where: { id: vid, facilityId: id }, relations: { types: { legalDocument: true } } });
    if (!v) throw new NotFoundException('Không tìm thấy hồ sơ');
    const feedbacks = await this.feedbacks.find({ where: { violationId: vid }, order: { createdAt: 'DESC' } });
    const pens = await this.penalties.find({ where: { violationId: vid, status: 'ISSUED' } });
    return { ...v, assignedTo: undefined, handlingNote: undefined, feedbacks, penalties: pens };
  }
}
