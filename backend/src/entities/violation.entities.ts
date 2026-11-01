// =====================================================================
// MODULE QUẢN LÝ THÔNG TIN VI PHẠM — loại vi phạm, hồ sơ vi phạm, quyết định
// xử phạt, phản hồi của cơ sở, kiểm tra trước, đối tượng vi phạm (Entity),
// tài khoản nền tảng, hồ sơ phối hợp điều tra
// =====================================================================
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  ManyToMany,
  OneToMany,
  JoinColumn,
  JoinTable,
} from 'typeorm';
import { Facility, LegalDocument } from './info-source.entities';
import { AdItem } from './ad-processing.entities';
import { User } from './system.entities';

const bigintToNumber = {
  to: (v?: number | null) => v,
  from: (v?: string | null) => (v === null || v === undefined ? v : Number(v)),
};

/** Danh mục phân loại vi phạm (trọng số theo Bảng 12.7) */
@Entity('violation_types')
export class ViolationType {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 50, unique: true })
  code!: string;

  @Column({ length: 255 })
  name!: string;

  /** Trọng số dùng tính điểm rủi ro */
  @Column({ type: 'int', default: 10 })
  weight!: number;

  /** LOW | MEDIUM | HIGH */
  @Column({ length: 10, default: 'MEDIUM' })
  severity!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'legal_document_id', type: 'int', nullable: true })
  legalDocumentId?: number | null;

  @ManyToOne(() => LegalDocument, { nullable: true })
  @JoinColumn({ name: 'legal_document_id' })
  legalDocument?: LegalDocument | null;

  /** Điều khoản cụ thể */
  @Column({ name: 'legal_basis', length: 500, nullable: true })
  legalBasis?: string;

  @Column({ name: 'fine_min', type: 'bigint', default: 0, transformer: bigintToNumber })
  fineMin!: number;

  @Column({ name: 'fine_max', type: 'bigint', default: 0, transformer: bigintToNumber })
  fineMax!: number;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;
}

/** Đối tượng vi phạm (Entity Profile) — cá nhân / tổ chức đứng sau quảng cáo */
@Entity('suspects')
export class Suspect {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 50, unique: true, nullable: true })
  code!: string;

  @Column({ length: 255 })
  name!: string;

  @Column({ name: 'normalized_name', length: 255, nullable: true })
  normalizedName?: string;

  @Column({ name: 'tax_code', length: 20, unique: true, nullable: true })
  taxCode?: string | null;

  @Column({ length: 500, nullable: true })
  address?: string;

  @Column({ length: 255, nullable: true })
  representative?: string;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  phones!: string[];

  @Column({ type: 'jsonb', default: () => "'[]'" })
  emails!: string[];

  @Column({ type: 'jsonb', default: () => "'[]'" })
  websites!: string[];

  /** Nếu đối tượng chính là một cơ sở KCB đã có trong hệ thống */
  @Column({ name: 'facility_id', type: 'int', nullable: true })
  facilityId?: number | null;

  @ManyToOne(() => Facility, { nullable: true })
  @JoinColumn({ name: 'facility_id' })
  facility?: Facility | null;

  @Column({ name: 'risk_score', type: 'int', default: 0 })
  riskScore!: number;

  @Column({ name: 'risk_level', length: 10, default: 'LOW' })
  riskLevel!: string;

  /** MONITORING | UNDER_INVESTIGATION | VERIFIED | CLEARED */
  @Column({ length: 30, default: 'MONITORING' })
  status!: string;

  @Column({ name: 'violation_count', type: 'int', default: 0 })
  violationCount!: number;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ name: 'created_by', type: 'bigint', nullable: true })
  createdBy?: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;

  @OneToMany(() => PlatformAccount, (a) => a.suspect)
  accounts?: PlatformAccount[];
}

@Entity('platform_accounts')
export class PlatformAccount {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'suspect_id', type: 'int' })
  suspectId!: number;

  @ManyToOne(() => Suspect, (s) => s.accounts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'suspect_id' })
  suspect?: Suspect;

  /** FACEBOOK | TIKTOK | YOUTUBE | GOOGLE | ZALO | WEBSITE | ... */
  @Column({ length: 20 })
  platform!: string;

  @Column({ name: 'platform_uid', length: 255 })
  platformUid!: string;

  @Column({ name: 'display_name', length: 255, nullable: true })
  displayName?: string;

  @Column({ length: 500, nullable: true })
  url?: string;

  @Column({ name: 'is_verified', default: false })
  isVerified!: boolean;

  @Column({ name: 'verified_by', type: 'bigint', nullable: true })
  verifiedBy?: string | null;

  @Column({ name: 'verified_at', type: 'timestamp', nullable: true })
  verifiedAt?: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;
}

/** Hồ sơ vi phạm (quảng cáo vi phạm) */
@Entity('violations')
export class Violation {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 50, unique: true, nullable: true })
  code!: string;

  @Column({ length: 500 })
  title!: string;

  @Column({ name: 'ad_item_id', type: 'bigint', nullable: true })
  adItemId?: string | null;

  @ManyToOne(() => AdItem, { nullable: true })
  @JoinColumn({ name: 'ad_item_id' })
  adItem?: AdItem | null;

  @Column({ name: 'facility_id', type: 'int', nullable: true })
  facilityId?: number | null;

  @ManyToOne(() => Facility, { nullable: true })
  @JoinColumn({ name: 'facility_id' })
  facility?: Facility | null;

  @Column({ name: 'suspect_id', type: 'int', nullable: true })
  suspectId?: number | null;

  @ManyToOne(() => Suspect, { nullable: true })
  @JoinColumn({ name: 'suspect_id' })
  suspect?: Suspect | null;

  @ManyToMany(() => ViolationType)
  @JoinTable({
    name: 'violation_type_links',
    joinColumn: { name: 'violation_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'violation_type_id', referencedColumnName: 'id' },
  })
  types?: ViolationType[];

  /** CRAWLER | CITIZEN_REPORT | PRECHECK | PARTNER | MANUAL | IMPORT */
  @Column({ length: 30, default: 'MANUAL' })
  source!: string;

  @Column({ name: 'content_snapshot', type: 'text', nullable: true })
  contentSnapshot?: string;

  @Column({ name: 'content_url', length: 1000, nullable: true })
  contentUrl?: string;

  /** Bằng chứng: [{type:'URL'|'IMAGE'|'VIDEO'|'FILE', url, note}] */
  @Column({ type: 'jsonb', default: () => "'[]'" })
  evidence!: any[];

  /** LOW | MEDIUM | HIGH */
  @Column({ length: 10, default: 'MEDIUM' })
  severity!: string;

  @Column({ type: 'int', default: 0 })
  priority!: number;

  /** Lượng tiếp cận (reach) — dùng tính v_i trong công thức rủi ro */
  @Column({ type: 'int', default: 0 })
  reach!: number;

  @Column({ name: 'ai_confidence', type: 'float', nullable: true })
  aiConfidence?: number | null;

  @Column({ name: 'ai_model_code', length: 50, nullable: true })
  aiModelCode?: string | null;

  @Column({ name: 'specialist_conclusion', type: 'text', nullable: true })
  specialistConclusion?: string;

  @Column({ length: 30, default: 'NEW' })
  status!: string;

  /** Kết quả kiểm tra thẩm quyền */
  @Column({ name: 'within_authority', type: 'boolean', nullable: true })
  withinAuthority?: boolean | null;

  /** WARNING | PENALTY | TRANSFERRED | DISMISSED */
  @Column({ name: 'handling_result', length: 30, nullable: true })
  handlingResult?: string | null;

  @Column({ name: 'handling_note', type: 'text', nullable: true })
  handlingNote?: string | null;

  /** NONE | REQUIRED | IN_PROGRESS | REMEDIATED */
  @Column({ name: 'remediation_status', length: 30, default: 'NONE' })
  remediationStatus!: string;

  @Column({ name: 'detected_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  detectedAt!: Date;

  @Column({ name: 'assigned_to', type: 'bigint', nullable: true })
  assignedTo?: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'assigned_to' })
  assignee?: User | null;

  @Column({ name: 'created_by', type: 'bigint', nullable: true })
  createdBy?: string | null;

  @Column({ name: 'resolved_at', type: 'timestamp', nullable: true })
  resolvedAt?: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;
}

/** Quyết định xử phạt hành chính */
@Entity('penalty_decisions')
export class PenaltyDecision {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'decision_number', length: 100, unique: true })
  decisionNumber!: string;

  @Column({ name: 'violation_id', type: 'int' })
  violationId!: number;

  @ManyToOne(() => Violation)
  @JoinColumn({ name: 'violation_id' })
  violation?: Violation;

  @Column({ name: 'facility_id', type: 'int', nullable: true })
  facilityId?: number | null;

  @Column({ name: 'suspect_id', type: 'int', nullable: true })
  suspectId?: number | null;

  /** Tên tổ chức / cá nhân bị xử phạt */
  @Column({ name: 'offender_name', length: 255 })
  offenderName!: string;

  @Column({ name: 'violation_behavior', type: 'text' })
  violationBehavior!: string;

  @Column({ name: 'legal_basis', type: 'text', nullable: true })
  legalBasis?: string;

  @Column({ name: 'fine_amount', type: 'bigint', default: 0, transformer: bigintToNumber })
  fineAmount!: number;

  /** Hình thức xử phạt bổ sung */
  @Column({ name: 'additional_penalty', type: 'text', nullable: true })
  additionalPenalty?: string;

  /** Biện pháp khắc phục hậu quả */
  @Column({ name: 'remedial_measures', type: 'text', nullable: true })
  remedialMeasures?: string;

  @Column({ length: 30, default: 'PENDING_APPROVAL' })
  status!: string;

  @Column({ name: 'requires_approval', default: false })
  requiresApproval!: boolean;

  @Column({ name: 'approved_by', type: 'bigint', nullable: true })
  approvedBy?: string | null;

  @Column({ name: 'approval_note', type: 'text', nullable: true })
  approvalNote?: string | null;

  @Column({ name: 'approved_at', type: 'timestamp', nullable: true })
  approvedAt?: Date | null;

  @Column({ name: 'issued_at', type: 'timestamp', nullable: true })
  issuedAt?: Date | null;

  @Column({ name: 'due_date', type: 'date', nullable: true })
  dueDate?: string | null;

  @Column({ name: 'execution_status', length: 30, default: 'NOT_ISSUED' })
  executionStatus!: string;

  @Column({ name: 'paid_at', type: 'timestamp', nullable: true })
  paidAt?: Date | null;

  @Column({ name: 'created_by', type: 'bigint', nullable: true })
  createdBy?: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;
}

/** Kiểm tra trước thông tin quảng cáo (pre-check) — lưu toàn bộ lịch sử kiểm tra */
@Entity('precheck_requests')
export class PrecheckRequest {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 50, unique: true, nullable: true })
  code!: string;

  @Column({ name: 'submitter_id', type: 'bigint', nullable: true })
  submitterId?: string | null;

  /** ANONYMOUS | CITIZEN | FACILITY | STAFF */
  @Column({ name: 'submitter_type', length: 20 })
  submitterType!: string;

  @Column({ name: 'submitter_name', length: 255, nullable: true })
  submitterName?: string;

  @Column({ name: 'submitter_contact', length: 255, nullable: true })
  submitterContact?: string;

  @Column({ name: 'facility_id', type: 'int', nullable: true })
  facilityId?: number | null;

  @ManyToOne(() => Facility, { nullable: true })
  @JoinColumn({ name: 'facility_id' })
  facility?: Facility | null;

  @Column({ name: 'facility_name_input', length: 255, nullable: true })
  facilityNameInput?: string;

  @Column({ name: 'license_number_input', length: 100, nullable: true })
  licenseNumberInput?: string;

  @Column({ name: 'representative_input', length: 255, nullable: true })
  representativeInput?: string;

  @Column({ name: 'content_text', type: 'text' })
  contentText!: string;

  @Column({ name: 'content_url', length: 1000, nullable: true })
  contentUrl?: string;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  attachments!: any[];

  /** Bước 2: thông tin AI trích xuất */
  @Column({ type: 'jsonb', default: () => "'{}'" })
  extracted!: any;

  /** Bước 3: kết quả đối chiếu CSDL [{check, passed, detail}] */
  @Column({ type: 'jsonb', default: () => "'[]'" })
  checks!: any[];

  @Column({ name: 'matching_rate', type: 'float', default: 0 })
  matchingRate!: number;

  @Column({ name: 'risk_score', type: 'int', default: 0 })
  riskScore!: number;

  /** Bước 4: kết quả sơ bộ PASS | WARNING | FAIL */
  @Column({ name: 'ai_result', length: 20 })
  aiResult!: string;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  reasons!: any[];

  @Column({ type: 'jsonb', default: () => "'[]'" })
  recommendations!: string[];

  /** AUTO_ASSESSED | PENDING_REVIEW | REVIEWED */
  @Column({ length: 20 })
  status!: string;

  @Column({ name: 'final_result', length: 20, nullable: true })
  finalResult?: string | null;

  @Column({ name: 'reviewer_id', type: 'bigint', nullable: true })
  reviewerId?: string | null;

  @Column({ name: 'review_note', type: 'text', nullable: true })
  reviewNote?: string | null;

  @Column({ name: 'reviewed_at', type: 'timestamp', nullable: true })
  reviewedAt?: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;
}

/** Phản hồi / giải trình / khiếu nại của cơ sở KCB */
@Entity('facility_feedbacks')
export class FacilityFeedback {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 50, unique: true, nullable: true })
  code!: string;

  @Column({ name: 'facility_id', type: 'int' })
  facilityId!: number;

  @ManyToOne(() => Facility)
  @JoinColumn({ name: 'facility_id' })
  facility?: Facility;

  @Column({ name: 'violation_id', type: 'int', nullable: true })
  violationId?: number | null;

  @ManyToOne(() => Violation, { nullable: true })
  @JoinColumn({ name: 'violation_id' })
  violation?: Violation | null;

  @Column({ name: 'precheck_id', type: 'int', nullable: true })
  precheckId?: number | null;

  @ManyToOne(() => PrecheckRequest, { nullable: true })
  @JoinColumn({ name: 'precheck_id' })
  precheck?: PrecheckRequest | null;

  @Column({ name: 'submitted_by', type: 'bigint', nullable: true })
  submittedBy?: string | null;

  /** EXPLANATION | COMPLAINT | REMEDIATION_PROOF | OTHER */
  @Column({ name: 'feedback_type', length: 30 })
  feedbackType!: string;

  @Column({ length: 500 })
  subject!: string;

  @Column({ type: 'text' })
  content!: string;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  attachments!: any[];

  /** RECEIVED | PROCESSING | ACCEPTED | REJECTED */
  @Column({ length: 20, default: 'RECEIVED' })
  status!: string;

  @Column({ name: 'handled_by', type: 'bigint', nullable: true })
  handledBy?: string | null;

  @Column({ name: 'response_note', type: 'text', nullable: true })
  responseNote?: string | null;

  @Column({ name: 'handled_at', type: 'timestamp', nullable: true })
  handledAt?: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;
}

/** Hàng đợi đối soát đối tượng (độ tương đồng 0.7 - 0.9 cần cán bộ kiểm tra) */
@Entity('suspect_match_candidates')
export class SuspectMatchCandidate {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'violation_id', type: 'int', nullable: true })
  violationId?: number | null;

  @Column({ name: 'suspect_id', type: 'int' })
  suspectId!: number;

  @ManyToOne(() => Suspect, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'suspect_id' })
  suspect?: Suspect;

  @Column({ name: 'extracted_name', length: 255, nullable: true })
  extractedName?: string;

  @Column({ name: 'extracted_identifiers', type: 'jsonb', default: () => "'{}'" })
  extractedIdentifiers!: any;

  @Column({ type: 'float' })
  score!: number;

  /** PENDING | MERGED | REJECTED */
  @Column({ length: 20, default: 'PENDING' })
  status!: string;

  @Column({ name: 'reviewed_by', type: 'bigint', nullable: true })
  reviewedBy?: string | null;

  @Column({ name: 'reviewed_at', type: 'timestamp', nullable: true })
  reviewedAt?: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;
}

/** Hồ sơ chuyển phối hợp (Công an / Sở TT&TT) */
@Entity('investigation_cases')
export class InvestigationCase {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 50, unique: true, nullable: true })
  code!: string;

  @Column({ name: 'violation_id', type: 'int' })
  violationId!: number;

  @ManyToOne(() => Violation)
  @JoinColumn({ name: 'violation_id' })
  violation?: Violation;

  /** CYBER_POLICE | DEPT_INFO_COMM */
  @Column({ name: 'target_agency', length: 30 })
  targetAgency!: string;

  @Column({ type: 'text', nullable: true })
  reason?: string;

  @Column({ name: 'request_content', type: 'text', nullable: true })
  requestContent?: string;

  @Column({ length: 10, default: 'MEDIUM' })
  severity!: string;

  @Column({ length: 30, default: 'TRANSFERRED' })
  status!: string;

  @Column({ name: 'requested_by', type: 'bigint', nullable: true })
  requestedBy?: string | null;

  @Column({ name: 'assigned_officer_id', type: 'bigint', nullable: true })
  assignedOfficerId?: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'assigned_officer_id' })
  assignedOfficer?: User | null;

  @Column({ name: 'suspect_id', type: 'int', nullable: true })
  suspectId?: number | null;

  @ManyToOne(() => Suspect, { nullable: true })
  @JoinColumn({ name: 'suspect_id' })
  suspect?: Suspect | null;

  @Column({ type: 'text', nullable: true })
  findings?: string | null;

  @Column({ name: 'result_summary', type: 'text', nullable: true })
  resultSummary?: string | null;

  @Column({ name: 'handling_measures', type: 'text', nullable: true })
  handlingMeasures?: string | null;

  /** IDENTIFIED | NOT_IDENTIFIED | HANDLED | RETURNED */
  @Column({ length: 30, nullable: true })
  outcome?: string | null;

  @Column({ name: 'transferred_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  transferredAt!: Date;

  @Column({ name: 'accepted_at', type: 'timestamp', nullable: true })
  acceptedAt?: Date | null;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt?: Date | null;

  @Column({ name: 'closed_at', type: 'timestamp', nullable: true })
  closedAt?: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;

  @OneToMany(() => CaseUpdate, (u) => u.case)
  updates?: CaseUpdate[];
}

/** Dòng thời gian xử lý của hồ sơ phối hợp */
@Entity('case_updates')
export class CaseUpdate {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'case_id', type: 'int' })
  caseId!: number;

  @ManyToOne(() => InvestigationCase, (c) => c.updates, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'case_id' })
  case?: InvestigationCase;

  @Column({ name: 'author_id', type: 'bigint', nullable: true })
  authorId?: string | null;

  @Column({ name: 'author_role', length: 50, nullable: true })
  authorRole?: string | null;

  @Column({ length: 50 })
  action!: string;

  @Column({ type: 'text', nullable: true })
  note?: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;
}
