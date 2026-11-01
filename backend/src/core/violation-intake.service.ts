// =====================================================================
// LIÊN KẾT GIỮA "XỬ LÝ THÔNG TIN QC" VÀ "QUẢN LÝ THÔNG TIN VI PHẠM"
//  - Tạo hồ sơ vi phạm khi chuyên viên xác nhận mẫu tin vi phạm
//  - Đối soát đối tượng vi phạm (Entity Resolution, mục 12.13.1):
//      score > MATCH_AUTO_MERGE (0.9)          -> tự động gộp vào đối tượng có sẵn
//      MATCH_REVIEW_MIN (0.7) .. 0.9            -> đưa vào hàng đợi cán bộ kiểm tra
//      < 0.7                                    -> tạo hồ sơ đối tượng mới
// =====================================================================
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  AdItem,
  AiAnalysis,
  PlatformAccount,
  Suspect,
  SuspectMatchCandidate,
  Violation,
  ViolationType,
} from '../entities';
import { Actor } from '../common/auth';
import { AuditService, NotificationService, ParamsService, RiskService } from './core.services';
import {
  domainOf,
  extractFacilityNames,
  extractPhones,
  extractUrls,
  makeCode,
  matchScore,
  normalizeText,
  pad,
} from '../common/utils/text';

export interface Identifiers {
  names: string[];
  phones: string[];
  urls: string[];
  accounts: { platform: string; platformUid: string; displayName?: string; url?: string }[];
}

@Injectable()
export class SuspectMatchingService {
  constructor(
    @InjectRepository(Suspect) private readonly suspects: Repository<Suspect>,
    @InjectRepository(PlatformAccount) private readonly accounts: Repository<PlatformAccount>,
    @InjectRepository(SuspectMatchCandidate) private readonly candidates: Repository<SuspectMatchCandidate>,
    @InjectRepository(Violation) private readonly violations: Repository<Violation>,
    private readonly params: ParamsService,
    private readonly risk: RiskService,
    private readonly audit: AuditService,
  ) {}

  identifiersFrom(v: { content?: string | null; authorName?: string | null; authorAccount?: string | null; sourceUrl?: string | null; platform?: string | null }): Identifiers {
    const text = v.content ?? '';
    const names = extractFacilityNames(text);
    if (v.authorName && !names.some((n) => matchScore(n, v.authorName!) > 0.9)) names.push(v.authorName);
    const accounts: Identifiers['accounts'] = [];
    if (v.authorAccount && v.platform && !['WEBSITE', 'GOOGLE'].includes(v.platform)) {
      accounts.push({ platform: v.platform, platformUid: v.authorAccount, displayName: v.authorName ?? undefined, url: v.sourceUrl ?? undefined });
    }
    const urls = [...new Set([...extractUrls(text), ...(v.sourceUrl ? [v.sourceUrl] : [])])];
    return { names, phones: extractPhones(text), urls, accounts };
  }

  /** Điểm khớp giữa bộ định danh và 1 đối tượng có sẵn */
  scoreAgainst(ids: Identifiers, s: Suspect, accs: PlatformAccount[], beta: number): { score: number; reasons: string[] } {
    let score = 0;
    const reasons: string[] = [];
    for (const n of ids.names) {
      const sc = matchScore(n, s.name, beta);
      if (sc > score) score = sc;
      if (sc >= 0.7) reasons.push(`Tên "${n}" ~ "${s.name}" (${sc})`);
    }
    const phones = (s.phones ?? []).map(String);
    for (const p of ids.phones) {
      if (phones.includes(p)) {
        score = 1;
        reasons.push(`Trùng số điện thoại ${p}`);
      }
    }
    for (const a of ids.accounts) {
      if (accs.some((x) => x.suspectId === s.id && x.platform === a.platform && x.platformUid.toLowerCase() === a.platformUid.toLowerCase())) {
        score = 1;
        reasons.push(`Trùng tài khoản ${a.platform}/${a.platformUid}`);
      }
    }
    const sites = (s.websites ?? []).map(domainOf);
    for (const u of ids.urls) {
      if (sites.includes(domainOf(u))) {
        score = Math.max(score, 0.95);
        reasons.push(`Trùng website ${domainOf(u)}`);
      }
    }
    return { score: Math.round(score * 1000) / 1000, reasons };
  }

  async rank(ids: Identifiers) {
    const beta = await this.params.num('MATCH_BETA', 0.6);
    const list = await this.suspects.find({ where: { status: In(['MONITORING', 'UNDER_INVESTIGATION', 'VERIFIED']) } });
    const accs = list.length ? await this.accounts.find({ where: { suspectId: In(list.map((s) => s.id)) } }) : [];
    return list
      .map((s) => ({ suspect: s, ...this.scoreAgainst(ids, s, accs, beta) }))
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score);
  }

  /** Bổ sung SĐT, tài khoản, website mới vào hồ sơ đối tượng */
  async mergeIdentifiers(s: Suspect, ids: Identifiers) {
    s.phones = [...new Set([...(s.phones ?? []), ...ids.phones])];
    const webs = ids.urls.map(domainOf).filter((d) => !/facebook|tiktok|youtube|google|zalo|instagram/.test(d));
    s.websites = [...new Set([...(s.websites ?? []), ...webs])];
    await this.suspects.save(s);
    for (const a of ids.accounts) {
      const exists = await this.accounts.findOne({ where: { platform: a.platform, platformUid: a.platformUid } });
      if (!exists) await this.accounts.save(this.accounts.create({ ...a, suspectId: s.id }));
    }
  }

  async createSuspect(ids: Identifiers, actor: Actor | null, extra: Partial<Suspect> = {}) {
    const name =
      extra.name ||
      ids.names[0] ||
      (ids.phones[0] ? `Đối tượng chưa xác định (SĐT ${ids.phones[0]})` : ids.accounts[0] ? `Tài khoản ${ids.accounts[0].platformUid}` : 'Đối tượng chưa xác định');
    const s = await this.suspects.save(
      this.suspects.create({ ...extra, name, normalizedName: normalizeText(name), phones: [], emails: extra.emails ?? [], websites: [], status: 'MONITORING', createdBy: actor?.userId ?? null }),
    );
    s.code = `DT-${pad(s.id, 4)}`;
    await this.suspects.update(s.id, { code: s.code });
    await this.mergeIdentifiers(s, ids);
    return s;
  }

  /** AI khoanh vùng đối tượng đứng sau một hồ sơ vi phạm */
  async detectForViolation(violation: Violation, adItem: AdItem | null, actor: Actor | null) {
    const ids = this.identifiersFrom({
      content: violation.contentSnapshot ?? adItem?.content,
      authorName: adItem?.authorName,
      authorAccount: adItem?.authorAccount,
      sourceUrl: violation.contentUrl ?? adItem?.sourceUrl,
      platform: adItem?.platform,
    });
    const ranked = await this.rank(ids);
    const autoMerge = await this.params.num('MATCH_AUTO_MERGE', 0.9);
    const reviewMin = await this.params.num('MATCH_REVIEW_MIN', 0.7);
    const best = ranked[0];

    if (best && best.score > autoMerge) {
      await this.mergeIdentifiers(best.suspect, ids);
      await this.violations.update(violation.id, { suspectId: best.suspect.id });
      await this.risk.recalcSuspect(best.suspect.id);
      await this.audit.log(actor, { action: 'MATCH_MERGE', module: 'VIOLATION', entityType: 'violation', entityId: violation.id, description: `Tự động gộp vào đối tượng ${best.suspect.code} (điểm ${best.score})`, metadata: best.reasons });
      return { action: 'MERGED', suspect: best.suspect, score: best.score, reasons: best.reasons, identifiers: ids };
    }
    const reviewables = ranked.filter((r) => r.score >= reviewMin);
    if (reviewables.length) {
      const created: SuspectMatchCandidate[] = [];
      for (const r of reviewables.slice(0, 3)) {
        const exists = await this.candidates.findOne({ where: { violationId: violation.id, suspectId: r.suspect.id } });
        if (!exists) {
          created.push(
            await this.candidates.save(
              this.candidates.create({ violationId: violation.id, suspectId: r.suspect.id, extractedName: ids.names[0], extractedIdentifiers: ids, score: r.score, status: 'PENDING' }),
            ),
          );
        }
      }
      await this.audit.log(actor, { action: 'MATCH_QUEUE', module: 'VIOLATION', entityType: 'violation', entityId: violation.id, description: `Đưa ${created.length} ứng viên đối tượng vào hàng đợi kiểm tra` });
      return { action: 'CANDIDATES', candidates: reviewables.slice(0, 3).map((r) => ({ suspect: r.suspect, score: r.score, reasons: r.reasons })), identifiers: ids };
    }
    if (!ids.names.length && !ids.phones.length && !ids.accounts.length) {
      return { action: 'NO_IDENTIFIERS', identifiers: ids };
    }
    const s = await this.createSuspect(ids, actor);
    await this.violations.update(violation.id, { suspectId: s.id });
    await this.risk.recalcSuspect(s.id);
    await this.audit.log(actor, { action: 'CREATE', module: 'VIOLATION', entityType: 'suspect', entityId: s.id, description: `Tạo hồ sơ đối tượng mới ${s.code} từ vi phạm ${violation.code}` });
    return { action: 'CREATED', suspect: s, identifiers: ids };
  }
}

const SOURCE_MAP: Record<string, string> = {
  CRAWLER: 'CRAWLER',
  CITIZEN_REPORT: 'CITIZEN_REPORT',
  PRECHECK: 'PRECHECK',
  PARTNER: 'PARTNER',
  MANUAL: 'MANUAL',
};

@Injectable()
export class ViolationIntakeService {
  constructor(
    @InjectRepository(Violation) private readonly violations: Repository<Violation>,
    @InjectRepository(ViolationType) private readonly vtypes: Repository<ViolationType>,
    private readonly matching: SuspectMatchingService,
    private readonly risk: RiskService,
    private readonly notify: NotificationService,
    private readonly audit: AuditService,
  ) {}

  async typesByCodes(codes: string[]) {
    if (!codes?.length) return [];
    return this.vtypes.find({ where: { code: In(codes) } });
  }

  async assignCode(v: Violation) {
    v.code = makeCode('VP', v.id);
    await this.violations.update(v.id, { code: v.code });
    return v;
  }

  /** Sau khi chuyên viên xác nhận: tạo hồ sơ vi phạm từ mẫu tin */
  async fromAdItem(
    item: AdItem,
    analysis: AiAnalysis | null,
    opts: { typeCodes: string[]; severity?: string; conclusion?: string },
    actor: Actor,
  ) {
    const existing = await this.violations.findOne({ where: { adItemId: item.id } });
    if (existing) return existing;
    const types = await this.typesByCodes(opts.typeCodes);
    const sev = opts.severity || (types.some((t) => t.severity === 'HIGH') ? 'HIGH' : types.some((t) => t.severity === 'MEDIUM') ? 'MEDIUM' : 'LOW');
    const evidence = [
      ...(item.sourceUrl ? [{ type: 'URL', url: item.sourceUrl, note: 'Đường dẫn gốc' }] : []),
      ...(item.media ?? []).map((m: any) => ({ type: m.type ?? 'FILE', url: m.url, note: m.note })),
    ];
    let v = await this.violations.save(
      this.violations.create({
        title: item.title || item.content.slice(0, 150),
        adItemId: item.id,
        facilityId: item.facilityId ?? null,
        source: SOURCE_MAP[item.sourceType] ?? 'CRAWLER',
        contentSnapshot: item.content,
        contentUrl: item.sourceUrl,
        evidence,
        severity: sev,
        priority: item.priority,
        reach: (item.views || 0) + (item.shares || 0) * 10 + (item.likes || 0),
        aiConfidence: analysis?.confidence ?? null,
        aiModelCode: analysis?.model?.code ?? 'AI-VD-RULES',
        specialistConclusion: opts.conclusion,
        status: 'NEW',
        detectedAt: item.collectedAt ?? new Date(),
        createdBy: actor.userId,
        types,
      }),
    );
    v = await this.assignCode(v);
    let matching: any = null;
    if (!v.facilityId) matching = await this.matching.detectForViolation(v, item, actor);
    await this.risk.recalcFacility(v.facilityId);
    await this.audit.log(actor, { action: 'CREATE', module: 'VIOLATION', entityType: 'violation', entityId: v.id, description: `Lập hồ sơ vi phạm ${v.code} từ mẫu tin ${item.code}` });
    await this.notify.toFacility(v.facilityId, {
      title: 'Cơ sở có quảng cáo bị xác định vi phạm',
      message: `Hồ sơ ${v.code}: ${v.title}. Cơ sở có thể gửi giải trình tại mục Phản hồi.`,
      type: 'WARNING',
      entityType: 'violation',
      entityId: v.id,
    });
    if (sev === 'HIGH') {
      await this.notify.toRoles(['MANAGER'], { title: `Vi phạm nghiêm trọng mới: ${v.code}`, message: v.title, type: 'ALERT', entityType: 'violation', entityId: v.id });
    }
    return Object.assign(v, { matching });
  }
}
