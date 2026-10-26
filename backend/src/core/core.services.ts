// Dịch vụ dùng chung cho mọi module: nhật ký, tham số, thông báo, điểm rủi ro
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AuditLog,
  SystemParameter,
  Notification,
  User,
  Violation,
  Facility,
  Suspect,
} from '../entities';
import { Actor } from '../common/auth';
import { RISK_LEVEL, VIOLATION_STATUS } from '../common/constants';

// ---------------------------------------------------------------------
// Nhật ký hoạt động (Audit trail): ai — làm gì — lúc nào — ở đâu
// ---------------------------------------------------------------------
@Injectable()
export class AuditService {
  private readonly logger = new Logger('Audit');
  constructor(@InjectRepository(AuditLog) private readonly repo: Repository<AuditLog>) {}

  async log(
    actor: Partial<Actor> | null | undefined,
    e: {
      action: string;
      module: string;
      entityType?: string;
      entityId?: string | number | null;
      description?: string;
      metadata?: any;
    },
  ) {
    try {
      await this.repo.insert({
        userId: actor?.userId ?? null,
        userEmail: actor?.email ?? null,
        role: actor?.role ?? null,
        action: e.action,
        module: e.module,
        entityType: e.entityType ?? null,
        entityId: e.entityId !== undefined && e.entityId !== null ? String(e.entityId) : null,
        description: e.description ?? null,
        ipAddress: actor?.ip ?? null,
        userAgent: actor?.userAgent?.slice(0, 500) ?? null,
        metadata: e.metadata ?? null,
      });
    } catch (err) {
      this.logger.warn(`Không ghi được nhật ký: ${(err as Error).message}`);
    }
  }
}

// ---------------------------------------------------------------------
// Tham số hệ thống (đọc từ bảng system_parameters, cache 10 giây)
// ---------------------------------------------------------------------
@Injectable()
export class ParamsService {
  private cache = new Map<string, string | null>();
  private loadedAt = 0;
  constructor(@InjectRepository(SystemParameter) private readonly repo: Repository<SystemParameter>) {}

  private async load() {
    if (Date.now() - this.loadedAt < 10_000) return;
    const rows = await this.repo.find();
    this.cache = new Map(rows.map((r) => [r.paramKey, r.paramValue ?? null]));
    this.loadedAt = Date.now();
  }

  invalidate() {
    this.loadedAt = 0;
  }

  async str(key: string, def = ''): Promise<string> {
    await this.load();
    const v = this.cache.get(key);
    return v === undefined || v === null ? def : v;
  }

  async num(key: string, def: number): Promise<number> {
    const v = Number(await this.str(key, ''));
    return Number.isFinite(v) && (await this.str(key, '')) !== '' ? v : def;
  }

  async bool(key: string, def: boolean): Promise<boolean> {
    const v = (await this.str(key, '')).toLowerCase();
    if (!v) return def;
    return ['true', '1', 'yes'].includes(v);
  }
}

// ---------------------------------------------------------------------
// Thông báo / cảnh báo trong hệ thống
// ---------------------------------------------------------------------
export interface NotifyPayload {
  title: string;
  message?: string;
  type?: 'INFO' | 'WARNING' | 'ALERT' | 'TASK';
  link?: string;
  entityType?: string;
  entityId?: string | number;
}

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notification) private readonly repo: Repository<Notification>,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  async toUsers(userIds: (string | null | undefined)[], p: NotifyPayload) {
    const ids = [...new Set(userIds.filter(Boolean).map(String))];
    if (!ids.length) return;
    await this.repo.insert(
      ids.map((userId) => ({
        userId,
        title: p.title,
        message: p.message,
        type: p.type ?? 'INFO',
        link: p.link,
        entityType: p.entityType,
        entityId: p.entityId !== undefined ? String(p.entityId) : undefined,
      })),
    );
  }

  /** Gửi cho mọi tài khoản đang hoạt động có vai trò trong danh sách */
  async toRoles(roleCodes: string[], p: NotifyPayload, exceptUserId?: string | null) {
    const rows = await this.users
      .createQueryBuilder('u')
      .innerJoin('u.roles', 'r')
      .where('r.roleCode IN (:...codes)', { codes: roleCodes })
      .andWhere("u.status = 'ACTIVE'")
      .select('u.id', 'id')
      .getRawMany<{ id: string }>();
    await this.toUsers(
      rows.map((r) => String(r.id)).filter((id) => id !== String(exceptUserId ?? '')),
      p,
    );
  }

  /** Gửi cho tài khoản của cơ sở KCB */
  async toFacility(facilityId: number | null | undefined, p: NotifyPayload) {
    if (!facilityId) return;
    const rows = await this.users.find({ where: { facilityId }, select: { id: true } });
    await this.toUsers(rows.map((r) => r.id), p);
  }
}

// ---------------------------------------------------------------------
// Điểm rủi ro (mục 12.13.2 & 12.17.3 báo cáo)
//   RS = min(100, Σ w_i · v_i · α^t_i + δ_tái_phạm)
//   w_i: trọng số loại vi phạm (Bảng 12.7) | v_i: mức nghiêm trọng × lượng tiếp cận
//   α : hệ số suy giảm theo tháng | t_i: số tháng từ lúc phát hiện
//   Vi phạm đã khắc phục (RESOLVED) tính 50%; bị bác bỏ (DISMISSED) không tính.
//   Mức: 0-30 Thấp, 31-70 Trung bình, 71-100 Cao (Bảng 12.8)
// ---------------------------------------------------------------------
@Injectable()
export class RiskService {
  constructor(
    @InjectRepository(Violation) private readonly violations: Repository<Violation>,
    @InjectRepository(Facility) private readonly facilities: Repository<Facility>,
    @InjectRepository(Suspect) private readonly suspects: Repository<Suspect>,
    private readonly params: ParamsService,
    private readonly notify: NotificationService,
  ) {}

  static level(score: number): string {
    if (score >= 71) return RISK_LEVEL.HIGH;
    if (score >= 31) return RISK_LEVEL.MEDIUM;
    return RISK_LEVEL.LOW;
  }

  async compute(list: Violation[]): Promise<{ score: number; breakdown: any[] }> {
    const alpha = await this.params.num('RISK_DECAY_ALPHA', 0.9);
    const recid = await this.params.num('RECIDIVISM_PENALTY', 10);
    const sevFactor: Record<string, number> = { LOW: 0.6, MEDIUM: 1, HIGH: 1.4 };
    const now = Date.now();
    let total = 0;
    const breakdown: any[] = [];
    const typeHits = new Map<string, number[]>();

    for (const v of list) {
      if (v.status === VIOLATION_STATUS.DISMISSED) continue;
      const w = (v.types ?? []).reduce((s, t) => s + t.weight, 0) || 10;
      const reachFactor = 1 + Math.min((v.reach || 0) / 100000, 0.5);
      const vi = (sevFactor[v.severity] ?? 1) * reachFactor;
      const months = Math.max(0, (now - new Date(v.detectedAt).getTime()) / (30 * 86400_000));
      let part = w * vi * Math.pow(alpha, months);
      if (v.status === VIOLATION_STATUS.RESOLVED) part *= 0.5;
      total += part;
      breakdown.push({ code: v.code, weight: w, factor: Math.round(vi * 100) / 100, months: Math.round(months * 10) / 10, points: Math.round(part * 10) / 10 });
      for (const t of v.types ?? []) {
        const arr = typeHits.get(t.code) ?? [];
        arr.push(new Date(v.detectedAt).getTime());
        typeHits.set(t.code, arr);
      }
    }
    // Tái phạm: cùng loại vi phạm lặp lại trong vòng 12 tháng
    let repeats = 0;
    typeHits.forEach((times) => {
      const recent = times.filter((t) => now - t < 365 * 86400_000);
      if (recent.length > 1) repeats += recent.length - 1;
    });
    if (repeats) {
      total += repeats * recid;
      breakdown.push({ recidivism: repeats, points: repeats * recid });
    }
    return { score: Math.min(100, Math.round(total)), breakdown };
  }

  async recalcFacility(facilityId?: number | null) {
    if (!facilityId) return null;
    const f = await this.facilities.findOne({ where: { id: facilityId } });
    if (!f) return null;
    const list = await this.violations.find({ where: { facilityId }, relations: { types: true } });
    const { score } = await this.compute(list);
    const before = f.riskLevel;
    f.riskScore = score;
    f.riskLevel = RiskService.level(score);
    f.violationCount = list.filter((v) => v.status !== VIOLATION_STATUS.DISMISSED).length;
    await this.facilities.save(f);
    await this.alertIfNeeded(before, f.riskLevel, score, `Cơ sở ${f.name}`, 'facility', f.id);
    return f;
  }

  async recalcSuspect(suspectId?: number | null) {
    if (!suspectId) return null;
    const s = await this.suspects.findOne({ where: { id: suspectId } });
    if (!s) return null;
    const list = await this.violations.find({ where: { suspectId }, relations: { types: true } });
    const { score } = await this.compute(list);
    const before = s.riskLevel;
    s.riskScore = score;
    s.riskLevel = RiskService.level(score);
    s.violationCount = list.filter((v) => v.status !== VIOLATION_STATUS.DISMISSED).length;
    await this.suspects.save(s);
    await this.alertIfNeeded(before, s.riskLevel, score, `Đối tượng ${s.name}`, 'suspect', s.id);
    return s;
  }

  private async alertIfNeeded(before: string, after: string, score: number, label: string, type: string, id: number) {
    const threshold = await this.params.num('RISK_ALERT_THRESHOLD', 71);
    if (score >= threshold && before !== RISK_LEVEL.HIGH && after === RISK_LEVEL.HIGH) {
      await this.notify.toRoles(['SPECIALIST', 'MANAGER'], {
        title: `Cảnh báo rủi ro cao: ${label}`,
        message: `Điểm rủi ro đạt ${score}/100. Đề xuất: thanh tra đột xuất / đình chỉ hoạt động (Bảng 12.8).`,
        type: 'ALERT',
        entityType: type,
        entityId: id,
      });
    }
  }

  /** Cập nhật lại cho danh sách id (bỏ trùng) */
  async recalcMany(facilityIds: (number | null | undefined)[], suspectIds: (number | null | undefined)[]) {
    for (const id of new Set(facilityIds.filter(Boolean))) await this.recalcFacility(id);
    for (const id of new Set(suspectIds.filter(Boolean))) await this.recalcSuspect(id);
  }
}

