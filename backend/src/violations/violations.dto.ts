import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ListQueryDto } from '../system-admin/system.dto';
import { PLATFORM } from '../common/constants';

export { ListQueryDto };

// ---------- Danh mục loại vi phạm ----------
export class CreateViolationTypeDto {
  @IsString() @IsNotEmpty() @MaxLength(50) code!: string;
  @IsString() @IsNotEmpty() @MaxLength(255) name!: string;
  /** Trọng số dùng tính điểm rủi ro (Bảng 12.7) */
  @IsInt() @Min(0) weight!: number;
  /** LOW | MEDIUM | HIGH */
  @IsIn(['LOW', 'MEDIUM', 'HIGH']) severity!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsInt() legalDocumentId?: number;
  @IsOptional() @IsString() legalBasis?: string;
  @IsOptional() @IsInt() @Min(0) fineMin?: number;
  @IsOptional() @IsInt() @Min(0) fineMax?: number;
}

export class UpdateViolationTypeDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsInt() @Min(0) weight?: number;
  @IsOptional() @IsIn(['LOW', 'MEDIUM', 'HIGH']) severity?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsInt() legalDocumentId?: number;
  @IsOptional() @IsString() legalBasis?: string;
  @IsOptional() @IsInt() @Min(0) fineMin?: number;
  @IsOptional() @IsInt() @Min(0) fineMax?: number;
}

// ---------- Hồ sơ vi phạm ----------
export class ViolationQueryDto extends ListQueryDto {
  /** Một hoặc nhiều trạng thái, cách nhau dấu phẩy */
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() severity?: string;
  /** Mã loại vi phạm, VD FALSE_CLAIM */
  @IsOptional() @IsString() typeCode?: string;
  @IsOptional() @IsInt() facilityId?: number;
  @IsOptional() @IsInt() suspectId?: number;
  @IsOptional() @IsString() source?: string;
  /** Quận/huyện của cơ sở */
  @IsOptional() @IsString() district?: string;
  /** me: hồ sơ được giao cho tôi */
  @IsOptional() @IsString() assignedTo?: string;
  /** true: chưa xác định được cơ sở / đối tượng */
  @IsOptional() @IsString() unidentified?: string;
  @IsOptional() @IsString() from?: string;
  @IsOptional() @IsString() to?: string;
}

export class EvidenceDto {
  /** URL | IMAGE | VIDEO | FILE */
  @IsIn(['URL', 'IMAGE', 'VIDEO', 'FILE']) type!: string;
  @IsString() url!: string;
  @IsOptional() @IsString() note?: string;
}

export class CreateViolationDto {
  @IsString() @IsNotEmpty() @MaxLength(500) title!: string;
  /** Nội dung quảng cáo vi phạm */
  @IsString() @IsNotEmpty() content!: string;
  @IsOptional() @IsString() contentUrl?: string;
  @IsOptional() @IsInt() facilityId?: number;
  @IsOptional() @IsInt() suspectId?: number;
  /** Mã loại vi phạm, VD ["FALSE_CLAIM"] */
  @IsArray() @IsString({ each: true }) typeCodes!: string[];
  @IsOptional() @IsIn(['LOW', 'MEDIUM', 'HIGH']) severity?: string;
  /** MANUAL | PARTNER */
  @IsOptional() @IsIn(['MANUAL', 'PARTNER']) source?: string;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => EvidenceDto) evidence?: EvidenceDto[];
  @IsOptional() @IsString() conclusion?: string;
  @IsOptional() @IsInt() reach?: number;
  @IsOptional() @IsDateString() detectedAt?: string;
  /** true: chạy AI khoanh vùng đối tượng khi không có cơ sở */
  @IsOptional() @IsBoolean() detectSuspect?: boolean;
}

export class UpdateViolationDto {
  @IsOptional() @IsString() @MaxLength(500) title?: string;
  @IsOptional() @IsInt() facilityId?: number | null;
  @IsOptional() @IsInt() suspectId?: number | null;
  @IsOptional() @IsArray() @IsString({ each: true }) typeCodes?: string[];
  @IsOptional() @IsIn(['LOW', 'MEDIUM', 'HIGH']) severity?: string;
  @IsOptional() @IsString() conclusion?: string;
  @IsOptional() @IsInt() priority?: number;
}

export class AssessDto {
  /** Vi phạm có thuộc thẩm quyền xử lý của Sở Y tế không */
  @IsBoolean() withinAuthority!: boolean;
  /** Đã đủ thông tin về chủ thể vi phạm để xử lý chưa */
  @IsBoolean() hasEnoughInfo!: boolean;
  @IsOptional() @IsString() note?: string;
  /** Nếu không thuộc thẩm quyền / thiếu thông tin: chuyển ngay cho cơ quan này */
  @IsOptional() @IsIn(['CYBER_POLICE', 'DEPT_INFO_COMM']) transferTo?: string;
}

export class TransferDto {
  /** CYBER_POLICE (Phòng An ninh mạng) | DEPT_INFO_COMM (Sở TT&TT) */
  @IsIn(['CYBER_POLICE', 'DEPT_INFO_COMM']) targetAgency!: string;
  @IsString() @IsNotEmpty({ message: 'Vui lòng nêu lý do chuyển' }) reason!: string;
  /** Nội dung đề nghị phối hợp */
  @IsOptional() @IsString() requestContent?: string;
}

export class NoteDto {
  @IsString() @IsNotEmpty({ message: 'Vui lòng nhập nội dung' }) note!: string;
}

export class RemediationDto {
  /** NONE | REQUIRED | IN_PROGRESS | REMEDIATED */
  @IsIn(['NONE', 'REQUIRED', 'IN_PROGRESS', 'REMEDIATED']) remediationStatus!: string;
  @IsOptional() @IsString() note?: string;
}

// ---------- Quyết định xử phạt ----------
export class CreatePenaltyDto {
  /** Số quyết định, VD 123/QĐ-XPHC */
  @IsString() @IsNotEmpty() @MaxLength(100) decisionNumber!: string;
  /** Bỏ trống: lấy tên cơ sở / đối tượng của hồ sơ */
  @IsOptional() @IsString() offenderName?: string;
  /** Bỏ trống: lấy tên các loại vi phạm */
  @IsOptional() @IsString() violationBehavior?: string;
  @IsOptional() @IsString() legalBasis?: string;
  /** Mức phạt tiền (VNĐ) */
  @IsNumber() @Min(0) fineAmount!: number;
  @IsOptional() @IsString() additionalPenalty?: string;
  @IsOptional() @IsString() remedialMeasures?: string;
  /** Hạn chấp hành (yyyy-mm-dd) */
  @IsOptional() @IsDateString() dueDate?: string;
}

export class PenaltyQueryDto extends ListQueryDto {
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() executionStatus?: string;
  @IsOptional() @IsInt() violationId?: number;
}

export class ApprovalDto {
  @IsOptional() @IsString() note?: string;
}

export class ExecutionDto {
  /** UNPAID | PAID | APPEALING | OVERDUE | COMPLIED (đã nộp phạt + khắc phục → hoàn thành hồ sơ) */
  @IsIn(['UNPAID', 'PAID', 'APPEALING', 'OVERDUE', 'COMPLIED']) executionStatus!: string;
  @IsOptional() @IsString() note?: string;
}

// ---------- Phản hồi từ đơn vị ----------
export class CreateFeedbackDto {
  /** Phản hồi cho hồ sơ vi phạm nào (của chính cơ sở) */
  @IsOptional() @IsInt() violationId?: number;
  /** Hoặc phản hồi kết quả kiểm tra trước */
  @IsOptional() @IsInt() precheckId?: number;
  /** EXPLANATION (giải trình) | COMPLAINT (khiếu nại) | REMEDIATION_PROOF (bằng chứng khắc phục) | OTHER */
  @IsIn(['EXPLANATION', 'COMPLAINT', 'REMEDIATION_PROOF', 'OTHER']) feedbackType!: string;
  @IsString() @IsNotEmpty() @MaxLength(500) subject!: string;
  @IsString() @IsNotEmpty() content!: string;
}

export class FeedbackQueryDto extends ListQueryDto {
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() feedbackType?: string;
  @IsOptional() @IsInt() facilityId?: number;
  @IsOptional() @IsInt() violationId?: number;
}

export class RespondFeedbackDto {
  /** ACCEPTED | REJECTED */
  @IsIn(['ACCEPTED', 'REJECTED']) decision!: string;
  @IsString() @IsNotEmpty() responseNote!: string;
  /** Khiếu nại được chấp nhận: bác bỏ hồ sơ vi phạm */
  @IsOptional() @IsBoolean() dismissViolation?: boolean;
  /** Bằng chứng khắc phục được chấp nhận: đánh dấu đã khắc phục */
  @IsOptional() @IsBoolean() markRemediated?: boolean;
  /** Phản hồi kết quả kiểm tra trước được chấp nhận: kết quả mới PASS | WARNING | FAIL */
  @IsOptional() @IsIn(['PASS', 'WARNING', 'FAIL']) newPrecheckResult?: string;
}

// ---------- Kiểm tra trước ----------
export class CreatePrecheckDto {
  /** Nội dung quảng cáo dự kiến (văn bản; nếu là ảnh/video hãy nhập lời thoại / chữ trên ảnh) */
  @IsString() @IsNotEmpty({ message: 'Vui lòng nhập nội dung quảng cáo' }) contentText!: string;
  @IsOptional() @IsString() contentUrl?: string;
  /** Tên cơ sở (cơ sở KCB đăng nhập: tự lấy theo tài khoản) */
  @IsOptional() @IsString() facilityName?: string;
  /** Số giấy phép hoạt động */
  @IsOptional() @IsString() licenseNumber?: string;
  /** Người đại diện */
  @IsOptional() @IsString() representative?: string;
  @IsOptional() @IsString() submitterName?: string;
  @IsOptional() @IsString() submitterContact?: string;
  /** Đường dẫn file đã upload qua /prechecks/extract-file */
  @IsOptional() @IsArray() attachments?: any[];
}

export class PrecheckQueryDto extends ListQueryDto {
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() result?: string;
  @IsOptional() @IsInt() facilityId?: number;
  @IsOptional() @IsString() submitterType?: string;
}

export class ReviewPrecheckDto {
  /** Kết quả cuối cùng: PASS | WARNING | FAIL */
  @IsIn(['PASS', 'WARNING', 'FAIL']) finalResult!: string;
  @IsString() @IsNotEmpty() reviewNote!: string;
}

// ---------- Đối tượng vi phạm ----------
export class SuspectQueryDto extends ListQueryDto {
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() riskLevel?: string;
  /** risk | violations | recent */
  @IsOptional() @IsString() sort?: string;
}

export class AccountDto {
  @IsIn(PLATFORM as unknown as string[]) platform!: string;
  @IsString() @IsNotEmpty() platformUid!: string;
  @IsOptional() @IsString() displayName?: string;
  @IsOptional() @IsString() url?: string;
}

export class CreateSuspectDto {
  @IsString() @IsNotEmpty() name!: string;
  @IsOptional() @IsString() @MaxLength(20) taxCode?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() representative?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) phones?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) emails?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) websites?: string[];
  @IsOptional() @IsInt() facilityId?: number;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => AccountDto) accounts?: AccountDto[];
}

export class UpdateSuspectDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() @MaxLength(20) taxCode?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() representative?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) phones?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) emails?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) websites?: string[];
  @IsOptional() @IsInt() facilityId?: number | null;
  @IsOptional() @IsString() notes?: string;
}

export class VerifySuspectDto {
  /** VERIFIED (đã xác minh danh tính) | CLEARED (loại trừ) | MONITORING */
  @IsIn(['VERIFIED', 'CLEARED', 'MONITORING']) status!: string;
  @IsOptional() @IsString() note?: string;
}

export class MergeSuspectDto {
  /** Gộp đối tượng hiện tại VÀO đối tượng này */
  @IsInt() targetSuspectId!: number;
}

export class DetectDto {
  @IsInt() violationId!: number;
}

// ---------- Hồ sơ phối hợp điều tra ----------
export class CaseQueryDto extends ListQueryDto {
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() targetAgency?: string;
  /** me: hồ sơ tôi đang thụ lý */
  @IsOptional() @IsString() assignedTo?: string;
}

export class CaseNoteDto {
  @IsString() @IsNotEmpty() note!: string;
  /** Nhãn hành động hiển thị trên dòng thời gian, mặc định NOTE */
  @IsOptional() @IsString() action?: string;
}

export class IdentifyDto {
  /** Đối tượng có sẵn */
  @IsOptional() @IsInt() suspectId?: number;
  /** Hoặc tạo hồ sơ đối tượng mới */
  @IsOptional() @ValidateNested() @Type(() => CreateSuspectDto) newSuspect?: CreateSuspectDto;
  @IsString() @IsNotEmpty() findings!: string;
}

export class CompleteCaseDto {
  /** HANDLED (đã xử lý) | NOT_IDENTIFIED (không xác định được đối tượng) */
  @IsIn(['HANDLED', 'NOT_IDENTIFIED']) outcome!: string;
  @IsString() @IsNotEmpty() resultSummary!: string;
  @IsOptional() @IsString() handlingMeasures?: string;
  /** true: cơ quan phối hợp đã xử lý triệt để → đóng luôn hồ sơ vi phạm */
  @IsOptional() @IsBoolean() closeViolation?: boolean;
}

// ---------- Người dân ----------
export class CitizenReportDto {
  /** Nội dung quảng cáo nghi vấn */
  @IsString() @IsNotEmpty() content!: string;
  @IsOptional() @IsString() sourceUrl?: string;
  @IsOptional() @IsIn(PLATFORM as unknown as string[]) platform?: string;
  @IsOptional() @IsString() reporterName?: string;
  /** SĐT / email để nhận phản hồi */
  @IsOptional() @IsString() reporterContact?: string;
}

export class PublicFacilityQueryDto extends ListQueryDto {
  @IsOptional() @IsString() district?: string;
  /** Mã loại cơ sở, VD NHA_KHOA */
  @IsOptional() @IsString() typeCode?: string;
  /** Kỹ thuật cần tìm, VD "nhổ răng" */
  @IsOptional() @IsString() technique?: string;
}

export class PublicViolatorQueryDto extends ListQueryDto {
  @IsOptional() @IsString() licenseNumber?: string;
  @IsOptional() @IsString() district?: string;
  @IsOptional() @IsString() typeCode?: string;
  @IsOptional() @IsString() from?: string;
  @IsOptional() @IsString() to?: string;
  /** PENALIZED | RESOLVED */
  @IsOptional() @IsString() status?: string;
}

export class StatsQueryDto {
  @IsOptional() @IsString() from?: string;
  @IsOptional() @IsString() to?: string;
}
