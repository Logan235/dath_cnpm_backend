import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ListQueryDto } from '../system-admin/system.dto';
export { ListQueryDto };
import { CrawledItemDto } from '../info-source/info-source.dto';
import { REJECT_REASON } from '../common/constants';

export class AdItemQueryDto extends ListQueryDto {
  /** Một hoặc nhiều trạng thái, cách nhau dấu phẩy. VD COLLECTED hoặc AI_ANALYZED,IN_REVIEW */
  @IsOptional() @IsString() status?: string;
  /** CRAWLER | CITIZEN_REPORT | PRECHECK | PARTNER | MANUAL */
  @IsOptional() @IsString() sourceType?: string;
  @IsOptional() @IsString() platform?: string;
  @IsOptional() @IsInt() topicId?: number;
  @IsOptional() @IsInt() scheduleId?: number;
  @IsOptional() @IsInt() crawlJobId?: number;
  @IsOptional() @IsInt() facilityId?: number;
  /** THAM_MY | DUOC_PHAM | KHAM_CHUA_BENH | NHA_KHOA | TPCN | KHAC */
  @IsOptional() @IsString() field?: string;
  /** LOW | MEDIUM | HIGH */
  @IsOptional() @IsString() suspicionLevel?: string;
  /** TEXT | IMAGE | VIDEO | AUDIO | MIXED */
  @IsOptional() @IsString() dataFormat?: string;
  /** me: mẫu tin được giao cho tôi */
  @IsOptional() @IsString() assignedTo?: string;
  /** yyyy-mm-dd */
  @IsOptional() @IsString() from?: string;
  @IsOptional() @IsString() to?: string;
  /** collectedAt | priority (mặc định collectedAt mới nhất) */
  @IsOptional() @IsString() sort?: string;
}

export class IngestDto {
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CrawledItemDto)
  items!: CrawledItemDto[];

  @IsOptional() @IsInt() scheduleId?: number;
  @IsOptional() @IsInt() crawlSourceId?: number;
  @IsOptional() @IsInt() topicId?: number;

  /** CRAWLER | PARTNER | MANUAL */
  @IsOptional()
  @IsIn(['CRAWLER', 'PARTNER', 'MANUAL'])
  sourceType?: string;
}

export class QcExtractDto {
  /** Đường dẫn bài quảng cáo (backend sẽ tải nội dung trang) */
  @IsOptional() @IsString() url?: string;
  /** Hoặc dán trực tiếp nội dung */
  @IsOptional() @IsString() text?: string;
}

export class QcDecisionDto {
  /** Danh sách id mẫu tin (trạng thái COLLECTED) */
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  ids!: string[];

  /** DISCARD: loại bỏ | FORWARD: chuyển tiếp sang bước xử lý (AI) */
  @IsIn(['DISCARD', 'FORWARD'])
  action!: 'DISCARD' | 'FORWARD';

  /** Bắt buộc khi DISCARD: SPAM | DUPLICATE | IRRELEVANT | WHITELISTED | TOO_SHORT | OTHER */
  @IsOptional()
  @IsIn(REJECT_REASON as unknown as string[])
  reason?: string;

  @IsOptional() @IsString() note?: string;

  /** Thao tác không thể hoàn tác — phải gửi true để xác nhận */
  @IsBoolean()
  confirm!: boolean;
}

export class IdsDto {
  /** Bỏ trống: áp dụng cho tất cả mẫu tin hợp lệ */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  ids?: string[];
}

export class DeleteItemsDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  ids!: string[];

  @IsBoolean()
  confirm!: boolean;
}

export class ClassifyDto {
  @IsOptional() @IsIn(['THAM_MY', 'DUOC_PHAM', 'KHAM_CHUA_BENH', 'NHA_KHOA', 'TPCN', 'THIET_BI_YT', 'KHAC']) field?: string;
  @IsOptional() @IsIn(['CO_SO_KCB', 'THUOC', 'DICH_VU', 'THIET_BI', 'CA_NHAN', 'KHAC']) adSubject?: string;
  @IsOptional() @IsIn(['LOW', 'MEDIUM', 'HIGH']) suspicionLevel?: string;
  @IsOptional() @IsIn(['TEXT', 'IMAGE', 'VIDEO', 'AUDIO', 'MIXED']) dataFormat?: string;
  @IsOptional() @IsInt() topicId?: number;
}

export class ClaimDto {
  /** Số mẫu tin muốn nhận (ưu tiên điểm cao trước) */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  count?: number;
}

export class AssignDto {
  /** id người dùng (chuyên viên) */
  @IsString()
  @IsNotEmpty()
  userId!: string;
}

export class ReviewDto {
  /** VIOLATION: xác nhận vi phạm | NOT_VIOLATION: bác bỏ | NEED_MORE_INFO: yêu cầu bổ sung */
  @IsIn(['VIOLATION', 'NOT_VIOLATION', 'NEED_MORE_INFO'])
  decision!: string;

  /** Đồng ý với AI? (bỏ trống: hệ thống tự so sánh) */
  @IsOptional() @IsBoolean() agreesWithAi?: boolean;

  /** Loại vi phạm theo đánh giá của chuyên viên (bỏ trống: dùng gợi ý của AI) */
  @IsOptional() @IsArray() @IsString({ each: true }) correctedViolationTypes?: string[];

  /** LOW | MEDIUM | HIGH */
  @IsOptional() @IsIn(['LOW', 'MEDIUM', 'HIGH']) severity?: string;

  /** VALID | INVALID | EXPIRED | NOT_FOUND | UNKNOWN */
  @IsOptional() @IsIn(['VALID', 'INVALID', 'EXPIRED', 'NOT_FOUND', 'UNKNOWN']) licenseStatus?: string;

  /** COMPLIANT | NON_COMPLIANT | UNKNOWN */
  @IsOptional() @IsIn(['COMPLIANT', 'NON_COMPLIANT', 'UNKNOWN']) compliantStatus?: string;

  /** Lý do / nhận xét — bắt buộc */
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng ghi lý do / nhận xét' })
  reason!: string;

  /** Phần AI dự đoán sai / thiếu căn cứ (phục vụ tái huấn luyện) */
  @IsOptional() @IsString() wrongParts?: string;

  /** Thời gian xem xét (giây) */
  @IsOptional() @IsInt() durationSeconds?: number;
}

export class ResolveConflictDto {
  @IsIn(['VIOLATION', 'NOT_VIOLATION'])
  decision!: string;

  @IsOptional() @IsArray() @IsString({ each: true }) correctedViolationTypes?: string[];
  @IsOptional() @IsIn(['LOW', 'MEDIUM', 'HIGH']) severity?: string;

  @IsString()
  @IsNotEmpty()
  reason!: string;
}

export class WhitelistQueryDto extends ListQueryDto {
  @IsOptional() @IsString() entryType?: string;
}

export class CreateWhitelistDto {
  /** DOMAIN | ACCOUNT | PHONE | FACILITY | KEYWORD */
  @IsIn(['DOMAIN', 'ACCOUNT', 'PHONE', 'FACILITY', 'KEYWORD'])
  entryType!: string;

  /** VD benhvienx.vn | facebook.com/benhviendakhoax | 0283775xxxx */
  @IsString()
  @IsNotEmpty()
  value!: string;

  @IsOptional() @IsInt() facilityId?: number;
  @IsOptional() @IsString() note?: string;
}

export class UpdateWhitelistDto {
  @IsOptional() @IsString() value?: string;
  @IsOptional() @IsInt() facilityId?: number;
  @IsOptional() @IsString() note?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class AnalyzeTextDto {
  @IsString()
  @IsNotEmpty()
  text!: string;

  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() sourceUrl?: string;
  @IsOptional() @IsInt() reach?: number;
}

export class FeedbackExportDto {
  /** jsonl | csv */
  @IsOptional() @IsIn(['jsonl', 'csv']) format?: string;
  /** true: chỉ xuất dữ liệu chưa xuất lần nào */
  @IsOptional() @IsString() onlyNew?: string;
  /** true: đánh dấu đã xuất (gắn datasetVersion) */
  @IsOptional() @IsString() markExported?: string;
  @IsOptional() @IsString() datasetVersion?: string;
}

export class UpdateModelDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() version?: string;
  @IsOptional() @IsString() endpoint?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
