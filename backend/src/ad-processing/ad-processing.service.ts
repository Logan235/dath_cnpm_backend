// =====================================================================
// MODULE QUẢN LÝ XỬ LÝ THÔNG TIN QUẢNG CÁO
// Pipeline mẫu tin (Bảng 8.4 & 8.5 báo cáo):
//   COLLECTED --(Kiểm tra nhanh QC: loại)----------------> QC_REJECTED
//   COLLECTED --(QC chuyển tiếp / Lọc tự động đạt)------> FILTERED
//   COLLECTED --(Lọc: trùng lặp / whitelist / không liên quan)-> FILTER_REJECTED
//   FILTERED  --(AI phân tích)--------------------------> AI_ANALYZED (vào hàng đợi chuyên viên)
//   AI_ANALYZED --(chuyên viên nhận việc)---------------> IN_REVIEW
//   IN_REVIEW --(đủ số đánh giá, thống nhất)------------> CONFIRMED_VIOLATION (tạo hồ sơ vi phạm) | NOT_VIOLATION
//   IN_REVIEW --(đánh giá khác nhau)--------------------> CONFLICT --(lãnh đạo quyết định)--> ...
//   ... --(yêu cầu bổ sung)----------------------------> NEED_MORE_INFO --(đánh giá lại)--> ...
// Mỗi kết luận của chuyên viên được lưu vào tập phản hồi tái huấn luyện AI.
// =====================================================================
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Not, Repository } from 'typeorm';
import {
  AdItem,
  AdReview,
  AiAnalysis,
  AiModel,
  AiTrainingFeedback,
  Facility,
  LegalDocument,
  License,
  User,
  Violation,
  WhitelistEntry,
} from '../entities';
import { Actor, hasPermission } from '../common/auth';
import { AuditService, NotificationService, ParamsService } from '../core/core.services';
import { AiAnalyzerService, AnalysisResult } from '../ai/ai-analyzer.service';
import { ViolationIntakeService } from '../core/violation-intake.service';
import { applySearch, paginate, toBool } from '../common/utils/paging';
import { contentHash, domainOf, normalizePhone, normalizeText } from '../common/utils/text';
import { AD_STATUS, LABELS } from '../common/constants';
import { createAdItems } from './ad-intake';
import * as D from './ad-processing.dto';
import { todayLocal } from '../common/utils/date';
import { QueueService } from '../queue/queue.service';

const REVIEWABLE = [AD_STATUS.AI_ANALYZED, AD_STATUS.IN_REVIEW, AD_STATUS.NEED_MORE_INFO] as string[];
const POSITIVE = ['VIOLATION', 'SUSPECTED'];

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h\d)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n')
    .trim();
}

@Injectable()
export class AdItemsService {
  private readonly logger = new Logger('Pipeline');
  constructor(
    @InjectRepository(AdItem) private readonly repo: Repository<AdItem>,
    @InjectRepository(AiAnalysis) private readonly analyses: Repository<AiAnalysis>,
    @InjectRepository(AdReview) private readonly reviews: Repository<AdReview>,
    @InjectRepository(WhitelistEntry) private readonly whitelist: Repository<WhitelistEntry>,
    @InjectRepository(Violation) private readonly violations: Repository<Violation>,
    @InjectRepository(License) private readonly licenses: Repository<License>,
    private readonly ds: DataSource,
    private readonly ai: AiAnalyzerService,
    private readonly params: ParamsService,
    private readonly audit: AuditService,
    private readonly queue: QueueService,
  ) {}

  list(q: D.AdItemQueryDto, actor: Actor) {
    const qb = this.repo
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.topic', 't')
      .leftJoinAndSelect('a.crawlSource', 'src')
      .leftJoinAndSelect('a.facility', 'f')
      .leftJoin('a.assignee', 'u')
      .addSelect(['u.id', 'u.fullName', 'u.email']);
    if (q.status) qb.andWhere('a.status IN (:...st)', { st: q.status.split(',').map((s) => s.trim()) });
    if (q.sourceType) qb.andWhere('a.sourceType = :stp', { stp: q.sourceType });
    if (q.platform) qb.andWhere('a.platform = :pf', { pf: q.platform });
    if (q.topicId) qb.andWhere('a.topicId = :tp', { tp: q.topicId });
    if (q.scheduleId) qb.andWhere('a.scheduleId = :sc', { sc: q.scheduleId });
    if (q.crawlJobId) qb.andWhere('a.crawlJobId = :cj', { cj: q.crawlJobId });
    if (q.facilityId) qb.andWhere('a.facilityId = :fc', { fc: q.facilityId });
    if (q.field) qb.andWhere('a.field = :fd', { fd: q.field });
    if (q.suspicionLevel) qb.andWhere('a.suspicionLevel = :sl', { sl: q.suspicionLevel });
    if (q.dataFormat) qb.andWhere('a.dataFormat = :df', { df: q.dataFormat });
    if (q.assignedTo === 'me') qb.andWhere('a.assignedTo = :me', { me: actor.userId });
    else if (q.assignedTo) qb.andWhere('a.assignedTo = :as', { as: q.assignedTo });
    if (q.from) qb.andWhere('a.collectedAt >= :from', { from: q.from });
    if (q.to) qb.andWhere("a.collectedAt < (:to::date + interval '1 day')", { to: q.to });
    applySearch(qb, q.search, ['a.code', 'a.title', 'a.content', 'a.authorName', 'a.sourceUrl']);
    if (q.sort === 'priority') qb.orderBy('a.priority', 'DESC').addOrderBy('a.collectedAt', 'DESC');
    else qb.orderBy('a.collectedAt', 'DESC').addOrderBy('a.id', 'DESC');
    return paginate(qb, q);
  }

  async get(id: string) {
    const a = await this.repo.findOne({
      where: { id },
      relations: { topic: true, crawlSource: true, schedule: true, crawlJob: true, facility: true, assignee: true },
    });
    if (!a) throw new NotFoundException('Không tìm thấy mẫu tin');
    const analyses = await this.analyses.find({ where: { adItemId: id }, relations: { model: true }, order: { createdAt: 'DESC' } });
    const reviews = await this.reviews.find({ where: { adItemId: id }, relations: { reviewer: true }, order: { createdAt: 'ASC' } });
    const violation = await this.violations.findOne({ where: { adItemId: id }, select: { id: true, code: true, status: true } });
    return {
      ...a,
      assignee: a.assignee ? { id: a.assignee.id, fullName: a.assignee.fullName, email: a.assignee.email } : null,
      statusLabel: LABELS.adStatus[a.status],
      latestAnalysis: analyses[0] ?? null,
      analyses,
      reviews: reviews.map((r) => ({ ...r, reviewer: r.reviewer ? { id: r.reviewer.id, fullName: r.reviewer.fullName, email: r.reviewer.email } : null })),
      violation,
    };
  }

  /** Nhận mẫu tin từ crawler bên ngoài / đơn vị phối hợp / nhập tay */
  async ingest(dto: D.IngestDto, actor: Actor) {
    const created = await createAdItems(this.repo, dto.items, {
      sourceType: dto.sourceType ?? 'CRAWLER',
      scheduleId: dto.scheduleId ?? null,
      crawlSourceId: dto.crawlSourceId ?? null,
      topicId: dto.topicId ?? null,
    });
    await this.audit.log(actor, { action: 'IMPORT', module: 'AD_PROCESSING', entityType: 'ad_item', description: `Tiếp nhận ${created.length} mẫu tin (${dto.sourceType ?? 'CRAWLER'})` });
    return { created: created.length, items: created.map((i) => ({ id: i.id, code: i.code, status: i.status })) };
  }

  // ------------------------------------------------------------------
  // KIỂM TRA NHANH QC
  // ------------------------------------------------------------------
  /** "Lấy nội dung" từ URL / văn bản + bảng kiểm tra GPHĐ, CCHN cơ sở, bác sĩ */
  async qcExtract(dto: D.QcExtractDto) {
    let text = dto.text?.trim() ?? '';
    let fetched: { ok: boolean; status?: number; error?: string } | null = null;
    if (!text && dto.url) {
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 8000);
        const res = await fetch(dto.url, { signal: ctrl.signal, headers: { 'User-Agent': 'Mozilla/5.0 (AI-SYT QC bot)' } });
        clearTimeout(timer);
        fetched = { ok: res.ok, status: res.status };
        text = stripHtml(await res.text()).slice(0, 20000);
      } catch (e) {
        fetched = { ok: false, error: (e as Error).message };
      }
    }
    if (!text) throw new BadRequestException(fetched?.error ? `Không tải được nội dung URL: ${fetched.error}. Hãy dán nội dung vào trường "text".` : 'Vui lòng nhập URL hoặc nội dung');
    return this.qcCheckTable(text, dto.url, fetched);
  }

  async qcCheckTable(text: string, url?: string, fetched?: any) {
    const r = await this.ai.analyze({ text, sourceUrl: url });
    const rows: any[] = [];
    const m = r.extracted.matchedFacility;
    rows.push({
      type: 'Cơ sở khám chữa bệnh',
      extracted: r.extracted.facilityNames.join('; ') || null,
      dbResult: m ? `${m.name} (${m.code}) — ${LABELS.facilityOperatingStatus[m.operatingStatus]} — khớp theo ${m.matchedBy}` : 'Không có dữ liệu',
      ok: !!m && m.operatingStatus === 'ACTIVE',
    });
    for (const c of r.extracted.licenseChecks) {
      rows.push({ type: 'Giấy phép hoạt động / số giấy phép', extracted: c.number, dbResult: c.status === 'NOT_FOUND' ? 'Không có dữ liệu' : c.detail, ok: c.status === 'VALID' });
    }
    if (!r.extracted.licenseChecks.length && m) {
      const gphd = await this.licenses.findOne({ where: { facilityId: m.id, licenseType: 'GPHD' } });
      rows.push({ type: 'Giấy phép hoạt động (theo CSDL)', extracted: null, dbResult: gphd ? `${gphd.licenseNumber} (${gphd.status})` : 'Không có dữ liệu', ok: !!gphd && gphd.status === 'ACTIVE' });
    }
    for (const d of r.extracted.doctorChecks) {
      rows.push({ type: 'Chứng chỉ hành nghề — Bác sĩ', extracted: d.name, dbResult: d.status === 'NOT_FOUND' ? 'Không có dữ liệu' : d.detail, ok: d.status === 'VALID' });
    }
    return {
      url,
      fetched,
      content: text,
      extracted: r.extracted,
      checkTable: rows,
      preliminary: { label: r.label, labelText: LABELS.aiLabel[r.label], confidence: r.confidence, violationTypes: r.violationTypes, explanation: r.explanation },
    };
  }

  /** Loại bỏ / chuyển tiếp — chỉ với mẫu tin chưa kiểm tra, không thể hoàn tác */
  async qcDecision(dto: D.QcDecisionDto, actor: Actor) {
    if (!dto.confirm) throw new BadRequestException('Thao tác không thể hoàn tác — hãy gửi "confirm": true để xác nhận');
    if (dto.action === 'DISCARD' && !dto.reason) throw new BadRequestException('Phải chọn lý do loại bỏ');
    const items = await this.repo.find({ where: { id: In(dto.ids) } });
    const invalid = items.filter((i) => i.status !== AD_STATUS.COLLECTED);
    const missing = dto.ids.filter((id) => !items.some((i) => String(i.id) === String(id)));
    const ok = items.filter((i) => i.status === AD_STATUS.COLLECTED);
    for (const i of ok) {
      Object.assign(i, {
        status: dto.action === 'DISCARD' ? AD_STATUS.QC_REJECTED : AD_STATUS.FILTERED,
        rejectReason: dto.action === 'DISCARD' ? dto.reason : null,
        rejectNote: dto.note ?? null,
        qcBy: actor.userId,
        qcAt: new Date(),
        contentHash: i.contentHash || contentHash(i.content),
      });
      await this.repo.save(i);
    }
    await this.audit.log(actor, {
      action: dto.action === 'DISCARD' ? 'QC_DISCARD' : 'QC_FORWARD',
      module: 'AD_PROCESSING',
      entityType: 'ad_item',
      description: `Kiểm tra nhanh QC: ${dto.action === 'DISCARD' ? 'loại bỏ' : 'chuyển tiếp'} ${ok.length} mẫu tin`,
      metadata: { ids: ok.map((i) => i.id), reason: dto.reason },
    });
    let analyzed: any = null;
    if (dto.action === 'FORWARD' && ok.length && (await this.params.bool('PIPELINE_AUTO_AI', true))) {
      analyzed = await this.analyzeItems(ok.map((i) => String(i.id)), actor);
    }
    return {
      processed: ok.map((i) => ({ id: i.id, code: i.code, status: i.status })),
      skipped: invalid.map((i) => ({ id: i.id, code: i.code, status: i.status, reason: 'Chỉ áp dụng cho mẫu tin trạng thái "Đã thu thập (chờ kiểm tra)"' })),
      notFound: missing,
      autoAnalyzed: analyzed,
    };
  }

  // ------------------------------------------------------------------
  // LỌC TỰ ĐỘNG ("Tự động lọc tất cả" ở màn hình Kết quả thu thập tin)
  // ------------------------------------------------------------------
  private async whitelistMatch(item: AdItem, entries: WhitelistEntry[]): Promise<WhitelistEntry | undefined> {
    const domains = [item.sourceUrl, item.authorAccount].filter(Boolean).map((x) => domainOf(x!));
    const accountRefs = [item.sourceUrl, item.authorAccount].filter(Boolean).map((x) => x!.toLowerCase().replace(/^https?:\/\/(www\.)?/, ''));
    const norm = normalizeText(item.content);
    return entries.find((e) => {
      const v = e.value.toLowerCase().replace(/^https?:\/\/(www\.)?/, '');
      if (e.entryType === 'DOMAIN') return domains.some((d) => d === v || d.endsWith('.' + v));
      if (e.entryType === 'ACCOUNT') return accountRefs.some((a) => a.startsWith(v) || a === v);
      if (e.entryType === 'PHONE') return item.content.replace(/\D/g, '').includes(normalizePhone(v));
      if (e.entryType === 'KEYWORD') return norm.includes(normalizeText(v));
      return false;
    });
  }

  async autoFilter(dto: D.IdsDto, actor: Actor) {
    const where: any = { status: AD_STATUS.COLLECTED };
    if (dto.ids?.length) where.id = In(dto.ids);
    const items = await this.repo.find({ where, order: { collectedAt: 'ASC', id: 'ASC' } });
    const entries = await this.whitelist.find({ where: { isActive: true } });
    const summary = { total: items.length, passed: 0, duplicate: 0, whitelisted: 0, irrelevant: 0, tooShort: 0 };
    const passedIds: string[] = [];
    const seen = new Map<string, string>();

    for (const item of items) {
      item.contentHash = item.contentHash || contentHash(item.content);
      let reason: string | null = null;
      let note: string | null = null;
      // 1. Trùng lặp với mẫu tin đã có (hoặc trong cùng lô)
      const dup =
        seen.get(item.contentHash) ??
        (
          await this.repo.findOne({
            where: { contentHash: item.contentHash, id: Not(item.id), status: Not(In([AD_STATUS.COLLECTED, AD_STATUS.QC_REJECTED, AD_STATUS.FILTER_REJECTED])) },
          })
        )?.code;
      if (dup) {
        reason = 'DUPLICATE';
        note = `Trùng nội dung với ${dup}`;
        summary.duplicate++;
      } else if (item.content.trim().length < 20) {
        reason = 'TOO_SHORT';
        summary.tooShort++;
      } else {
        const wl = await this.whitelistMatch(item, entries);
        if (wl) {
          reason = 'WHITELISTED';
          note = `Thuộc whitelist: ${wl.entryType} ${wl.value}`;
          summary.whitelisted++;
        } else {
          const r = await this.ai.analyze({ text: item.content, title: item.title, sourceUrl: item.sourceUrl });
          if (!r.isMedicalRelated && !r.matchedRules.length) {
            reason = 'IRRELEVANT';
            note = 'Không chứa nội dung liên quan lĩnh vực y tế';
            summary.irrelevant++;
          } else {
            // Phân loại sơ bộ (Quản lý phân loại tin)
            item.field = item.field || r.field;
            item.adSubject = item.adSubject || r.adSubject;
            item.suspicionLevel = r.suspicionLevel;
          }
        }
      }
      if (reason) {
        Object.assign(item, { status: AD_STATUS.FILTER_REJECTED, rejectReason: reason, rejectNote: note, qcBy: actor.userId, qcAt: new Date() });
      } else {
        item.status = AD_STATUS.FILTERED;
        summary.passed++;
        passedIds.push(String(item.id));
        seen.set(item.contentHash, item.code);
      }
      await this.repo.save(item);
    }
    await this.audit.log(actor, { action: 'AUTO_FILTER', module: 'AD_PROCESSING', entityType: 'ad_item', description: `Lọc tự động ${items.length} mẫu tin: đạt ${summary.passed}`, metadata: summary });
    let analyzed: any = null;
    if (passedIds.length && (await this.params.bool('PIPELINE_AUTO_AI', true))) analyzed = await this.analyzeItems(passedIds, actor);
    const rejected = items.filter((i) => i.status === AD_STATUS.FILTER_REJECTED).map((i) => ({ id: i.id, code: i.code, reason: i.rejectReason, note: i.rejectNote }));
    return { summary, rejected, autoAnalyzed: analyzed };
  }

  // ------------------------------------------------------------------
  // GỬI AI PHÂN TÍCH
  // ------------------------------------------------------------------
  async analyzeOne(item: AdItem): Promise<{ item: AdItem; analysis: AiAnalysis; result: AnalysisResult }> {
    const reach = (item.views || 0) + (item.shares || 0) * 10 + (item.likes || 0);
    const r = await this.ai.analyze({ text: item.content, title: item.title, sourceUrl: item.sourceUrl, authorAccount: item.authorAccount, reach, facilityId: item.facilityId });
    await this.analyses.update({ adItemId: item.id, isLatest: true }, { isLatest: false });
    const analysis = await this.analyses.save(
      this.analyses.create({
        adItemId: item.id,
        modelId: r.modelId,
        label: r.label,
        confidence: r.confidence,
        violationTypes: r.violationTypes,
        matchedRules: r.matchedRules,
        extractedEntities: r.extracted,
        legalRefs: r.legalRefs,
        explanation: r.explanation,
        priorityScore: r.priorityScore,
        isLatest: true,
        processingMs: r.processingMs,
      }),
    );
    Object.assign(item, {
      status: AD_STATUS.AI_ANALYZED,
      priority: r.priorityScore,
      facilityId: r.extracted.matchedFacility?.id ?? item.facilityId ?? null,
      field: item.field || r.field,
      adSubject: item.adSubject || r.adSubject,
      suspicionLevel: r.suspicionLevel,
      assignedTo: null,
    });
    await this.repo.save(item);
    return { item, analysis, result: r };
  }

  async analyzeItems(ids: string[] | undefined, actor: Actor) {
    const where: any = ids?.length ? { id: In(ids), status: In([AD_STATUS.FILTERED, AD_STATUS.NEED_MORE_INFO, AD_STATUS.AI_ANALYZED]) } : { status: AD_STATUS.FILTERED };
    const items = await this.repo.find({ where, relations: { schedule: true }, order: { id: 'ASC' } });
    
    if (!items.length) {
      return { queued: 0, message: 'Không có mẫu tin nào đủ điều kiện phân tích' };
    }

    // Kiểm tra RabbitMQ có enabled không
    if (!this.queue.isEnabled()) {
      // Fallback: Sử dụng built-in AI (sync mode)
      this.logger.warn('RabbitMQ not configured, using built-in AI (sync mode)');
      const results: any[] = [];
      for (const it of items) {
        const { analysis } = await this.analyzeOne(it);
        results.push({ 
          id: it.id, 
          code: it.code, 
          label: analysis.label, 
          confidence: analysis.confidence, 
          violationTypes: analysis.violationTypes, 
          priority: analysis.priorityScore 
        });
      }
      await this.audit.log(actor, { 
        action: 'AI_ANALYZE', 
        module: 'AD_PROCESSING', 
        entityType: 'ad_item', 
        description: `AI phân tích ${items.length} mẫu tin (built-in)`, 
        metadata: { ids: items.map((i) => i.id) } 
      });
      return { analyzed: results.length, results };
    }

    // RabbitMQ Mode: Publish vào queue
    let queued = 0;
    let failed = 0;

    for (const item of items) {
      try {
        // 1. Update status → AI_ANALYZING (trigger sẽ sync sang crawl_ads)
        item.status = AD_STATUS.AI_ANALYZING;
        await this.repo.save(item);

        // 2. Extract keywords
        const keywords = item.schedule?.primaryKeywords
          ? item.schedule.primaryKeywords.split(',').map(k => k.trim()).filter(Boolean)
          : [];

        // 3. Extract images/videos từ media
        const images = item.media
          .filter(m => m.type === 'IMAGE')
          .map(m => m.url);
        
        const videos = item.media
          .filter(m => m.type === 'VIDEO')
          .map(m => m.url);

        // 4. Publish vào RabbitMQ
        await this.queue.publishDirectContentToAI(
          item.content,
          {
            url: item.sourceUrl,
            crawl_source: item.platform,
            images: images.length > 0 ? images : undefined,
            keyword: keywords.join(','),
            request_id: `ad_item_${item.id}`,
          },
        );

        queued++;
        this.logger.log(`✅ Queued ad_item ${item.id} for AI analysis`);
        
      } catch (error) {
        this.logger.error(`Failed to queue item ${item.id}: ${error.message}`);
        
        // Rollback status
        item.status = AD_STATUS.FILTERED;
        await this.repo.save(item);
        failed++;
      }
    }

    await this.audit.log(actor, {
      action: 'AI_ANALYZE',
      module: 'AD_PROCESSING',
      entityType: 'ad_item',
      description: `Đã gửi ${queued} mẫu tin vào hàng đợi AI (RabbitMQ)`,
      metadata: { queued, failed, ids: items.map((i) => i.id) },
    });

    return {
      queued,
      failed,
      message: `Đã gửi ${queued} mẫu tin vào hàng đợi AI. AI Service sẽ xử lý tuần tự.${failed > 0 ? ` (${failed} thất bại)` : ''}`,
    };
  }

  async classify(id: string, dto: D.ClassifyDto, actor: Actor) {
    const a = await this.repo.findOne({ where: { id } });
    if (!a) throw new NotFoundException('Không tìm thấy mẫu tin');
    Object.assign(a, dto);
    await this.repo.save(a);
    await this.audit.log(actor, { action: 'CLASSIFY', module: 'AD_PROCESSING', entityType: 'ad_item', entityId: id, metadata: dto });
    return a;
  }

  async classificationStats(q: { from?: string; to?: string }) {
    const where = [`1=1`];
    const params: any[] = [];
    if (q.from) (params.push(q.from), where.push(`collected_at >= $${params.length}`));
    if (q.to) (params.push(q.to), where.push(`collected_at < ($${params.length}::date + interval '1 day')`));
    const w = where.join(' AND ');
    const by = (col: string) => this.ds.query(`SELECT COALESCE(${col}, 'CHUA_PHAN_LOAI') AS key, count(*)::int AS count FROM ad_items WHERE ${w} GROUP BY 1 ORDER BY 2 DESC`, params);
    return {
      byFormat: await by('data_format'),
      bySource: await by('platform'),
      bySourceType: await by('source_type'),
      byField: await by('field'),
      bySubject: await by('ad_subject'),
      bySuspicion: await by('suspicion_level'),
      byStatus: await by('status'),
    };
  }

  /** Xóa mẫu tin (chỉ mẫu tin chưa thành hồ sơ vi phạm) — không thể khôi phục */
  async deleteItems(dto: D.DeleteItemsDto, actor: Actor) {
    if (!dto.confirm) throw new BadRequestException('Xóa không thể khôi phục — gửi "confirm": true để xác nhận');
    const linked = await this.violations.find({ where: { adItemId: In(dto.ids) }, select: { adItemId: true } });
    const blocked = new Set(linked.map((v) => String(v.adItemId)));
    const ids = dto.ids.filter((i) => !blocked.has(String(i)));
    if (ids.length) await this.repo.delete({ id: In(ids) });
    await this.audit.log(actor, { action: 'DELETE', module: 'AD_PROCESSING', entityType: 'ad_item', description: `Xóa ${ids.length} mẫu tin`, metadata: { ids } });
    return { deleted: ids.length, blocked: [...blocked] };
  }
}

// ---------------------------------------------------------------------
// HUMAN-IN-THE-LOOP: hàng đợi, nhận việc, hỗ trợ quyết định, đánh giá, xung đột
// ---------------------------------------------------------------------
@Injectable()
export class ReviewService {
  constructor(
    @InjectRepository(AdItem) private readonly items: Repository<AdItem>,
    @InjectRepository(AiAnalysis) private readonly analyses: Repository<AiAnalysis>,
    @InjectRepository(AdReview) private readonly reviews: Repository<AdReview>,
    @InjectRepository(AiTrainingFeedback) private readonly feedback: Repository<AiTrainingFeedback>,
    @InjectRepository(Facility) private readonly facilities: Repository<Facility>,
    @InjectRepository(License) private readonly licenses: Repository<License>,
    @InjectRepository(LegalDocument) private readonly legalDocs: Repository<LegalDocument>,
    @InjectRepository(Violation) private readonly violations: Repository<Violation>,
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly intake: ViolationIntakeService,
    private readonly params: ParamsService,
    private readonly audit: AuditService,
    private readonly notify: NotificationService,
  ) {}

  /** Hàng đợi ưu tiên: điểm ưu tiên cao (AI tin cậy + nghiêm trọng + lan truyền) lên đầu */
  async queue(q: D.ListQueryDto & { scope?: string }, actor: Actor) {
    const qb = this.items
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.facility', 'f')
      .leftJoin('a.assignee', 'u')
      .addSelect(['u.id', 'u.fullName'])
      .where('a.status IN (:...st)', { st: REVIEWABLE })
      // không đưa lại những mẫu tin tôi đã đánh giá (đánh giá chéo cần người khác)
      .andWhere("a.id NOT IN (SELECT r.ad_item_id FROM ad_reviews r WHERE r.reviewer_id = :me AND r.decision <> 'NEED_MORE_INFO')", { me: actor.userId })
      .orderBy('a.priority', 'DESC')
      .addOrderBy('a.collectedAt', 'ASC');
    if (q.scope === 'mine') qb.andWhere('a.assignedTo = :me2', { me2: actor.userId });
    else if (q.scope === 'unassigned') qb.andWhere('a.assignedTo IS NULL');
    applySearch(qb, q.search, ['a.code', 'a.title', 'a.content']);
    const res = await paginate(qb, q);
    const ids = res.data.map((i) => i.id);
    const latest = ids.length ? await this.analyses.find({ where: { adItemId: In(ids), isLatest: true } }) : [];
    return {
      ...res,
      data: res.data.map((i) => {
        const an = latest.find((x) => String(x.adItemId) === String(i.id));
        return {
          ...i,
          ai: an ? { label: an.label, confidence: an.confidence, violationTypes: an.violationTypes } : null,
        };
      }),
    };
  }

  /** Phân phối tác vụ: nhận N mẫu tin ưu tiên cao nhất chưa có người nhận */
  async claim(count: number, actor: Actor) {
    const rows = await this.items
      .createQueryBuilder('a')
      .where('a.status IN (:...st)', { st: [AD_STATUS.AI_ANALYZED, AD_STATUS.NEED_MORE_INFO, AD_STATUS.IN_REVIEW] })
      .andWhere('a.assignedTo IS NULL')
      .andWhere("a.id NOT IN (SELECT r.ad_item_id FROM ad_reviews r WHERE r.reviewer_id = :me AND r.decision <> 'NEED_MORE_INFO')", { me: actor.userId })
      .orderBy('a.priority', 'DESC')
      .addOrderBy('a.collectedAt', 'ASC')
      .take(count)
      .getMany();
    for (const r of rows) {
      r.assignedTo = actor.userId;
      r.status = AD_STATUS.IN_REVIEW;
      await this.items.save(r);
    }
    await this.audit.log(actor, { action: 'CLAIM', module: 'AD_PROCESSING', entityType: 'ad_item', description: `Nhận ${rows.length} mẫu tin để đánh giá`, metadata: { ids: rows.map((r) => r.id) } });
    return { claimed: rows.length, items: rows.map((r) => ({ id: r.id, code: r.code, priority: r.priority })) };
  }

  async assign(id: string, userId: string, actor: Actor) {
    const a = await this.items.findOne({ where: { id } });
    if (!a) throw new NotFoundException('Không tìm thấy mẫu tin');
    if (!REVIEWABLE.includes(a.status)) throw new BadRequestException('Mẫu tin không ở bước chờ chuyên viên đánh giá');
    const u = await this.users.findOne({ where: { id: userId }, relations: { roles: true } });
    if (!u || !(u.roles ?? []).some((r) => ['SPECIALIST', 'MANAGER'].includes(r.roleCode))) throw new BadRequestException('Người được giao phải là chuyên viên / lãnh đạo');
    a.assignedTo = userId;
    a.status = AD_STATUS.IN_REVIEW;
    await this.items.save(a);
    await this.notify.toUsers([userId], { title: `Được giao đánh giá mẫu tin ${a.code}`, message: a.title, type: 'TASK', entityType: 'ad_item', entityId: a.id });
    await this.audit.log(actor, { action: 'ASSIGN', module: 'AD_PROCESSING', entityType: 'ad_item', entityId: id, description: `Giao mẫu tin cho ${u.email}` });
    return a;
  }

  async release(id: string, actor: Actor) {
    const a = await this.items.findOne({ where: { id } });
    if (!a) throw new NotFoundException('Không tìm thấy mẫu tin');
    if (a.assignedTo !== actor.userId && !hasPermission(actor, 'review.resolve')) throw new ForbiddenException('Mẫu tin không được giao cho bạn');
    a.assignedTo = null;
    if (a.status === AD_STATUS.IN_REVIEW) a.status = AD_STATUS.AI_ANALYZED;
    return this.items.save(a);
  }

  /** Màn hình hỗ trợ ra quyết định: nội dung gốc + kết quả AI + dữ liệu pháp lý + lịch sử liên quan */
  async decisionSupport(id: string) {
    const a = await this.items.findOne({ where: { id }, relations: { facility: true, topic: true, crawlSource: true } });
    if (!a) throw new NotFoundException('Không tìm thấy mẫu tin');
    const analysis = await this.analyses.findOne({ where: { adItemId: id, isLatest: true }, relations: { model: true } });
    const facilityId = a.facilityId;
    const facility = facilityId ? await this.facilities.findOne({ where: { id: facilityId } }) : null;
    const facilityLicenses = facilityId ? await this.licenses.find({ where: { facilityId } }) : [];
    const pastViolations = facilityId
      ? await this.violations.find({ where: { facilityId }, relations: { types: true }, order: { detectedAt: 'DESC' }, take: 10 })
      : [];
    const similar = a.contentHash
      ? await this.items.find({ where: { contentHash: a.contentHash, id: Not(a.id) }, select: { id: true, code: true, status: true, finalLabel: true, collectedAt: true }, take: 10 })
      : [];
    const refIds = (analysis?.legalRefs ?? []).map((r: any) => r.id);
    const legal = refIds.length ? await this.legalDocs.find({ where: { id: In(refIds), status: 'ACTIVE' }, select: { id: true, code: true, documentNumber: true, title: true, summary: true, attachmentPath: true } }) : [];
    const reviews = await this.reviews.find({ where: { adItemId: id }, relations: { reviewer: true }, order: { createdAt: 'ASC' } });
    return {
      item: a,
      ai: analysis,
      facility,
      facilityLicenses,
      pastViolations,
      similarItems: similar,
      legalDocuments: legal,
      reviews: reviews.map((r) => ({ ...r, reviewer: r.reviewer ? { id: r.reviewer.id, fullName: r.reviewer.fullName } : null })),
      requiredReviews: await this.params.num('REVIEW_REQUIRED_COUNT', 1),
    };
  }

  private feedbackType(aiLabel: string | undefined, aiTypes: string[], human: string, humanTypes: string[]) {
    const aiPos = POSITIVE.includes(aiLabel ?? '');
    const humanPos = human === 'VIOLATION';
    if (aiPos && !humanPos) return 'FALSE_POSITIVE';
    if (!aiPos && humanPos) return 'FALSE_NEGATIVE';
    if (humanPos && [...aiTypes].sort().join() !== [...humanTypes].sort().join()) return 'RELABEL';
    return 'CONFIRMED';
  }

  /** Chốt kết luận cuối cùng cho mẫu tin */
  private async finalize(item: AdItem, analysis: AiAnalysis | null, decision: string, types: string[], severity: string | undefined, conclusion: string, review: AdReview, actor: Actor) {
    const humanTypes = decision === 'VIOLATION' ? (types.length ? types : analysis?.violationTypes ?? []) : [];
    item.status = decision === 'VIOLATION' ? AD_STATUS.CONFIRMED_VIOLATION : AD_STATUS.NOT_VIOLATION;
    item.finalLabel = decision;
    item.decidedBy = actor.userId;
    item.decidedAt = new Date();
    item.assignedTo = null;
    await this.items.save(item);

    // Dữ liệu phản hồi phục vụ tái huấn luyện (Active Learning)
    await this.feedback.save(
      this.feedback.create({
        adItemId: item.id,
        analysisId: analysis?.id ?? null,
        reviewId: review.id,
        modelId: analysis?.modelId ?? null,
        aiLabel: analysis?.label,
        aiViolationTypes: analysis?.violationTypes ?? [],
        humanLabel: decision,
        humanViolationTypes: humanTypes,
        feedbackType: this.feedbackType(analysis?.label, analysis?.violationTypes ?? [], decision, humanTypes),
        note: [review.reason, review.wrongParts].filter(Boolean).join(' | '),
        contentSnapshot: item.content,
      }),
    );

    let violation: any = null;
    if (decision === 'VIOLATION') {
      violation = await this.intake.fromAdItem(item, analysis, { typeCodes: humanTypes, severity, conclusion }, actor);
    }
    // Phản ánh của người dân: báo kết quả cho người phản ánh
    if (item.reportedBy) {
      await this.notify.toUsers([item.reportedBy], {
        title: `Kết quả xử lý phản ánh ${item.code}`,
        message: decision === 'VIOLATION' ? 'Quảng cáo bạn phản ánh đã được xác nhận vi phạm và chuyển xử lý.' : 'Quảng cáo bạn phản ánh chưa phát hiện vi phạm.',
        type: 'INFO',
        entityType: 'ad_item',
        entityId: item.id,
      });
    }
    return violation;
  }

  async submitReview(id: string, dto: D.ReviewDto, actor: Actor) {
    const item = await this.items.findOne({ where: { id } });
    if (!item) throw new NotFoundException('Không tìm thấy mẫu tin');
    if (!REVIEWABLE.includes(item.status)) throw new BadRequestException(`Mẫu tin đang ở trạng thái "${LABELS.adStatus[item.status]}", không thể đánh giá`);
    if (item.assignedTo && item.assignedTo !== actor.userId && !hasPermission(actor, 'review.resolve')) {
      throw new ForbiddenException('Mẫu tin đang được giao cho chuyên viên khác');
    }
    const already = await this.reviews.findOne({ where: { adItemId: id, reviewerId: actor.userId, decision: Not('NEED_MORE_INFO'), isResolution: false } });
    if (already) throw new ConflictException('Bạn đã đánh giá mẫu tin này (đánh giá chéo cần chuyên viên khác)');
    if (dto.correctedViolationTypes?.length) {
      const found = await this.intake.typesByCodes(dto.correctedViolationTypes);
      const bad = dto.correctedViolationTypes.filter((c) => !found.some((f) => f.code === c));
      if (bad.length) throw new BadRequestException(`Loại vi phạm không tồn tại: ${bad.join(', ')}`);
    }
    const analysis = await this.analyses.findOne({ where: { adItemId: id, isLatest: true }, relations: { model: true } });
    const aiTypes = analysis?.violationTypes ?? [];
    const humanTypes = dto.correctedViolationTypes ?? (dto.decision === 'VIOLATION' ? aiTypes : []);
    const autoAgree = analysis
      ? (dto.decision === 'VIOLATION' && POSITIVE.includes(analysis.label)) || (dto.decision === 'NOT_VIOLATION' && analysis.label === 'NO_VIOLATION')
      : null;

    const review = await this.reviews.save(
      this.reviews.create({
        adItemId: id,
        analysisId: analysis?.id ?? null,
        reviewerId: actor.userId,
        decision: dto.decision,
        agreesWithAi: dto.agreesWithAi ?? autoAgree,
        correctedViolationTypes: humanTypes,
        severity: dto.severity,
        isVerified: dto.decision !== 'NEED_MORE_INFO',
        isReclassified: dto.decision === 'VIOLATION' && [...aiTypes].sort().join() !== [...humanTypes].sort().join(),
        licenseStatus: dto.licenseStatus,
        compliantStatus: dto.compliantStatus ?? (dto.decision === 'VIOLATION' ? 'NON_COMPLIANT' : dto.decision === 'NOT_VIOLATION' ? 'COMPLIANT' : 'UNKNOWN'),
        reason: dto.reason,
        wrongParts: dto.wrongParts,
        durationSeconds: dto.durationSeconds,
      }),
    );
    await this.audit.log(actor, {
      action: 'REVIEW',
      module: 'AD_PROCESSING',
      entityType: 'ad_item',
      entityId: id,
      description: `Đánh giá ${item.code}: ${LABELS.reviewDecision[dto.decision]} (${review.agreesWithAi ? 'đồng ý' : 'không đồng ý'} với AI)`,
      metadata: { reviewId: review.id, decision: dto.decision, types: humanTypes },
    });

    if (dto.decision === 'NEED_MORE_INFO') {
      item.status = AD_STATUS.NEED_MORE_INFO;
      item.assignedTo = null;
      await this.items.save(item);
      return { review, itemStatus: item.status, message: 'Đã chuyển sang "Cần bổ sung căn cứ". Có thể gửi AI phân tích lại hoặc đánh giá lại sau.' };
    }

    // Đánh giá chéo: cần đủ REVIEW_REQUIRED_COUNT chuyên viên
    const required = Math.max(1, await this.params.num('REVIEW_REQUIRED_COUNT', 1));
    const finals = await this.reviews.find({ where: { adItemId: id, decision: In(['VIOLATION', 'NOT_VIOLATION']), isResolution: false } });
    if (finals.length < required) {
      item.status = AD_STATUS.IN_REVIEW;
      item.assignedTo = null; // trả về hàng đợi để chuyên viên khác đánh giá
      await this.items.save(item);
      return { review, itemStatus: item.status, message: `Đã ghi nhận ${finals.length}/${required} đánh giá. Chờ chuyên viên khác đánh giá chéo.` };
    }
    const decisions = new Set(finals.map((f) => f.decision));
    if (decisions.size > 1) {
      item.status = AD_STATUS.CONFLICT;
      item.assignedTo = null;
      await this.items.save(item);
      await this.notify.toRoles(['MANAGER'], {
        title: `Xung đột đánh giá mẫu tin ${item.code}`,
        message: 'Các chuyên viên đưa ra kết luận khác nhau, cần lãnh đạo quyết định.',
        type: 'TASK',
        entityType: 'ad_item',
        entityId: item.id,
      });
      return { review, itemStatus: item.status, message: 'Các chuyên viên đánh giá khác nhau → chờ lãnh đạo giải quyết xung đột.' };
    }
    const violation = await this.finalize(item, analysis, dto.decision, humanTypes, dto.severity, dto.reason, review, actor);
    return {
      review,
      itemStatus: item.status,
      violation: violation ? { id: violation.id, code: violation.code, status: violation.status, suspectMatching: violation.matching ?? null } : null,
      message: dto.decision === 'VIOLATION' ? `Đã xác nhận vi phạm, lập hồ sơ ${violation?.code}` : 'Đã kết luận không vi phạm',
    };
  }

  async resolveConflict(id: string, dto: D.ResolveConflictDto, actor: Actor) {
    const item = await this.items.findOne({ where: { id } });
    if (!item) throw new NotFoundException('Không tìm thấy mẫu tin');
    if (item.status !== AD_STATUS.CONFLICT) throw new BadRequestException('Mẫu tin không ở trạng thái xung đột');
    const analysis = await this.analyses.findOne({ where: { adItemId: id, isLatest: true }, relations: { model: true } });
    const review = await this.reviews.save(
      this.reviews.create({
        adItemId: id,
        analysisId: analysis?.id ?? null,
        reviewerId: actor.userId,
        decision: dto.decision,
        agreesWithAi: analysis ? (dto.decision === 'VIOLATION') === POSITIVE.includes(analysis.label) : null,
        correctedViolationTypes: dto.correctedViolationTypes ?? [],
        severity: dto.severity,
        reason: dto.reason,
        isResolution: true,
        isVerified: true,
      }),
    );
    await this.audit.log(actor, { action: 'RESOLVE_CONFLICT', module: 'AD_PROCESSING', entityType: 'ad_item', entityId: id, description: `Lãnh đạo kết luận ${item.code}: ${LABELS.reviewDecision[dto.decision]}` });
    const violation = await this.finalize(item, analysis, dto.decision, dto.correctedViolationTypes ?? [], dto.severity, dto.reason, review, actor);
    return { review, itemStatus: item.status, violation: violation ? { id: violation.id, code: violation.code } : null };
  }

  reviewsOf(id: string) {
    return this.reviews.find({ where: { adItemId: id }, relations: { reviewer: true }, order: { createdAt: 'ASC' } }).then((list) =>
      list.map((r) => ({ ...r, reviewer: r.reviewer ? { id: r.reviewer.id, fullName: r.reviewer.fullName, email: r.reviewer.email } : null })),
    );
  }
}

// ---------------------------------------------------------------------
// Whitelist, mô hình AI, dữ liệu phản hồi, hiệu suất AI
// ---------------------------------------------------------------------
@Injectable()
export class AiOpsService {
  constructor(
    @InjectRepository(WhitelistEntry) private readonly wl: Repository<WhitelistEntry>,
    @InjectRepository(AiModel) private readonly models: Repository<AiModel>,
    @InjectRepository(AiTrainingFeedback) private readonly feedback: Repository<AiTrainingFeedback>,
    private readonly ds: DataSource,
    private readonly ai: AiAnalyzerService,
    private readonly audit: AuditService,
  ) {}

  listWhitelist(q: D.WhitelistQueryDto) {
    const qb = this.wl.createQueryBuilder('w').orderBy('w.id', 'DESC');
    if (q.entryType) qb.andWhere('w.entryType = :t', { t: q.entryType });
    applySearch(qb, q.search, ['w.value', 'w.note']);
    return paginate(qb, q);
  }

  async createWhitelist(dto: D.CreateWhitelistDto, actor: Actor) {
    const value = dto.value.trim().toLowerCase();
    if (await this.wl.findOne({ where: { entryType: dto.entryType, value } })) throw new ConflictException('Đã có trong whitelist');
    const w = await this.wl.save(this.wl.create({ ...dto, value, createdBy: actor.userId }));
    await this.audit.log(actor, { action: 'CREATE', module: 'AD_PROCESSING', entityType: 'whitelist', entityId: w.id, description: `Thêm whitelist ${w.entryType} ${w.value}` });
    return w;
  }

  async updateWhitelist(id: number, dto: D.UpdateWhitelistDto, actor: Actor) {
    const w = await this.wl.findOne({ where: { id } });
    if (!w) throw new NotFoundException('Không tìm thấy');
    Object.assign(w, dto);
    await this.audit.log(actor, { action: 'UPDATE', module: 'AD_PROCESSING', entityType: 'whitelist', entityId: id, metadata: dto });
    return this.wl.save(w);
  }

  async removeWhitelist(id: number, actor: Actor) {
    await this.wl.delete(id);
    await this.audit.log(actor, { action: 'DELETE', module: 'AD_PROCESSING', entityType: 'whitelist', entityId: id });
    return { deleted: true };
  }

  analyzeText(dto: D.AnalyzeTextDto) {
    return this.ai.analyze(dto);
  }

  listModels() {
    return this.models.find({ order: { id: 'ASC' } });
  }

  async updateModel(id: number, dto: D.UpdateModelDto, actor: Actor) {
    const m = await this.models.findOne({ where: { id } });
    if (!m) throw new NotFoundException('Không tìm thấy mô hình');
    Object.assign(m, dto);
    await this.audit.log(actor, { action: 'UPDATE', module: 'AD_PROCESSING', entityType: 'ai_model', entityId: id, metadata: dto });
    return this.models.save(m);
  }

  listFeedback(q: D.ListQueryDto & { feedbackType?: string; exported?: string }) {
    const qb = this.feedback.createQueryBuilder('f').orderBy('f.createdAt', 'DESC');
    if (q.feedbackType) qb.andWhere('f.feedbackType = :t', { t: q.feedbackType });
    const ex = toBool(q.exported);
    if (ex === true) qb.andWhere('f.exportedAt IS NOT NULL');
    if (ex === false) qb.andWhere('f.exportedAt IS NULL');
    applySearch(qb, q.search, ['f.contentSnapshot', 'f.note']);
    return paginate(qb, q);
  }

  /** Đóng gói dữ liệu đã đánh giá để tái huấn luyện mô hình */
  async exportFeedback(dto: D.FeedbackExportDto, actor: Actor) {
    const qb = this.feedback.createQueryBuilder('f').orderBy('f.id', 'ASC');
    if (toBool(dto.onlyNew)) qb.andWhere('f.exportedAt IS NULL');
    const rows = await qb.getMany();
    if (toBool(dto.markExported) && rows.length) {
      const version = dto.datasetVersion || `ds-${todayLocal()}`;
      await this.feedback.update({ id: In(rows.map((r) => r.id)) }, { exportedAt: new Date(), datasetVersion: version });
    }
    await this.audit.log(actor, { action: 'EXPORT', module: 'AD_PROCESSING', entityType: 'ai_training_feedback', description: `Xuất ${rows.length} mẫu dữ liệu phản hồi tái huấn luyện` });
    return rows.map((r) => ({
      id: r.id,
      text: r.contentSnapshot,
      ai_label: r.aiLabel,
      ai_violation_types: r.aiViolationTypes,
      human_label: r.humanLabel,
      human_violation_types: r.humanViolationTypes,
      feedback_type: r.feedbackType,
      note: r.note,
      created_at: r.createdAt,
    }));
  }

  /** Hiệu suất AI so với kết luận chuyên viên + mức đồng thuận giữa chuyên viên */
  async performance() {
    const rows: { ai: string; human: string }[] = await this.ds.query(`
      SELECT an.label AS ai, a.final_label AS human
      FROM ad_items a JOIN ai_analyses an ON an.ad_item_id = a.id AND an.is_latest
      WHERE a.final_label IS NOT NULL`);
    let tp = 0, fp = 0, fn = 0, tn = 0;
    for (const r of rows) {
      const p = POSITIVE.includes(r.ai);
      const h = r.human === 'VIOLATION';
      if (p && h) tp++;
      else if (p && !h) fp++;
      else if (!p && h) fn++;
      else tn++;
    }
    const precision = tp + fp ? tp / (tp + fp) : null;
    const recall = tp + fn ? tp / (tp + fn) : null;
    const f1 = precision !== null && recall !== null && precision + recall ? (2 * precision * recall) / (precision + recall) : null;
    const accuracy = rows.length ? (tp + tn) / rows.length : null;
    const [agree] = await this.ds.query(`SELECT count(*) FILTER (WHERE agrees_with_ai)::int AS agree, count(*) FILTER (WHERE agrees_with_ai IS NOT NULL)::int AS total FROM ad_reviews WHERE NOT is_resolution`);
    const [irr] = await this.ds.query(`
      SELECT count(*)::int AS items, count(*) FILTER (WHERE n_dec = 1)::int AS agreed FROM (
        SELECT ad_item_id, count(DISTINCT decision) AS n_dec, count(*) AS n
        FROM ad_reviews WHERE decision IN ('VIOLATION','NOT_VIOLATION') AND NOT is_resolution
        GROUP BY ad_item_id HAVING count(*) >= 2) t`);
    const byType = await this.ds.query(`SELECT feedback_type AS type, count(*)::int AS count FROM ai_training_feedback GROUP BY 1`);
    const r4 = (x: number | null) => (x === null ? null : Math.round(x * 10000) / 10000);
    return {
      evaluatedItems: rows.length,
      confusionMatrix: { truePositive: tp, falsePositive: fp, falseNegative: fn, trueNegative: tn },
      accuracy: r4(accuracy),
      precision: r4(precision),
      recall: r4(recall),
      f1: r4(f1),
      expertAgreementWithAi: agree.total ? r4(agree.agree / agree.total) : null,
      interRater: { itemsWithMultipleReviews: irr.items, agreementRate: irr.items ? r4(irr.agreed / irr.items) : null },
      feedbackByType: byType,
    };
  }
}
