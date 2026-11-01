// =====================================================================
// MODULE QUẢN LÝ NGUỒN THÔNG TIN
// =====================================================================
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, ObjectLiteral, Repository } from 'typeorm';
import bcrypt from 'bcrypt';
import {
  AdItem,
  CrawlJob,
  CrawlSchedule,
  CrawlSource,
  Facility,
  FacilityType,
  Keyword,
  LegalDocument,
  LegalDocumentType,
  License,
  Role,
  SourceCategory,
  Topic,
  User,
} from '../entities';
import { Actor, hasPermission } from '../common/auth';
import { AuditService } from '../core/core.services';
import { DocumentTextService, fileInfo } from '../core/files';
import { extractFacility, extractLegalDocument, extractLicense, missingFields } from '../core/doc-fields';
import { applySearch, paginate, toBool } from '../common/utils/paging';
import { hasInvalidKeywordChars, splitKeywords } from '../common/utils/text';
import { ACCOUNT_TYPE, CRAWL_STATUS, ROLE } from '../common/constants';
import { tempPassword } from '../system-admin/system.service';
import { createAdItems, IntakeItem } from '../ad-processing/ad-intake';
import * as D from './info-source.dto';
import { todayLocal } from '../common/utils/date';

// ---------------------------------------------------------------------
// Danh mục đơn giản dùng chung (mã + tên + kích hoạt)
// ---------------------------------------------------------------------
type CatalogEntity = ObjectLiteral & { id: number; code: string; name: string; isActive: boolean };

export class CatalogHelper<T extends CatalogEntity> {
  constructor(
    private readonly repo: Repository<T>,
    private readonly label: string,
    private readonly entityType: string,
    private readonly audit: AuditService,
    private readonly inUse: (id: number) => Promise<number>,
    private readonly onDeactivate?: (id: number) => Promise<void>,
  ) {}

  list(q: D.CatalogQueryDto) {
    const qb = this.repo.createQueryBuilder('c').orderBy('c.id', 'ASC');
    applySearch(qb, q.search, ['c.code', 'c.name']);
    const a = toBool(q.isActive);
    if (a !== undefined) qb.andWhere('c.isActive = :a', { a });
    return paginate(qb, { ...q, pageSize: q.pageSize ?? 100 });
  }

  async get(id: number) {
    const x = await this.repo.findOne({ where: { id } as any });
    if (!x) throw new NotFoundException(`Không tìm thấy ${this.label}`);
    return x;
  }

  async create(dto: D.CreateCatalogDto, actor: Actor) {
    if (await this.repo.findOne({ where: { code: dto.code } as any })) throw new ConflictException(`Mã ${this.label} đã tồn tại`);
    const x = await this.repo.save(this.repo.create(dto as any) as any);
    await this.audit.log(actor, { action: 'CREATE', module: 'INFO_SOURCE', entityType: this.entityType, entityId: x.id, description: `Thêm ${this.label} ${dto.code}` });
    return x;
  }

  async update(id: number, dto: D.UpdateCatalogDto, actor: Actor) {
    const x = await this.get(id);
    if (dto.code && dto.code !== x.code && (await this.repo.findOne({ where: { code: dto.code } as any }))) {
      throw new ConflictException(`Mã ${this.label} đã tồn tại`);
    }
    Object.assign(x, dto);
    const saved = await this.repo.save(x);
    await this.audit.log(actor, { action: 'UPDATE', module: 'INFO_SOURCE', entityType: this.entityType, entityId: id, metadata: dto });
    return saved;
  }

  async setActive(id: number, isActive: boolean, actor: Actor) {
    const x = await this.get(id);
    (x as any).isActive = isActive;
    await this.repo.save(x);
    if (!isActive && this.onDeactivate) await this.onDeactivate(id);
    await this.audit.log(actor, { action: 'STATUS_CHANGE', module: 'INFO_SOURCE', entityType: this.entityType, entityId: id, description: `${isActive ? 'Kích hoạt' : 'Vô hiệu hóa'} ${this.label} ${x.code}` });
    return x;
  }

  async remove(id: number, actor: Actor) {
    const x = await this.get(id);
    const n = await this.inUse(id);
    if (n) throw new ConflictException(`${this.label} đang được sử dụng (${n} bản ghi), chỉ có thể vô hiệu hóa`);
    await this.repo.delete(id);
    await this.audit.log(actor, { action: 'DELETE', module: 'INFO_SOURCE', entityType: this.entityType, entityId: id, description: `Xóa ${this.label} ${x.code}` });
    return { deleted: true };
  }
}

/** Số văn bản chuẩn: 16/2012/QH13 | 117/2020/NĐ-CP | 09/2015/TT-BYT | 123/SYT-NVY */
const DOC_NUMBER_RE = /^\d{1,5}\/(\d{4}\/)?[A-ZĐ0-9]+(-[A-ZĐ0-9]+)*$/u;

function today() {
  return todayLocal();
}

// ---------------------------------------------------------------------
// Văn bản pháp lý
// ---------------------------------------------------------------------
@Injectable()
export class LegalDocumentsService {
  readonly types: CatalogHelper<LegalDocumentType>;
  constructor(
    @InjectRepository(LegalDocument) private readonly repo: Repository<LegalDocument>,
    @InjectRepository(LegalDocumentType) private readonly typeRepo: Repository<LegalDocumentType>,
    private readonly ds: DataSource,
    private readonly audit: AuditService,
    private readonly docText: DocumentTextService,
  ) {
    this.types = new CatalogHelper(typeRepo, 'loại văn bản', 'legal_document_type', audit, (id) => this.repo.count({ where: { typeId: id } }));
  }

  list(q: D.LegalDocQueryDto, actor: Actor | null) {
    const qb = this.repo.createQueryBuilder('d').leftJoinAndSelect('d.type', 't').orderBy('d.issuedDate', 'DESC', 'NULLS LAST');
    applySearch(qb, q.search, ['d.code', 'd.documentNumber', 'd.title', 'd.issuer', 'd.summary']);
    // Đơn vị KCB / người dân chỉ xem văn bản đang hiệu lực
    if (!hasPermission(actor, 'legal_doc.manage')) qb.andWhere("d.status = 'ACTIVE'");
    else if (q.status) qb.andWhere('d.status = :s', { s: q.status });
    if (q.typeId) qb.andWhere('d.typeId = :t', { t: q.typeId });
    if (q.field) qb.andWhere('d.field ILIKE :f', { f: `%${q.field}%` });
    if (q.issuer) qb.andWhere('d.issuer ILIKE :i', { i: `%${q.issuer}%` });
    if (q.from) qb.andWhere('d.issuedDate >= :from', { from: q.from });
    if (q.to) qb.andWhere('d.issuedDate <= :to', { to: q.to });
    qb.select(['d', 't']);
    return paginate(qb, q).then((r) => ({ ...r, data: r.data.map((d) => ({ ...d, content: undefined })) }));
  }

  async get(id: number, actor: Actor | null) {
    const d = await this.repo.findOne({ where: { id }, relations: { type: true } });
    if (!d || (d.status !== 'ACTIVE' && !hasPermission(actor, 'legal_doc.manage'))) throw new NotFoundException('Không tìm thấy văn bản');
    return d;
  }

  private async validate(dto: Partial<D.CreateLegalDocDto>, id?: number) {
    if (dto.code) {
      const dup = await this.repo.findOne({ where: { code: dto.code } });
      if (dup && dup.id !== id) throw new ConflictException('Mã văn bản đã tồn tại');
    }
    if (dto.documentNumber && !DOC_NUMBER_RE.test(dto.documentNumber.toUpperCase())) {
      throw new BadRequestException('Số văn bản không đúng định dạng (VD 16/2012/QH13, 117/2020/NĐ-CP, 123/SYT-NVY)');
    }
    if (dto.typeId) {
      const t = await this.typeRepo.findOne({ where: { id: dto.typeId } });
      if (!t || !t.isActive) throw new BadRequestException('Loại văn bản không hợp lệ hoặc đã bị vô hiệu hóa');
    }
    if (dto.issuedDate && dto.effectiveDate && dto.effectiveDate < dto.issuedDate) {
      throw new BadRequestException('Ngày hiệu lực không được trước ngày ban hành');
    }
  }

  async create(dto: D.CreateLegalDocDto, actor: Actor) {
    await this.validate(dto);
    const d = await this.repo.save(this.repo.create({ ...dto, status: 'ACTIVE', createdBy: actor.userId }));
    await this.audit.log(actor, { action: 'CREATE', module: 'INFO_SOURCE', entityType: 'legal_document', entityId: d.id, description: `Thêm văn bản ${d.documentNumber}` });
    return d;
  }

  /** Upload PDF/Word -> trích xuất thông tin (bản nháp) / tự lưu nếu đủ trường */
  async importFile(file: Express.Multer.File, autoSave: boolean, actor: Actor) {
    const text = await this.docText.extractText(file);
    const draft: any = extractLegalDocument(text);
    if (draft.typeCode) draft.typeId = (await this.typeRepo.findOne({ where: { code: draft.typeCode } }))?.id;
    const info = fileInfo(file);
    draft.attachmentPath = info.url;
    draft.attachmentName = info.name;
    const missing = missingFields(draft, ['code', 'documentNumber', 'title', 'typeId']);
    let saved: LegalDocument | null = null;
    let saveError: string | null = null;
    if (autoSave && !missing.length) {
      try {
        saved = await this.create(draft, actor);
      } catch (e) {
        saveError = (e as Error).message;
      }
    }
    await this.audit.log(actor, { action: 'IMPORT', module: 'INFO_SOURCE', entityType: 'legal_document', entityId: saved?.id, description: `Trích xuất văn bản từ file ${info.name}` });
    return {
      file: info,
      extractedTextPreview: text.slice(0, 1500),
      draft: { ...draft, content: undefined, contentLength: draft.content?.length ?? 0 },
      missingFields: missing,
      saved,
      saveError,
      next: saved ? 'Đã lưu văn bản' : 'Kiểm tra/bổ sung các trường rồi gọi POST /legal-documents với draft (kèm attachmentPath)',
    };
  }

  async attach(id: number, file: Express.Multer.File, actor: Actor) {
    const d = await this.repo.findOne({ where: { id } });
    if (!d) throw new NotFoundException('Không tìm thấy văn bản');
    const info = fileInfo(file);
    d.attachmentPath = info.url;
    d.attachmentName = info.name;
    try {
      d.content = await this.docText.extractText(file);
    } catch {
      /* file ảnh/scan: giữ nguyên content */
    }
    await this.repo.save(d);
    await this.audit.log(actor, { action: 'UPDATE', module: 'INFO_SOURCE', entityType: 'legal_document', entityId: id, description: `Cập nhật file đính kèm ${info.name}` });
    return d;
  }

  async update(id: number, dto: D.UpdateLegalDocDto, actor: Actor) {
    const d = await this.repo.findOne({ where: { id } });
    if (!d) throw new NotFoundException('Không tìm thấy văn bản');
    await this.validate({ ...d, ...dto } as any, id);
    Object.assign(d, dto, { updatedBy: actor.userId });
    const saved = await this.repo.save(d);
    await this.audit.log(actor, { action: 'UPDATE', module: 'INFO_SOURCE', entityType: 'legal_document', entityId: id, metadata: dto });
    return saved;
  }

  async setStatus(id: number, status: string, actor: Actor) {
    const d = await this.repo.findOne({ where: { id } });
    if (!d) throw new NotFoundException('Không tìm thấy văn bản');
    d.status = status;
    d.updatedBy = actor.userId;
    await this.repo.save(d);
    await this.audit.log(actor, { action: 'STATUS_CHANGE', module: 'INFO_SOURCE', entityType: 'legal_document', entityId: id, description: `${status === 'ACTIVE' ? 'Kích hoạt' : 'Vô hiệu hóa'} văn bản ${d.documentNumber} (AI ${status === 'ACTIVE' ? 'được' : 'không còn'} dùng làm căn cứ)` });
    return d;
  }

  /** Không cho xóa văn bản đang dùng làm căn cứ (loại vi phạm, kết quả AI, lịch sử kiểm tra) */
  async remove(id: number, actor: Actor) {
    const d = await this.repo.findOne({ where: { id } });
    if (!d) throw new NotFoundException('Không tìm thấy văn bản');
    const [{ n }] = await this.ds.query(
      `SELECT (SELECT count(*) FROM violation_types WHERE legal_document_id = $1)
            + (SELECT count(*) FROM ai_analyses WHERE legal_refs @> $2::jsonb)
            + (SELECT count(*) FROM precheck_requests WHERE extracted->'legalRefs' @> $2::jsonb) AS n`,
      [id, JSON.stringify([{ id }])],
    );
    if (Number(n)) throw new ConflictException(`Văn bản đang được AI / lịch sử kiểm tra sử dụng (${n} lần), chỉ có thể vô hiệu hóa`);
    await this.repo.delete(id);
    await this.audit.log(actor, { action: 'DELETE', module: 'INFO_SOURCE', entityType: 'legal_document', entityId: id, description: `Xóa văn bản ${d.documentNumber}` });
    return { deleted: true };
  }
}

// ---------------------------------------------------------------------
// Đơn vị khám chữa bệnh
// ---------------------------------------------------------------------
@Injectable()
export class FacilitiesService {
  readonly types: CatalogHelper<FacilityType>;
  constructor(
    @InjectRepository(Facility) private readonly repo: Repository<Facility>,
    @InjectRepository(FacilityType) private readonly typeRepo: Repository<FacilityType>,
    @InjectRepository(License) private readonly licenses: Repository<License>,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Role) private readonly roles: Repository<Role>,
    private readonly ds: DataSource,
    private readonly audit: AuditService,
    private readonly docText: DocumentTextService,
  ) {
    this.types = new CatalogHelper(typeRepo, 'loại đơn vị KCB', 'facility_type', audit, (id) => this.repo.count({ where: { typeId: id } }));
  }

  list(q: D.FacilityQueryDto) {
    const qb = this.repo.createQueryBuilder('f').leftJoinAndSelect('f.type', 't').orderBy('f.id', 'ASC');
    applySearch(qb, q.search, ['f.code', 'f.name', 'f.licenseNumber', 'f.address', 'f.representative']);
    if (q.typeId) qb.andWhere('f.typeId = :t', { t: q.typeId });
    if (q.district) qb.andWhere('f.district ILIKE :d', { d: `%${q.district}%` });
    if (q.operatingStatus) qb.andWhere('f.operatingStatus = :os', { os: q.operatingStatus });
    if (q.riskLevel) qb.andWhere('f.riskLevel = :rl', { rl: q.riskLevel });
    const a = toBool(q.isActive);
    if (a !== undefined) qb.andWhere('f.isActive = :a', { a });
    const b = toBool(q.isBlacklisted);
    if (b !== undefined) qb.andWhere('f.isBlacklisted = :b', { b });
    return paginate(qb, q);
  }

  async get(id: number) {
    const f = await this.repo.findOne({ where: { id }, relations: { type: true, licenses: true } });
    if (!f) throw new NotFoundException('Không tìm thấy đơn vị KCB');
    const accounts = await this.users.find({ where: { facilityId: id }, select: { id: true, username: true, email: true, status: true, lastLoginAt: true } });
    const [stats] = await this.ds.query(
      `SELECT count(*)::int AS total,
              count(*) FILTER (WHERE status NOT IN ('RESOLVED','DISMISSED'))::int AS open,
              max(detected_at) AS last_detected
       FROM violations WHERE facility_id = $1`,
      [id],
    );
    const t = today();
    return {
      ...f,
      licenses: (f.licenses ?? []).map((l) => ({ ...l, isExpired: !!l.expiryDate && l.expiryDate < t })),
      accounts,
      violationStats: stats,
    };
  }

  private async validateType(typeId?: number | null) {
    if (!typeId) return;
    const t = await this.typeRepo.findOne({ where: { id: typeId } });
    if (!t || !t.isActive) throw new BadRequestException('Loại đơn vị không hợp lệ hoặc đã bị vô hiệu hóa');
  }

  /**
   * Thêm đơn vị KCB:
   *  - Mã đơn vị, số giấy phép không trùng
   *  - Tự tạo giấy phép hoạt động (GPHĐ) trong danh mục giấy phép
   *  - Tự tạo TÀI KHOẢN đăng nhập cho cơ sở (username = mã đơn vị, mật khẩu tạm trả về 1 lần)
   */
  async create(dto: D.CreateFacilityDto, actor: Actor) {
    if (await this.repo.findOne({ where: { code: dto.code } })) throw new ConflictException('Mã đơn vị đã tồn tại');
    if (await this.repo.findOne({ where: { licenseNumber: dto.licenseNumber } })) throw new ConflictException('Số giấy phép hoạt động đã được dùng cho đơn vị khác');
    await this.validateType(dto.typeId);
    const { createAccount, ...data } = dto;

    return this.ds.transaction(async (m) => {
      const f = await m.save(
        m.create(Facility, { ...data, licensedTechniques: dto.licensedTechniques ?? [], province: dto.province ?? 'TP. Hồ Chí Minh', createdBy: actor.userId }),
      );
      const existsLic = await m.findOne(License, { where: { licenseType: 'GPHD', licenseNumber: dto.licenseNumber } });
      if (!existsLic) {
        await m.save(
          m.create(License, {
            licenseNumber: dto.licenseNumber,
            licenseType: 'GPHD',
            facilityId: f.id,
            holderName: f.name,
            issuedDate: dto.licenseIssuedDate,
            issuer: 'Sở Y tế TP.HCM',
            scope: dto.professionalScope,
            status: 'ACTIVE',
            createdBy: actor.userId,
          }),
        );
      }
      let account: any = null;
      if (createAccount !== false) {
        const username = dto.code.toLowerCase();
        let email = (dto.email || `${username}@cskcb.local`).toLowerCase();
        if (await m.findOne(User, { where: { email } })) email = `${username}@cskcb.local`;
        if (await m.findOne(User, { where: [{ username }, { email }] })) {
          account = { skipped: true, reason: 'Tên đăng nhập / email đã tồn tại' };
        } else {
          const password = tempPassword();
          const role = await m.findOne(Role, { where: { roleCode: ROLE.FACILITY } });
          const u = await m.save(
            m.create(User, {
              username,
              email,
              fullName: f.name,
              phoneNumber: f.phone,
              passwordHash: await bcrypt.hash(password, 10),
              status: 'ACTIVE',
              accountType: ACCOUNT_TYPE.FACILITY,
              facilityId: f.id,
              createdBy: actor.userId,
              roles: role ? [role] : [],
            }),
          );
          account = { userId: u.id, username, email, temporaryPassword: password, note: 'Mật khẩu chỉ hiển thị 1 lần — gửi cho cơ sở và yêu cầu đổi mật khẩu' };
        }
      }
      await this.audit.log(actor, { action: 'CREATE', module: 'INFO_SOURCE', entityType: 'facility', entityId: f.id, description: `Thêm đơn vị KCB ${f.code} - ${f.name}` });
      return { facility: f, account };
    });
  }

  async importFile(file: Express.Multer.File, autoSave: boolean, actor: Actor) {
    const text = await this.docText.extractText(file);
    const draft: any = extractFacility(text);
    if (draft.typeCode) draft.typeId = (await this.typeRepo.findOne({ where: { code: draft.typeCode } }))?.id;
    const required = ['code', 'name', 'address', 'organizationForm', 'professionalScope', 'workingHours', 'licenseNumber', 'licenseIssuedDate'];
    const missing = missingFields(draft, required);
    let saved: any = null;
    let saveError: string | null = null;
    if (autoSave && !missing.length) {
      try {
        const { typeCode, ...rest } = draft;
        saved = await this.create(rest, actor);
      } catch (e) {
        saveError = (e as Error).message;
      }
    }
    return { file: fileInfo(file), extractedTextPreview: text.slice(0, 1500), draft, missingFields: missing, saved, saveError };
  }

  async update(id: number, dto: D.UpdateFacilityDto, actor: Actor) {
    const f = await this.repo.findOne({ where: { id } });
    if (!f) throw new NotFoundException('Không tìm thấy đơn vị KCB');
    if (dto.licenseNumber && dto.licenseNumber !== f.licenseNumber && (await this.repo.findOne({ where: { licenseNumber: dto.licenseNumber } }))) {
      throw new ConflictException('Số giấy phép đã được dùng cho đơn vị khác');
    }
    await this.validateType(dto.typeId);
    Object.assign(f, dto);
    const saved = await this.repo.save(f);
    await this.audit.log(actor, { action: 'UPDATE', module: 'INFO_SOURCE', entityType: 'facility', entityId: id, metadata: dto });
    return saved;
  }

  async setActive(id: number, isActive: boolean, actor: Actor) {
    const f = await this.repo.findOne({ where: { id } });
    if (!f) throw new NotFoundException('Không tìm thấy đơn vị KCB');
    f.isActive = isActive;
    await this.repo.save(f);
    // Khóa / mở tài khoản đăng nhập của cơ sở theo trạng thái
    await this.users.update({ facilityId: id }, { status: isActive ? 'ACTIVE' : 'LOCKED' });
    await this.audit.log(actor, { action: 'STATUS_CHANGE', module: 'INFO_SOURCE', entityType: 'facility', entityId: id, description: `${isActive ? 'Kích hoạt' : 'Vô hiệu hóa'} đơn vị ${f.code}` });
    return f;
  }

  async setOperatingStatus(id: number, dto: D.OperatingStatusDto, actor: Actor) {
    const f = await this.repo.findOne({ where: { id } });
    if (!f) throw new NotFoundException('Không tìm thấy đơn vị KCB');
    const before = f.operatingStatus;
    f.operatingStatus = dto.operatingStatus;
    if (dto.note) f.note = [f.note, `[${today()}] ${dto.note}`].filter(Boolean).join('\n');
    await this.repo.save(f);
    if (dto.operatingStatus === 'REVOKED') {
      await this.licenses.update({ facilityId: id, licenseType: 'GPHD' }, { status: 'INACTIVE' });
    }
    await this.audit.log(actor, { action: 'STATUS_CHANGE', module: 'INFO_SOURCE', entityType: 'facility', entityId: id, description: `Đổi trạng thái hoạt động ${before} -> ${dto.operatingStatus}`, metadata: dto });
    return f;
  }

  async setBlacklist(id: number, dto: D.BlacklistDto, actor: Actor) {
    const f = await this.repo.findOne({ where: { id } });
    if (!f) throw new NotFoundException('Không tìm thấy đơn vị KCB');
    f.isBlacklisted = dto.isBlacklisted;
    if (dto.note) f.note = [f.note, `[${today()}] ${dto.note}`].filter(Boolean).join('\n');
    await this.repo.save(f);
    await this.audit.log(actor, { action: 'STATUS_CHANGE', module: 'VIOLATION', entityType: 'facility', entityId: id, description: `${dto.isBlacklisted ? 'Đưa vào' : 'Gỡ khỏi'} danh sách đen: ${f.name}` });
    return f;
  }

  async resetAccountPassword(id: number, actor: Actor) {
    const u = await this.users.findOne({ where: { facilityId: id } });
    if (!u) throw new NotFoundException('Cơ sở chưa có tài khoản');
    const pwd = tempPassword();
    await this.users.update(u.id, { passwordHash: await bcrypt.hash(pwd, 10), refreshToken: null as any });
    await this.audit.log(actor, { action: 'RESET_PASSWORD', module: 'INFO_SOURCE', entityType: 'user', entityId: u.id, description: `Đặt lại mật khẩu tài khoản cơ sở ${u.username}` });
    return { username: u.username, email: u.email, temporaryPassword: pwd };
  }

  async remove(id: number, actor: Actor) {
    const f = await this.repo.findOne({ where: { id } });
    if (!f) throw new NotFoundException('Không tìm thấy đơn vị KCB');
    const [{ n }] = await this.ds.query(
      `SELECT (SELECT count(*) FROM violations WHERE facility_id = $1)
            + (SELECT count(*) FROM precheck_requests WHERE facility_id = $1)
            + (SELECT count(*) FROM ad_items WHERE facility_id = $1)
            + (SELECT count(*) FROM facility_feedbacks WHERE facility_id = $1) AS n`,
      [id],
    );
    if (Number(n)) throw new ConflictException('Đơn vị đã phát sinh dữ liệu (vi phạm, kiểm tra, mẫu tin), chỉ có thể vô hiệu hóa');
    await this.ds.transaction(async (m) => {
      const users = await m.find(User, { where: { facilityId: id } });
      for (const u of users) {
        await m.query('DELETE FROM user_roles WHERE user_id = $1', [u.id]);
        await m.query('DELETE FROM notifications WHERE user_id = $1', [u.id]);
        await m.delete(User, u.id);
      }
      await m.delete(License, { facilityId: id });
      await m.query('UPDATE whitelist_entries SET facility_id = NULL WHERE facility_id = $1', [id]);
      await m.delete(Facility, id);
    });
    await this.audit.log(actor, { action: 'DELETE', module: 'INFO_SOURCE', entityType: 'facility', entityId: id, description: `Xóa đơn vị ${f.code}` });
    return { deleted: true };
  }
}

// ---------------------------------------------------------------------
// Giấy phép
// ---------------------------------------------------------------------
@Injectable()
export class LicensesService {
  constructor(
    @InjectRepository(License) private readonly repo: Repository<License>,
    @InjectRepository(Facility) private readonly facilities: Repository<Facility>,
    private readonly ds: DataSource,
    private readonly audit: AuditService,
    private readonly docText: DocumentTextService,
  ) {}

  private decorate(l: License) {
    const t = today();
    const isExpired = !!l.expiryDate && l.expiryDate < t;
    const daysToExpiry = l.expiryDate ? Math.round((new Date(l.expiryDate).getTime() - Date.now()) / 86400_000) : null;
    return { ...l, isExpired, daysToExpiry, usableByAi: l.status === 'ACTIVE' && !isExpired };
  }

  async list(q: D.LicenseQueryDto) {
    const qb = this.repo.createQueryBuilder('l').leftJoinAndSelect('l.facility', 'f').orderBy('l.id', 'ASC');
    applySearch(qb, q.search, ['l.licenseNumber', 'l.holderName', 'f.name', 'f.code']);
    if (q.licenseType) qb.andWhere('l.licenseType = :t', { t: q.licenseType });
    if (q.facilityId) qb.andWhere('l.facilityId = :f', { f: q.facilityId });
    if (q.status) qb.andWhere('l.status = :s', { s: q.status });
    if (toBool(q.expired)) qb.andWhere('l.expiryDate < CURRENT_DATE');
    if (q.expiringInDays) qb.andWhere("l.expiryDate BETWEEN CURRENT_DATE AND CURRENT_DATE + (:d || ' days')::interval", { d: q.expiringInDays });
    const r = await paginate(qb, q);
    return { ...r, data: r.data.map((l) => this.decorate(l)) };
  }

  async get(id: number) {
    const l = await this.repo.findOne({ where: { id }, relations: { facility: true } });
    if (!l) throw new NotFoundException('Không tìm thấy giấy phép');
    return this.decorate(l);
  }

  /** Tra cứu nhanh tính hợp lệ của một số giấy phép / chứng chỉ */
  async verify(number: string) {
    if (!number) throw new BadRequestException('Thiếu số giấy phép');
    const list = await this.repo.createQueryBuilder('l').leftJoinAndSelect('l.facility', 'f').where('LOWER(l.licenseNumber) = LOWER(:n)', { n: number.trim() }).getMany();
    if (!list.length) return { number, found: false, result: 'Không có dữ liệu', message: 'Số giấy phép không có trong CSDL của Sở Y tế' };
    return {
      number,
      found: true,
      licenses: list.map((l) => {
        const d = this.decorate(l);
        return {
          licenseType: l.licenseType,
          holderName: l.holderName,
          facility: l.facility ? { id: l.facility.id, name: l.facility.name, operatingStatus: l.facility.operatingStatus } : null,
          issuedDate: l.issuedDate,
          expiryDate: l.expiryDate,
          scope: l.scope,
          valid: d.usableByAi && (!l.facility || l.facility.operatingStatus === 'ACTIVE'),
          status: l.status,
          isExpired: d.isExpired,
        };
      }),
    };
  }

  private async validate(dto: Partial<D.CreateLicenseDto>, id?: number) {
    if (dto.licenseType && dto.licenseNumber) {
      const dup = await this.repo.findOne({ where: { licenseType: dto.licenseType, licenseNumber: dto.licenseNumber } });
      if (dup && dup.id !== id) throw new ConflictException('Số giấy phép đã tồn tại');
    }
    if (['GPHD', 'XNQC'].includes(dto.licenseType ?? '') && !dto.facilityId) {
      throw new BadRequestException('Giấy phép hoạt động / xác nhận quảng cáo phải gắn với đơn vị KCB (facilityId)');
    }
    if (dto.licenseType === 'CCHN' && !dto.holderName) throw new BadRequestException('Chứng chỉ hành nghề phải có họ tên người được cấp');
    if (dto.facilityId) {
      const f = await this.facilities.findOne({ where: { id: dto.facilityId } });
      if (!f) throw new BadRequestException('Đơn vị KCB không tồn tại');
    }
    if (dto.issuedDate && dto.expiryDate && dto.expiryDate < dto.issuedDate) throw new BadRequestException('Ngày hết hạn phải sau ngày cấp');
  }

  async create(dto: D.CreateLicenseDto, actor: Actor) {
    await this.validate(dto);
    const l = await this.repo.save(this.repo.create({ ...dto, status: 'ACTIVE', createdBy: actor.userId }));
    await this.audit.log(actor, { action: 'CREATE', module: 'INFO_SOURCE', entityType: 'license', entityId: l.id, description: `Thêm giấy phép ${l.licenseType} ${l.licenseNumber}` });
    return this.get(l.id);
  }

  async importFile(file: Express.Multer.File, autoSave: boolean, actor: Actor) {
    const text = await this.docText.extractText(file);
    const draft: any = extractLicense(text);
    if (!draft.facilityId && (draft.facilityCode || draft.facilityName)) {
      const f = draft.facilityCode
        ? await this.facilities.findOne({ where: { code: draft.facilityCode } })
        : await this.facilities.createQueryBuilder('f').where('f.name ILIKE :n', { n: `%${draft.facilityName}%` }).getOne();
      if (f) draft.facilityId = f.id;
    }
    const info = fileInfo(file);
    draft.attachmentPath = info.url;
    draft.attachmentName = info.name;
    const required = ['licenseNumber', 'licenseType', 'issuedDate', ...(['GPHD', 'XNQC'].includes(draft.licenseType) ? ['facilityId'] : []), ...(draft.licenseType === 'CCHN' ? ['holderName'] : [])];
    const missing = missingFields(draft, required);
    let saved: any = null;
    let saveError: string | null = null;
    if (autoSave && !missing.length) {
      try {
        const { facilityCode, facilityName, ...rest } = draft;
        saved = await this.create(rest, actor);
      } catch (e) {
        saveError = (e as Error).message;
      }
    }
    return { file: info, extractedTextPreview: text.slice(0, 1500), draft, missingFields: missing, saved, saveError };
  }

  async attach(id: number, file: Express.Multer.File, actor: Actor) {
    const l = await this.repo.findOne({ where: { id } });
    if (!l) throw new NotFoundException('Không tìm thấy giấy phép');
    const info = fileInfo(file);
    l.attachmentPath = info.url;
    l.attachmentName = info.name;
    await this.repo.save(l);
    await this.audit.log(actor, { action: 'UPDATE', module: 'INFO_SOURCE', entityType: 'license', entityId: id, description: `Đính kèm ${info.name}` });
    return this.get(id);
  }

  async update(id: number, dto: D.UpdateLicenseDto, actor: Actor) {
    const l = await this.repo.findOne({ where: { id } });
    if (!l) throw new NotFoundException('Không tìm thấy giấy phép');
    await this.validate({ ...l, ...dto } as any, id);
    Object.assign(l, dto);
    await this.repo.save(l);
    await this.audit.log(actor, { action: 'UPDATE', module: 'INFO_SOURCE', entityType: 'license', entityId: id, metadata: dto });
    return this.get(id);
  }

  async setStatus(id: number, status: string, actor: Actor) {
    const l = await this.repo.findOne({ where: { id } });
    if (!l) throw new NotFoundException('Không tìm thấy giấy phép');
    l.status = status;
    await this.repo.save(l);
    await this.audit.log(actor, { action: 'STATUS_CHANGE', module: 'INFO_SOURCE', entityType: 'license', entityId: id, description: `${status === 'ACTIVE' ? 'Kích hoạt' : 'Vô hiệu hóa'} giấy phép ${l.licenseNumber}` });
    return this.get(id);
  }

  async remove(id: number, actor: Actor) {
    const l = await this.repo.findOne({ where: { id } });
    if (!l) throw new NotFoundException('Không tìm thấy giấy phép');
    const like = `%${l.licenseNumber}%`;
    const [{ n }] = await this.ds.query(
      `SELECT (SELECT count(*) FROM ai_analyses WHERE extracted_entities::text ILIKE $1)
            + (SELECT count(*) FROM precheck_requests WHERE extracted::text ILIKE $1 OR checks::text ILIKE $1) AS n`,
      [like],
    );
    if (Number(n)) throw new ConflictException('Giấy phép đang được AI / lịch sử kiểm tra quảng cáo sử dụng, chỉ có thể vô hiệu hóa');
    await this.repo.delete(id);
    await this.audit.log(actor, { action: 'DELETE', module: 'INFO_SOURCE', entityType: 'license', entityId: id, description: `Xóa giấy phép ${l.licenseNumber}` });
    return { deleted: true };
  }
}

// ---------------------------------------------------------------------
// Thu thập tin: phân loại nguồn, nguồn, chủ đề, từ khóa, lịch thu thập, phiên thu thập
// ---------------------------------------------------------------------
@Injectable()
export class CrawlService {
  readonly categories: CatalogHelper<SourceCategory>;
  readonly topics: CatalogHelper<Topic>;
  constructor(
    @InjectRepository(SourceCategory) catRepo: Repository<SourceCategory>,
    @InjectRepository(CrawlSource) private readonly sources: Repository<CrawlSource>,
    @InjectRepository(Topic) private readonly topicRepo: Repository<Topic>,
    @InjectRepository(Keyword) private readonly keywords: Repository<Keyword>,
    @InjectRepository(CrawlSchedule) private readonly schedules: Repository<CrawlSchedule>,
    @InjectRepository(CrawlJob) private readonly jobs: Repository<CrawlJob>,
    @InjectRepository(AdItem) private readonly adItems: Repository<AdItem>,
    @InjectRepository(Facility) private readonly facilities: Repository<Facility>,
    @InjectRepository(License) private readonly licenses: Repository<License>,
    private readonly audit: AuditService,
  ) {
    // Quy tắc 10.8.2: vô hiệu hóa loại nguồn -> vô hiệu hóa các nguồn thuộc loại đó (và dừng lịch thu thập)
    this.categories = new CatalogHelper(
      catRepo,
      'loại nguồn thu thập',
      'source_category',
      audit,
      (id) => this.sources.count({ where: { categoryId: id } }),
      async (id) => {
        const list = await this.sources.find({ where: { categoryId: id } });
        if (!list.length) return;
        await this.sources.update({ categoryId: id }, { isActive: false });
        await this.schedules.update({ sourceId: In(list.map((s) => s.id)) }, { status: CRAWL_STATUS.STOPPED });
      },
    );
    this.topics = new CatalogHelper(
      topicRepo,
      'chủ đề',
      'topic',
      audit,
      (id) => this.schedules.count({ where: { topicId: id } }),
      async (id) => {
        await this.schedules.update({ topicId: id, status: CRAWL_STATUS.RUNNING }, { status: CRAWL_STATUS.PAUSED });
      },
    );
  }

  // ----- Nguồn thu thập -----
  listSources(q: D.CatalogQueryDto & { categoryId?: number }) {
    const qb = this.sources.createQueryBuilder('s').leftJoinAndSelect('s.category', 'c').orderBy('s.id', 'ASC');
    applySearch(qb, q.search, ['s.name', 's.url', 's.platform']);
    const a = toBool(q.isActive);
    if (a !== undefined) qb.andWhere('s.isActive = :a', { a });
    if (q.categoryId) qb.andWhere('s.categoryId = :c', { c: q.categoryId });
    return paginate(qb, { ...q, pageSize: q.pageSize ?? 100 });
  }

  private async assertCategory(id: number) {
    const c = await this.categories.get(id);
    if (!c.isActive) throw new BadRequestException('Loại nguồn đang bị vô hiệu hóa');
  }

  async createSource(dto: D.CreateSourceDto, actor: Actor) {
    await this.assertCategory(dto.categoryId);
    const s = await this.sources.save(this.sources.create(dto));
    await this.audit.log(actor, { action: 'CREATE', module: 'INFO_SOURCE', entityType: 'crawl_source', entityId: s.id, description: `Thêm nguồn ${s.name}` });
    return s;
  }

  async updateSource(id: number, dto: D.UpdateSourceDto, actor: Actor) {
    const s = await this.sources.findOne({ where: { id } });
    if (!s) throw new NotFoundException('Không tìm thấy nguồn');
    if (dto.categoryId) await this.assertCategory(dto.categoryId);
    Object.assign(s, dto);
    await this.audit.log(actor, { action: 'UPDATE', module: 'INFO_SOURCE', entityType: 'crawl_source', entityId: id, metadata: dto });
    return this.sources.save(s);
  }

  async setSourceActive(id: number, isActive: boolean, actor: Actor) {
    const s = await this.sources.findOne({ where: { id }, relations: { category: true } });
    if (!s) throw new NotFoundException('Không tìm thấy nguồn');
    if (isActive && s.category && !s.category.isActive) throw new BadRequestException('Phải kích hoạt loại nguồn trước');
    s.isActive = isActive;
    await this.sources.save(s);
    if (!isActive) await this.schedules.update({ sourceId: id }, { status: CRAWL_STATUS.STOPPED });
    await this.audit.log(actor, { action: 'STATUS_CHANGE', module: 'INFO_SOURCE', entityType: 'crawl_source', entityId: id, description: `${isActive ? 'Kích hoạt' : 'Vô hiệu hóa'} nguồn ${s.name}` });
    return s;
  }

  async removeSource(id: number, actor: Actor) {
    if (await this.schedules.count({ where: { sourceId: id } })) throw new ConflictException('Nguồn đang có lịch thu thập, chỉ có thể vô hiệu hóa');
    await this.sources.delete(id);
    await this.audit.log(actor, { action: 'DELETE', module: 'INFO_SOURCE', entityType: 'crawl_source', entityId: id });
    return { deleted: true };
  }

  // ----- Từ khóa theo chủ đề -----
  async topicDetail(id: number) {
    const t = await this.topicRepo.findOne({ where: { id }, relations: { keywords: true } });
    if (!t) throw new NotFoundException('Không tìm thấy chủ đề');
    return t;
  }

  async addKeyword(topicId: number, dto: D.CreateKeywordDto, actor: Actor) {
    await this.topics.get(topicId);
    const kw = dto.keyword.trim();
    if (hasInvalidKeywordChars(kw)) throw new BadRequestException('Từ khóa chứa ký tự đặc biệt không hợp lệ');
    if (await this.keywords.findOne({ where: { topicId, keyword: kw } })) throw new ConflictException('Từ khóa đã có trong chủ đề');
    const k = await this.keywords.save(this.keywords.create({ topicId, keyword: kw, keywordType: dto.keywordType ?? 'PRIMARY' }));
    await this.audit.log(actor, { action: 'CREATE', module: 'INFO_SOURCE', entityType: 'keyword', entityId: k.id, description: `Thêm từ khóa "${kw}"` });
    return k;
  }

  async updateKeyword(id: number, dto: D.UpdateKeywordDto, actor: Actor) {
    const k = await this.keywords.findOne({ where: { id } });
    if (!k) throw new NotFoundException('Không tìm thấy từ khóa');
    if (dto.keyword) {
      if (hasInvalidKeywordChars(dto.keyword)) throw new BadRequestException('Từ khóa chứa ký tự đặc biệt không hợp lệ');
      dto.keyword = dto.keyword.trim();
    }
    Object.assign(k, dto);
    await this.audit.log(actor, { action: 'UPDATE', module: 'INFO_SOURCE', entityType: 'keyword', entityId: id, metadata: dto });
    return this.keywords.save(k);
  }

  async removeKeyword(id: number, actor: Actor) {
    await this.keywords.delete(id);
    await this.audit.log(actor, { action: 'DELETE', module: 'INFO_SOURCE', entityType: 'keyword', entityId: id });
    return { deleted: true };
  }

  // ----- Lịch thu thập -----
  listSchedules(q: D.ScheduleQueryDto) {
    const qb = this.schedules
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.source', 'src')
      .leftJoinAndSelect('s.topic', 't')
      .orderBy('s.id', 'ASC');
    applySearch(qb, q.search, ['s.code', 's.name', 's.primaryKeywords', 's.secondaryKeywords']);
    if (q.status) qb.andWhere('s.status = :st', { st: q.status });
    if (q.sourceId) qb.andWhere('s.sourceId = :sid', { sid: q.sourceId });
    if (q.topicId) qb.andWhere('s.topicId = :tid', { tid: q.topicId });
    return paginate(qb, q);
  }

  async getSchedule(id: number) {
    const s = await this.schedules.findOne({ where: { id }, relations: { source: { category: true }, topic: true } });
    if (!s) throw new NotFoundException('Không tìm thấy lịch thu thập');
    const recentJobs = await this.jobs.find({ where: { scheduleId: id }, order: { startedAt: 'DESC' }, take: 10 });
    return { ...s, recentJobs };
  }

  private validateKeywords(primary?: string, secondary?: string) {
    if (primary !== undefined) {
      const list = splitKeywords(primary);
      if (!list.length) throw new BadRequestException('Từ khóa chính không được để trống');
      if (list.some(hasInvalidKeywordChars)) throw new BadRequestException('Từ khóa chứa ký tự đặc biệt không hợp lệ');
    }
    if (secondary && splitKeywords(secondary).some(hasInvalidKeywordChars)) throw new BadRequestException('Từ khóa phụ chứa ký tự đặc biệt không hợp lệ');
  }

  private async assertRefs(sourceId?: number, topicId?: number | null) {
    if (sourceId) {
      const s = await this.sources.findOne({ where: { id: sourceId } });
      if (!s) throw new BadRequestException('Nguồn thu thập không tồn tại');
    }
    if (topicId) {
      const t = await this.topicRepo.findOne({ where: { id: topicId } });
      if (!t) throw new BadRequestException('Chủ đề không tồn tại');
    }
  }

  async createSchedule(dto: D.CreateScheduleDto, actor: Actor) {
    if (await this.schedules.findOne({ where: { code: dto.code } })) throw new ConflictException('Mã lịch thu thập đã tồn tại');
    this.validateKeywords(dto.primaryKeywords, dto.secondaryKeywords);
    await this.assertRefs(dto.sourceId, dto.topicId);
    const s = await this.schedules.save(this.schedules.create({ ...dto, status: CRAWL_STATUS.STOPPED, createdBy: actor.userId }));
    await this.audit.log(actor, { action: 'CREATE', module: 'INFO_SOURCE', entityType: 'crawl_schedule', entityId: s.id, description: `Thêm lịch thu thập ${s.code}` });
    return s;
  }

  async updateSchedule(id: number, dto: D.UpdateScheduleDto, actor: Actor) {
    const s = await this.schedules.findOne({ where: { id } });
    if (!s) throw new NotFoundException('Không tìm thấy lịch thu thập');
    this.validateKeywords(dto.primaryKeywords, dto.secondaryKeywords);
    await this.assertRefs(dto.sourceId, dto.topicId);
    Object.assign(s, dto);
    await this.audit.log(actor, { action: 'UPDATE', module: 'INFO_SOURCE', entityType: 'crawl_schedule', entityId: id, metadata: dto });
    return this.schedules.save(s);
  }

  async setScheduleStatus(id: number, status: string, actor: Actor) {
    const s = await this.schedules.findOne({ where: { id }, relations: { source: { category: true }, topic: true } });
    if (!s) throw new NotFoundException('Không tìm thấy lịch thu thập');
    if (status === CRAWL_STATUS.RUNNING) {
      if (!s.source?.isActive || (s.source.category && !s.source.category.isActive)) throw new BadRequestException('Nguồn thu thập đang bị vô hiệu hóa');
      if (s.topic && !s.topic.isActive) throw new BadRequestException('Chủ đề đang bị vô hiệu hóa');
    }
    s.status = status;
    await this.schedules.save(s);
    await this.audit.log(actor, { action: 'STATUS_CHANGE', module: 'INFO_SOURCE', entityType: 'crawl_schedule', entityId: id, description: `Lịch ${s.code}: ${status}` });
    return s;
  }

  async removeSchedule(id: number, actor: Actor) {
    const s = await this.schedules.findOne({ where: { id } });
    if (!s) throw new NotFoundException('Không tìm thấy lịch thu thập');
    if (s.status === CRAWL_STATUS.RUNNING) throw new BadRequestException('Hãy dừng lịch trước khi xóa');
    await this.schedules.delete(id);
    await this.audit.log(actor, { action: 'DELETE', module: 'INFO_SOURCE', entityType: 'crawl_schedule', entityId: id, description: `Xóa lịch ${s.code}` });
    return { deleted: true };
  }

  listJobs(q: D.ListQueryDto & { scheduleId?: number }) {
    const qb = this.jobs.createQueryBuilder('j').leftJoinAndSelect('j.schedule', 's').orderBy('j.startedAt', 'DESC');
    if (q.scheduleId) qb.andWhere('j.scheduleId = :s', { s: q.scheduleId });
    return paginate(qb, q);
  }

  /**
   * Chạy một phiên thu thập:
   *  - items có dữ liệu: nhận dữ liệu thật từ crawler bên ngoài
   *  - không có items: GIẢ LẬP crawler sinh mẫu tin từ từ khóa của lịch (để demo / test)
   * Mẫu tin vào trạng thái COLLECTED -> hiển thị ở "Kết quả thu thập tin".
   */
  async runSchedule(id: number, dto: D.RunScheduleDto, actor: Actor) {
    const s = await this.schedules.findOne({ where: { id }, relations: { source: true, topic: true } });
    if (!s) throw new NotFoundException('Không tìm thấy lịch thu thập');
    if (s.status !== CRAWL_STATUS.RUNNING) throw new BadRequestException('Lịch thu thập chưa được kích hoạt (POST /crawl-schedules/:id/start)');
    const job = await this.jobs.save(this.jobs.create({ scheduleId: s.id, status: 'RUNNING', triggeredBy: actor.userId }));
    const items: IntakeItem[] = dto.items?.length
      ? dto.items
      : await this.simulate(s, Math.min(dto.count ?? 5, s.sampleLimit));
    const created = await createAdItems(this.adItems, items, {
      sourceType: 'CRAWLER',
      crawlJobId: job.id,
      scheduleId: s.id,
      crawlSourceId: s.sourceId,
      topicId: s.topicId ?? null,
      platform: s.source?.platform,
    });
    job.status = 'COMPLETED';
    job.finishedAt = new Date();
    job.itemsCollected = created.length;
    job.note = dto.items?.length ? 'Dữ liệu từ crawler' : 'Dữ liệu giả lập (demo)';
    await this.jobs.save(job);
    s.lastRunAt = new Date();
    await this.schedules.save(s);
    await this.audit.log(actor, { action: 'CRAWL', module: 'INFO_SOURCE', entityType: 'crawl_job', entityId: job.id, description: `Lịch ${s.code} thu thập ${created.length} mẫu tin` });
    return { job, items: created.map((i) => ({ id: i.id, code: i.code, title: i.title, status: i.status })) };
  }

  private async simulate(s: CrawlSchedule, count: number): Promise<IntakeItem[]> {
    const kws = [...splitKeywords(s.primaryKeywords), ...splitKeywords(s.secondaryKeywords)];
    const facilities = (await this.facilities.find({ take: 10 })).map((f) => f.name);
    const doctors = (await this.licenses.find({ where: { licenseType: 'CCHN' }, take: 10 })).map((l) => l.holderName!).filter(Boolean);
    const fakeFacilities = ['Phòng khám Ánh Dương', 'Thẩm mỹ viện Kim Cương', 'Spa Ngọc Trinh Beauty', 'Nha khoa Hoàn Mỹ Plus'];
    const fakeDoctors = ['Ngô Thanh Tùng', 'Vũ Thị Hạnh', 'Đặng Quốc Bảo'];
    const pick = <T>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
    const phone = () => `09${Math.floor(10000000 + Math.random() * 89999999)}`;
    const templates = [
      (kw: string) => `${pick([...facilities, ...fakeFacilities])} ưu đãi ${kw} giảm 40%, cam kết hiệu quả 100%, không đau, bảo hành trọn đời. Hotline ${phone()}.`,
      (kw: string) => `Chia sẻ kinh nghiệm: trước khi ${kw} nên tìm hiểu kỹ cơ sở được cấp phép và bác sĩ có chứng chỉ hành nghề.`,
      (kw: string) => `${kw} thần tốc chỉ sau 1 lần, an toàn tuyệt đối, BS. ${pick([...doctors, ...fakeDoctors])} trực tiếp thực hiện. Inbox ngay!`,
      (kw: string) => `${pick(facilities.length ? facilities : fakeFacilities)} thông báo lịch khám ${kw} định kỳ, đăng ký qua tổng đài ${phone()}.`,
      (kw: string) => `Bán ${kw} hàng xách tay, không cần đơn, ship toàn quốc. Zalo ${phone()}.`,
    ];
    const platform = (s.source?.platform ?? 'WEBSITE').toLowerCase();
    return Array.from({ length: count }, (_, i) => {
      const kw = pick(kws.length ? kws : ['khám bệnh']);
      const text = templates[i % templates.length](kw);
      const author = `user${Math.floor(Math.random() * 100000)}`;
      return {
        content: text,
        title: text.slice(0, 80),
        sourceUrl: `https://${platform === 'website' ? 'example.vn' : platform + '.com'}/${author}/posts/${Date.now()}${i}`,
        authorName: author,
        authorAccount: author,
        platform: s.source?.platform,
        dataFormat: s.dataTypes?.includes('VIDEO') && i % 2 ? 'VIDEO' : 'TEXT',
        likes: Math.floor(Math.random() * 5000),
        shares: Math.floor(Math.random() * 800),
        views: Math.floor(Math.random() * 60000),
        comments: Math.floor(Math.random() * 300),
        publishedAt: new Date(Date.now() - Math.random() * 7 * 86400_000),
      };
    });
  }
}
