// =====================================================================
// MODULE QUẢN LÝ NGUỒN THÔNG TIN — văn bản pháp lý, đơn vị KCB, giấy phép,
// thu thập tin (nguồn, phân loại nguồn, chủ đề, từ khóa, lịch thu thập)
// =====================================================================
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';

@Entity('legal_document_types')
export class LegalDocumentType {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 50, unique: true })
  code!: string;

  @Column({ length: 255 })
  name!: string;

  @Column({ length: 500, nullable: true })
  description?: string;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;
}

@Entity('legal_documents')
export class LegalDocument {
  @PrimaryGeneratedColumn()
  id!: number;

  /** Mã văn bản — duy nhất, bắt buộc */
  @Column({ length: 100, unique: true })
  code!: string;

  /** Số văn bản (VD: 16/2012/QH13) */
  @Column({ name: 'document_number', length: 100 })
  documentNumber!: string;

  @Column({ length: 500 })
  title!: string;

  @Column({ name: 'type_id', type: 'int' })
  typeId!: number;

  @ManyToOne(() => LegalDocumentType)
  @JoinColumn({ name: 'type_id' })
  type?: LegalDocumentType;

  @Column({ length: 255, nullable: true })
  issuer?: string;

  @Column({ name: 'issued_date', type: 'date', nullable: true })
  issuedDate?: string | null;

  @Column({ name: 'effective_date', type: 'date', nullable: true })
  effectiveDate?: string | null;

  @Column({ name: 'expiry_date', type: 'date', nullable: true })
  expiryDate?: string | null;

  /** Lĩnh vực điều chỉnh */
  @Column({ length: 255, nullable: true })
  field?: string;

  @Column({ type: 'text', nullable: true })
  summary?: string;

  /** Nội dung trích xuất từ file (để AI đối chiếu) */
  @Column({ type: 'text', nullable: true })
  content?: string;

  @Column({ name: 'attachment_path', length: 500, nullable: true })
  attachmentPath?: string | null;

  @Column({ name: 'attachment_name', length: 255, nullable: true })
  attachmentName?: string | null;

  /** ACTIVE | INACTIVE — AI chỉ dùng văn bản ACTIVE */
  @Column({ length: 20, default: 'ACTIVE' })
  status!: string;

  @Column({ name: 'created_by', type: 'bigint', nullable: true })
  createdBy?: string | null;

  @Column({ name: 'updated_by', type: 'bigint', nullable: true })
  updatedBy?: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;
}

@Entity('facility_types')
export class FacilityType {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 50, unique: true })
  code!: string;

  @Column({ length: 255 })
  name!: string;

  @Column({ length: 500, nullable: true })
  description?: string;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;
}

/** Đơn vị khám chữa bệnh (bảng `facilities` có sẵn, được mở rộng thêm cột) */
@Entity('facilities')
export class Facility {
  @PrimaryGeneratedColumn()
  id!: number;

  /** Mã đơn vị — duy nhất; dùng làm username tài khoản cơ sở */
  @Column({ length: 50, unique: true, nullable: true })
  code!: string;

  @Column({ length: 255 })
  name!: string;

  @Column({ name: 'type_id', type: 'int', nullable: true })
  typeId?: number | null;

  @ManyToOne(() => FacilityType, { nullable: true })
  @JoinColumn({ name: 'type_id' })
  type?: FacilityType | null;

  /** Hình thức tổ chức (Bệnh viện, Phòng khám chuyên khoa, ...) */
  @Column({ name: 'organization_form', length: 255, nullable: true })
  organizationForm?: string;

  @Column({ length: 500, nullable: true })
  address?: string;

  @Column({ length: 100, nullable: true })
  ward?: string;

  @Column({ length: 100, nullable: true })
  district?: string;

  @Column({ length: 100, nullable: true })
  province?: string;

  @Column({ length: 20, nullable: true })
  phone?: string;

  @Column({ length: 255, nullable: true })
  email?: string;

  @Column({ length: 255, nullable: true })
  website?: string;

  /** Người đại diện / người chịu trách nhiệm chuyên môn */
  @Column({ length: 255, nullable: true })
  representative?: string;

  /** Phạm vi hoạt động chuyên môn */
  @Column({ name: 'professional_scope', type: 'text', nullable: true })
  professionalScope?: string;

  /** Thời gian làm việc hằng ngày */
  @Column({ name: 'working_hours', length: 255, nullable: true })
  workingHours?: string;

  /** Số giấy phép hoạt động */
  @Column({ name: 'license_number', length: 100, unique: true })
  licenseNumber!: string;

  @Column({ name: 'license_issued_date', type: 'date', nullable: true })
  licenseIssuedDate?: string | null;

  /** Danh mục kỹ thuật được cấp phép, VD ["nhổ răng","cạo vôi răng"] */
  @Column({ name: 'licensed_techniques', type: 'jsonb', default: () => "'[]'" })
  licensedTechniques!: string[];

  /** ACTIVE | SUSPENDED | REVOKED */
  @Column({ name: 'operating_status', length: 20, default: 'ACTIVE' })
  operatingStatus!: string;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @Column({ name: 'risk_score', type: 'int', default: 0 })
  riskScore!: number;

  @Column({ name: 'risk_level', length: 10, default: 'LOW' })
  riskLevel!: string;

  @Column({ name: 'violation_count', type: 'int', default: 0 })
  violationCount!: number;

  /** Danh sách đen (theo dõi đặc biệt) */
  @Column({ name: 'is_blacklisted', default: false })
  isBlacklisted!: boolean;

  /** NONE | REQUIRED | IN_PROGRESS | REMEDIATED */
  @Column({ name: 'remediation_status', length: 30, default: 'NONE' })
  remediationStatus!: string;

  @Column({ type: 'text', nullable: true })
  note?: string;

  @Column({ name: 'created_by', type: 'bigint', nullable: true })
  createdBy?: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;

  @OneToMany(() => License, (l) => l.facility)
  licenses?: License[];
}

/** Giấy phép: GPHĐ, CCHN (bác sĩ), xác nhận nội dung quảng cáo... */
@Entity('licenses')
export class License {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'license_number', length: 100 })
  licenseNumber!: string;

  /** GPHD | CCHN | XNQC | OTHER */
  @Column({ name: 'license_type', length: 20 })
  licenseType!: string;

  @Column({ name: 'facility_id', type: 'int', nullable: true })
  facilityId?: number | null;

  @ManyToOne(() => Facility, (f) => f.licenses, { nullable: true })
  @JoinColumn({ name: 'facility_id' })
  facility?: Facility | null;

  /** Người / đơn vị được cấp (với CCHN: họ tên bác sĩ) */
  @Column({ name: 'holder_name', length: 255, nullable: true })
  holderName?: string;

  /** Chức danh / chuyên khoa (với CCHN) */
  @Column({ name: 'holder_title', length: 255, nullable: true })
  holderTitle?: string;

  @Column({ name: 'issued_date', type: 'date', nullable: true })
  issuedDate?: string | null;

  @Column({ name: 'expiry_date', type: 'date', nullable: true })
  expiryDate?: string | null;

  @Column({ length: 255, nullable: true })
  issuer?: string;

  /** Phạm vi hoạt động / nội dung được xác nhận */
  @Column({ type: 'text', nullable: true })
  scope?: string;

  @Column({ name: 'attachment_path', length: 500, nullable: true })
  attachmentPath?: string | null;

  @Column({ name: 'attachment_name', length: 255, nullable: true })
  attachmentName?: string | null;

  /** ACTIVE | INACTIVE — AI chỉ dùng giấy phép ACTIVE và còn hạn */
  @Column({ length: 20, default: 'ACTIVE' })
  status!: string;

  @Column({ type: 'text', nullable: true })
  note?: string;

  @Column({ name: 'created_by', type: 'bigint', nullable: true })
  createdBy?: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;
}

/** Danh sách phân loại nguồn (Mạng xã hội, Công cụ tìm kiếm, Website cố định...) */
@Entity('source_categories')
export class SourceCategory {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 50, unique: true })
  code!: string;

  @Column({ length: 255 })
  name!: string;

  @Column({ length: 500, nullable: true })
  description?: string;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;
}

@Entity('crawl_sources')
export class CrawlSource {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 255 })
  name!: string;

  @Column({ name: 'category_id', type: 'int' })
  categoryId!: number;

  @ManyToOne(() => SourceCategory)
  @JoinColumn({ name: 'category_id' })
  category?: SourceCategory;

  @Column({ length: 30 })
  platform!: string;

  @Column({ length: 500, nullable: true })
  url?: string;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @Column({ type: 'text', nullable: true })
  note?: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;
}

@Entity('topics')
export class Topic {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 50, unique: true })
  code!: string;

  @Column({ length: 255 })
  name!: string;

  @Column({ length: 500, nullable: true })
  description?: string;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;

  @OneToMany(() => Keyword, (k) => k.topic)
  keywords?: Keyword[];
}

@Entity('keywords')
export class Keyword {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 255 })
  keyword!: string;

  @Column({ name: 'topic_id', type: 'int', nullable: true })
  topicId?: number | null;

  @ManyToOne(() => Topic, (t) => t.keywords, { nullable: true })
  @JoinColumn({ name: 'topic_id' })
  topic?: Topic | null;

  /** PRIMARY | SECONDARY */
  @Column({ name: 'keyword_type', length: 20, default: 'PRIMARY' })
  keywordType!: string;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;
}

/** Lịch thu thập tin */
@Entity('crawl_schedules')
export class CrawlSchedule {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 50, unique: true })
  code!: string;

  @Column({ length: 255 })
  name!: string;

  @Column({ name: 'source_id', type: 'int' })
  sourceId!: number;

  @ManyToOne(() => CrawlSource)
  @JoinColumn({ name: 'source_id' })
  source?: CrawlSource;

  @Column({ name: 'topic_id', type: 'int', nullable: true })
  topicId?: number | null;

  @ManyToOne(() => Topic, { nullable: true })
  @JoinColumn({ name: 'topic_id' })
  topic?: Topic | null;

  /** Từ khóa chính, cách nhau bởi dấu phẩy */
  @Column({ name: 'primary_keywords', type: 'text' })
  primaryKeywords!: string;

  @Column({ name: 'secondary_keywords', type: 'text', nullable: true })
  secondaryKeywords?: string;

  /** ["TEXT","IMAGE","VIDEO","AUDIO"] */
  @Column({ name: 'data_types', type: 'jsonb', default: () => `'["TEXT"]'` })
  dataTypes!: string[];

  /** VD: 24/7, EVERY_2H, EVERY_6H, DAILY */
  @Column({ length: 50, default: 'DAILY' })
  frequency!: string;

  @Column({ name: 'sample_limit', type: 'int', default: 100 })
  sampleLimit!: number;

  /** RUNNING | PAUSED | STOPPED */
  @Column({ length: 20, default: 'STOPPED' })
  status!: string;

  @Column({ name: 'last_run_at', type: 'timestamp', nullable: true })
  lastRunAt?: Date | null;

  @Column({ name: 'created_by', type: 'bigint', nullable: true })
  createdBy?: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;
}

/** Phiên thu thập (mỗi lần crawler chạy) */
@Entity('crawl_jobs')
export class CrawlJob {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'schedule_id', type: 'int', nullable: true })
  scheduleId?: number | null;

  @ManyToOne(() => CrawlSchedule, { nullable: true })
  @JoinColumn({ name: 'schedule_id' })
  schedule?: CrawlSchedule | null;

  /** RUNNING | COMPLETED | FAILED */
  @Column({ length: 20, default: 'RUNNING' })
  status!: string;

  @Column({ name: 'started_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  startedAt!: Date;

  @Column({ name: 'finished_at', type: 'timestamp', nullable: true })
  finishedAt?: Date | null;

  @Column({ name: 'items_collected', type: 'int', default: 0 })
  itemsCollected!: number;

  @Column({ name: 'triggered_by', type: 'bigint', nullable: true })
  triggeredBy?: string | null;

  @Column({ type: 'text', nullable: true })
  note?: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;
}
