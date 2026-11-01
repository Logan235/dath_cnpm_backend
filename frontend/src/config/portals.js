import {
  ICON_DASHBOARD,
  ICON_SETTINGS,
  ICON_ADMIN_NAV,
  ICON_COLLECT,
  ICON_PROCESS,
  ICON_THEME,
} from "@/assets/icons";

/**
 * Mỗi vai trò (role_code ở backend) có một "khu vực" giao diện riêng:
 *  - base : tiền tố URL của khu vực
 *  - home : trang mở ra ngay sau khi đăng nhập
 *  - nav  : sidebar của khu vực — khớp với quyền của vai trò ở backend (seed.sql)
 * Mục nav có `also` = các trang con không nằm trên sidebar nhưng vẫn tô sáng mục đó.
 * Khu vực CITIZEN là khu vực công khai: không cần đăng nhập vẫn dùng được.
 */
export const PORTALS = {
  ADMIN: {
    role: "ADMIN",
    base: "/admin",
    home: "/admin/dashboard",
    roleLabel: "Quản trị hệ thống",
    moduleLabel: "Cơ cấu tổ chức, vai trò, người dùng, tài khoản, duyệt cấp quyền, nhật ký",
    nav: [
      { key: "dashboard", label: "Tổng quan", iconSrc: ICON_DASHBOARD, href: "/admin/dashboard" },
      {
        key: "admin",
        label: "Quản trị hệ thống",
        iconSrc: ICON_ADMIN_NAV,
        children: [
          { key: "orgchart", label: "Cơ cấu tổ chức", href: "/admin/system-administration/org-chart" },
          { key: "roles", label: "Vai trò và phân quyền", href: "/admin/system-administration/roles" },
          { key: "users", label: "Người dùng", href: "/admin/system-administration/users" },
          { key: "accounts", label: "Tài khoản đăng nhập", href: "/admin/system-administration/accounts" },
          { key: "role-requests", label: "Duyệt form xin cấp quyền", href: "/admin/system-administration/role-requests" },
          { key: "logs", label: "Nhật ký hoạt động", href: "/admin/system-administration/activity-logs" },
          { key: "params", label: "Tham số hệ thống", href: "/admin/system-administration/parameters" },
          { key: "notifications", label: "Thông báo", href: "/admin/notifications" },
        ],
      },
      {
        key: "settings",
        label: "Cài đặt hệ thống",
        iconSrc: ICON_SETTINGS,
        children: [
          { key: "language", label: "Ngôn ngữ", href: "/admin/system-settings/language" },
          { key: "settings-general", label: "Cài đặt", href: "/admin/system-settings/settings" },
          { key: "maintenance", label: "Bảo trì", href: "/admin/system-settings/maintenance" },
          { key: "cookies", label: "Quản lý cookies", href: "/admin/system-administration/cookies" },
          { key: "pageinfo", label: "Thông tin trang", href: "/admin/system-administration/page-info" },
        ],
      },
      { key: "theme", label: "Cài đặt giao diện", iconSrc: ICON_THEME, href: "/admin/interface-settings" },
    ],
  },

  SPECIALIST: {
    role: "SPECIALIST",
    base: "/specialist",
    home: "/specialist/dashboard",
    roleLabel: "Chuyên viên Sở Y tế",
    moduleLabel: "Nguồn thông tin, xử lý quảng cáo, đánh giá kết quả AI, hồ sơ vi phạm",
    nav: [
      { key: "dashboard", label: "Việc cần làm", iconSrc: ICON_DASHBOARD, href: "/specialist/dashboard", also: ["/specialist/notifications"] },
      {
        key: "information-source",
        label: "Quản lý nguồn thông tin",
        iconSrc: ICON_COLLECT,
        children: [
          { key: "legal-documents", label: "Văn bản pháp lý", href: "/specialist/legal-documents" },
          { key: "medical-facilities", label: "Đơn vị KCB", href: "/specialist/medical-facilities" },
          { key: "licenses", label: "Giấy phép / CCHN", href: "/specialist/licenses" },
          { key: "crawler-config", label: "Thu thập tin", href: "/specialist/crawler-config" },
          { key: "data-classification", label: "Phân loại tin", href: "/specialist/data-classification" },
          { key: "catalogs", label: "Danh mục dùng chung", href: "/specialist/catalogs" },
        ],
      },
      {
        key: "ad-processing",
        label: "Xử lý thông tin QC",
        iconSrc: ICON_PROCESS,
        children: [
          { key: "qc-check", label: "Kiểm tra nhanh QC", href: "/specialist/qc-check" },
          { key: "collect-results", label: "Kết quả thu thập tin", href: "/specialist/collect-results" },
          { key: "filter-results", label: "Kết quả lọc", href: "/specialist/filter-results" },
          {
            key: "extract-results",
            label: "Đánh giá kết quả AI",
            href: "/specialist/extract-results",
            also: ["/specialist/review"],
          },
          { key: "expert-feedback", label: "Dữ liệu đánh giá chuyên viên", href: "/specialist/expert-feedback" },
          { key: "whitelist", label: "Whitelist", href: "/specialist/whitelist" },
        ],
      },
      {
        key: "violations",
        label: "Quản lý thông tin vi phạm",
        iconSrc: ICON_ADMIN_NAV,
        children: [
          { key: "violations", label: "Hồ sơ vi phạm", href: "/specialist/violations" },
          { key: "handling", label: "Quyết định xử phạt", href: "/specialist/handling" },
          { key: "facility-feedback", label: "Phản hồi từ đơn vị KCB", href: "/specialist/facility-feedback" },
          { key: "prechecks", label: "Kiểm tra trước QC", href: "/specialist/prechecks" },
          { key: "suspects", label: "Đối tượng vi phạm", href: "/specialist/suspects" },
          { key: "violation-categories", label: "Danh mục loại vi phạm", href: "/specialist/violation-categories" },
          { key: "statistics", label: "Thống kê báo cáo", href: "/specialist/statistics" },
        ],
      },
    ],
  },

  MANAGER: {
    role: "MANAGER",
    base: "/manager",
    home: "/manager/dashboard",
    roleLabel: "Cán bộ quản lý / Lãnh đạo",
    moduleLabel: "Phê duyệt xử phạt, giải quyết xung đột đánh giá, duyệt cấp quyền, báo cáo",
    nav: [
      { key: "dashboard", label: "Bảng điều khiển", iconSrc: ICON_DASHBOARD, href: "/manager/dashboard", also: ["/manager/notifications"] },
      {
        key: "approvals",
        label: "Phê duyệt",
        iconSrc: ICON_PROCESS,
        children: [
          { key: "handling", label: "Phê duyệt quyết định xử phạt", href: "/manager/handling" },
          { key: "conflicts", label: "Giải quyết xung đột đánh giá", href: "/manager/conflicts", also: ["/manager/review"] },
          { key: "role-requests", label: "Duyệt form xin cấp quyền", href: "/manager/role-requests" },
          { key: "prechecks", label: "Xác minh kiểm tra trước QC", href: "/manager/prechecks" },
        ],
      },
      {
        key: "monitoring",
        label: "Giám sát",
        iconSrc: ICON_COLLECT,
        children: [
          { key: "violations", label: "Hồ sơ vi phạm", href: "/manager/violations" },
          { key: "cases", label: "Hồ sơ chuyển phối hợp", href: "/manager/cases" },
          { key: "suspects", label: "Đối tượng vi phạm", href: "/manager/suspects" },
          { key: "statistics", label: "Thống kê báo cáo", href: "/manager/statistics" },
        ],
      },
    ],
  },

  CYBER_POLICE: {
    role: "CYBER_POLICE",
    base: "/cyber-security",
    home: "/cyber-security/dashboard",
    roleLabel: "Cán bộ Phòng An ninh mạng",
    moduleLabel: "Tiếp nhận hồ sơ chuyển, điều tra xác minh, đối tượng vi phạm",
    nav: [
      { key: "dashboard", label: "Tổng quan", iconSrc: ICON_DASHBOARD, href: "/cyber-security/dashboard", also: ["/cyber-security/notifications"] },
      {
        key: "investigation",
        label: "Điều tra xác minh",
        iconSrc: ICON_PROCESS,
        children: [
          { key: "cases", label: "Hồ sơ được chuyển", href: "/cyber-security/cases" },
          { key: "suspects", label: "Đối tượng vi phạm", href: "/cyber-security/suspects" },
          { key: "match-candidates", label: "Đối soát đối tượng", href: "/cyber-security/match-candidates" },
        ],
      },
      {
        key: "lookup",
        label: "Tra cứu",
        iconSrc: ICON_COLLECT,
        children: [
          { key: "violations", label: "Hồ sơ vi phạm", href: "/cyber-security/violations" },
          { key: "facilities", label: "Đơn vị KCB và giấy phép", href: "/cyber-security/facilities" },
          { key: "statistics", label: "Thống kê báo cáo", href: "/cyber-security/statistics" },
        ],
      },
    ],
  },

  FACILITY: {
    role: "FACILITY",
    base: "/facility",
    home: "/facility/profile",
    roleLabel: "Cơ sở khám chữa bệnh",
    moduleLabel: "Hồ sơ cơ sở, giải trình vi phạm, kiểm tra trước nội dung quảng cáo",
    nav: [
      { key: "profile", label: "Hồ sơ cơ sở", iconSrc: ICON_DASHBOARD, href: "/facility/profile", also: ["/facility/notifications"] },
      {
        key: "facility-tools",
        label: "Nghiệp vụ",
        iconSrc: ICON_PROCESS,
        children: [
          { key: "violations", label: "Vi phạm của cơ sở", href: "/facility/violations" },
          { key: "feedbacks", label: "Giải trình / khiếu nại", href: "/facility/feedbacks" },
          { key: "pre-check", label: "Kiểm tra trước nội dung QC", href: "/facility/pre-check" },
          { key: "legal-documents", label: "Văn bản pháp lý", href: "/facility/legal-documents" },
        ],
      },
    ],
  },

  CITIZEN: {
    role: "CITIZEN",
    base: "/citizen",
    home: "/citizen/pre-check",
    roleLabel: "Người dân",
    moduleLabel: "Kiểm tra quảng cáo, tra cứu cơ sở, phản ánh — dùng được cả khi không đăng nhập",
    public: true,
    nav: [
      { key: "pre-check", label: "Kiểm tra quảng cáo", href: "/citizen/pre-check" },
      { key: "facilities", label: "Tra cứu cơ sở KCB", href: "/citizen/facilities" },
      { key: "violating", label: "Đơn vị vi phạm", href: "/citizen/violating-facilities" },
      { key: "report", label: "Phản ánh quảng cáo", href: "/citizen/report" },
      { key: "legal", label: "Văn bản pháp lý", href: "/citizen/legal-documents" },
      { key: "mine", label: "Của tôi", href: "/citizen/mine", requiresLogin: true },
    ],
  },
};

// Thứ tự hiển thị trên màn hình đăng nhập
export const ROLE_ORDER = ["ADMIN", "SPECIALIST", "MANAGER", "FACILITY", "CYBER_POLICE", "CITIZEN"];

export function getPortal(role) {
  return PORTALS[role] || null;
}

/** Trang mở ra sau đăng nhập. Cán bộ chưa được cấp vai trò -> trang xin cấp quyền */
export function homeFor(session) {
  if (!session?.accessToken) return "/citizen/pre-check";
  if (!session.role) return "/role-request";
  return PORTALS[session.role]?.home || "/citizen/pre-check";
}
