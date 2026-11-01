import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ListQueryDto } from '../system-admin/system.dto';
export { ListQueryDto };
import { PLATFORM } from '../common/constants';

// ---------- Danh mục đơn giản (loại văn bản, loại cơ sở, phân loại nguồn, chủ đề) ----------
export class CatalogQueryDto extends ListQueryDto {
  /** true | false */
  @IsOptional()
  @IsString()
  isActive?: string;
}

export class CreateCatalogDto {
  @IsString()
  @IsNotEmpty({ message: 'Mã là bắt buộc' })
  @MaxLength(50)
  code!: string;

  @IsString()
  @IsNotEmpty({ message: 'Tên là bắt buộc' })
  @MaxLength(255)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

export class UpdateCatalogDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

export class StatusDto {
  /** ACTIVE | INACTIVE */
  @IsIn(['ACTIVE', 'INACTIVE'])
  status!: string;
}

export class ImportQueryDto {
  /** true: nếu đủ trường bắt buộc thì lưu luôn; mặc định chỉ trả bản nháp để điền form */
  @IsOptional()
  @IsString()
  autoSave?: string;
}

// ---------- Văn bản pháp lý ----------
export class LegalDocQueryDto extends ListQueryDto {
  @IsOptional()
  @IsInt()
  typeId?: number;

  /** ACTIVE | INACTIVE (người dân chỉ thấy ACTIVE) */
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  field?: string;

  @IsOptional()
  @IsString()
  issuer?: string;

  /** Ngày ban hành từ (yyyy-mm-dd) */
  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;
}

export class CreateLegalDocDto {
  /** Mã văn bản — không trùng, không để trống */
  @IsString()
  @IsNotEmpty({ message: 'Mã văn bản là bắt buộc' })
  @MaxLength(100)
  code!: string;

  /** Số văn bản theo định dạng chuẩn, VD 16/2012/QH13, 117/2020/NĐ-CP, 123/SYT-NVY */
  @IsString()
  @IsNotEmpty({ message: 'Số văn bản là bắt buộc' })
  @MaxLength(100)
  documentNumber!: string;

  @IsString()
  @IsNotEmpty({ message: 'Tên văn bản là bắt buộc' })
  @MaxLength(500)
  title!: string;

  /** Loại văn bản (GET /legal-document-types) */
  @IsInt({ message: 'Phải chọn loại văn bản' })
  typeId!: number;

  @IsOptional()
  @IsString()
  issuer?: string;

  @IsOptional()
  @IsDateString()
  issuedDate?: string;

  @IsOptional()
  @IsDateString()
  effectiveDate?: string;

  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @IsOptional()
  @IsString()
  field?: string;

  @IsOptional()
  @IsString()
  summary?: string;

  @IsOptional()
  @IsString()
  content?: string;

  /** Đường dẫn file đính kèm (nếu đã upload qua /legal-documents/import) */
  @IsOptional()
  @IsString()
  attachmentPath?: string;

  @IsOptional()
  @IsString()
  attachmentName?: string;
}

export class UpdateLegalDocDto {
  @IsOptional() @IsString() @MaxLength(100) code?: string;
  @IsOptional() @IsString() @MaxLength(100) documentNumber?: string;
  @IsOptional() @IsString() @MaxLength(500) title?: string;
  @IsOptional() @IsInt() typeId?: number;
  @IsOptional() @IsString() issuer?: string;
  @IsOptional() @IsDateString() issuedDate?: string;
  @IsOptional() @IsDateString() effectiveDate?: string;
  @IsOptional() @IsDateString() expiryDate?: string;
  @IsOptional() @IsString() field?: string;
  @IsOptional() @IsString() summary?: string;
  @IsOptional() @IsString() content?: string;
}

// ---------- Đơn vị KCB ----------
export class FacilityQueryDto extends ListQueryDto {
  @IsOptional()
  @IsInt()
  typeId?: number;

  @IsOptional()
  @IsString()
  district?: string;

  /** ACTIVE | SUSPENDED | REVOKED */
  @IsOptional()
  @IsString()
  operatingStatus?: string;

  /** LOW | MEDIUM | HIGH */
  @IsOptional()
  @IsString()
  riskLevel?: string;

  /** true | false */
  @IsOptional()
  @IsString()
  isActive?: string;

  /** true | false */
  @IsOptional()
  @IsString()
  isBlacklisted?: string;
}

export class CreateFacilityDto {
  /** Mã đơn vị — duy nhất, dùng làm tên đăng nhập của cơ sở */
  @IsString()
  @IsNotEmpty({ message: 'Mã đơn vị là bắt buộc' })
  @MaxLength(50)
  code!: string;

  @IsString()
  @IsNotEmpty({ message: 'Tên đơn vị là bắt buộc' })
  @MaxLength(255)
  name!: string;

  @IsOptional()
  @IsInt()
  typeId?: number;

  /** Hình thức tổ chức */
  @IsString()
  @IsNotEmpty({ message: 'Hình thức tổ chức là bắt buộc' })
  organizationForm!: string;

  @IsString()
  @IsNotEmpty({ message: 'Địa chỉ là bắt buộc' })
  @MaxLength(500)
  address!: string;

  @IsOptional() @IsString() ward?: string;
  @IsOptional() @IsString() district?: string;
  @IsOptional() @IsString() province?: string;
  @IsOptional() @IsString() @MaxLength(20) phone?: string;
  @IsOptional() @IsEmail({}, { message: 'Email không hợp lệ' }) email?: string;
  @IsOptional() @IsString() website?: string;
  @IsOptional() @IsString() representative?: string;

  /** Phạm vi hoạt động chuyên môn */
  @IsString()
  @IsNotEmpty({ message: 'Phạm vi hoạt động chuyên môn là bắt buộc' })
  professionalScope!: string;

  /** Thời gian làm việc hằng ngày */
  @IsString()
  @IsNotEmpty({ message: 'Thời gian làm việc là bắt buộc' })
  workingHours!: string;

  /** Số giấy phép hoạt động */
  @IsString()
  @IsNotEmpty({ message: 'Số giấy phép hoạt động là bắt buộc' })
  licenseNumber!: string;

  /** Ngày cấp giấy phép (yyyy-mm-dd) */
  @IsDateString({}, { message: 'Ngày cấp không hợp lệ (yyyy-mm-dd)' })
  licenseIssuedDate!: string;

  /** Danh mục kỹ thuật được cấp phép */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  licensedTechniques?: string[];

  @IsOptional() @IsString() note?: string;

  /** Có tạo tài khoản đăng nhập cho cơ sở không (mặc định có) */
  @IsOptional()
  @IsBoolean()
  createAccount?: boolean;
}

export class UpdateFacilityDto {
  @IsOptional() @IsString() @MaxLength(255) name?: string;
  @IsOptional() @IsInt() typeId?: number;
  @IsOptional() @IsString() organizationForm?: string;
  @IsOptional() @IsString() @MaxLength(500) address?: string;
  @IsOptional() @IsString() ward?: string;
  @IsOptional() @IsString() district?: string;
  @IsOptional() @IsString() province?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() website?: string;
  @IsOptional() @IsString() representative?: string;
  @IsOptional() @IsString() professionalScope?: string;
  @IsOptional() @IsString() workingHours?: string;
  @IsOptional() @IsString() licenseNumber?: string;
  @IsOptional() @IsDateString() licenseIssuedDate?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) licensedTechniques?: string[];
  @IsOptional() @IsString() note?: string;
}

export class OperatingStatusDto {
  /** ACTIVE | SUSPENDED (tạm đình chỉ) | REVOKED (rút giấy phép) */
  @IsIn(['ACTIVE', 'SUSPENDED', 'REVOKED'])
  operatingStatus!: string;

  @IsOptional()
  @IsString()
  note?: string;
}

export class BlacklistDto {
  @IsBoolean()
  isBlacklisted!: boolean;

  @IsOptional()
  @IsString()
  note?: string;
}

// ---------- Giấy phép ----------
export class LicenseQueryDto extends ListQueryDto {
  /** GPHD | CCHN | XNQC | OTHER */
  @IsOptional()
  @IsString()
  licenseType?: string;

  @IsOptional()
  @IsInt()
  facilityId?: number;

  @IsOptional()
  @IsString()
  status?: string;

  /** true: chỉ giấy phép đã hết hạn */
  @IsOptional()
  @IsString()
  expired?: string;

  /** Số ngày: giấy phép sắp hết hạn trong N ngày tới */
  @IsOptional()
  @IsInt()
  expiringInDays?: number;
}

export class CreateLicenseDto {
  @IsString()
  @IsNotEmpty({ message: 'Số giấy phép là bắt buộc' })
  @MaxLength(100)
  licenseNumber!: string;

  /** GPHD | CCHN | XNQC | OTHER */
  @IsIn(['GPHD', 'CCHN', 'XNQC', 'OTHER'])
  licenseType!: string;

  /** Đơn vị KCB (bắt buộc với GPHD, XNQC) */
  @IsOptional()
  @IsInt()
  facilityId?: number;

  /** Người được cấp (bắt buộc với CCHN — họ tên bác sĩ) */
  @IsOptional()
  @IsString()
  holderName?: string;

  @IsOptional()
  @IsString()
  holderTitle?: string;

  @IsDateString({}, { message: 'Ngày cấp không hợp lệ (yyyy-mm-dd)' })
  issuedDate!: string;

  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @IsOptional() @IsString() issuer?: string;
  @IsOptional() @IsString() scope?: string;
  @IsOptional() @IsString() note?: string;
  @IsOptional() @IsString() attachmentPath?: string;
  @IsOptional() @IsString() attachmentName?: string;
}

export class UpdateLicenseDto {
  @IsOptional() @IsString() licenseNumber?: string;
  @IsOptional() @IsInt() facilityId?: number;
  @IsOptional() @IsString() holderName?: string;
  @IsOptional() @IsString() holderTitle?: string;
  @IsOptional() @IsDateString() issuedDate?: string;
  @IsOptional() @IsDateString() expiryDate?: string;
  @IsOptional() @IsString() issuer?: string;
  @IsOptional() @IsString() scope?: string;
  @IsOptional() @IsString() note?: string;
}

// ---------- Thu thập tin ----------
export class CreateSourceDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsInt()
  categoryId!: number;

  /** FACEBOOK | TIKTOK | YOUTUBE | GOOGLE | ZALO | INSTAGRAM | WEBSITE | RADIO | TV | OUTDOOR | OTHER */
  @IsIn(PLATFORM as unknown as string[])
  platform!: string;

  @IsOptional() @IsString() url?: string;
  @IsOptional() @IsString() note?: string;
}

export class UpdateSourceDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsInt() categoryId?: number;
  @IsOptional() @IsIn(PLATFORM as unknown as string[]) platform?: string;
  @IsOptional() @IsString() url?: string;
  @IsOptional() @IsString() note?: string;
}

export class SetActiveFlagDto {
  @IsBoolean()
  isActive!: boolean;
}

export class CreateKeywordDto {
  @IsString()
  @IsNotEmpty({ message: 'Từ khóa không được để trống' })
  @MaxLength(255)
  keyword!: string;

  /** PRIMARY | SECONDARY */
  @IsOptional()
  @IsIn(['PRIMARY', 'SECONDARY'])
  keywordType?: string;
}

export class UpdateKeywordDto {
  @IsOptional() @IsString() @MaxLength(255) keyword?: string;
  @IsOptional() @IsIn(['PRIMARY', 'SECONDARY']) keywordType?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class ScheduleQueryDto extends ListQueryDto {
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsInt() sourceId?: number;
  @IsOptional() @IsInt() topicId?: number;
}

export class CreateScheduleDto {
  /** Mã lịch — duy nhất */
  @IsString()
  @IsNotEmpty({ message: 'Mã lịch thu thập là bắt buộc' })
  @MaxLength(50)
  code!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsInt()
  sourceId!: number;

  @IsOptional()
  @IsInt()
  topicId?: number;

  /** Từ khóa chính, cách nhau dấu phẩy — bắt buộc, không ký tự đặc biệt */
  @IsString()
  @IsNotEmpty({ message: 'Từ khóa không được để trống' })
  primaryKeywords!: string;

  @IsOptional()
  @IsString()
  secondaryKeywords?: string;

  /** ["TEXT","IMAGE","VIDEO","AUDIO"] */
  @IsOptional()
  @IsArray()
  @IsIn(['TEXT', 'IMAGE', 'VIDEO', 'AUDIO'], { each: true })
  dataTypes?: string[];

  /** 24/7 | EVERY_2H | EVERY_6H | DAILY | WEEKLY */
  @IsOptional()
  @IsString()
  frequency?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100000)
  sampleLimit?: number;
}

export class UpdateScheduleDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsInt() sourceId?: number;
  @IsOptional() @IsInt() topicId?: number;
  @IsOptional() @IsString() primaryKeywords?: string;
  @IsOptional() @IsString() secondaryKeywords?: string;
  @IsOptional() @IsArray() @IsIn(['TEXT', 'IMAGE', 'VIDEO', 'AUDIO'], { each: true }) dataTypes?: string[];
  @IsOptional() @IsString() frequency?: string;
  @IsOptional() @IsInt() @Min(1) sampleLimit?: number;
}

export class CrawledItemDto {
  @IsString()
  @IsNotEmpty()
  content!: string;

  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() sourceUrl?: string;
  @IsOptional() @IsString() authorName?: string;
  @IsOptional() @IsString() authorAccount?: string;
  @IsOptional() @IsString() platform?: string;
  /** TEXT | IMAGE | VIDEO | AUDIO | MIXED */
  @IsOptional() @IsString() dataFormat?: string;
  @IsOptional() @IsArray() media?: any[];
  @IsOptional() @IsInt() likes?: number;
  @IsOptional() @IsInt() shares?: number;
  @IsOptional() @IsInt() views?: number;
  @IsOptional() @IsInt() comments?: number;
  @IsOptional() @IsDateString() publishedAt?: string;
}

export class RunScheduleDto {
  /** Số mẫu tin giả lập crawler sẽ thu về (1-50, mặc định 5). Bỏ qua nếu truyền items */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  count?: number;

  /** Dữ liệu thật do crawler bên ngoài gửi vào (nếu có) */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CrawledItemDto)
  items?: CrawledItemDto[];
}
