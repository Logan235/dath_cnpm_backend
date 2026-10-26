// =====================================================================
// MODULE QUẢN LÝ XỬ LÝ THÔNG TIN QUẢNG CÁO — mẫu tin, whitelist, mô hình AI,
// kết quả AI (ads_classified), đánh giá chuyên viên (ad_review_status),
// dữ liệu phản hồi tái huấn luyện
// =====================================================================
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { CrawlJob, CrawlSource, CrawlSchedule, Topic, Facility } from './info-source.entities';
import { User } from './system.entities';

/** Mẫu tin quảng cáo (dữ liệu thu thập + trạng thái xử lý trong pipeline) */
@Entity('ad_items')
export class AdItem {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ length: 50, unique: true, nullable: true })
  code!: string;

  /** CRAWLER | CITIZEN_REPORT | PRECHECK | PARTNER | MANUAL */
  @Column({ name: 'source_type', length: 30, default: 'CRAWLER' })
  sourceType!: string;

  @Column({ name: 'crawl_job_id', type: 'int', nullable: true })
  crawlJobId?: number | null;

  @ManyToOne(() => CrawlJob, { nullable: true })
  @JoinColumn({ name: 'crawl_job_id' })
  crawlJob?: CrawlJob | null;

  @Column({ name: 'schedule_id', type: 'int', nullable: true })
  scheduleId?: number | null;

  @ManyToOne(() => CrawlSchedule, { nullable: true })
  @JoinColumn({ name: 'schedule_id' })
  schedule?: CrawlSchedule | null;

  @Column({ name: 'crawl_source_id', type: 'int', nullable: true })
  crawlSourceId?: number | null;

  @ManyToOne(() => CrawlSource, { nullable: true })
  @JoinColumn({ name: 'crawl_source_id' })
  crawlSource?: CrawlSource | null;

  @Column({ name: 'topic_id', type: 'int', nullable: true })
  topicId?: number | null;

  @ManyToOne(() => Topic, { nullable: true })
  @JoinColumn({ name: 'topic_id' })
  topic?: Topic | null;

  @Column({ length: 30, nullable: true })
  platform?: string;

  @Column({ name: 'source_url', length: 1000, nullable: true })
  sourceUrl?: string;

  @Column({ name: 'author_name', length: 255, nullable: true })
  authorName?: string;

  @Column({ name: 'author_account', length: 255, nullable: true })
  authorAccount?: string;

  @Column({ length: 500, nullable: true })
  title?: string;

  @Column({ type: 'text' })
  content!: string;

  /** sha256 nội dung đã chuẩn hóa — dùng phát hiện trùng lặp */
  @Column({ name: 'content_hash', length: 64, nullable: true })
  contentHash?: string;

  /** [{type:'IMAGE'|'VIDEO'|'AUDIO', url, ocrText?}] */
  @Column({ type: 'jsonb', default: () => "'[]'" })
  media!: any[];

  /** TEXT | IMAGE | VIDEO | AUDIO | MIXED */
  @Column({ name: 'data_format', length: 20, default: 'TEXT' })
  dataFormat!: string;

  @Column({ name: 'published_at', type: 'timestamp', nullable: true })
  publishedAt?: Date | null;

  @Column({ name: 'collected_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  collectedAt!: Date;

  @Column({ type: 'int', default: 0 })
  likes!: number;

  @Column({ type: 'int', default: 0 })
  shares!: number;

  @Column({ type: 'int', default: 0 })
  views!: number;

  @Column({ type: 'int', default: 0 })
  comments!: number;

  // ----- Phân loại tin -----
  /** Lĩnh vực quảng cáo: THAM_MY | DUOC_PHAM | KHAM_CHUA_BENH | NHA_KHOA | TPCN | THIET_BI_YT | KHAC */
  @Column({ length: 100, nullable: true })
  field?: string;

  /** Đối tượng quảng cáo: CO_SO_KCB | THUOC | DICH_VU | THIET_BI | CA_NHAN | KHAC */
  @Column({ name: 'ad_subject', length: 100, nullable: true })
  adSubject?: string;

  /** Mức độ nghi vấn: LOW | MEDIUM | HIGH */
  @Column({ name: 'suspicion_level', length: 10, nullable: true })
  suspicionLevel?: string;

  // ----- Trạng thái pipeline -----
  @Column({ length: 30, default: 'COLLECTED' })
  status!: string;

  @Column({ name: 'reject_reason', length: 50, nullable: true })
  rejectReason?: string | null;

  @Column({ name: 'reject_note', type: 'text', nullable: true })
  rejectNote?: string | null;

  @Column({ name: 'qc_by', type: 'bigint', nullable: true })
  qcBy?: string | null;

  @Column({ name: 'qc_at', type: 'timestamp', nullable: true })
  qcAt?: Date | null;

  /** Điểm ưu tiên trong hàng đợi chuyên viên (0-100) */
  @Column({ type: 'int', default: 0 })
  priority!: number;

  @Column({ name: 'assigned_to', type: 'bigint', nullable: true })
  assignedTo?: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'assigned_to' })
  assignee?: User | null;

  /** Cơ sở KCB được AI đối chiếu khớp */
  @Column({ name: 'facility_id', type: 'int', nullable: true })
  facilityId?: number | null;

  @ManyToOne(() => Facility, { nullable: true })
  @JoinColumn({ name: 'facility_id' })
  facility?: Facility | null;

  /** Người phản ánh (nguồn CITIZEN_REPORT) */
  @Column({ name: 'reported_by', type: 'bigint', nullable: true })
  reportedBy?: string | null;

  @Column({ name: 'reporter_name', length: 255, nullable: true })
  reporterName?: string;

  @Column({ name: 'reporter_contact', length: 255, nullable: true })
  reporterContact?: string;

  /** Kết luận cuối cùng: VIOLATION | NOT_VIOLATION */
  @Column({ name: 'final_label', length: 30, nullable: true })
  finalLabel?: string | null;

  @Column({ name: 'decided_by', type: 'bigint', nullable: true })
  decidedBy?: string | null;

  @Column({ name: 'decided_at', type: 'timestamp', nullable: true })
  decidedAt?: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;
}

/** Danh sách tin cậy: tài khoản / tên miền / cơ sở được bỏ qua khi lọc */
@Entity('whitelist_entries')
export class WhitelistEntry {
  @PrimaryGeneratedColumn()
  id!: number;

  /** DOMAIN | ACCOUNT | PHONE | FACILITY | KEYWORD */
  @Column({ name: 'entry_type', length: 20 })
  entryType!: string;

  @Column({ length: 500 })
  value!: string;

  @Column({ name: 'facility_id', type: 'int', nullable: true })
  facilityId?: number | null;

  @Column({ type: 'text', nullable: true })
  note?: string;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @Column({ name: 'created_by', type: 'bigint', nullable: true })
  createdBy?: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;
}

@Entity('ai_models')
export class AiModel {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 50, unique: true })
  code!: string;

  @Column({ length: 255 })
  name!: string;

  @Column({ length: 50 })
  version!: string;

  /** CLASSIFIER | VIOLATION_DETECTOR | NER | ENTITY_MATCHING */
  @Column({ name: 'model_type', length: 50 })
  modelType!: string;

  /** BUILTIN_RULES | EXTERNAL_API */
  @Column({ length: 50, default: 'BUILTIN_RULES' })
  provider!: string;

  @Column({ length: 500, nullable: true })
  endpoint?: string;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @Column({ type: 'jsonb', nullable: true })
  metrics?: any;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;
}

/** Kết quả phân tích AI (bảng ads_classified trong báo cáo) */
@Entity('ai_analyses')
export class AiAnalysis {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ name: 'ad_item_id', type: 'bigint' })
  adItemId!: string;

  @ManyToOne(() => AdItem)
  @JoinColumn({ name: 'ad_item_id' })
  adItem?: AdItem;

  @Column({ name: 'model_id', type: 'int', nullable: true })
  modelId?: number | null;

  @ManyToOne(() => AiModel, { nullable: true })
  @JoinColumn({ name: 'model_id' })
  model?: AiModel | null;

  /** VIOLATION | SUSPECTED | NO_VIOLATION */
  @Column({ length: 30 })
  label!: string;

  @Column({ type: 'float', default: 0 })
  confidence!: number;

  /** Mã loại vi phạm AI gợi ý */
  @Column({ name: 'violation_types', type: 'jsonb', default: () => "'[]'" })
  violationTypes!: string[];

  /** Căn cứ: [{type, phrase, score}] */
  @Column({ name: 'matched_rules', type: 'jsonb', default: () => "'[]'" })
  matchedRules!: any[];

  /** Thực thể trích xuất: tên cơ sở, SĐT, số giấy phép, bác sĩ, kỹ thuật... */
  @Column({ name: 'extracted_entities', type: 'jsonb', default: () => "'{}'" })
  extractedEntities!: any;

  /** Văn bản pháp lý (đang hiệu lực) làm căn cứ */
  @Column({ name: 'legal_refs', type: 'jsonb', default: () => "'[]'" })
  legalRefs!: any[];

  @Column({ type: 'text', nullable: true })
  explanation?: string;

  @Column({ name: 'priority_score', type: 'int', default: 0 })
  priorityScore!: number;

  @Column({ name: 'is_latest', default: true })
  isLatest!: boolean;

  @Column({ name: 'processing_ms', type: 'int', default: 0 })
  processingMs!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;
}

/** Đánh giá của chuyên viên (bảng ad_review_status trong báo cáo) */
@Entity('ad_reviews')
export class AdReview {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ name: 'ad_item_id', type: 'bigint' })
  adItemId!: string;

  @ManyToOne(() => AdItem)
  @JoinColumn({ name: 'ad_item_id' })
  adItem?: AdItem;

  @Column({ name: 'analysis_id', type: 'bigint', nullable: true })
  analysisId?: string | null;

  @Column({ name: 'reviewer_id', type: 'bigint' })
  reviewerId!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'reviewer_id' })
  reviewer?: User;

  /** VIOLATION | NOT_VIOLATION | NEED_MORE_INFO */
  @Column({ length: 30 })
  decision!: string;

  /** Chuyên viên có đồng ý với AI không */
  @Column({ name: 'agrees_with_ai', type: 'boolean', nullable: true })
  agreesWithAi?: boolean | null;

  @Column({ name: 'corrected_violation_types', type: 'jsonb', default: () => "'[]'" })
  correctedViolationTypes!: string[];

  @Column({ length: 10, nullable: true })
  severity?: string;

  @Column({ name: 'is_verified', default: true })
  isVerified!: boolean;

  @Column({ name: 'is_reclassified', default: false })
  isReclassified!: boolean;

  /** VALID | INVALID | EXPIRED | NOT_FOUND | UNKNOWN */
  @Column({ name: 'license_status', length: 30, nullable: true })
  licenseStatus?: string;

  /** COMPLIANT | NON_COMPLIANT | UNKNOWN */
  @Column({ name: 'compliant_status', length: 30, nullable: true })
  compliantStatus?: string;

  @Column({ type: 'text', nullable: true })
  reason?: string;

  /** Phần AI sai / thiếu căn cứ */
  @Column({ name: 'wrong_parts', type: 'text', nullable: true })
  wrongParts?: string;

  @Column({ name: 'duration_seconds', type: 'int', nullable: true })
  durationSeconds?: number;

  /** Đánh giá của lãnh đạo khi giải quyết xung đột */
  @Column({ name: 'is_resolution', default: false })
  isResolution!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;
}

/** Tập dữ liệu phản hồi phục vụ tái huấn luyện (Active Learning) */
@Entity('ai_training_feedback')
export class AiTrainingFeedback {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ name: 'ad_item_id', type: 'bigint' })
  adItemId!: string;

  @Column({ name: 'analysis_id', type: 'bigint', nullable: true })
  analysisId?: string | null;

  @Column({ name: 'review_id', type: 'bigint', nullable: true })
  reviewId?: string | null;

  @Column({ name: 'model_id', type: 'int', nullable: true })
  modelId?: number | null;

  @Column({ name: 'ai_label', length: 30, nullable: true })
  aiLabel?: string;

  @Column({ name: 'ai_violation_types', type: 'jsonb', default: () => "'[]'" })
  aiViolationTypes!: string[];

  @Column({ name: 'human_label', length: 30 })
  humanLabel!: string;

  @Column({ name: 'human_violation_types', type: 'jsonb', default: () => "'[]'" })
  humanViolationTypes!: string[];

  /** CONFIRMED | FALSE_POSITIVE | FALSE_NEGATIVE | RELABEL */
  @Column({ name: 'feedback_type', length: 30 })
  feedbackType!: string;

  @Column({ type: 'text', nullable: true })
  note?: string;

  @Column({ name: 'content_snapshot', type: 'text' })
  contentSnapshot!: string;

  @Column({ name: 'dataset_version', length: 50, nullable: true })
  datasetVersion?: string | null;

  @Column({ name: 'exported_at', type: 'timestamp', nullable: true })
  exportedAt?: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;
}
