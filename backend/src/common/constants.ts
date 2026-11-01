// =====================================================================
// HẰNG SỐ NGHIỆP VỤ DÙNG CHUNG
// Mã lưu trong DB là tiếng Anh (ổn định khi lập trình), nhãn tiếng Việt để
// frontend hiển thị: GET /meta/enums trả về toàn bộ bảng dưới đây.
// =====================================================================

export const ROLE = {
  ADMIN: 'ADMIN', // Quản trị hệ thống
  SPECIALIST: 'SPECIALIST', // Chuyên viên Sở Y tế
  MANAGER: 'MANAGER', // Cán bộ quản lý / Lãnh đạo phòng
  CYBER_POLICE: 'CYBER_POLICE', // Cán bộ Phòng An ninh mạng
  FACILITY: 'FACILITY', // Cơ sở khám chữa bệnh
  CITIZEN: 'CITIZEN', // Người dân
} as const;
export type RoleCode = (typeof ROLE)[keyof typeof ROLE];

/** Vai trò "cán bộ" — chỉ cấp qua form xin cấp quyền hoặc do admin tạo */
export const OFFICER_ROLES: string[] = [
  ROLE.SPECIALIST,
  ROLE.MANAGER,
  ROLE.CYBER_POLICE,
  ROLE.ADMIN,
];

export const ACCOUNT_TYPE = {
  CITIZEN: 'CITIZEN', // đăng ký bằng email thường
  OFFICIAL: 'OFFICIAL', // đăng ký bằng email cơ quan (đuôi đặc biệt) -> cán bộ
  FACILITY: 'FACILITY', // tài khoản tự sinh khi tạo cơ sở KCB
  STAFF: 'STAFF', // do quản trị viên tạo trực tiếp
} as const;

export const USER_STATUS = { ACTIVE: 'ACTIVE', LOCKED: 'LOCKED' } as const;

export const RECORD_STATUS = { ACTIVE: 'ACTIVE', INACTIVE: 'INACTIVE' } as const;

export const ROLE_REQUEST_STATUS = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
} as const;

// ---------- Nguồn thông tin ----------
export const LICENSE_TYPE = {
  GPHD: 'GPHD', // Giấy phép hoạt động
  CCHN: 'CCHN', // Chứng chỉ hành nghề (bác sĩ)
  XNQC: 'XNQC', // Giấy xác nhận nội dung quảng cáo
  OTHER: 'OTHER',
} as const;

export const FACILITY_OPERATING_STATUS = {
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
  REVOKED: 'REVOKED',
} as const;

export const CRAWL_STATUS = {
  RUNNING: 'RUNNING',
  PAUSED: 'PAUSED',
  STOPPED: 'STOPPED',
} as const;

export const PLATFORM = [
  'FACEBOOK',
  'TIKTOK',
  'YOUTUBE',
  'GOOGLE',
  'ZALO',
  'INSTAGRAM',
  'WEBSITE',
  'RADIO',
  'TV',
  'OUTDOOR',
  'OTHER',
] as const;

export const DATA_FORMAT = ['TEXT', 'IMAGE', 'VIDEO', 'AUDIO', 'MIXED'] as const;

// ---------- Xử lý thông tin quảng cáo (mẫu tin) ----------
export const AD_STATUS = {
  COLLECTED: 'COLLECTED', // Đã thu thập — chờ kiểm tra nhanh / lọc
  QC_REJECTED: 'QC_REJECTED', // Bị loại ở bước kiểm tra nhanh QC
  FILTER_REJECTED: 'FILTER_REJECTED', // Bị loại bởi bộ lọc tự động
  FILTERED: 'FILTERED', // Đã lọc — chờ AI phân tích
  AI_ANALYZED: 'AI_ANALYZED', // AI đã phân tích — chờ chuyên viên
  IN_REVIEW: 'IN_REVIEW', // Chuyên viên đã nhận xử lý
  NEED_MORE_INFO: 'NEED_MORE_INFO', // Cần bổ sung căn cứ
  CONFLICT: 'CONFLICT', // Các chuyên viên đánh giá khác nhau — chờ lãnh đạo
  CONFIRMED_VIOLATION: 'CONFIRMED_VIOLATION', // Đã xác nhận vi phạm
  NOT_VIOLATION: 'NOT_VIOLATION', // Kết luận không vi phạm
} as const;

export const AD_SOURCE = {
  CRAWLER: 'CRAWLER',
  CITIZEN_REPORT: 'CITIZEN_REPORT',
  PRECHECK: 'PRECHECK',
  PARTNER: 'PARTNER',
  MANUAL: 'MANUAL',
} as const;

export const REJECT_REASON = ['SPAM', 'DUPLICATE', 'IRRELEVANT', 'WHITELISTED', 'TOO_SHORT', 'OTHER'] as const;

export const AI_LABEL = {
  VIOLATION: 'VIOLATION',
  SUSPECTED: 'SUSPECTED',
  NO_VIOLATION: 'NO_VIOLATION',
} as const;

export const REVIEW_DECISION = {
  VIOLATION: 'VIOLATION',
  NOT_VIOLATION: 'NOT_VIOLATION',
  NEED_MORE_INFO: 'NEED_MORE_INFO',
} as const;

export const SEVERITY = { LOW: 'LOW', MEDIUM: 'MEDIUM', HIGH: 'HIGH' } as const;

// ---------- Thông tin vi phạm ----------
export const VIOLATION_STATUS = {
  NEW: 'NEW', // Chờ xác minh thẩm quyền
  PROCESSING: 'PROCESSING', // Đang xử lý tại Sở Y tế
  TRANSFERRED: 'TRANSFERRED', // Đã chuyển cơ quan phối hợp
  PENDING_APPROVAL: 'PENDING_APPROVAL', // Chờ lãnh đạo phê duyệt quyết định xử phạt
  PENALIZED: 'PENALIZED', // Đã ban hành quyết định xử phạt
  RESOLVED: 'RESOLVED', // Đã hoàn thành
  DISMISSED: 'DISMISSED', // Bác bỏ
} as const;
export const VIOLATION_OPEN_STATUSES: string[] = [
  VIOLATION_STATUS.NEW,
  VIOLATION_STATUS.PROCESSING,
  VIOLATION_STATUS.TRANSFERRED,
  VIOLATION_STATUS.PENDING_APPROVAL,
  VIOLATION_STATUS.PENALIZED,
];

export const PENALTY_STATUS = {
  PENDING_APPROVAL: 'PENDING_APPROVAL',
  ISSUED: 'ISSUED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
} as const;

export const EXECUTION_STATUS = {
  NOT_ISSUED: 'NOT_ISSUED',
  UNPAID: 'UNPAID',
  PAID: 'PAID',
  APPEALING: 'APPEALING',
  OVERDUE: 'OVERDUE',
  COMPLIED: 'COMPLIED', // đã nộp phạt + khắc phục hậu quả
} as const;

export const FEEDBACK_TYPE = ['EXPLANATION', 'COMPLAINT', 'REMEDIATION_PROOF', 'OTHER'] as const;
export const FEEDBACK_STATUS = {
  RECEIVED: 'RECEIVED',
  PROCESSING: 'PROCESSING',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED',
} as const;

export const PRECHECK_RESULT = { PASS: 'PASS', WARNING: 'WARNING', FAIL: 'FAIL' } as const;
export const PRECHECK_STATUS = {
  AUTO_ASSESSED: 'AUTO_ASSESSED', // kết quả sơ bộ của AI (người dân / ẩn danh)
  PENDING_REVIEW: 'PENDING_REVIEW', // cơ sở KCB gửi — chờ chuyên viên xác minh
  REVIEWED: 'REVIEWED', // chuyên viên đã xác minh, có kết quả cuối cùng
} as const;

export const SUSPECT_STATUS = {
  MONITORING: 'MONITORING',
  UNDER_INVESTIGATION: 'UNDER_INVESTIGATION',
  VERIFIED: 'VERIFIED',
  CLEARED: 'CLEARED',
} as const;

export const CASE_AGENCY = { CYBER_POLICE: 'CYBER_POLICE', DEPT_INFO_COMM: 'DEPT_INFO_COMM' } as const;
export const CASE_STATUS = {
  TRANSFERRED: 'TRANSFERRED', // Đã chuyển, chờ tiếp nhận
  INVESTIGATING: 'INVESTIGATING', // Đã tiếp nhận, đang điều tra xác minh
  IDENTIFIED: 'IDENTIFIED', // Đã xác minh được đối tượng
  HANDLED: 'HANDLED', // Đã xử lý / có kết quả
  RETURNED: 'RETURNED', // Trả hồ sơ về Sở Y tế
  CLOSED: 'CLOSED', // Lưu trữ
} as const;

export const RISK_LEVEL = { LOW: 'LOW', MEDIUM: 'MEDIUM', HIGH: 'HIGH' } as const;

/** Nhãn tiếng Việt cho frontend */
export const LABELS: Record<string, Record<string, string>> = {
  role: {
    ADMIN: 'Quản trị hệ thống',
    SPECIALIST: 'Chuyên viên Sở Y tế',
    MANAGER: 'Cán bộ quản lý / Lãnh đạo',
    CYBER_POLICE: 'Cán bộ Phòng An ninh mạng',
    FACILITY: 'Cơ sở khám chữa bệnh',
    CITIZEN: 'Người dân',
  },
  accountType: {
    CITIZEN: 'Người dân',
    OFFICIAL: 'Cán bộ (email cơ quan)',
    FACILITY: 'Tài khoản cơ sở KCB',
    STAFF: 'Cán bộ (quản trị tạo)',
  },
  roleRequestStatus: {
    PENDING: 'Chờ duyệt',
    APPROVED: 'Đã cấp quyền',
    REJECTED: 'Từ chối',
    CANCELLED: 'Đã hủy',
  },
  recordStatus: { ACTIVE: 'Kích hoạt', INACTIVE: 'Vô hiệu hóa' },
  licenseType: {
    GPHD: 'Giấy phép hoạt động',
    CCHN: 'Chứng chỉ hành nghề',
    XNQC: 'Giấy xác nhận nội dung quảng cáo',
    OTHER: 'Khác',
  },
  facilityOperatingStatus: {
    ACTIVE: 'Đang hoạt động',
    SUSPENDED: 'Tạm đình chỉ',
    REVOKED: 'Rút giấy phép',
  },
  crawlStatus: { RUNNING: 'Đang chạy', PAUSED: 'Tạm dừng', STOPPED: 'Dừng' },
  adStatus: {
    COLLECTED: 'Đã thu thập (chờ kiểm tra)',
    QC_REJECTED: 'Loại ở kiểm tra nhanh',
    FILTER_REJECTED: 'Loại bởi bộ lọc',
    FILTERED: 'Đã lọc (chờ AI)',
    AI_ANALYZED: 'AI đã phân tích (chờ chuyên viên)',
    IN_REVIEW: 'Chuyên viên đang xem xét',
    NEED_MORE_INFO: 'Cần bổ sung căn cứ',
    CONFLICT: 'Đánh giá xung đột (chờ lãnh đạo)',
    CONFIRMED_VIOLATION: 'Đã xác nhận vi phạm',
    NOT_VIOLATION: 'Không vi phạm',
  },
  adSource: {
    CRAWLER: 'Crawler thu thập',
    CITIZEN_REPORT: 'Phản ánh của người dân',
    PRECHECK: 'Từ kiểm tra trước',
    PARTNER: 'Đơn vị phối hợp cung cấp',
    MANUAL: 'Cán bộ nhập thủ công',
  },
  rejectReason: {
    SPAM: 'Tin rác',
    DUPLICATE: 'Trùng lặp',
    IRRELEVANT: 'Không liên quan y tế',
    WHITELISTED: 'Thuộc danh sách tin cậy (whitelist)',
    TOO_SHORT: 'Nội dung quá ngắn',
    OTHER: 'Khác',
  },
  aiLabel: { VIOLATION: 'Vi phạm', SUSPECTED: 'Nghi vấn', NO_VIOLATION: 'Không vi phạm' },
  reviewDecision: {
    VIOLATION: 'Xác nhận vi phạm',
    NOT_VIOLATION: 'Bác bỏ (không vi phạm)',
    NEED_MORE_INFO: 'Yêu cầu bổ sung bằng chứng',
  },
  severity: { LOW: 'Nhẹ', MEDIUM: 'Trung bình', HIGH: 'Nghiêm trọng' },
  violationStatus: {
    NEW: 'Chờ xác minh',
    PROCESSING: 'Đang xử lý',
    TRANSFERRED: 'Đã chuyển phối hợp',
    PENDING_APPROVAL: 'Chờ lãnh đạo phê duyệt',
    PENALIZED: 'Đã ra quyết định xử phạt',
    RESOLVED: 'Đã hoàn thành',
    DISMISSED: 'Bác bỏ',
  },
  penaltyStatus: {
    PENDING_APPROVAL: 'Chờ phê duyệt',
    ISSUED: 'Đã ban hành',
    REJECTED: 'Bị từ chối',
    CANCELLED: 'Đã hủy',
  },
  executionStatus: {
    NOT_ISSUED: 'Chưa ban hành',
    UNPAID: 'Chưa nộp phạt',
    PAID: 'Đã nộp phạt',
    APPEALING: 'Đang khiếu nại',
    OVERDUE: 'Quá hạn',
    COMPLIED: 'Đã chấp hành',
  },
  feedbackType: {
    EXPLANATION: 'Giải trình',
    COMPLAINT: 'Khiếu nại',
    REMEDIATION_PROOF: 'Bằng chứng khắc phục',
    OTHER: 'Khác',
  },
  feedbackStatus: {
    RECEIVED: 'Đã tiếp nhận',
    PROCESSING: 'Đang xử lý',
    ACCEPTED: 'Chấp nhận',
    REJECTED: 'Không chấp nhận',
  },
  precheckResult: { PASS: 'Đạt', WARNING: 'Cảnh báo', FAIL: 'Không đạt' },
  precheckStatus: {
    AUTO_ASSESSED: 'Kết quả sơ bộ (AI)',
    PENDING_REVIEW: 'Chờ chuyên viên xác minh',
    REVIEWED: 'Đã xác minh',
  },
  suspectStatus: {
    MONITORING: 'Đang theo dõi',
    UNDER_INVESTIGATION: 'Đang điều tra',
    VERIFIED: 'Đã xác minh danh tính',
    CLEARED: 'Đã loại trừ',
  },
  caseAgency: {
    CYBER_POLICE: 'Phòng An ninh mạng & PCTP công nghệ cao',
    DEPT_INFO_COMM: 'Sở Thông tin và Truyền thông',
  },
  caseStatus: {
    TRANSFERRED: 'Chờ tiếp nhận',
    INVESTIGATING: 'Đang điều tra xác minh',
    IDENTIFIED: 'Đã xác định đối tượng',
    HANDLED: 'Đã xử lý',
    RETURNED: 'Trả hồ sơ',
    CLOSED: 'Đã lưu trữ',
  },
  riskLevel: { LOW: 'Thấp', MEDIUM: 'Trung bình', HIGH: 'Cao' },
};
