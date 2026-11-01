// =====================================================================
// MODULE QUẢN LÝ THÔNG TIN VI PHẠM — loại vi phạm, hồ sơ vi phạm, xử phạt, phản hồi
// Quy trình (Bảng 8.5 + workflow chuyên viên):
//   NEW --(kiểm tra thẩm quyền: thuộc thẩm quyền + đủ thông tin)--> PROCESSING
//   NEW/PROCESSING --(không thuộc thẩm quyền / cần xác minh đối tượng)--> TRANSFERRED (hồ sơ phối hợp)
//   TRANSFERRED --(cơ quan phối hợp trả kết quả)--> PROCESSING | RESOLVED
//   PROCESSING --(nhắc nhở)--> RESOLVED
//   PROCESSING --(lập QĐ xử phạt: nghiêm trọng hoặc phạt >= ngưỡng)--> PENDING_APPROVAL --(lãnh đạo duyệt)--> PENALIZED
//   PROCESSING --(lập QĐ xử phạt: thông thường)--> PENALIZED
//   PENALIZED --(chấp hành xong: nộp phạt + khắc phục)--> RESOLVED
//   * --(bác bỏ / khiếu nại được chấp nhận)--> DISMISSED
// =====================================================================
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Not, Repository } from 'typeorm';
import {
  AdItem,
  AiAnalysis,
  AiTrainingFeedback,
  AuditLog,
  CaseUpdate,
  Facility,
  FacilityFeedback,
  InvestigationCase,
  PenaltyDecision,
  PrecheckRequest,
  Suspect,
  Violation,
  ViolationType,
} from '../entities';
import { Actor, hasPermission } from '../common/auth';
import { AuditService, NotificationService, ParamsService, RiskService } from '../core/core.services';
import { SuspectMatchingService, ViolationIntakeService } from '../core/violation-intake.service';
import { applySearch, paginate, toBool } from '../common/utils/paging';
import { makeCode } from '../common/utils/text';
import { readXlsx } from '../common/utils/export';
import { fileInfo } from '../core/files';
import {
  CASE_STATUS,
  EXECUTION_STATUS,
  FEEDBACK_STATUS,
  LABELS,
  PENALTY_STATUS,
  ROLE,
  VIOLATION_OPEN_STATUSES,
  VIOLATION_STATUS as VS,
} from '../common/constants';
import * as D from './violations.dto';

function appendNote(old: string | null | undefined, actor: Actor, note?: string) {
  if (!note) return old ?? null;
  const d = new Date();
  const p2 = (n: number) => String(n).padStart(2, '0');
  // Giờ địa phương của máy chạy backend (không dùng toISOString vì đó là giờ UTC)
  const ts = `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())} ${p2(d.getHours())}:${p2(d.getMinutes())}`;
  const line = `[${ts}] ${actor.fullName}: ${note}`;
  return [old, line].filter(Boolean).join('\n');
}

// ---------------------------------------------------------------------
// Danh mục phân loại vi phạm
// ---------------------------------------------------------------------
@Injectable()
export class ViolationTypesService {
  constructor(
    @InjectRepository(ViolationType) private readonly repo: Repository<ViolationType>,
    private readonly ds: DataSource,
    private readonly audit: AuditService,
  ) {}

  list(q: D.ListQueryDto & { isActive?: string }) {
    const qb = this.repo.createQueryBuilder('t').leftJoinAndSelect('t.legalDocument', 'd').orderBy('t.weight', 'DESC');
    applySearch(qb, q.search, ['t.code', 't.name', 't.description']);
    const a = toBool(q.isActive);
    if (a !== undefined) qb.andWhere('t.isActive = :a', { a });
    return qb.getMany();
  }

  async stats() {
    return this.ds.query(`
      SELECT t.id, t.code, t.name, t.weight, t.severity, count(l.violation_id)::int AS violations
      FROM violation_types t LEFT JOIN violation_type_links l ON l.violation_type_id = t.id
      GROUP BY t.id ORDER BY violations DESC, t.weight DESC`);
  }

  async create(dto: D.CreateViolationTypeDto, actor: Actor) {
    if (await this.repo.findOne({ where: { code: dto.code } })) throw new ConflictException('Mã loại vi phạm đã tồn tại');
    const t = await this.repo.save(this.repo.create(dto));
    await this.audit.log(actor, { action: 'CREATE', module: 'VIOLATION', entityType: 'violation_type', entityId: t.id, description: `Thêm loại vi phạm ${t.code}` });
    return t;
  }

  async update(id: number, dto: D.UpdateViolationTypeDto, actor: Actor) {
    const t = await this.repo.findOne({ where: { id } });
    if (!t) throw new NotFoundException('Không tìm thấy loại vi phạm');
    Object.assign(t, dto);
    await this.audit.log(actor, { action: 'UPDATE', module: 'VIOLATION', entityType: 'violation_type', entityId: id, metadata: dto });
    return this.repo.save(t);
  }

  async setActive(id: number, isActive: boolean, actor: Actor) {
    const t = await this.repo.findOne({ where: { id } });
    if (!t) throw new NotFoundException('Không tìm thấy loại vi phạm');
    t.isActive = isActive;
    await this.audit.log(actor, { action: 'STATUS_CHANGE', module: 'VIOLATION', entityType: 'violation_type', entityId: id, description: `${isActive ? 'Kích hoạt' : 'Vô hiệu hóa'} ${t.code}` });
    return this.repo.save(t);
  }

  async remove(id: number, actor: Actor) {
    const [{ n }] = await this.ds.query('SELECT count(*)::int AS n FROM violation_type_links WHERE violation_type_id = $1', [id]);
    if (n) throw new ConflictException(`Loại vi phạm đang dùng trong ${n} hồ sơ, chỉ có thể vô hiệu hóa`);
    await this.repo.delete(id);
    await this.audit.log(actor, { action: 'DELETE', module: 'VIOLATION', entityType: 'violation_type', entityId: id });
    return { deleted: true };
  }
}

// ---------------------------------------------------------------------
// Hồ sơ vi phạm
// ---------------------------------------------------------------------
@Injectable()
export class ViolationsService {
  constructor(
    @InjectRepository(Violation) private readonly repo: Repository<Violation>,
    @InjectRepository(ViolationType) private readonly types: Repository<ViolationType>,
    @InjectRepository(Facility) private readonly facilities: Repository<Facility>,
    @InjectRepository(Suspect) private readonly suspects: Repository<Suspect>,
    @InjectRepository(AdItem) private readonly adItems: Repository<AdItem>,
    @InjectRepository(AiAnalysis) private readonly analyses: Repository<AiAnalysis>,
    @InjectRepository(AiTrainingFeedback) private readonly feedbackDs: Repository<AiTrainingFeedback>,
    @InjectRepository(PenaltyDecision) private readonly penalties: Repository<PenaltyDecision>,
    @InjectRepository(FacilityFeedback) private readonly feedbacks: Repository<FacilityFeedback>,
    @InjectRepository(InvestigationCase) private readonly cases: Repository<InvestigationCase>,
    @InjectRepository(CaseUpdate) private readonly caseUpdates: Repository<CaseUpdate>,
    @InjectRepository(AuditLog) private readonly logs: Repository<AuditLog>,
    private readonly intake: ViolationIntakeService,
    private readonly matching: SuspectMatchingService,
    private readonly risk: RiskService,
    private readonly params: ParamsService,
    private readonly notify: NotificationService,
    private readonly audit: AuditService,
  ) {}

  query(q: D.ViolationQueryDto, actor: Actor | null) {
    const qb = this.repo
      .createQueryBuilder('v')
      .leftJoinAndSelect('v.types', 't')
      .leftJoinAndSelect('v.facility', 'f')
      .leftJoinAndSelect('v.suspect', 's')
      .leftJoin('v.assignee', 'u')
      .addSelect(['u.id', 'u.fullName']);
    if (q.status) qb.andWhere('v.status IN (:...st)', { st: q.status.split(',').map((x) => x.trim()) });
    if (q.severity) qb.andWhere('v.severity = :sev', { sev: q.severity });
    if (q.typeCode) qb.andWhere('v.id IN (SELECT l.violation_id FROM violation_type_links l JOIN violation_types vt ON vt.id = l.violation_type_id WHERE vt.code = :tc)', { tc: q.typeCode });
    if (q.facilityId) qb.andWhere('v.facilityId = :fid', { fid: q.facilityId });
    if (q.suspectId) qb.andWhere('v.suspectId = :sid', { sid: q.suspectId });
    if (q.source) qb.andWhere('v.source = :src', { src: q.source });
    if (q.district) qb.andWhere('f.district ILIKE :dis', { dis: `%${q.district}%` });
    if (q.assignedTo === 'me' && actor) qb.andWhere('v.assignedTo = :me', { me: actor.userId });
    if (toBool(q.unidentified)) qb.andWhere('v.facilityId IS NULL AND v.suspectId IS NULL');
    if (q.from) qb.andWhere('v.detectedAt >= :from', { from: q.from });
    if (q.to) qb.andWhere("v.detectedAt < (:to::date + interval '1 day')", { to: q.to });
    applySearch(qb, q.search, ['v.code', 'v.title', 'v.contentSnapshot', 'f.name', 's.name']);
    qb.orderBy('v.priority', 'DESC').addOrderBy('v.detectedAt', 'DESC');
    return qb;
  }

  list(q: D.ViolationQueryDto, actor: Actor) {
    return paginate(this.query(q, actor), q);
  }

  async get(id: number) {
    const v = await this.repo.findOne({ where: { id }, relations: { types: { legalDocument: true }, facility: true, suspect: { accounts: true }, adItem: true, assignee: true } });
    if (!v) throw new NotFoundException('Không tìm thấy hồ sơ vi phạm');
    const analysis = v.adItemId ? await this.analyses.findOne({ where: { adItemId: v.adItemId, isLatest: true } }) : null;
    const penalties = await this.penalties.find({ where: { violationId: id }, order: { createdAt: 'DESC' } });
    const feedbacks = await this.feedbacks.find({ where: { violationId: id }, order: { createdAt: 'DESC' } });
    const cases = await this.cases.find({ where: { violationId: id }, relations: { updates: true, assignedOfficer: true }, order: { createdAt: 'DESC' } });
    const history = await this.logs.find({ where: { entityType: 'violation', entityId: String(id) }, order: { createdAt: 'ASC' } });
    return {
      ...v,
      statusLabel: LABELS.violationStatus[v.status],
      assignee: v.assignee ? { id: v.assignee.id, fullName: v.assignee.fullName } : null,
      aiAnalysis: analysis,
      penalties,
      feedbacks,
      cases: cases.map((c) => ({ ...c, assignedOfficer: c.assignedOfficer ? { id: c.assignedOfficer.id, fullName: c.assignedOfficer.fullName } : null })),
      history: history.map((h) => ({ at: h.createdAt, by: h.userEmail, role: h.role, action: h.action, description: h.description })),
      allowedActions: this.allowedActions(v),
    };
  }

  /** Các thao tác hợp lệ ở trạng thái hiện tại (frontend dùng để bật/tắt nút) */
  allowedActions(v: Violation): string[] {
    const map: Record<string, string[]> = {
      NEW: ['assess', 'transfer', 'dismiss', 'update', 'assign'],
      PROCESSING: ['penalty', 'warn', 'transfer', 'dismiss', 'update', 'assign', 'remediation'],
      TRANSFERRED: ['dismiss'],
      PENDING_APPROVAL: [],
      PENALIZED: ['remediation'],
      RESOLVED: [],
      DISMISSED: [],
    };
    return map[v.status] ?? [];
  }

  private async load(id: number) {
    const v = await this.repo.findOne({ where: { id }, relations: { types: true, facility: true, suspect: true } });
    if (!v) throw new NotFoundException('Không tìm thấy hồ sơ vi phạm');
    return v;
  }

  private assertStatus(v: Violation, allowed: string[], action: string) {
    if (!allowed.includes(v.status)) {
      throw new BadRequestException(`Không thể ${action} khi hồ sơ đang "${LABELS.violationStatus[v.status]}"`);
    }
  }

  private async typesOrFail(codes: string[]) {
    const list = await this.intake.typesByCodes(codes);
    const bad = codes.filter((c) => !list.some((t) => t.code === c));
    if (bad.length) throw new BadRequestException(`Loại vi phạm không tồn tại: ${bad.join(', ')}`);
    return list;
  }

  /** Nhập thủ công hồ sơ vi phạm (VD do đơn vị phối hợp cung cấp) */
  async create(dto: D.CreateViolationDto, actor: Actor) {
    const types = await this.typesOrFail(dto.typeCodes);
    if (dto.facilityId && !(await this.facilities.findOne({ where: { id: dto.facilityId } }))) throw new BadRequestException('Cơ sở không tồn tại');
    if (dto.suspectId && !(await this.suspects.findOne({ where: { id: dto.suspectId } }))) throw new BadRequestException('Đối tượng không tồn tại');
    const sev = dto.severity || (types.some((t) => t.severity === 'HIGH') ? 'HIGH' : types.some((t) => t.severity === 'MEDIUM') ? 'MEDIUM' : 'LOW');
    let v = await this.repo.save(
      this.repo.create({
        title: dto.title,
        contentSnapshot: dto.content,
        contentUrl: dto.contentUrl,
        facilityId: dto.facilityId ?? null,
        suspectId: dto.suspectId ?? null,
        types,
        severity: sev,
        priority: sev === 'HIGH' ? 80 : sev === 'MEDIUM' ? 50 : 20,
        source: dto.source ?? 'MANUAL',
        evidence: dto.evidence ?? (dto.contentUrl ? [{ type: 'URL', url: dto.contentUrl }] : []),
        specialistConclusion: dto.conclusion,
        reach: dto.reach ?? 0,
        detectedAt: dto.detectedAt ? new Date(dto.detectedAt) : new Date(),
        status: VS.NEW,
        createdBy: actor.userId,
        assignedTo: actor.userId,
      }),
    );
    v = await this.intake.assignCode(v);
    let matching: any = null;
    if (!v.facilityId && !v.suspectId && dto.detectSuspect !== false) matching = await this.matching.detectForViolation(v, null, actor);
    await this.risk.recalcMany([v.facilityId], [v.suspectId]);
    await this.audit.log(actor, { action: 'CREATE', module: 'VIOLATION', entityType: 'violation', entityId: v.id, description: `Nhập hồ sơ vi phạm ${v.code}` });
    await this.notify.toFacility(v.facilityId, { title: 'Cơ sở có hồ sơ vi phạm mới', message: `${v.code}: ${v.title}`, type: 'WARNING', entityType: 'violation', entityId: v.id });
    return { violation: await this.get(v.id), suspectMatching: matching };
  }

  /** Import từ Excel: cột Tiêu đề | Nội dung | Đường dẫn | Mã cơ sở | Loại vi phạm | Mức độ | Ngày phát hiện */
  async importXlsx(file: Express.Multer.File, actor: Actor) {
    const rows = await readXlsx(file.path);
    const created: any[] = [];
    const errors: any[] = [];
    let line = 1;
    for (const r of rows) {
      line++;
      try {
        const code = r['Mã cơ sở'] ? String(r['Mã cơ sở']).trim() : '';
        const facility = code ? await this.facilities.findOne({ where: { code } }) : null;
        if (code && !facility) throw new Error(`Không tìm thấy cơ sở ${code}`);
        const res = await this.create(
          {
            title: String(r['Tiêu đề'] ?? '').trim(),
            content: String(r['Nội dung'] ?? '').trim(),
            contentUrl: r['Đường dẫn'] ? String(r['Đường dẫn']) : undefined,
            facilityId: facility?.id,
            typeCodes: String(r['Loại vi phạm'] ?? '').split(/[,;]/).map((x) => x.trim()).filter(Boolean),
            severity: r['Mức độ'] ? String(r['Mức độ']).trim().toUpperCase() : undefined,
            detectedAt: r['Ngày phát hiện'] ? new Date(r['Ngày phát hiện']).toISOString() : undefined,
            source: 'MANUAL',
          } as D.CreateViolationDto,
          actor,
        );
        if (!res.violation.title || !res.violation.contentSnapshot) throw new Error('Thiếu tiêu đề / nội dung');
        created.push({ line, code: res.violation.code });
      } catch (e) {
        errors.push({ line, error: (e as Error).message });
      }
    }
    await this.audit.log(actor, { action: 'IMPORT', module: 'VIOLATION', entityType: 'violation', description: `Import Excel: ${created.length} hồ sơ, ${errors.length} lỗi`, metadata: { file: fileInfo(file).name } });
    return { total: rows.length, created, errors };
  }

  async update(id: number, dto: D.UpdateViolationDto, actor: Actor) {
    const v = await this.load(id);
    this.assertStatus(v, [VS.NEW, VS.PROCESSING], 'sửa');
    const beforeF = v.facilityId;
    const beforeS = v.suspectId;
    if (dto.typeCodes) v.types = await this.typesOrFail(dto.typeCodes);
    if (dto.title !== undefined) v.title = dto.title;
    if (dto.severity) v.severity = dto.severity;
    if (dto.conclusion !== undefined) v.specialistConclusion = dto.conclusion;
    if (dto.priority !== undefined) v.priority = dto.priority;
    if (dto.facilityId !== undefined) v.facilityId = dto.facilityId;
    if (dto.suspectId !== undefined) v.suspectId = dto.suspectId;
    delete (v as any).facility;
    delete (v as any).suspect;
    await this.repo.save(v);
    await this.risk.recalcMany([beforeF, v.facilityId], [beforeS, v.suspectId]);
    await this.audit.log(actor, { action: 'UPDATE', module: 'VIOLATION', entityType: 'violation', entityId: id, metadata: dto });
    return this.get(id);
  }

  async addEvidence(id: number, files: Express.Multer.File[], note: string | undefined, actor: Actor) {
    const v = await this.load(id);
    const added = files.map((f) => {
      const info = fileInfo(f);
      const type = /^image\//.test(f.mimetype) ? 'IMAGE' : /^video\//.test(f.mimetype) ? 'VIDEO' : 'FILE';
      return { type, url: info.url, name: info.name, note, addedBy: actor.fullName, addedAt: new Date() };
    });
    v.evidence = [...(v.evidence ?? []), ...added];
    await this.repo.update(id, { evidence: v.evidence });
    await this.audit.log(actor, { action: 'UPDATE', module: 'VIOLATION', entityType: 'violation', entityId: id, description: `Bổ sung ${added.length} bằng chứng` });
    return { evidence: v.evidence };
  }

  async assign(id: number, userId: string, actor: Actor) {
    const v = await this.load(id);
    await this.repo.update(id, { assignedTo: userId });
    await this.notify.toUsers([userId], { title: `Được giao xử lý hồ sơ ${v.code}`, message: v.title, type: 'TASK', entityType: 'violation', entityId: id });
    await this.audit.log(actor, { action: 'ASSIGN', module: 'VIOLATION', entityType: 'violation', entityId: id, description: `Giao hồ sơ cho user ${userId}` });
    return this.get(id);
  }

  /** Bước "Kiểm tra thẩm quyền" */
  async assess(id: number, dto: D.AssessDto, actor: Actor) {
    const v = await this.load(id);
    this.assertStatus(v, [VS.NEW], 'kiểm tra thẩm quyền');
    v.withinAuthority = dto.withinAuthority;
    v.handlingNote = appendNote(v.handlingNote, actor, `Kiểm tra thẩm quyền: ${dto.withinAuthority ? 'thuộc' : 'không thuộc'} thẩm quyền, ${dto.hasEnoughInfo ? 'đủ' : 'chưa đủ'} thông tin. ${dto.note ?? ''}`);
    if (dto.withinAuthority && dto.hasEnoughInfo) {
      if (!v.facilityId && !v.suspectId) throw new BadRequestException('Chưa xác định cơ sở / đối tượng vi phạm — không thể coi là đủ thông tin');
      v.status = VS.PROCESSING;
      v.assignedTo = v.assignedTo ?? actor.userId;
      delete (v as any).facility;
      delete (v as any).suspect;
      await this.repo.save(v);
      await this.audit.log(actor, { action: 'ASSESS', module: 'VIOLATION', entityType: 'violation', entityId: id, description: 'Thuộc thẩm quyền Sở Y tế → chuyển sang xử lý' });
      return { violation: await this.get(id), next: 'Lập quyết định xử phạt (POST /violations/:id/penalty-decisions) hoặc nhắc nhở (POST /violations/:id/warn)' };
    }
    delete (v as any).facility;
    delete (v as any).suspect;
    await this.repo.save(v);
    await this.audit.log(actor, { action: 'ASSESS', module: 'VIOLATION', entityType: 'violation', entityId: id, description: 'Không thuộc thẩm quyền / chưa đủ thông tin' });
    if (dto.transferTo) {
      return this.transfer(id, { targetAgency: dto.transferTo, reason: dto.note || (!dto.withinAuthority ? 'Không thuộc thẩm quyền Sở Y tế' : 'Cần xác minh đối tượng vi phạm') }, actor);
    }
    return { violation: await this.get(id), requiresTransfer: true, next: 'Chuyển phối hợp: POST /violations/:id/transfer (CYBER_POLICE hoặc DEPT_INFO_COMM)' };
  }

  /** Chuyển hồ sơ cho Phòng An ninh mạng / Sở TT&TT */
  async transfer(id: number, dto: D.TransferDto, actor: Actor) {
    const v = await this.load(id);
    this.assertStatus(v, [VS.NEW, VS.PROCESSING], 'chuyển phối hợp');
    const open = await this.cases.findOne({ where: { violationId: id, targetAgency: dto.targetAgency, status: In([CASE_STATUS.TRANSFERRED, CASE_STATUS.INVESTIGATING, CASE_STATUS.IDENTIFIED]) } });
    if (open) throw new ConflictException(`Đã có hồ sơ phối hợp ${open.code} đang xử lý`);
    let c = await this.cases.save(
      this.cases.create({
        violationId: id,
        targetAgency: dto.targetAgency,
        reason: dto.reason,
        requestContent: dto.requestContent,
        severity: v.severity,
        status: CASE_STATUS.TRANSFERRED,
        requestedBy: actor.userId,
        suspectId: v.suspectId ?? null,
        transferredAt: new Date(),
      }),
    );
    c.code = makeCode('HS', c.id);
    await this.cases.update(c.id, { code: c.code });
    await this.caseUpdates.save(this.caseUpdates.create({ caseId: c.id, authorId: actor.userId, authorRole: actor.role, action: 'TRANSFER', note: `Sở Y tế chuyển hồ sơ: ${dto.reason}` }));
    await this.repo.update(id, { status: VS.TRANSFERRED, handlingResult: 'TRANSFERRED', handlingNote: appendNote(v.handlingNote, actor, `Chuyển ${LABELS.caseAgency[dto.targetAgency]}: ${dto.reason}`) });
    if (v.suspectId) await this.suspects.update(v.suspectId, { status: 'UNDER_INVESTIGATION' });
    if (dto.targetAgency === 'CYBER_POLICE') {
      await this.notify.toRoles([ROLE.CYBER_POLICE], { title: `Hồ sơ phối hợp mới ${c.code}`, message: `Vi phạm ${v.code}: ${v.title}`, type: 'TASK', entityType: 'investigation_case', entityId: c.id });
    }
    await this.audit.log(actor, { action: 'TRANSFER', module: 'VIOLATION', entityType: 'violation', entityId: id, description: `Chuyển hồ sơ ${c.code} cho ${LABELS.caseAgency[dto.targetAgency]}` });
    return { violation: await this.get(id), case: c };
  }

  /** Xử lý bằng hình thức nhắc nhở (vi phạm nhẹ) */
  async warn(id: number, note: string, actor: Actor) {
    const v = await this.load(id);
    this.assertStatus(v, [VS.PROCESSING], 'nhắc nhở');
    await this.repo.update(id, {
      status: VS.RESOLVED,
      handlingResult: 'WARNING',
      remediationStatus: v.remediationStatus === 'NONE' ? 'REQUIRED' : v.remediationStatus,
      resolvedAt: new Date(),
      handlingNote: appendNote(v.handlingNote, actor, `Nhắc nhở: ${note}`),
    });
    await this.risk.recalcMany([v.facilityId], [v.suspectId]);
    await this.notify.toFacility(v.facilityId, { title: `Nhắc nhở về hồ sơ ${v.code}`, message: note, type: 'WARNING', entityType: 'violation', entityId: id });
    await this.audit.log(actor, { action: 'WARN', module: 'VIOLATION', entityType: 'violation', entityId: id, description: `Nhắc nhở: ${note}` });
    return this.get(id);
  }

  async dismiss(id: number, note: string, actor: Actor, fromFeedback = false) {
    const v = await this.load(id);
    this.assertStatus(v, [VS.NEW, VS.PROCESSING, VS.TRANSFERRED, VS.PENDING_APPROVAL, VS.PENALIZED], 'bác bỏ');
    await this.repo.update(id, { status: VS.DISMISSED, handlingResult: 'DISMISSED', resolvedAt: new Date(), handlingNote: appendNote(v.handlingNote, actor, `Bác bỏ: ${note}`) });
    await this.penalties.update({ violationId: id, status: In([PENALTY_STATUS.PENDING_APPROVAL, PENALTY_STATUS.ISSUED]) }, { status: PENALTY_STATUS.CANCELLED });
    await this.cases.update({ violationId: id, status: In([CASE_STATUS.TRANSFERRED, CASE_STATUS.INVESTIGATING, CASE_STATUS.IDENTIFIED]) }, { status: CASE_STATUS.CLOSED, closedAt: new Date() });
    if (v.adItemId) {
      const item = await this.adItems.findOne({ where: { id: v.adItemId } });
      if (item) {
        await this.feedbackDs.save(
          this.feedbackDs.create({
            adItemId: item.id,
            humanLabel: 'NOT_VIOLATION',
            feedbackType: 'FALSE_POSITIVE',
            note: `Bác bỏ ở bước xử lý${fromFeedback ? ' (khiếu nại được chấp nhận)' : ''}: ${note}`,
            contentSnapshot: item.content,
          }),
        );
      }
    }
    await this.risk.recalcMany([v.facilityId], [v.suspectId]);
    await this.notify.toFacility(v.facilityId, { title: `Hồ sơ ${v.code} đã được bác bỏ`, message: note, type: 'INFO', entityType: 'violation', entityId: id });
    await this.audit.log(actor, { action: 'DISMISS', module: 'VIOLATION', entityType: 'violation', entityId: id, description: `Bác bỏ hồ sơ: ${note}` });
    return this.get(id);
  }

  async setRemediation(id: number, dto: D.RemediationDto, actor: Actor) {
    const v = await this.load(id);
    await this.repo.update(id, { remediationStatus: dto.remediationStatus, handlingNote: appendNote(v.handlingNote, actor, dto.note) });
    if (v.facilityId) await this.facilities.update(v.facilityId, { remediationStatus: dto.remediationStatus });
    await this.audit.log(actor, { action: 'REMEDIATION', module: 'VIOLATION', entityType: 'violation', entityId: id, description: `Khắc phục hậu quả: ${dto.remediationStatus}` });
    return this.get(id);
  }

  async history(id: number) {
    return this.logs.find({ where: { entityType: 'violation', entityId: String(id) }, order: { createdAt: 'ASC' } });
  }

  async exportRows(q: D.ViolationQueryDto, actor: Actor) {
    const list = await this.query(q, actor).take(5000).getMany();
    return list.map((v) => ({
      code: v.code,
      title: v.title,
      facility: v.facility?.name ?? '',
      suspect: v.suspect?.name ?? '',
      types: (v.types ?? []).map((t) => t.name).join('; '),
      severity: LABELS.severity[v.severity],
      status: LABELS.violationStatus[v.status],
      source: LABELS.adSource[v.source] ?? v.source,
      aiConfidence: v.aiConfidence,
      detectedAt: v.detectedAt,
      resolvedAt: v.resolvedAt,
      contentUrl: v.contentUrl,
    }));
  }
}

// ---------------------------------------------------------------------
// Quyết định xử phạt hành chính
// ---------------------------------------------------------------------
@Injectable()
export class PenaltyService {
  constructor(
    @InjectRepository(PenaltyDecision) private readonly repo: Repository<PenaltyDecision>,
    @InjectRepository(Violation) private readonly violations: Repository<Violation>,
    @InjectRepository(Facility) private readonly facilities: Repository<Facility>,
    private readonly params: ParamsService,
    private readonly risk: RiskService,
    private readonly notify: NotificationService,
    private readonly audit: AuditService,
  ) {}

  list(q: D.PenaltyQueryDto) {
    const qb = this.repo.createQueryBuilder('p').leftJoinAndSelect('p.violation', 'v').orderBy('p.createdAt', 'DESC');
    if (q.status) qb.andWhere('p.status = :s', { s: q.status });
    if (q.executionStatus) qb.andWhere('p.executionStatus = :e', { e: q.executionStatus });
    if (q.violationId) qb.andWhere('p.violationId = :vid', { vid: q.violationId });
    applySearch(qb, q.search, ['p.decisionNumber', 'p.offenderName', 'v.code']);
    return paginate(qb, q);
  }

  async get(id: number) {
    const p = await this.repo.findOne({ where: { id }, relations: { violation: { types: true, facility: true, suspect: true } } });
    if (!p) throw new NotFoundException('Không tìm thấy quyết định');
    return p;
  }

  async create(violationId: number, dto: D.CreatePenaltyDto, actor: Actor) {
    const v = await this.violations.findOne({ where: { id: violationId }, relations: { types: { legalDocument: true }, facility: true, suspect: true } });
    if (!v) throw new NotFoundException('Không tìm thấy hồ sơ vi phạm');
    if (v.status !== VS.PROCESSING) throw new BadRequestException(`Chỉ lập quyết định khi hồ sơ "Đang xử lý" (hiện tại: ${LABELS.violationStatus[v.status]})`);
    if (!v.facility && !v.suspect && !dto.offenderName) throw new BadRequestException('Chưa xác định chủ thể vi phạm — hãy chuyển phối hợp xác minh đối tượng hoặc nhập offenderName');
    if (await this.repo.findOne({ where: { decisionNumber: dto.decisionNumber } })) throw new ConflictException('Số quyết định đã tồn tại');
    if (await this.repo.findOne({ where: { violationId, status: In([PENALTY_STATUS.PENDING_APPROVAL, PENALTY_STATUS.ISSUED]) } })) {
      throw new ConflictException('Hồ sơ đã có quyết định xử phạt đang hiệu lực / chờ duyệt');
    }
    const threshold = await this.params.num('PENALTY_APPROVAL_THRESHOLD', 20_000_000);
    const requiresApproval = v.severity === 'HIGH' || dto.fineAmount >= threshold;
    const types = v.types ?? [];
    let p = this.repo.create({
      decisionNumber: dto.decisionNumber,
      violationId,
      facilityId: v.facilityId ?? null,
      suspectId: v.suspectId ?? null,
      offenderName: dto.offenderName || v.facility?.name || v.suspect?.name || 'Chưa xác định',
      violationBehavior: dto.violationBehavior || types.map((t) => t.name).join('; ') || v.title,
      legalBasis:
        dto.legalBasis ||
        [...new Set(types.map((t) => [t.legalBasis, t.legalDocument ? `${t.legalDocument.documentNumber}` : null].filter(Boolean).join(' - ')))].join('; '),
      fineAmount: dto.fineAmount,
      additionalPenalty: dto.additionalPenalty,
      remedialMeasures: dto.remedialMeasures,
      dueDate: dto.dueDate,
      requiresApproval,
      status: requiresApproval ? PENALTY_STATUS.PENDING_APPROVAL : PENALTY_STATUS.ISSUED,
      issuedAt: requiresApproval ? null : new Date(),
      executionStatus: requiresApproval ? EXECUTION_STATUS.NOT_ISSUED : EXECUTION_STATUS.UNPAID,
      createdBy: actor.userId,
    });
    p = await this.repo.save(p);
    await this.violations.update(violationId, {
      status: requiresApproval ? VS.PENDING_APPROVAL : VS.PENALIZED,
      handlingResult: 'PENALTY',
      remediationStatus: dto.remedialMeasures ? 'REQUIRED' : v.remediationStatus,
    });
    if (requiresApproval) {
      await this.notify.toRoles([ROLE.MANAGER], {
        title: `Chờ phê duyệt quyết định ${p.decisionNumber}`,
        message: `Hồ sơ ${v.code} — mức phạt ${p.fineAmount.toLocaleString('vi-VN')}đ${v.severity === 'HIGH' ? ' (vi phạm nghiêm trọng)' : ''}`,
        type: 'TASK',
        entityType: 'penalty_decision',
        entityId: p.id,
      });
    } else {
      await this.notify.toFacility(v.facilityId, { title: `Quyết định xử phạt ${p.decisionNumber}`, message: `Hồ sơ ${v.code}: phạt ${p.fineAmount.toLocaleString('vi-VN')}đ`, type: 'WARNING', entityType: 'penalty_decision', entityId: p.id });
    }
    await this.audit.log(actor, { action: 'CREATE', module: 'VIOLATION', entityType: 'violation', entityId: violationId, description: `Lập quyết định xử phạt ${p.decisionNumber} (${requiresApproval ? 'chờ lãnh đạo duyệt' : 'ban hành'})`, metadata: { penaltyId: p.id, fine: p.fineAmount } });
    return { decision: p, requiresApproval, reason: requiresApproval ? (v.severity === 'HIGH' ? 'Vi phạm nghiêm trọng' : `Mức phạt >= ${threshold.toLocaleString('vi-VN')}đ`) : null };
  }

  async approve(id: number, note: string | undefined, actor: Actor) {
    const p = await this.get(id);
    if (p.status !== PENALTY_STATUS.PENDING_APPROVAL) throw new BadRequestException('Quyết định không ở trạng thái chờ duyệt');
    if (p.createdBy === actor.userId) throw new ForbiddenException('Người lập quyết định không được tự phê duyệt');
    Object.assign(p, { status: PENALTY_STATUS.ISSUED, approvedBy: actor.userId, approvalNote: note ?? null, approvedAt: new Date(), issuedAt: new Date(), executionStatus: EXECUTION_STATUS.UNPAID });
    await this.repo.save(p);
    await this.violations.update(p.violationId, { status: VS.PENALIZED });
    await this.notify.toUsers([p.createdBy], { title: `Quyết định ${p.decisionNumber} đã được phê duyệt`, message: note, type: 'INFO', entityType: 'penalty_decision', entityId: id });
    await this.notify.toFacility(p.facilityId, { title: `Quyết định xử phạt ${p.decisionNumber}`, message: `Mức phạt ${p.fineAmount.toLocaleString('vi-VN')}đ`, type: 'WARNING', entityType: 'penalty_decision', entityId: id });
    await this.audit.log(actor, { action: 'APPROVE', module: 'VIOLATION', entityType: 'violation', entityId: p.violationId, description: `Lãnh đạo phê duyệt quyết định ${p.decisionNumber}` });
    return p;
  }

  async reject(id: number, note: string, actor: Actor) {
    const p = await this.get(id);
    if (p.status !== PENALTY_STATUS.PENDING_APPROVAL) throw new BadRequestException('Quyết định không ở trạng thái chờ duyệt');
    Object.assign(p, { status: PENALTY_STATUS.REJECTED, approvedBy: actor.userId, approvalNote: note, approvedAt: new Date() });
    await this.repo.save(p);
    await this.violations.update(p.violationId, { status: VS.PROCESSING });
    await this.notify.toUsers([p.createdBy], { title: `Quyết định ${p.decisionNumber} bị từ chối`, message: note, type: 'WARNING', entityType: 'penalty_decision', entityId: id });
    await this.audit.log(actor, { action: 'REJECT', module: 'VIOLATION', entityType: 'violation', entityId: p.violationId, description: `Lãnh đạo từ chối quyết định ${p.decisionNumber}: ${note}` });
    return p;
  }

  async execution(id: number, dto: D.ExecutionDto, actor: Actor) {
    const p = await this.get(id);
    if (p.status !== PENALTY_STATUS.ISSUED) throw new BadRequestException('Chỉ cập nhật thi hành cho quyết định đã ban hành');
    p.executionStatus = dto.executionStatus;
    if (dto.executionStatus === EXECUTION_STATUS.PAID || dto.executionStatus === EXECUTION_STATUS.COMPLIED) p.paidAt = p.paidAt ?? new Date();
    await this.repo.save(p);
    if (dto.executionStatus === EXECUTION_STATUS.COMPLIED) {
      await this.violations.update(p.violationId, { status: VS.RESOLVED, remediationStatus: 'REMEDIATED', resolvedAt: new Date() });
      if (p.facilityId) {
        const open = await this.violations.count({ where: { facilityId: p.facilityId, status: In(VIOLATION_OPEN_STATUSES) } });
        if (!open) await this.facilities.update(p.facilityId, { remediationStatus: 'REMEDIATED' });
      }
      await this.risk.recalcMany([p.facilityId], [p.suspectId]);
    }
    await this.audit.log(actor, { action: 'EXECUTION', module: 'VIOLATION', entityType: 'violation', entityId: p.violationId, description: `Thi hành quyết định ${p.decisionNumber}: ${LABELS.executionStatus[dto.executionStatus]}. ${dto.note ?? ''}` });
    return this.get(id);
  }

  /** Xuất quyết định ra file Word (.doc) để in / lưu hồ sơ */
  async documentHtml(id: number) {
    const p = await this.get(id);
    const v = p.violation!;
    const money = p.fineAmount.toLocaleString('vi-VN');
    const esc = (s?: string | null) => (s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!);
    return `<html><head><meta charset="utf-8"><title>${esc(p.decisionNumber)}</title></head>
<body style="font-family:'Times New Roman';font-size:13pt;line-height:1.5">
<table width="100%"><tr><td align="center"><b>SỞ Y TẾ TP. HỒ CHÍ MINH</b></td><td align="center"><b>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</b><br/><u>Độc lập - Tự do - Hạnh phúc</u></td></tr>
<tr><td align="center">Số: ${esc(p.decisionNumber)}</td><td align="center"><i>TP. Hồ Chí Minh, ngày ${new Date(p.issuedAt ?? p.createdAt).toLocaleDateString('vi-VN')}</i></td></tr></table>
<h3 style="text-align:center">QUYẾT ĐỊNH<br/>Xử phạt vi phạm hành chính trong lĩnh vực quảng cáo y tế</h3>
<p><b>Căn cứ:</b> ${esc(p.legalBasis) || 'Luật Xử lý vi phạm hành chính; Nghị định 117/2020/NĐ-CP'}</p>
<p><b>Hồ sơ vi phạm:</b> ${esc(v.code)} — ${esc(v.title)}</p>
<p><b>Điều 1.</b> Xử phạt vi phạm hành chính đối với: <b>${esc(p.offenderName)}</b>${v.facility ? `, địa chỉ: ${esc(v.facility.address)}, giấy phép hoạt động số ${esc(v.facility.licenseNumber)}` : ''}.</p>
<p>Hành vi vi phạm: ${esc(p.violationBehavior)}</p>
<p>Hình thức xử phạt chính: Phạt tiền <b>${money} đồng</b>.</p>
${p.additionalPenalty ? `<p>Hình thức xử phạt bổ sung: ${esc(p.additionalPenalty)}</p>` : ''}
${p.remedialMeasures ? `<p>Biện pháp khắc phục hậu quả: ${esc(p.remedialMeasures)}</p>` : ''}
<p><b>Điều 2.</b> Thời hạn chấp hành: ${p.dueDate ? new Date(p.dueDate).toLocaleDateString('vi-VN') : '10 ngày kể từ ngày nhận quyết định'}.</p>
<p><b>Điều 3.</b> Quyết định có hiệu lực kể từ ngày ký. Trạng thái: ${LABELS.penaltyStatus[p.status]}.</p>
<p style="text-align:right;margin-top:40px"><b>NGƯỜI RA QUYẾT ĐỊNH</b><br/><br/><br/>(ký, ghi rõ họ tên)</p>
</body></html>`;
  }
}

// ---------------------------------------------------------------------
// Phản hồi / giải trình / khiếu nại từ cơ sở KCB
// ---------------------------------------------------------------------
@Injectable()
export class FeedbackService {
  constructor(
    @InjectRepository(FacilityFeedback) private readonly repo: Repository<FacilityFeedback>,
    @InjectRepository(Violation) private readonly violations: Repository<Violation>,
    @InjectRepository(PrecheckRequest) private readonly prechecks: Repository<PrecheckRequest>,
    @InjectRepository(Facility) private readonly facilities: Repository<Facility>,
    private readonly violationsSvc: ViolationsService,
    private readonly notify: NotificationService,
    private readonly audit: AuditService,
  ) {}

  async create(dto: D.CreateFeedbackDto, actor: Actor) {
    if (!actor.facilityId) throw new ForbiddenException('Tài khoản không gắn với cơ sở KCB nào');
    if (!dto.violationId && !dto.precheckId) throw new BadRequestException('Phải chọn hồ sơ vi phạm (violationId) hoặc phiếu kiểm tra trước (precheckId)');
    if (dto.violationId) {
      const v = await this.violations.findOne({ where: { id: dto.violationId } });
      if (!v || v.facilityId !== actor.facilityId) throw new ForbiddenException('Hồ sơ vi phạm không thuộc cơ sở của bạn');
      if (dto.feedbackType === 'REMEDIATION_PROOF' && v.remediationStatus === 'REQUIRED') {
        await this.violations.update(v.id, { remediationStatus: 'IN_PROGRESS' });
      }
    }
    if (dto.precheckId) {
      const p = await this.prechecks.findOne({ where: { id: dto.precheckId } });
      if (!p || (p.facilityId !== actor.facilityId && p.submitterId !== actor.userId)) throw new ForbiddenException('Phiếu kiểm tra không thuộc cơ sở của bạn');
    }
    let f = await this.repo.save(this.repo.create({ ...dto, facilityId: actor.facilityId, submittedBy: actor.userId, status: FEEDBACK_STATUS.RECEIVED, attachments: [] }));
    f.code = makeCode('PH', f.id);
    await this.repo.update(f.id, { code: f.code });
    await this.notify.toRoles([ROLE.SPECIALIST], { title: `Phản hồi mới từ cơ sở: ${f.code}`, message: `${LABELS.feedbackType[f.feedbackType]}: ${f.subject}`, type: 'TASK', entityType: 'facility_feedback', entityId: f.id });
    await this.audit.log(actor, { action: 'CREATE', module: 'VIOLATION', entityType: dto.violationId ? 'violation' : 'facility_feedback', entityId: dto.violationId ?? f.id, description: `Cơ sở gửi ${LABELS.feedbackType[f.feedbackType]} ${f.code}` });
    return f;
  }

  async attach(id: number, files: Express.Multer.File[], actor: Actor) {
    const f = await this.repo.findOne({ where: { id } });
    if (!f) throw new NotFoundException('Không tìm thấy phản hồi');
    if (f.submittedBy !== actor.userId) throw new ForbiddenException('Không phải phản hồi của bạn');
    f.attachments = [...(f.attachments ?? []), ...files.map(fileInfo)];
    return this.repo.save(f);
  }

  mine(actor: Actor, q: D.FeedbackQueryDto) {
    if (!actor.facilityId) throw new ForbiddenException('Tài khoản không gắn với cơ sở KCB');
    return this.list({ ...q, facilityId: actor.facilityId });
  }

  list(q: D.FeedbackQueryDto) {
    const qb = this.repo
      .createQueryBuilder('f')
      .leftJoinAndSelect('f.facility', 'fa')
      .leftJoinAndSelect('f.violation', 'v')
      .leftJoinAndSelect('f.precheck', 'p')
      .orderBy('f.createdAt', 'DESC');
    if (q.status) qb.andWhere('f.status = :s', { s: q.status });
    if (q.feedbackType) qb.andWhere('f.feedbackType = :t', { t: q.feedbackType });
    if (q.facilityId) qb.andWhere('f.facilityId = :fid', { fid: q.facilityId });
    if (q.violationId) qb.andWhere('f.violationId = :vid', { vid: q.violationId });
    applySearch(qb, q.search, ['f.code', 'f.subject', 'f.content', 'fa.name']);
    return paginate(qb, q);
  }

  async get(id: number, actor: Actor) {
    const f = await this.repo.findOne({ where: { id }, relations: { facility: true, violation: { types: true }, precheck: true } });
    if (!f) throw new NotFoundException('Không tìm thấy phản hồi');
    if (!hasPermission(actor, 'feedback.handle') && f.facilityId !== actor.facilityId) throw new ForbiddenException('Không có quyền xem phản hồi này');
    return f;
  }

  async process(id: number, actor: Actor) {
    const f = await this.repo.findOne({ where: { id } });
    if (!f) throw new NotFoundException('Không tìm thấy phản hồi');
    if (f.status !== FEEDBACK_STATUS.RECEIVED) throw new BadRequestException('Phản hồi đã được xử lý');
    f.status = FEEDBACK_STATUS.PROCESSING;
    f.handledBy = actor.userId;
    await this.repo.save(f);
    await this.notify.toFacility(f.facilityId, { title: `Phản hồi ${f.code} đang được xử lý`, type: 'INFO', entityType: 'facility_feedback', entityId: id });
    return f;
  }

  async respond(id: number, dto: D.RespondFeedbackDto, actor: Actor) {
    const f = await this.repo.findOne({ where: { id } });
    if (!f) throw new NotFoundException('Không tìm thấy phản hồi');
    if (![FEEDBACK_STATUS.RECEIVED, FEEDBACK_STATUS.PROCESSING].includes(f.status as any)) throw new BadRequestException('Phản hồi đã có kết luận');
    Object.assign(f, { status: dto.decision, responseNote: dto.responseNote, handledBy: actor.userId, handledAt: new Date() });
    await this.repo.save(f);
    const effects: string[] = [];
    if (dto.decision === 'ACCEPTED' && f.violationId) {
      if (dto.dismissViolation) {
        await this.violationsSvc.dismiss(f.violationId, `Chấp nhận ${LABELS.feedbackType[f.feedbackType]} ${f.code}: ${dto.responseNote}`, actor, true);
        effects.push('Đã bác bỏ hồ sơ vi phạm');
      }
      if (dto.markRemediated || f.feedbackType === 'REMEDIATION_PROOF') {
        await this.violationsSvc.setRemediation(f.violationId, { remediationStatus: 'REMEDIATED', note: `Theo phản hồi ${f.code}` }, actor);
        effects.push('Đã ghi nhận khắc phục hậu quả');
      }
    }
    if (dto.decision === 'ACCEPTED' && f.precheckId && dto.newPrecheckResult) {
      await this.prechecks.update(f.precheckId, { finalResult: dto.newPrecheckResult, status: 'REVIEWED', reviewerId: actor.userId, reviewNote: `Điều chỉnh theo phản hồi ${f.code}: ${dto.responseNote}`, reviewedAt: new Date() });
      effects.push(`Kết quả kiểm tra trước đổi thành ${LABELS.precheckResult[dto.newPrecheckResult]}`);
    }
    await this.notify.toFacility(f.facilityId, {
      title: `Kết quả xử lý phản hồi ${f.code}: ${LABELS.feedbackStatus[dto.decision]}`,
      message: dto.responseNote,
      type: dto.decision === 'ACCEPTED' ? 'INFO' : 'WARNING',
      entityType: 'facility_feedback',
      entityId: id,
    });
    await this.audit.log(actor, { action: dto.decision === 'ACCEPTED' ? 'APPROVE' : 'REJECT', module: 'VIOLATION', entityType: f.violationId ? 'violation' : 'facility_feedback', entityId: f.violationId ?? id, description: `Xử lý phản hồi ${f.code}: ${LABELS.feedbackStatus[dto.decision]}`, metadata: effects });
    return { feedback: f, effects };
  }
}
