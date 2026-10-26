import React, { useState, useMemo } from "react";
import { COLORS } from "@/constants/colors";
import ToolbarButton from "@/components/ToolbarButton";
import Panel from "@/components/Panel";
import Breadcrumb from "@/components/Breadcrumb";
import Pagination from "@/components/Pagination";
import {
  Plus,
  Pencil,
  XIcon,
  Search,
  Eye,
  ChevronsUpDown,
  ChevronDown,
  ChevronRight,
  SlidersHorizontal,
  ShieldCheck,
  ShieldAlert,
  Shield,
  Layers,
  Layout,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FolderTree,
  Table as TableIcon,
  RotateCcw,
  Check,
  X,
  ExternalLink,
  Globe,
  Radio,
  Sliders,
  Building2,
  AlertCircle,
  FileText,
  Users,
  UserCheck,
  Network,
  Cookie,
  Settings,
  History,
  BarChart3,
  Share2,
  CheckSquare,
  Square,
  HelpCircle,
  Sparkles,
  Info,
  Power,
} from "lucide-react";

// Dữ liệu mẫu danh sách các Trang Chức Năng trong Hệ thống (System Pages & Features)
const INITIAL_SYSTEM_PAGES = [
  {
    id: "PAGE_SRC_01",
    stt: 1,
    code: "PAGE_CRAWLER_CONFIG",
    name: "Cấu hình thu thập & Crawler",
    nameEn: "Crawler & Ingestion Configuration",
    iconName: "Sliders",
    url: "/facility/crawler-config",
    parentCode: "SRC_ROOT",
    parentName: "Thu thập & Giám sát nguồn tin",
    orderNum: 1,
    hasApproval: false,
    status: "active",
    actions: ["Xem danh sách", "Thêm tiến trình", "Cập nhật tham số", "Kiểm tra kết nối", "Bật/Tắt crawler"],
    description: "Cấu hình lịch quét tự động, tần suất thu thập và tham số luồng của các bot crawler mạng xã hội.",
    updatedAt: "24/08/2026 09:30",
    updatedBy: "admin.syt",
  },
  {
    id: "PAGE_SRC_02",
    stt: 2,
    code: "PAGE_MEDICAL_FACILITIES",
    name: "Danh mục cơ sở khám chữa bệnh",
    nameEn: "Medical Facilities Directory",
    iconName: "Building2",
    url: "/facility/medical-facilities",
    parentCode: "SRC_ROOT",
    parentName: "Thu thập & Giám sát nguồn tin",
    orderNum: 2,
    hasApproval: true,
    status: "active",
    actions: ["Xem danh sách", "Thêm cơ sở KCB", "Chỉnh sửa", "Xóa", "Phê duyệt giấy phép KCB", "Xuất Excel"],
    description: "Quản lý danh sách giấy phép hoạt động, chứng chỉ hành nghề và danh mục cơ sở KCB được cấp phép tại địa bàn.",
    approvalRuleNote: "Quy tắc: Nút 'Phê duyệt giấy phép' chỉ hiển thị khi có check chọn 'Chức năng duyệt' và hồ sơ cơ sở ở trạng thái 'Chờ duyệt'.",
    updatedAt: "20/08/2026 14:15",
    updatedBy: "admin.syt",
  },
  {
    id: "PAGE_SRC_03",
    stt: 3,
    code: "PAGE_DATA_CLASSIFICATION",
    name: "Phân loại dữ liệu quảng cáo",
    nameEn: "Ad Data Classification",
    iconName: "Layers",
    url: "/facility/data-classification",
    parentCode: "SRC_ROOT",
    parentName: "Thu thập & Giám sát nguồn tin",
    orderNum: 3,
    hasApproval: false,
    status: "active",
    actions: ["Xem dữ liệu", "Gắn nhãn AI", "Lọc theo nền tảng", "Xuất dữ liệu thô"],
    description: "Phân loại và gán nhãn sơ bộ các nội dung quảng cáo thu thập từ Facebook, TikTok, YouTube theo chuyên khoa y tế.",
    updatedAt: "18/08/2026 11:20",
    updatedBy: "admin.syt",
  },
  {
    id: "PAGE_PROC_01",
    stt: 4,
    code: "PAGE_QC_CHECK",
    name: "Kiểm duyệt & Phê duyệt kết quả (QC)",
    nameEn: "QC Check & Approval Process",
    iconName: "ShieldCheck",
    url: "/specialist/qc-check",
    parentCode: "PROC_ROOT",
    parentName: "Xử lý & Kiểm duyệt dữ liệu",
    orderNum: 1,
    hasApproval: true,
    status: "active",
    actions: ["Xem hồ sơ QC", "Phê duyệt kết luận vi phạm", "Từ chối duyệt", "Phản hồi AI", "Chuyển hồ sơ thanh tra", "Xuất biên bản"],
    description: "Màn hình nghiệp vụ chính của Thanh tra: Kiểm tra chi tiết bằng chứng vi phạm, thực hiện phê duyệt hoặc từ chối kết luận AI.",
    approvalRuleNote: "Quy tắc: Nút 'Phê duyệt vi phạm' chỉ hiển thị khi trang có check chọn 'Chức năng duyệt' và bản ghi đang ở trạng thái 'Chờ duyệt'.",
    updatedAt: "25/08/2026 08:45",
    updatedBy: "admin.syt",
  },
  {
    id: "PAGE_PROC_02",
    stt: 5,
    code: "PAGE_VIOLATION_CATEGORIES",
    name: "Danh mục hành vi vi phạm y tế",
    nameEn: "Violation Categories Registry",
    iconName: "AlertTriangle",
    url: "/cyber-security/violation-categories",
    parentCode: "PROC_ROOT",
    parentName: "Xử lý & Kiểm duyệt dữ liệu",
    orderNum: 2,
    hasApproval: true,
    status: "active",
    actions: ["Xem danh mục", "Thêm hành vi", "Sửa điều khoản", "Duyệt bổ sung danh mục", "Vô hiệu hóa"],
    description: "Danh mục các hành vi quảng cáo sai sự thật, quá phạm vi cấp phép, sử dụng từ ngữ cấm theo Nghị định 117/2020/NĐ-CP.",
    approvalRuleNote: "Quy tắc: Nút 'Duyệt danh mục mới' chỉ hiển thị với vai trò Lãnh đạo khi trang có check 'Chức năng duyệt' và mục ở trạng thái 'Chờ duyệt'.",
    updatedAt: "19/08/2026 16:10",
    updatedBy: "admin.syt",
  },
  {
    id: "PAGE_PROC_03",
    stt: 6,
    code: "PAGE_WHITELIST",
    name: "Danh sách trang Whitelist",
    nameEn: "Whitelisted Sources & Pages",
    iconName: "CheckCircle2",
    url: "/specialist/whitelist",
    parentCode: "PROC_ROOT",
    parentName: "Xử lý & Kiểm duyệt dữ liệu",
    orderNum: 3,
    hasApproval: false,
    status: "active",
    actions: ["Xem Whitelist", "Thêm trang tin", "Gỡ khỏi Whitelist", "Kiểm tra định kỳ"],
    description: "Danh sách các trang Fanpage, website chính thống của cơ quan nhà nước, bệnh viện công lập không áp dụng cảnh báo vi phạm tự động.",
    updatedAt: "15/08/2026 10:00",
    updatedBy: "admin.syt",
  },
  {
    id: "PAGE_REP_01",
    stt: 7,
    code: "PAGE_REPORTS_SUMMARY",
    name: "Báo cáo tổng hợp vi phạm quảng cáo",
    nameEn: "Violation Summary Reports",
    iconName: "BarChart3",
    url: "/reports/summary",
    parentCode: "REP_ROOT",
    parentName: "Báo cáo & Thống kê",
    orderNum: 1,
    hasApproval: false,
    status: "active",
    actions: ["Xem biểu đồ", "Lọc theo thời gian", "Xuất báo cáo PDF", "Xuất Excel thống kê"],
    description: "Thống kê tổng hợp số lượng quảng cáo quét được, tỷ lệ vi phạm theo chuyên khoa, theo nền tảng và theo địa bàn quận huyện.",
    updatedAt: "22/08/2026 15:40",
    updatedBy: "admin.syt",
  },
  {
    id: "PAGE_REP_02",
    stt: 8,
    code: "PAGE_REPORTS_INSPECTION",
    name: "Báo cáo xử lý & Kết luận thanh tra",
    nameEn: "Inspection Case Reports",
    iconName: "FileText",
    url: "/reports/inspection",
    parentCode: "REP_ROOT",
    parentName: "Báo cáo & Thống kê",
    orderNum: 2,
    hasApproval: true,
    status: "active",
    actions: ["Xem hồ sơ thanh tra", "Lập quyết định xử phạt", "Phê duyệt kết luận", "Ký số văn bản", "Lưu trữ"],
    description: "Quản lý hồ sơ các vụ việc đã chuyển sang Thanh tra Sở Y Tế xử lý, lập biên bản vi phạm hành chính và quyết định xử phạt.",
    approvalRuleNote: "Quy tắc: Nút 'Phê duyệt quyết định xử phạt' chỉ hiển thị khi trang có check 'Chức năng duyệt' và biên bản ở trạng thái 'Chờ duyệt'.",
    updatedAt: "21/08/2026 17:00",
    updatedBy: "admin.syt",
  },
  {
    id: "PAGE_SYS_01",
    stt: 9,
    code: "PAGE_USERS_MGMT",
    name: "Quản lý người dùng",
    nameEn: "Users Management",
    iconName: "Users",
    url: "/admin/system-administration/users",
    parentCode: "SYS_ROOT",
    parentName: "Quản trị hệ thống",
    orderNum: 1,
    hasApproval: false,
    status: "active",
    actions: ["Xem danh sách", "Thêm người dùng", "Chỉnh sửa", "Khóa/Mở khóa", "Đặt lại mật khẩu"],
    description: "Quản lý danh sách cán bộ, thanh tra viên, chuyên viên truy cập hệ thống giám sát quảng cáo y tế.",
    updatedAt: "24/08/2026 14:30",
    updatedBy: "admin.syt",
  },
  {
    id: "PAGE_SYS_02",
    stt: 10,
    code: "PAGE_ACCOUNTS_MGMT",
    name: "Quản lý tài khoản truy cập",
    nameEn: "Account Access Management",
    iconName: "UserCheck",
    url: "/admin/system-administration/accounts",
    parentCode: "SYS_ROOT",
    parentName: "Quản trị hệ thống",
    orderNum: 2,
    hasApproval: false,
    status: "active",
    actions: ["Xem tài khoản", "Gán quyền", "Kích hoạt 2FA", "Cấp chứng thư số"],
    description: "Quản trị tài khoản đăng nhập, cấu hình xác thực 2 lớp và quản lý phân quyền theo phòng ban.",
    updatedAt: "20/08/2026 09:15",
    updatedBy: "admin.syt",
  },
  {
    id: "PAGE_SYS_03",
    stt: 11,
    code: "PAGE_ROLES_MGMT",
    name: "Quản lý vai trò & Phân quyền",
    nameEn: "Role & Permission Management",
    iconName: "Shield",
    url: "/admin/system-administration/roles",
    parentCode: "SYS_ROOT",
    parentName: "Quản trị hệ thống",
    orderNum: 3,
    hasApproval: false,
    status: "active",
    actions: ["Xem vai trò", "Thêm vai trò", "Chỉnh sửa quyền hạn", "Phân quyền theo màn hình", "Xóa vai trò"],
    description: "Định nghĩa các nhóm vai trò (Super Admin, Lãnh đạo Sở, Thanh tra viên, Chuyên viên QC) và ma trận quyền hạn trên các trang.",
    updatedAt: "20/08/2026 11:50",
    updatedBy: "admin.syt",
  },
  {
    id: "PAGE_SYS_04",
    stt: 12,
    code: "PAGE_ORG_CHART",
    name: "Quản lý cơ cấu tổ chức",
    nameEn: "Organizational Structure",
    iconName: "Network",
    url: "/admin/system-administration/org-chart",
    parentCode: "SYS_ROOT",
    parentName: "Quản trị hệ thống",
    orderNum: 4,
    hasApproval: false,
    status: "active",
    actions: ["Xem sơ đồ", "Thêm đơn vị", "Chuyển cấp phòng ban", "Cập nhật chức vụ"],
    description: "Quản lý cây cơ cấu tổ chức Sở Y Tế, Phòng Nghiệp vụ Y Dược, Thanh tra Sở và các Trung tâm Y tế trực thuộc.",
    updatedAt: "17/08/2026 14:00",
    updatedBy: "admin.syt",
  },
  {
    id: "PAGE_SYS_05",
    stt: 13,
    code: "PAGE_COOKIES_MGMT",
    name: "Quản lý Cookies & Phiên làm việc",
    nameEn: "Cookies & Session Management",
    iconName: "Cookie",
    url: "/admin/system-administration/cookies",
    parentCode: "SYS_ROOT",
    parentName: "Quản trị hệ thống",
    orderNum: 5,
    hasApproval: false,
    status: "active",
    actions: ["Xem cookies", "Thêm phiên crawler", "Kiểm tra liveness", "Gia hạn session"],
    description: "Quản trị kho Cookies xác thực phục vụ crawler tự động thu thập tin trên Facebook Graph API, TikTok và YouTube.",
    updatedAt: "23/08/2026 16:45",
    updatedBy: "admin.syt",
  },
  {
    id: "PAGE_SYS_06",
    stt: 14,
    code: "PAGE_PARAMETERS_MGMT",
    name: "Quản lý tham số hệ thống",
    nameEn: "System Parameter Configuration",
    iconName: "Settings",
    url: "/admin/system-administration/parameters",
    parentCode: "SYS_ROOT",
    parentName: "Quản trị hệ thống",
    orderNum: 6,
    hasApproval: false,
    status: "active",
    actions: ["Xem tham số", "Chỉnh sửa giá trị", "Khôi phục mặc định", "Đồng bộ cấu hình"],
    description: "Cấu hình các tham số lõi: Ngưỡng tự tin AI, chu kỳ quét tin, thời gian timeout kết nối và giới hạn dung lượng lưu trữ.",
    updatedAt: "24/08/2026 08:30",
    updatedBy: "admin.syt",
  },
  {
    id: "PAGE_SYS_07",
    stt: 15,
    code: "PAGE_INFO_MGMT",
    name: "Quản lý thông tin trang",
    nameEn: "Page Information Management",
    iconName: "Layout",
    url: "/admin/system-administration/page-info",
    parentCode: "SYS_ROOT",
    parentName: "Quản trị hệ thống",
    orderNum: 7,
    hasApproval: false,
    status: "active",
    actions: ["Xem danh sách", "Thêm trang", "Chỉnh sửa cấu hình", "Bật/Tắt chức năng duyệt", "Chuyển chế độ xem"],
    description: "Quản lý danh mục màn hình hệ thống, cấu hình phân cấp cây menu và thiết lập điều kiện cờ 'Chức năng duyệt'.",
    updatedAt: "25/08/2026 09:00",
    updatedBy: "admin.syt",
  },
  {
    id: "PAGE_SYS_08",
    stt: 16,
    code: "PAGE_ACTIVITY_LOGS",
    name: "Nhật ký hoạt động hệ thống",
    nameEn: "System Activity & Audit Logs",
    iconName: "History",
    url: "/admin/system-administration/activity-logs",
    parentCode: "SYS_ROOT",
    parentName: "Quản trị hệ thống",
    orderNum: 8,
    hasApproval: false,
    status: "active",
    actions: ["Xem nhật ký", "Tra cứu theo IP", "Lọc theo hành động", "Xuất file Audit log"],
    description: "Ghi nhận toàn bộ thao tác đăng nhập, chỉnh sửa cấu hình, phê duyệt vi phạm và thay đổi quyền của cán bộ trên hệ thống.",
    updatedAt: "25/08/2026 09:12",
    updatedBy: "admin.syt",
  },
];

// Danh mục Module cha (Parent Categories)
const PARENT_MODULES = [
  { code: "SRC_ROOT", name: "1. Thu thập & Giám sát nguồn tin (Information Source)", icon: "Radio" },
  { code: "PROC_ROOT", name: "2. Xử lý & Kiểm duyệt dữ liệu (Data Processing)", icon: "ShieldCheck" },
  { code: "REP_ROOT", name: "3. Báo cáo & Thống kê vi phạm (Reports & Statistics)", icon: "BarChart3" },
  { code: "SYS_ROOT", name: "4. Quản trị hệ thống (System Administration)", icon: "Settings" },
];

// Dữ liệu trích xuất Thông tin Trang Đăng tải / Fanpage Thu thập (Extracted Pages & Channels)
const INITIAL_CRAWLED_PAGES = [
  {
    id: "CRAWL_FB_01",
    stt: 1,
    pageName: "Thẩm mỹ viện Quốc tế Sài Gòn Star",
    platform: "Facebook",
    type: "Fanpage",
    pageId: "fb.page.8829103921",
    ownerName: "Công ty TNHH Thẩm mỹ SG Star (Đại diện: BS. Nguyễn Văn H)",
    url: "https://facebook.com/thammyviensaigonstar",
    crawledAds: 142,
    violationAds: 28,
    violationRate: "19.7%",
    status: "investigating",
    statusLabel: "Nghi vấn vi phạm",
    statusBadgeColor: "#D97706",
    verified: false,
    firstSeen: "12/03/2026",
    lastScan: "25/08/2026 08:15",
    riskLevel: "Cao",
    notes: "Có nhiều bài quảng cáo sử dụng cụm từ cấm 'Cam kết khỏi dứt điểm 100%', 'Bác sĩ đầu ngành Quân đội' chưa kiểm chứng.",
  },
  {
    id: "CRAWL_FB_02",
    stt: 2,
    pageName: "Bệnh viện Đa khoa Medlatec",
    platform: "Facebook",
    type: "Fanpage",
    pageId: "fb.page.1092837482",
    ownerName: "Bệnh viện Đa khoa Medlatec (Số GPHĐ: 124/BYT-GPHĐ)",
    url: "https://facebook.com/medlatec.official",
    crawledAds: 310,
    violationAds: 0,
    violationRate: "0.0%",
    status: "verified",
    statusLabel: "Đã xác minh cơ sở y tế",
    statusBadgeColor: "#059669",
    verified: true,
    firstSeen: "01/01/2026",
    lastScan: "25/08/2026 07:30",
    riskLevel: "An toàn",
    notes: "Đã đối chiếu khớp dữ liệu với CSDL Giấy phép hoạt động của Bộ Y Tế. Nội dung quảng cáo tuân thủ quy định.",
  },
  {
    id: "CRAWL_TT_03",
    stt: 3,
    pageName: "Bác Sĩ Da Liễu - Trị Mụn Thần Tốc",
    platform: "TikTok",
    type: "Kênh cá nhân",
    pageId: "@dr.dalieu.thantoc",
    ownerName: "Chưa định danh (Số ĐT liên hệ: 0988.xxx.112 - Zalo tư vấn)",
    url: "https://tiktok.com/@dr.dalieu.thantoc",
    crawledAds: 86,
    violationAds: 45,
    violationRate: "52.3%",
    status: "flagged",
    statusLabel: "Quảng cáo sai sự thật / Mạo danh",
    statusBadgeColor: "#DC2626",
    verified: false,
    firstSeen: "15/04/2026",
    lastScan: "24/08/2026 21:40",
    riskLevel: "Rất cao",
    notes: "Mặc áo blouse trắng tự xưng bác sĩ Bệnh viện Da liễu TƯ, quảng cáo kem trộn không rõ nguồn gốc xuất xứ.",
  },
  {
    id: "CRAWL_FB_04",
    stt: 4,
    pageName: "Hội Chia Sẻ Kinh Nghiệm Nâng Mũi & Tiêm Filler HN",
    platform: "Facebook",
    type: "Nhóm công khai (Group)",
    pageId: "fb.group.5592817290",
    ownerName: "Admin: Nhóm cộng đồng làm đẹp (3 tài khoản quản trị ẩn danh)",
    url: "https://facebook.com/groups/nangmui.filler.hanoi",
    crawledAds: 205,
    violationAds: 64,
    violationRate: "31.2%",
    status: "monitoring",
    statusLabel: "Đang theo dõi tự động",
    statusBadgeColor: "#3577DB",
    verified: false,
    firstSeen: "10/02/2026",
    lastScan: "25/08/2026 06:20",
    riskLevel: "Cao",
    notes: "Nơi seeding và chia sẻ các dịch vụ tiêm filler, botox tại nhà / cơ sở thẩm mỹ chui không phép.",
  },
  {
    id: "CRAWL_YT_05",
    stt: 5,
    pageName: "Đông Y Gia Truyền Trị Xương Khớp Dứt Điểm",
    platform: "YouTube",
    type: "Kênh YouTube",
    pageId: "yt.channel.UC9283ka821",
    ownerName: "Hộ kinh doanh Lương Y Trần V.T (Chưa cấp phép KCB)",
    url: "https://youtube.com/@dongygiatruyen.xuongkhop",
    crawledAds: 94,
    violationAds: 72,
    violationRate: "76.6%",
    status: "blacklist",
    statusLabel: "Vi phạm nghiêm trọng / Đề xuất xử phạt",
    statusBadgeColor: "#7C3AED",
    verified: false,
    firstSeen: "20/01/2026",
    lastScan: "24/08/2026 19:10",
    riskLevel: "Đặc biệt nghiêm trọng",
    notes: "Sử dụng hình ảnh cắt ghép của nghệ sĩ nổi tiếng và đài truyền hình VTV để lừa dối người tiêu dùng.",
  },
  {
    id: "CRAWL_FB_06",
    stt: 6,
    pageName: "Phòng khám Chuyên khoa Răng Hàm Mặt Paris",
    platform: "Facebook",
    type: "Fanpage",
    pageId: "fb.page.9981240192",
    ownerName: "Công ty CP Nha khoa Quốc tế Paris (GPHĐ: 08842/SYT-GPHĐ)",
    url: "https://facebook.com/nhakhoaparis.official",
    crawledAds: 180,
    violationAds: 2,
    violationRate: "1.1%",
    status: "verified",
    statusLabel: "Đã xác minh cơ sở y tế",
    statusBadgeColor: "#059669",
    verified: true,
    firstSeen: "15/01/2026",
    lastScan: "25/08/2026 08:00",
    riskLevel: "Thấp",
    notes: "Đã có giấy phép quảng cáo số 231/2025/XNQC-SYT. Vi phạm nhỏ về thiếu dòng chữ khuyến cáo theo quy định mới.",
  },
];

function PageInfoPage() {
  // Tabs: "system_pages" (Trang hệ thống) | "crawled_pages" (Trang Fanpage thu thập)
  const [activeTab, setActiveTab] = useState("system_pages");

  // Dữ liệu danh sách
  const [pagesList, setPagesList] = useState(INITIAL_SYSTEM_PAGES);
  const [crawledList, setCrawledList] = useState(INITIAL_CRAWLED_PAGES);

  // Bộ lọc tìm kiếm Trang hệ thống
  const [searchName, setSearchName] = useState("");
  const [searchNameEn, setSearchNameEn] = useState("");
  const [selectedParent, setSelectedParent] = useState("");
  const [filterApproval, setFilterApproval] = useState("all"); // "all" | "has_approval" | "no_approval"
  const [filterStatus, setFilterStatus] = useState("all"); // "all" | "active" | "inactive"

  // Bộ lọc tìm kiếm Trang thu thập
  const [searchCrawlPage, setSearchCrawlPage] = useState("");
  const [filterPlatform, setFilterPlatform] = useState("all");
  const [filterCrawlStatus, setFilterCrawlStatus] = useState("all");

  // Chế độ xem: Bảng (Table) hoặc Cây phân cấp (Tree)
  const [viewMode, setViewMode] = useState("table"); // "table" | "tree"
  const [expandedNodes, setExpandedNodes] = useState({
    SRC_ROOT: true,
    PROC_ROOT: true,
    REP_ROOT: true,
    SYS_ROOT: true,
  });

  // Chọn dòng trong bảng
  const [selectedRowId, setSelectedRowId] = useState(null);
  const [selectedPageIds, setSelectedPageIds] = useState([]);

  // State các Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showToggleStatusModal, setShowToggleStatusModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCrawledDetailModal, setShowCrawledDetailModal] = useState(false);

  // Đối tượng đang chọn thao tác
  const [currentSelectedPage, setCurrentSelectedPage] = useState(null);
  const [currentCrawledPage, setCurrentCrawledPage] = useState(null);

  // Thông báo Toast
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Form State Thêm / Sửa trang hệ thống
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    nameEn: "",
    iconName: "Layout",
    url: "",
    parentCode: "SRC_ROOT",
    orderNum: 1,
    hasApproval: false,
    status: "active",
    description: "",
    actions: ["Xem danh sách", "Thêm mới", "Chỉnh sửa", "Xóa"],
  });

  // Lọc dữ liệu Trang Hệ Thống
  const filteredPages = useMemo(() => {
    return pagesList.filter((item) => {
      const matchName = item.name.toLowerCase().includes(searchName.toLowerCase()) ||
        item.code.toLowerCase().includes(searchName.toLowerCase());
      const matchNameEn = searchNameEn === "" || item.nameEn.toLowerCase().includes(searchNameEn.toLowerCase());
      const matchParent = selectedParent === "" || item.parentCode === selectedParent;
      const matchApproval =
        filterApproval === "all" ||
        (filterApproval === "has_approval" && item.hasApproval) ||
        (filterApproval === "no_approval" && !item.hasApproval);
      const matchStatus = filterStatus === "all" || item.status === filterStatus;

      return matchName && matchNameEn && matchParent && matchApproval && matchStatus;
    });
  }, [pagesList, searchName, searchNameEn, selectedParent, filterApproval, filterStatus]);

  // Lọc dữ liệu Trang Fanpage thu thập
  const filteredCrawledPages = useMemo(() => {
    return crawledList.filter((item) => {
      const matchText =
        item.pageName.toLowerCase().includes(searchCrawlPage.toLowerCase()) ||
        item.ownerName.toLowerCase().includes(searchCrawlPage.toLowerCase()) ||
        item.pageId.toLowerCase().includes(searchCrawlPage.toLowerCase());
      const matchPlatform = filterPlatform === "all" || item.platform === filterPlatform;
      const matchStatus = filterCrawlStatus === "all" || item.status === filterCrawlStatus;

      return matchText && matchPlatform && matchStatus;
    });
  }, [crawledList, searchCrawlPage, filterPlatform, filterCrawlStatus]);

  // Nhóm trang theo Module phục vụ Tree View
  const groupedTreeData = useMemo(() => {
    return PARENT_MODULES.map((module) => {
      const children = pagesList.filter((p) => p.parentCode === module.code);
      return {
        ...module,
        children,
      };
    });
  }, [pagesList]);

  // Toggle Node trong Tree View
  const toggleTreeNode = (code) => {
    setExpandedNodes((prev) => ({
      ...prev,
      [code]: !prev[code],
    }));
  };

  // Helper styles
  const thStyle = {
    background: COLORS.tableHeaderBg,
    color: COLORS.headerTextBlue,
    fontWeight: 600,
    fontSize: 13,
    textAlign: "left",
    padding: "12px 14px",
    whiteSpace: "nowrap",
    verticalAlign: "middle",
    userSelect: "none",
  };

  const inputStyle = {
    height: 38,
    width: "100%",
    border: "1px solid #d5d8dd",
    borderRadius: 5,
    padding: "0 12px",
    fontSize: 13,
    outline: "none",
    boxSizing: "border-box",
    color: "#333",
    background: "#fff",
  };

  const renderSortableHeader = (label) => (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
      <span>{label}</span>
      <ChevronsUpDown size={14} color={COLORS.headerTextBlue} />
    </div>
  );

  // Xử lý mở Modal Thêm mới
  const handleOpenAddModal = () => {
    setFormData({
      code: "PAGE_NEW_" + Math.floor(100 + Math.random() * 900),
      name: "",
      nameEn: "",
      iconName: "Layout",
      url: "/module/new-page",
      parentCode: "SRC_ROOT",
      orderNum: pagesList.length + 1,
      hasApproval: false,
      status: "active",
      description: "",
      actions: ["Xem danh sách", "Thêm mới", "Chỉnh sửa", "Xóa"],
    });
    setShowAddModal(true);
  };

  // Xử lý lưu trang mới
  const handleSaveNewPage = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert("Vui lòng nhập tên trang!");
      return;
    }
    const parentObj = PARENT_MODULES.find((m) => m.code === formData.parentCode);
    const newPage = {
      ...formData,
      id: "PAGE_CUSTOM_" + Date.now(),
      stt: pagesList.length + 1,
      parentName: parentObj ? parentObj.name.split(". ")[1] || parentObj.name : "Module chính",
      updatedAt: "25/08/2026 " + new Date().toLocaleTimeString().slice(0, 5),
      updatedBy: "admin.syt",
      approvalRuleNote: formData.hasApproval
        ? "Quy tắc: Nút duyệt chỉ hiển thị khi có check chọn 'Chức năng duyệt' và người dùng có trạng thái 'Chờ duyệt'."
        : undefined,
    };
    setPagesList([newPage, ...pagesList]);
    setShowAddModal(false);
    showToast(`Đã thêm thành công trang: ${formData.name}`);
  };

  // Xử lý mở Modal Sửa
  const handleOpenEditModal = (pageItem) => {
    const target = pageItem || (selectedRowId ? pagesList.find((p) => p.id === selectedRowId) : pagesList[0]);
    if (!target) return;
    setCurrentSelectedPage(target);
    setFormData({
      code: target.code,
      name: target.name,
      nameEn: target.nameEn,
      iconName: target.iconName || "Layout",
      url: target.url,
      parentCode: target.parentCode,
      orderNum: target.orderNum,
      hasApproval: target.hasApproval,
      status: target.status,
      description: target.description || "",
      actions: target.actions || ["Xem danh sách"],
    });
    setShowEditModal(true);
  };

  // Xử lý cập nhật trang
  const handleSaveEditPage = (e) => {
    e.preventDefault();
    if (!currentSelectedPage) return;
    const parentObj = PARENT_MODULES.find((m) => m.code === formData.parentCode);
    setPagesList((prev) =>
      prev.map((item) =>
        item.id === currentSelectedPage.id
          ? {
              ...item,
              ...formData,
              parentName: parentObj ? parentObj.name.split(". ")[1] || parentObj.name : item.parentName,
              updatedAt: "25/08/2026 " + new Date().toLocaleTimeString().slice(0, 5),
              approvalRuleNote: formData.hasApproval
                ? "Quy tắc: Nút duyệt chỉ hiển thị khi có check chọn 'Chức năng duyệt' và người dùng có trạng thái 'Chờ duyệt'."
                : undefined,
            }
          : item
      )
    );
    setShowEditModal(false);
    showToast(`Đã cập nhật thông tin trang: ${formData.name}`);
  };

  // Xử lý mở Chi tiết
  const handleOpenDetailModal = (pageItem) => {
    const target = pageItem || (selectedRowId ? pagesList.find((p) => p.id === selectedRowId) : pagesList[0]);
    if (!target) return;
    setCurrentSelectedPage(target);
    setShowDetailModal(true);
  };

  // Xử lý mở Toggle Status
  const handleOpenToggleStatusModal = (pageItem) => {
    const target = pageItem || (selectedRowId ? pagesList.find((p) => p.id === selectedRowId) : pagesList[0]);
    if (!target) return;
    setCurrentSelectedPage(target);
    setShowToggleStatusModal(true);
  };

  // Xác nhận đổi trạng thái
  const handleConfirmToggleStatus = () => {
    if (!currentSelectedPage) return;
    const newStatus = currentSelectedPage.status === "active" ? "inactive" : "active";
    setPagesList((prev) =>
      prev.map((item) => (item.id === currentSelectedPage.id ? { ...item, status: newStatus } : item))
    );
    setShowToggleStatusModal(false);
    showToast(`Đã ${newStatus === "active" ? "kích hoạt" : "vô hiệu hóa"} trang: ${currentSelectedPage.name}`);
  };

  // Xử lý mở Modal Xóa
  const handleOpenDeleteModal = (pageItem) => {
    const target = pageItem || (selectedRowId ? pagesList.find((p) => p.id === selectedRowId) : pagesList[0]);
    if (!target) return;
    setCurrentSelectedPage(target);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = () => {
    if (!currentSelectedPage) return;
    setPagesList((prev) => prev.filter((item) => item.id !== currentSelectedPage.id));
    setShowDeleteModal(false);
    if (selectedRowId === currentSelectedPage.id) setSelectedRowId(null);
    showToast(`Đã xóa thành công trang: ${currentSelectedPage.name}`);
  };

  // Xử lý mở chi tiết Fanpage thu thập
  const handleOpenCrawledDetail = (item) => {
    setCurrentCrawledPage(item);
    setShowCrawledDetailModal(true);
  };

  // Icon helper
  const renderIconBadge = (iconName) => {
    const iconProps = { size: 16, color: "#3577DB" };
    switch (iconName) {
      case "Sliders":
        return <Sliders {...iconProps} />;
      case "Building2":
        return <Building2 {...iconProps} />;
      case "Layers":
        return <Layers {...iconProps} />;
      case "ShieldCheck":
        return <ShieldCheck {...iconProps} color="#059669" />;
      case "AlertTriangle":
        return <AlertTriangle {...iconProps} color="#D97706" />;
      case "CheckCircle2":
        return <CheckCircle2 {...iconProps} color="#059669" />;
      case "BarChart3":
        return <BarChart3 {...iconProps} color="#7C3AED" />;
      case "FileText":
        return <FileText {...iconProps} />;
      case "Users":
        return <Users {...iconProps} />;
      case "UserCheck":
        return <UserCheck {...iconProps} />;
      case "Shield":
        return <Shield {...iconProps} />;
      case "Network":
        return <Network {...iconProps} />;
      case "Cookie":
        return <Cookie {...iconProps} color="#D97706" />;
      case "Settings":
        return <Settings {...iconProps} />;
      case "History":
        return <History {...iconProps} />;
      default:
        return <Layout {...iconProps} />;
    }
  };

  return (
    <div style={{ position: "relative", minHeight: "100vh", paddingBottom: 40 }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            zIndex: 9999,
            background: "#071437",
            color: "#fff",
            padding: "12px 20px",
            borderRadius: 6,
            boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontSize: 13,
            fontWeight: 500,
            borderLeft: "4px solid #10B981",
          }}
        >
          <CheckCircle2 size={18} color="#10B981" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Action Toolbar */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8, alignItems: "center" }}>
        <ToolbarButton
          icon={Plus}
          label="Thêm mới trang"
          primary
          onClick={handleOpenAddModal}
        />
        <ToolbarButton
          icon={Pencil}
          label="Chỉnh sửa"
          onClick={() => handleOpenEditModal()}
        />
        <ToolbarButton
          icon={XIcon}
          label="Xóa"
          onClick={() => handleOpenDeleteModal()}
        />
        <ToolbarButton
          icon={Search}
          label="Tìm kiếm & Lọc"
          onClick={() => {
            const input = document.getElementById("search-page-name-input");
            if (input) input.focus();
          }}
        />
        <ToolbarButton
          icon={Eye}
          label="Xem chi tiết & Quy tắc duyệt"
          onClick={() => handleOpenDetailModal()}
        />
        <ToolbarButton
          icon={Power}
          label="Kích hoạt/Vô hiệu hóa"
          onClick={() => handleOpenToggleStatusModal()}
        />
      </div>

      {/* Breadcrumb with right action switches & View Mode Switcher */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <Breadcrumb current="Quản lý thông tin trang" />

        {/* View Mode & Extra Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {activeTab === "system_pages" && (
            <div
              style={{
                display: "inline-flex",
                background: "#f1f3f7",
                padding: 3,
                borderRadius: 6,
                border: "1px solid #d5d8dd",
              }}
            >
              <button
                onClick={() => setViewMode("table")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "5px 12px",
                  fontSize: 12,
                  fontWeight: 500,
                  borderRadius: 4,
                  border: "none",
                  cursor: "pointer",
                  background: viewMode === "table" ? "#fff" : "transparent",
                  color: viewMode === "table" ? "#3577DB" : "#666",
                  boxShadow: viewMode === "table" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                  transition: "all 0.15s ease",
                }}
              >
                <TableIcon size={14} />
                Chế độ Bảng
              </button>
              <button
                onClick={() => setViewMode("tree")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "5px 12px",
                  fontSize: 12,
                  fontWeight: 500,
                  borderRadius: 4,
                  border: "none",
                  cursor: "pointer",
                  background: viewMode === "tree" ? "#fff" : "transparent",
                  color: viewMode === "tree" ? "#3577DB" : "#666",
                  boxShadow: viewMode === "tree" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                  transition: "all 0.15s ease",
                }}
              >
                <FolderTree size={14} />
                Chế độ Cây (Tree View)
              </button>
            </div>
          )}

          <div
            title="Tùy biến cột hiển thị"
            style={{
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 32,
              height: 32,
              borderRadius: 4,
              border: "1px solid #d5d8dd",
              background: "#fff",
              color: "#333",
            }}
          >
            <SlidersHorizontal size={15} />
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation Bar */}
      <div
        style={{
          display: "flex",
          borderBottom: "2px solid #E2E8F0",
          marginBottom: 16,
          background: "#fff",
          borderRadius: "6px 6px 0 0",
          padding: "0 16px",
        }}
      >
        <button
          onClick={() => setActiveTab("system_pages")}
          style={{
            padding: "14px 20px",
            fontSize: 14,
            fontWeight: 600,
            color: activeTab === "system_pages" ? "#3577DB" : "#64748B",
            border: "none",
            borderBottom: activeTab === "system_pages" ? "3px solid #3577DB" : "3px solid transparent",
            background: "transparent",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: -2,
            transition: "all 0.15s ease",
          }}
        >
          <Layout size={16} />
          1. Thông tin trang hệ thống & Cấu hình duyệt
          <span
            style={{
              fontSize: 11,
              background: activeTab === "system_pages" ? "#EBF3FF" : "#F1F5F9",
              color: activeTab === "system_pages" ? "#3577DB" : "#64748B",
              padding: "2px 8px",
              borderRadius: 12,
              fontWeight: 600,
            }}
          >
            {pagesList.length} trang
          </span>
        </button>

        <button
          onClick={() => setActiveTab("crawled_pages")}
          style={{
            padding: "14px 20px",
            fontSize: 14,
            fontWeight: 600,
            color: activeTab === "crawled_pages" ? "#3577DB" : "#64748B",
            border: "none",
            borderBottom: activeTab === "crawled_pages" ? "3px solid #3577DB" : "3px solid transparent",
            background: "transparent",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: -2,
            transition: "all 0.15s ease",
          }}
        >
          <Share2 size={16} />
          2. Thông tin Trang đăng tải / Fanpage thu thập
          <span
            style={{
              fontSize: 11,
              background: activeTab === "crawled_pages" ? "#EBF3FF" : "#F1F5F9",
              color: activeTab === "crawled_pages" ? "#3577DB" : "#64748B",
              padding: "2px 8px",
              borderRadius: 12,
              fontWeight: 600,
            }}
          >
            {crawledList.length} nguồn tin
          </span>
        </button>
      </div>

      {/* TAB 1: THÔNG TIN TRANG HỆ THỐNG */}
      {activeTab === "system_pages" && (
        <Panel style={{ padding: "20px 24px" }}>
          {/* Rule Engine Notice Box */}
          <div
            style={{
              background: "#F0FDF4",
              border: "1px solid #BBF7D0",
              borderRadius: 6,
              padding: "12px 16px",
              marginBottom: 20,
              display: "flex",
              alignItems: "flex-start",
              gap: 12,
            }}
          >
            <ShieldCheck size={20} color="#16A34A" style={{ flexShrink: 0, marginTop: 2 }} />
            <div style={{ fontSize: 13, color: "#166534", lineHeight: 1.5 }}>
              <div style={{ fontWeight: 600, marginBottom: 2 }}>
                Đặc tả quy tắc kiểm tra điều kiện duyệt (Rule Engine Check):
              </div>
              <div>
                Hệ thống <strong>chỉ hiển thị nút duyệt</strong> trên giao diện nghiệp vụ đối với các màn hình có check chọn{" "}
                <span
                  style={{
                    background: "#DCFCE7",
                    padding: "1px 6px",
                    borderRadius: 4,
                    fontWeight: 600,
                    color: "#15803D",
                  }}
                >
                  "Chức năng duyệt"
                </span>{" "}
                trong bảng Thông tin trang và người dùng hiện tại có bản ghi/hồ sơ ở trạng thái{" "}
                <span
                  style={{
                    background: "#FEF3C7",
                    padding: "1px 6px",
                    borderRadius: 4,
                    fontWeight: 600,
                    color: "#B45309",
                  }}
                >
                  "Chờ duyệt"
                </span>
                .
              </div>
            </div>
          </div>

          {/* Filter Row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 16, marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 13, color: "#333", marginBottom: 6, fontWeight: 500 }}>
                Tên trang / Mã trang
              </div>
              <input
                id="search-page-name-input"
                style={inputStyle}
                placeholder="Nhập tên trang hoặc mã..."
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
              />
            </div>

            <div>
              <div style={{ fontSize: 13, color: "#333", marginBottom: 6, fontWeight: 500 }}>
                Tên tiếng Anh
              </div>
              <input
                style={inputStyle}
                placeholder="English name..."
                value={searchNameEn}
                onChange={(e) => setSearchNameEn(e.target.value)}
              />
            </div>

            <div>
              <div style={{ fontSize: 13, color: "#333", marginBottom: 6, fontWeight: 500 }}>
                Mã trang cha / Phân hệ
              </div>
              <div style={{ position: "relative" }}>
                <select
                  style={{
                    ...inputStyle,
                    appearance: "none",
                    WebkitAppearance: "none",
                    paddingRight: 30,
                    cursor: "pointer",
                  }}
                  value={selectedParent}
                  onChange={(e) => setSelectedParent(e.target.value)}
                >
                  <option value="">-- Tất cả phân hệ cha --</option>
                  {PARENT_MODULES.map((m) => (
                    <option key={m.code} value={m.code}>
                      {m.name}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={16}
                  color={COLORS.headerTextBlue}
                  style={{ position: "absolute", right: 10, top: 11, pointerEvents: "none" }}
                />
              </div>
            </div>

            <div>
              <div style={{ fontSize: 13, color: "#333", marginBottom: 6, fontWeight: 500 }}>
                Cờ "Chức năng duyệt"
              </div>
              <div style={{ position: "relative" }}>
                <select
                  style={{
                    ...inputStyle,
                    appearance: "none",
                    WebkitAppearance: "none",
                    paddingRight: 30,
                    cursor: "pointer",
                  }}
                  value={filterApproval}
                  onChange={(e) => setFilterApproval(e.target.value)}
                >
                  <option value="all">-- Tất cả --</option>
                  <option value="has_approval">✓ Có chức năng duyệt</option>
                  <option value="no_approval">✕ Không có chức năng duyệt</option>
                </select>
                <ChevronDown
                  size={16}
                  color={COLORS.headerTextBlue}
                  style={{ position: "absolute", right: 10, top: 11, pointerEvents: "none" }}
                />
              </div>
            </div>

            <div>
              <div style={{ fontSize: 13, color: "#333", marginBottom: 6, fontWeight: 500 }}>
                Trạng thái hoạt động
              </div>
              <div style={{ position: "relative" }}>
                <select
                  style={{
                    ...inputStyle,
                    appearance: "none",
                    WebkitAppearance: "none",
                    paddingRight: 30,
                    cursor: "pointer",
                  }}
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="all">-- Tất cả trạng thái --</option>
                  <option value="active">Đang hoạt động</option>
                  <option value="inactive">Vô hiệu hóa</option>
                </select>
                <ChevronDown
                  size={16}
                  color={COLORS.headerTextBlue}
                  style={{ position: "absolute", right: 10, top: 11, pointerEvents: "none" }}
                />
              </div>
            </div>
          </div>

          {/* VIEW MODE 1: CHẾ ĐỘ BẢNG (TABLE VIEW) */}
          {viewMode === "table" && (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={{ ...thStyle, width: 44, textAlign: "center", borderTopLeftRadius: 6, borderBottomLeftRadius: 6 }}>
                      <input
                        type="checkbox"
                        checked={selectedPageIds.length === filteredPages.length && filteredPages.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedPageIds(filteredPages.map((p) => p.id));
                          } else {
                            setSelectedPageIds([]);
                          }
                        }}
                        style={{ cursor: "pointer" }}
                      />
                    </th>
                    <th style={{ ...thStyle, width: 50, textAlign: "center" }}>STT</th>
                    <th style={thStyle}>{renderSortableHeader("Mã trang")}</th>
                    <th style={thStyle}>{renderSortableHeader("Tên trang (Tiếng Việt)")}</th>
                    <th style={thStyle}>{renderSortableHeader("Tên tiếng Anh")}</th>
                    <th style={{ ...thStyle, width: 90, textAlign: "center" }}>Biểu tượng</th>
                    <th style={thStyle}>{renderSortableHeader("Đường dẫn (URL)")}</th>
                    <th style={thStyle}>{renderSortableHeader("Phân hệ cha")}</th>
                    <th style={{ ...thStyle, width: 70, textAlign: "center" }}>
                      {renderSortableHeader("Thứ tự")}
                    </th>
                    <th style={{ ...thStyle, width: 140, textAlign: "center" }}>
                      {renderSortableHeader("Chức năng duyệt")}
                    </th>
                    <th style={{ ...thStyle, width: 120, textAlign: "center" }}>
                      {renderSortableHeader("Trạng thái")}
                    </th>
                    <th style={{ ...thStyle, width: 110, textAlign: "center", borderTopRightRadius: 6, borderBottomRightRadius: 6 }}>
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPages.length === 0 ? (
                    <tr>
                      <td
                        colSpan={12}
                        style={{
                          padding: "36px 14px",
                          textAlign: "center",
                          fontSize: 13,
                          color: "#64748B",
                        }}
                      >
                        Không tìm thấy trang chức năng nào phù hợp với bộ lọc.
                      </td>
                    </tr>
                  ) : (
                    filteredPages.map((item, idx) => {
                      const isSelected = selectedRowId === item.id || selectedPageIds.includes(item.id);
                      return (
                        <tr
                          key={item.id}
                          onClick={() => setSelectedRowId(item.id)}
                          style={{
                            borderBottom: "1px solid #E2E8F0",
                            background: isSelected ? "#F0F7FF" : idx % 2 === 0 ? "#FFFFFF" : "#F8FAFC",
                            cursor: "pointer",
                            transition: "background 0.1s ease",
                          }}
                        >
                          <td style={{ padding: "10px 14px", textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={selectedPageIds.includes(item.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedPageIds([...selectedPageIds, item.id]);
                                } else {
                                  setSelectedPageIds(selectedPageIds.filter((id) => id !== item.id));
                                }
                              }}
                              style={{ cursor: "pointer" }}
                            />
                          </td>
                          <td style={{ padding: "10px 14px", textAlign: "center", fontSize: 13, color: "#64748B" }}>
                            {idx + 1}
                          </td>
                          <td style={{ padding: "10px 14px", fontSize: 13, fontWeight: 600, color: "#0F172A" }}>
                            <code>{item.code}</code>
                          </td>
                          <td style={{ padding: "10px 14px", fontSize: 13, fontWeight: 600, color: "#1E3A8A" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              {renderIconBadge(item.iconName)}
                              <span>{item.name}</span>
                            </div>
                          </td>
                          <td style={{ padding: "10px 14px", fontSize: 13, color: "#475569" }}>
                            {item.nameEn}
                          </td>
                          <td style={{ padding: "10px 14px", textAlign: "center" }}>
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                width: 28,
                                height: 28,
                                borderRadius: 4,
                                background: "#EFF6FF",
                                border: "1px solid #DBEAFE",
                              }}
                            >
                              {renderIconBadge(item.iconName)}
                            </span>
                          </td>
                          <td style={{ padding: "10px 14px", fontSize: 12, color: "#2563EB", fontFamily: "monospace" }}>
                            {item.url}
                          </td>
                          <td style={{ padding: "10px 14px", fontSize: 12, color: "#334155" }}>
                            <span
                              style={{
                                background: "#F1F5F9",
                                padding: "3px 8px",
                                borderRadius: 4,
                                border: "1px solid #E2E8F0",
                                fontSize: 11,
                                fontWeight: 500,
                              }}
                            >
                              {item.parentName}
                            </span>
                          </td>
                          <td style={{ padding: "10px 14px", textAlign: "center", fontSize: 13, fontWeight: 600 }}>
                            {item.orderNum}
                          </td>
                          <td style={{ padding: "10px 14px", textAlign: "center" }}>
                            {item.hasApproval ? (
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 4,
                                  background: "#DCFCE7",
                                  color: "#15803D",
                                  padding: "3px 10px",
                                  borderRadius: 12,
                                  fontSize: 11,
                                  fontWeight: 600,
                                  border: "1px solid #86EFAC",
                                }}
                                title="Trang có kiểm tra điều kiện duyệt"
                              >
                                <Check size={12} strokeWidth={3} />
                                Có chức năng duyệt
                              </span>
                            ) : (
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 4,
                                  background: "#F1F5F9",
                                  color: "#64748B",
                                  padding: "3px 10px",
                                  borderRadius: 12,
                                  fontSize: 11,
                                  fontWeight: 500,
                                }}
                              >
                                ✕ Không duyệt
                              </span>
                            )}
                          </td>
                          <td style={{ padding: "10px 14px", textAlign: "center" }}>
                            {item.status === "active" ? (
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 5,
                                  background: "#ECFDF5",
                                  color: "#059669",
                                  padding: "3px 10px",
                                  borderRadius: 12,
                                  fontSize: 11,
                                  fontWeight: 600,
                                }}
                              >
                                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#059669" }} />
                                Hoạt động
                              </span>
                            ) : (
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 5,
                                  background: "#FEF2F2",
                                  color: "#DC2626",
                                  padding: "3px 10px",
                                  borderRadius: 12,
                                  fontSize: 11,
                                  fontWeight: 600,
                                }}
                              >
                                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#DC2626" }} />
                                Khóa
                              </span>
                            )}
                          </td>
                          <td style={{ padding: "10px 14px", textAlign: "center" }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                              <button
                                title="Xem chi tiết & Cấu hình duyệt"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenDetailModal(item);
                                }}
                                style={{
                                  border: "none",
                                  background: "transparent",
                                  cursor: "pointer",
                                  color: "#3577DB",
                                  padding: 4,
                                  borderRadius: 4,
                                }}
                              >
                                <Eye size={15} />
                              </button>
                              <button
                                title="Chỉnh sửa thông tin"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenEditModal(item);
                                }}
                                style={{
                                  border: "none",
                                  background: "transparent",
                                  cursor: "pointer",
                                  color: "#D97706",
                                  padding: 4,
                                  borderRadius: 4,
                                }}
                              >
                                <Pencil size={15} />
                              </button>
                              <button
                                title="Bật/Tắt kích hoạt"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenToggleStatusModal(item);
                                }}
                                style={{
                                  border: "none",
                                  background: "transparent",
                                  cursor: "pointer",
                                  color: item.status === "active" ? "#059669" : "#DC2626",
                                  padding: 4,
                                  borderRadius: 4,
                                }}
                              >
                                <Power size={15} />
                              </button>
                              <button
                                title="Xóa trang"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenDeleteModal(item);
                                }}
                                style={{
                                  border: "none",
                                  background: "transparent",
                                  cursor: "pointer",
                                  color: "#EF4444",
                                  padding: 4,
                                  borderRadius: 4,
                                }}
                              >
                                <XIcon size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* VIEW MODE 2: CHẾ ĐỘ CÂY (TREE VIEW) */}
          {viewMode === "tree" && (
            <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 8, padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#0F172A", display: "flex", alignItems: "center", gap: 8 }}>
                  <FolderTree size={18} color="#3577DB" />
                  Sơ đồ Phân cấp Cây Menu & Điều kiện Duyệt (System Navigation Tree)
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() =>
                      setExpandedNodes({
                        SRC_ROOT: true,
                        PROC_ROOT: true,
                        REP_ROOT: true,
                        SYS_ROOT: true,
                      })
                    }
                    style={{
                      fontSize: 12,
                      padding: "4px 10px",
                      borderRadius: 4,
                      border: "1px solid #CBD5E1",
                      background: "#fff",
                      cursor: "pointer",
                    }}
                  >
                    Mở rộng tất cả
                  </button>
                  <button
                    onClick={() => setExpandedNodes({})}
                    style={{
                      fontSize: 12,
                      padding: "4px 10px",
                      borderRadius: 4,
                      border: "1px solid #CBD5E1",
                      background: "#fff",
                      cursor: "pointer",
                    }}
                  >
                    Thu gọn tất cả
                  </button>
                </div>
              </div>

              {groupedTreeData.map((module) => {
                const isExpanded = !!expandedNodes[module.code];
                return (
                  <div
                    key={module.code}
                    style={{
                      marginBottom: 12,
                      background: "#FFFFFF",
                      border: "1px solid #CBD5E1",
                      borderRadius: 6,
                      overflow: "hidden",
                    }}
                  >
                    {/* Module Root Header */}
                    <div
                      onClick={() => toggleTreeNode(module.code)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "12px 16px",
                        background: "#F1F5F9",
                        cursor: "pointer",
                        userSelect: "none",
                        borderBottom: isExpanded ? "1px solid #E2E8F0" : "none",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        {isExpanded ? <ChevronDown size={18} color="#3577DB" /> : <ChevronRight size={18} color="#64748B" />}
                        <span style={{ fontWeight: 700, fontSize: 14, color: "#1E293B" }}>
                          {module.name}
                        </span>
                        <span
                          style={{
                            fontSize: 11,
                            background: "#DBEAFE",
                            color: "#1E40AF",
                            padding: "2px 8px",
                            borderRadius: 12,
                            fontWeight: 600,
                          }}
                        >
                          {module.children.length} trang con
                        </span>
                      </div>
                      <span style={{ fontSize: 12, color: "#64748B" }}>Mã: {module.code}</span>
                    </div>

                    {/* Module Children Pages */}
                    {isExpanded && (
                      <div style={{ padding: "8px 16px 12px 36px" }}>
                        {module.children.map((child) => (
                          <div
                            key={child.id}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "10px 12px",
                              margin: "6px 0",
                              background: child.hasApproval ? "#F0FDF4" : "#FFFFFF",
                              border: child.hasApproval ? "1px solid #BBF7D0" : "1px solid #E2E8F0",
                              borderRadius: 6,
                              transition: "all 0.15s ease",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  width: 28,
                                  height: 28,
                                  borderRadius: 4,
                                  background: "#EFF6FF",
                                }}
                              >
                                {renderIconBadge(child.iconName)}
                              </span>
                              <div>
                                <div style={{ fontSize: 13, fontWeight: 600, color: "#0F172A" }}>
                                  {child.name}
                                  <span style={{ fontSize: 12, color: "#64748B", marginLeft: 8, fontWeight: 400 }}>
                                    ({child.nameEn})
                                  </span>
                                </div>
                                <div style={{ fontSize: 11, color: "#2563EB", fontFamily: "monospace", marginTop: 2 }}>
                                  URL: {child.url} | Thứ tự: #{child.orderNum}
                                </div>
                              </div>
                            </div>

                            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                              {child.hasApproval ? (
                                <span
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 4,
                                    background: "#DCFCE7",
                                    color: "#15803D",
                                    padding: "3px 10px",
                                    borderRadius: 12,
                                    fontSize: 11,
                                    fontWeight: 600,
                                    border: "1px solid #86EFAC",
                                  }}
                                >
                                  <Check size={12} strokeWidth={3} />
                                  Kích hoạt Chức năng duyệt
                                </span>
                              ) : (
                                <span
                                  style={{
                                    fontSize: 11,
                                    color: "#64748B",
                                    background: "#F1F5F9",
                                    padding: "3px 8px",
                                    borderRadius: 12,
                                  }}
                                >
                                  Không duyệt
                                </span>
                              )}

                              <div style={{ display: "flex", gap: 6 }}>
                                <button
                                  onClick={() => handleOpenDetailModal(child)}
                                  style={{
                                    fontSize: 11,
                                    padding: "4px 8px",
                                    borderRadius: 4,
                                    border: "1px solid #CBD5E1",
                                    background: "#fff",
                                    color: "#3577DB",
                                    cursor: "pointer",
                                    fontWeight: 500,
                                  }}
                                >
                                  Chi tiết
                                </button>
                                <button
                                  onClick={() => handleOpenEditModal(child)}
                                  style={{
                                    fontSize: 11,
                                    padding: "4px 8px",
                                    borderRadius: 4,
                                    border: "1px solid #CBD5E1",
                                    background: "#fff",
                                    color: "#D97706",
                                    cursor: "pointer",
                                    fontWeight: 500,
                                  }}
                                >
                                  Sửa
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination Footer */}
          <Pagination total={filteredPages.length} />
        </Panel>
      )}

      {/* TAB 2: THÔNG TIN TRANG ĐĂNG TẢI / FANPAGE THU THẬP */}
      {activeTab === "crawled_pages" && (
        <Panel style={{ padding: "20px 24px" }}>
          {/* Crawled Info Callout */}
          <div
            style={{
              background: "#EFF6FF",
              border: "1px solid #BFDBFE",
              borderRadius: 6,
              padding: "12px 16px",
              marginBottom: 20,
              display: "flex",
              alignItems: "flex-start",
              gap: 12,
            }}
          >
            <Share2 size={20} color="#2563EB" style={{ flexShrink: 0, marginTop: 2 }} />
            <div style={{ fontSize: 13, color: "#1E40AF", lineHeight: 1.5 }}>
              <div style={{ fontWeight: 600, marginBottom: 2 }}>
                Đặc tả trích xuất Thông tin Trang (Fanpage / Group / Kênh quảng cáo):
              </div>
              <div>
                Trong quy trình thu thập tin, hệ thống tự động ghi nhận và phân tích cấu trúc:{" "}
                <em>
                  "Thông tin về người hoặc đơn vị đăng tải bài viết, chẳng hạn như tên tài khoản cá nhân, tên Trang
                  (Fanpage) hoặc tên Nhóm (Group), cũng được ghi nhận cẩn thận để xác định nguồn gốc của quảng cáo."
                </em>
              </div>
            </div>
          </div>

          {/* Filters Row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 13, color: "#333", marginBottom: 6, fontWeight: 500 }}>
                Tìm kiếm Tên Trang / ID / Chủ sở hữu
              </div>
              <input
                style={inputStyle}
                placeholder="Nhập tên Fanpage, Page ID, Người sở hữu..."
                value={searchCrawlPage}
                onChange={(e) => setSearchCrawlPage(e.target.value)}
              />
            </div>

            <div>
              <div style={{ fontSize: 13, color: "#333", marginBottom: 6, fontWeight: 500 }}>
                Nền tảng mạng xã hội
              </div>
              <div style={{ position: "relative" }}>
                <select
                  style={{
                    ...inputStyle,
                    appearance: "none",
                    WebkitAppearance: "none",
                    paddingRight: 30,
                    cursor: "pointer",
                  }}
                  value={filterPlatform}
                  onChange={(e) => setFilterPlatform(e.target.value)}
                >
                  <option value="all">-- Tất cả nền tảng --</option>
                  <option value="Facebook">Facebook (Fanpage / Group)</option>
                  <option value="TikTok">TikTok</option>
                  <option value="YouTube">YouTube</option>
                </select>
                <ChevronDown
                  size={16}
                  color={COLORS.headerTextBlue}
                  style={{ position: "absolute", right: 10, top: 11, pointerEvents: "none" }}
                />
              </div>
            </div>

            <div>
              <div style={{ fontSize: 13, color: "#333", marginBottom: 6, fontWeight: 500 }}>
                Tình trạng xác minh & Giám sát
              </div>
              <div style={{ position: "relative" }}>
                <select
                  style={{
                    ...inputStyle,
                    appearance: "none",
                    WebkitAppearance: "none",
                    paddingRight: 30,
                    cursor: "pointer",
                  }}
                  value={filterCrawlStatus}
                  onChange={(e) => setFilterCrawlStatus(e.target.value)}
                >
                  <option value="all">-- Tất cả tình trạng --</option>
                  <option value="verified">Đã xác minh cơ sở y tế</option>
                  <option value="investigating">Nghi vấn vi phạm</option>
                  <option value="flagged">Quảng cáo sai sự thật / Mạo danh</option>
                  <option value="monitoring">Đang theo dõi tự động</option>
                  <option value="blacklist">Blacklist / Đề xuất xử phạt</option>
                </select>
                <ChevronDown
                  size={16}
                  color={COLORS.headerTextBlue}
                  style={{ position: "absolute", right: 10, top: 11, pointerEvents: "none" }}
                />
              </div>
            </div>
          </div>

          {/* Data Table Crawled Pages */}
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ ...thStyle, width: 50, textAlign: "center", borderTopLeftRadius: 6, borderBottomLeftRadius: 6 }}>
                    STT
                  </th>
                  <th style={thStyle}>{renderSortableHeader("Tên Trang / Nhóm / Kênh")}</th>
                  <th style={{ ...thStyle, width: 110, textAlign: "center" }}>
                    {renderSortableHeader("Nền tảng")}
                  </th>
                  <th style={thStyle}>{renderSortableHeader("Loại nguồn gốc")}</th>
                  <th style={thStyle}>{renderSortableHeader("Chủ sở hữu / Người đại diện xác định")}</th>
                  <th style={{ ...thStyle, width: 110, textAlign: "center" }}>
                    {renderSortableHeader("Số bài quét")}
                  </th>
                  <th style={{ ...thStyle, width: 110, textAlign: "center" }}>
                    {renderSortableHeader("Tỷ lệ vi phạm")}
                  </th>
                  <th style={{ ...thStyle, width: 180, textAlign: "center" }}>
                    {renderSortableHeader("Tình trạng xác minh")}
                  </th>
                  <th style={{ ...thStyle, width: 110, textAlign: "center", borderTopRightRadius: 6, borderBottomRightRadius: 6 }}>
                    Hồ sơ chi tiết
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredCrawledPages.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      style={{
                        padding: "36px 14px",
                        textAlign: "center",
                        fontSize: 13,
                        color: "#64748B",
                      }}
                    >
                      Không tìm thấy nguồn trang thu thập nào phù hợp.
                    </td>
                  </tr>
                ) : (
                  filteredCrawledPages.map((item, idx) => (
                    <tr
                      key={item.id}
                      onClick={() => handleOpenCrawledDetail(item)}
                      style={{
                        borderBottom: "1px solid #E2E8F0",
                        background: idx % 2 === 0 ? "#FFFFFF" : "#F8FAFC",
                        cursor: "pointer",
                        transition: "background 0.1s ease",
                      }}
                    >
                      <td style={{ padding: "10px 14px", textAlign: "center", fontSize: 13, color: "#64748B" }}>
                        {idx + 1}
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#0F172A" }}>{item.pageName}</div>
                        <div style={{ fontSize: 11, color: "#64748B", fontFamily: "monospace", marginTop: 2 }}>
                          ID: {item.pageId}
                        </div>
                      </td>
                      <td style={{ padding: "10px 14px", textAlign: "center" }}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "3px 8px",
                            borderRadius: 4,
                            fontSize: 11,
                            fontWeight: 600,
                            background:
                              item.platform === "Facebook"
                                ? "#EBF3FF"
                                : item.platform === "TikTok"
                                ? "#F1F5F9"
                                : "#FEF2F2",
                            color:
                              item.platform === "Facebook"
                                ? "#1D4ED8"
                                : item.platform === "TikTok"
                                ? "#0F172A"
                                : "#DC2626",
                            border: "1px solid #E2E8F0",
                          }}
                        >
                          {item.platform}
                        </span>
                      </td>
                      <td style={{ padding: "10px 14px", fontSize: 13, color: "#334155" }}>
                        {item.type}
                      </td>
                      <td style={{ padding: "10px 14px", fontSize: 13, color: "#1E293B" }}>
                        {item.ownerName}
                      </td>
                      <td style={{ padding: "10px 14px", textAlign: "center", fontSize: 13, fontWeight: 600 }}>
                        {item.crawledAds} bài
                      </td>
                      <td style={{ padding: "10px 14px", textAlign: "center" }}>
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 700,
                            color: item.violationAds > 0 ? "#DC2626" : "#059669",
                          }}
                        >
                          {item.violationRate}
                        </span>
                        <div style={{ fontSize: 10, color: "#64748B" }}>({item.violationAds} vi phạm)</div>
                      </td>
                      <td style={{ padding: "10px 14px", textAlign: "center" }}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "4px 10px",
                            borderRadius: 12,
                            fontSize: 11,
                            fontWeight: 600,
                            background: item.statusBadgeColor + "15",
                            color: item.statusBadgeColor,
                            border: `1px solid ${item.statusBadgeColor}40`,
                          }}
                        >
                          {item.statusLabel}
                        </span>
                      </td>
                      <td style={{ padding: "10px 14px", textAlign: "center" }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenCrawledDetail(item);
                          }}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            padding: "4px 10px",
                            fontSize: 11,
                            fontWeight: 500,
                            borderRadius: 4,
                            border: "1px solid #CBD5E1",
                            background: "#fff",
                            color: "#3577DB",
                            cursor: "pointer",
                          }}
                        >
                          <Eye size={13} />
                          Hồ sơ
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <Pagination total={filteredCrawledPages.length} />
        </Panel>
      )}

      {/* ========================================================================= */}
      {/* 1. MODAL: THÊM MỚI THÔNG TIN TRANG */}
      {/* ========================================================================= */}
      {showAddModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(2px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: 20,
          }}
        >
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: 8,
              width: "100%",
              maxWidth: 720,
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)",
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "16px 20px",
                borderBottom: "1px solid #E2E8F0",
                background: "#071437",
                color: "#fff",
                borderRadius: "8px 8px 0 0",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Plus size={18} color="#38BDF8" />
                <span style={{ fontSize: 16, fontWeight: 600 }}>Thêm Mới Thông Tin Trang Chức Năng</span>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                style={{ background: "transparent", border: "none", color: "#94A3B8", cursor: "pointer" }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSaveNewPage} style={{ padding: "20px 24px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 6 }}>
                    Mã trang <span style={{ color: "#EF4444" }}>*</span>
                  </label>
                  <input
                    style={inputStyle}
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 6 }}>
                    Phân hệ / Mã trang cha <span style={{ color: "#EF4444" }}>*</span>
                  </label>
                  <select
                    style={inputStyle}
                    value={formData.parentCode}
                    onChange={(e) => setFormData({ ...formData, parentCode: e.target.value })}
                  >
                    {PARENT_MODULES.map((m) => (
                      <option key={m.code} value={m.code}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 6 }}>
                    Tên trang (Tiếng Việt) <span style={{ color: "#EF4444" }}>*</span>
                  </label>
                  <input
                    style={inputStyle}
                    placeholder="VD: Kiểm duyệt kết quả quảng cáo"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 6 }}>
                    Tên tiếng Anh (English Name)
                  </label>
                  <input
                    style={inputStyle}
                    placeholder="VD: Ad QC Inspection"
                    value={formData.nameEn}
                    onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 6 }}>
                    Đường dẫn Route (URL) <span style={{ color: "#EF4444" }}>*</span>
                  </label>
                  <input
                    style={inputStyle}
                    placeholder="/specialist/qc-custom"
                    value={formData.url}
                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 6 }}>
                    Biểu tượng (Icon)
                  </label>
                  <select
                    style={inputStyle}
                    value={formData.iconName}
                    onChange={(e) => setFormData({ ...formData, iconName: e.target.value })}
                  >
                    <option value="Layout">Layout</option>
                    <option value="ShieldCheck">ShieldCheck</option>
                    <option value="Building2">Building2</option>
                    <option value="Layers">Layers</option>
                    <option value="AlertTriangle">AlertTriangle</option>
                    <option value="BarChart3">BarChart3</option>
                    <option value="Users">Users</option>
                    <option value="Settings">Settings</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 6 }}>
                    Thứ tự hiển thị
                  </label>
                  <input
                    type="number"
                    style={inputStyle}
                    value={formData.orderNum}
                    onChange={(e) => setFormData({ ...formData, orderNum: Number(e.target.value) })}
                    min={1}
                  />
                </div>
              </div>

              {/* CRITICAL FEATURE: CỜ "CHỨC NĂNG DUYỆT" THEO ĐẶC TẢ */}
              <div
                style={{
                  background: "#F0FDF4",
                  border: "1px solid #86EFAC",
                  borderRadius: 6,
                  padding: "14px 16px",
                  marginBottom: 16,
                }}
              >
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    cursor: "pointer",
                    fontWeight: 700,
                    fontSize: 14,
                    color: "#166534",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={formData.hasApproval}
                    onChange={(e) => setFormData({ ...formData, hasApproval: e.target.checked })}
                    style={{ width: 18, height: 18, cursor: "pointer" }}
                  />
                  <span>Kích hoạt cờ "Chức năng duyệt" cho trang này</span>
                </label>
                <div style={{ fontSize: 12, color: "#15803D", marginTop: 6, lineHeight: 1.4, paddingLeft: 28 }}>
                  💡 <strong>Quy tắc hệ thống:</strong> Nút "Phê duyệt" hoặc "Duyệt kết quả" trên màn hình nghiệp vụ chỉ
                  được render khi cờ này được <strong>bật (Check)</strong> và bản ghi người dùng đang xử lý có trạng thái
                  là <strong>"Chờ duyệt"</strong>.
                </div>
              </div>

              {/* Trạng thái hoạt động */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 13 }}>
                  <input
                    type="checkbox"
                    checked={formData.status === "active"}
                    onChange={(e) => setFormData({ ...formData, status: e.target.checked ? "active" : "inactive" })}
                    style={{ width: 16, height: 16 }}
                  />
                  <span style={{ fontWeight: 600, color: "#334155" }}>Kích hoạt hiển thị trang trên menu hệ thống</span>
                </label>
              </div>

              {/* Mô tả chức năng */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 6 }}>
                  Mô tả phạm vi nghiệp vụ trang
                </label>
                <textarea
                  style={{
                    ...inputStyle,
                    height: 70,
                    padding: "8px 12px",
                    resize: "none",
                  }}
                  placeholder="Nhập mô tả tóm tắt mục đích sử dụng trang..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              {/* Footer Buttons */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, paddingTop: 12, borderTop: "1px solid #E2E8F0" }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{
                    padding: "8px 16px",
                    fontSize: 13,
                    fontWeight: 500,
                    borderRadius: 4,
                    border: "1px solid #CBD5E1",
                    background: "#F8FAFC",
                    color: "#475569",
                    cursor: "pointer",
                  }}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  style={{
                    padding: "8px 20px",
                    fontSize: 13,
                    fontWeight: 600,
                    borderRadius: 4,
                    border: "none",
                    background: "#3577DB",
                    color: "#FFFFFF",
                    cursor: "pointer",
                  }}
                >
                  Lưu thông tin trang
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. MODAL: CHỈNH SỬA THÔNG TIN TRANG */}
      {/* ========================================================================= */}
      {showEditModal && currentSelectedPage && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(2px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: 20,
          }}
        >
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: 8,
              width: "100%",
              maxWidth: 720,
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "16px 20px",
                borderBottom: "1px solid #E2E8F0",
                background: "#071437",
                color: "#fff",
                borderRadius: "8px 8px 0 0",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Pencil size={18} color="#FBBF24" />
                <span style={{ fontSize: 16, fontWeight: 600 }}>
                  Chỉnh Sửa Thông Tin Trang: {currentSelectedPage.code}
                </span>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                style={{ background: "transparent", border: "none", color: "#94A3B8", cursor: "pointer" }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveEditPage} style={{ padding: "20px 24px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 6 }}>
                    Mã trang (Read-only)
                  </label>
                  <input style={{ ...inputStyle, background: "#F1F5F9", color: "#64748B" }} value={formData.code} disabled />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 6 }}>
                    Phân hệ / Mã trang cha
                  </label>
                  <select
                    style={inputStyle}
                    value={formData.parentCode}
                    onChange={(e) => setFormData({ ...formData, parentCode: e.target.value })}
                  >
                    {PARENT_MODULES.map((m) => (
                      <option key={m.code} value={m.code}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 6 }}>
                    Tên trang (Tiếng Việt) <span style={{ color: "#EF4444" }}>*</span>
                  </label>
                  <input
                    style={inputStyle}
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 6 }}>
                    Tên tiếng Anh
                  </label>
                  <input
                    style={inputStyle}
                    value={formData.nameEn}
                    onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 6 }}>
                    Đường dẫn Route (URL)
                  </label>
                  <input
                    style={inputStyle}
                    value={formData.url}
                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 6 }}>
                    Biểu tượng
                  </label>
                  <select
                    style={inputStyle}
                    value={formData.iconName}
                    onChange={(e) => setFormData({ ...formData, iconName: e.target.value })}
                  >
                    <option value="Layout">Layout</option>
                    <option value="ShieldCheck">ShieldCheck</option>
                    <option value="Building2">Building2</option>
                    <option value="Layers">Layers</option>
                    <option value="AlertTriangle">AlertTriangle</option>
                    <option value="BarChart3">BarChart3</option>
                    <option value="Users">Users</option>
                    <option value="Settings">Settings</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 6 }}>
                    Thứ tự
                  </label>
                  <input
                    type="number"
                    style={inputStyle}
                    value={formData.orderNum}
                    onChange={(e) => setFormData({ ...formData, orderNum: Number(e.target.value) })}
                    min={1}
                  />
                </div>
              </div>

              {/* BẬT / TẮT CỜ CHỨC NĂNG DUYỆT */}
              <div
                style={{
                  background: formData.hasApproval ? "#F0FDF4" : "#F8FAFC",
                  border: formData.hasApproval ? "1px solid #86EFAC" : "1px solid #CBD5E1",
                  borderRadius: 6,
                  padding: "14px 16px",
                  marginBottom: 16,
                  transition: "all 0.15s ease",
                }}
              >
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    cursor: "pointer",
                    fontWeight: 700,
                    fontSize: 14,
                    color: formData.hasApproval ? "#166534" : "#334155",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={formData.hasApproval}
                    onChange={(e) => setFormData({ ...formData, hasApproval: e.target.checked })}
                    style={{ width: 18, height: 18, cursor: "pointer" }}
                  />
                  <span>Kích hoạt cờ "Chức năng duyệt" cho trang này</span>
                </label>
                <div style={{ fontSize: 12, color: "#64748B", marginTop: 6, paddingLeft: 28 }}>
                  Quy tắc: Nút duyệt chỉ hiển thị khi có check chọn "Chức năng duyệt" và người dùng có bản ghi ở trạng
                  thái "Chờ duyệt".
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, paddingTop: 12, borderTop: "1px solid #E2E8F0" }}>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  style={{
                    padding: "8px 16px",
                    fontSize: 13,
                    fontWeight: 500,
                    borderRadius: 4,
                    border: "1px solid #CBD5E1",
                    background: "#F8FAFC",
                    color: "#475569",
                    cursor: "pointer",
                  }}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  style={{
                    padding: "8px 20px",
                    fontSize: 13,
                    fontWeight: 600,
                    borderRadius: 4,
                    border: "none",
                    background: "#3577DB",
                    color: "#FFFFFF",
                    cursor: "pointer",
                  }}
                >
                  Cập nhật thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. MODAL: XEM CHI TIẾT THÔNG TIN TRANG & QUY TẮC DUYỆT */}
      {/* ========================================================================= */}
      {showDetailModal && currentSelectedPage && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(2px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: 20,
          }}
        >
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: 8,
              width: "100%",
              maxWidth: 780,
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "16px 20px",
                borderBottom: "1px solid #E2E8F0",
                background: "#071437",
                color: "#fff",
                borderRadius: "8px 8px 0 0",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Eye size={18} color="#38BDF8" />
                <span style={{ fontSize: 16, fontWeight: 600 }}>
                  Chi Tiết Cấu Hình Trang & Quy Tắc Duyệt ({currentSelectedPage.code})
                </span>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                style={{ background: "transparent", border: "none", color: "#94A3B8", cursor: "pointer" }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: "20px 24px" }}>
              {/* Header Info Block */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: "#F8FAFC",
                  padding: 16,
                  borderRadius: 6,
                  border: "1px solid #E2E8F0",
                  marginBottom: 20,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 8,
                      background: "#EFF6FF",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: "1px solid #DBEAFE",
                    }}
                  >
                    {renderIconBadge(currentSelectedPage.iconName)}
                  </div>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "#0F172A" }}>
                      {currentSelectedPage.name}
                    </div>
                    <div style={{ fontSize: 13, color: "#64748B" }}>
                      {currentSelectedPage.nameEn} • URL: <code>{currentSelectedPage.url}</code>
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: "right" }}>
                  {currentSelectedPage.status === "active" ? (
                    <span
                      style={{
                        background: "#ECFDF5",
                        color: "#059669",
                        padding: "4px 12px",
                        borderRadius: 12,
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      ● Đang hoạt động
                    </span>
                  ) : (
                    <span
                      style={{
                        background: "#FEF2F2",
                        color: "#DC2626",
                        padding: "4px 12px",
                        borderRadius: 12,
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      ● Vô hiệu hóa
                    </span>
                  )}
                </div>
              </div>

              {/* Grid 2 Columns: Specs & Approval Rule Engine */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
                {/* Specs Box */}
                <div style={{ border: "1px solid #E2E8F0", borderRadius: 6, padding: 16 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#1E293B", marginBottom: 12 }}>
                    Thông số kỹ thuật trang
                  </div>
                  <div style={{ fontSize: 13, display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#64748B" }}>Mã định danh:</span>
                      <strong style={{ color: "#0F172A" }}>{currentSelectedPage.code}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#64748B" }}>Phân hệ cha:</span>
                      <strong style={{ color: "#1E3A8A" }}>{currentSelectedPage.parentName}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#64748B" }}>Thứ tự hiển thị:</span>
                      <strong>#{currentSelectedPage.orderNum}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#64748B" }}>Cập nhật lần cuối:</span>
                      <span>{currentSelectedPage.updatedAt}</span>
                    </div>
                  </div>
                </div>

                {/* Approval Rule Engine Box */}
                <div
                  style={{
                    border: currentSelectedPage.hasApproval ? "1px solid #86EFAC" : "1px solid #E2E8F0",
                    background: currentSelectedPage.hasApproval ? "#F0FDF4" : "#F8FAFC",
                    borderRadius: 6,
                    padding: 16,
                  }}
                >
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#166534", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                    <ShieldCheck size={18} color="#16A34A" />
                    Cấu hình Quy tắc duyệt (Approval Rule)
                  </div>
                  <div style={{ fontSize: 13, color: "#334155", lineHeight: 1.5 }}>
                    <div style={{ marginBottom: 8 }}>
                      Trạng thái cờ duyệt:{" "}
                      <strong>
                        {currentSelectedPage.hasApproval ? "✓ ĐÃ KÍCH HOẠT (TRUE)" : "✕ KHÔNG BẬT (FALSE)"}
                      </strong>
                    </div>
                    {currentSelectedPage.hasApproval ? (
                      <div
                        style={{
                          background: "#FFFFFF",
                          border: "1px dashed #22C55E",
                          padding: "10px 12px",
                          borderRadius: 4,
                          fontSize: 12,
                          color: "#15803D",
                        }}
                      >
                        <strong>Logic kiểm tra:</strong>
                        <div style={{ marginTop: 4 }}>
                          <code>IF (Page.hasApproval == TRUE && Record.status == 'CHỜ DUYỆT')</code>
                          <br />
                          <code>THEN RenderButton('Phê duyệt')</code>
                        </div>
                      </div>
                    ) : (
                      <div style={{ fontSize: 12, color: "#64748B" }}>
                        Trang này không áp dụng quy trình duyệt phân cấp. Các nút thao tác hiển thị theo phân quyền vai
                        trò thông thường.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions Matrix on Page */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#1E293B", marginBottom: 8 }}>
                  Danh sách hành động/nút thao tác được cấu hình trên trang:
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {currentSelectedPage.actions ? (
                    currentSelectedPage.actions.map((act, i) => (
                      <span
                        key={i}
                        style={{
                          background: "#EFF6FF",
                          color: "#1E40AF",
                          padding: "4px 12px",
                          borderRadius: 4,
                          border: "1px solid #DBEAFE",
                          fontSize: 12,
                          fontWeight: 500,
                        }}
                      >
                        {act}
                      </span>
                    ))
                  ) : (
                    <span style={{ fontSize: 13, color: "#64748B" }}>Chưa cấu hình hành động</span>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, paddingTop: 12, borderTop: "1px solid #E2E8F0" }}>
                <button
                  onClick={() => setShowDetailModal(false)}
                  style={{
                    padding: "8px 20px",
                    fontSize: 13,
                    fontWeight: 600,
                    borderRadius: 4,
                    border: "none",
                    background: "#3577DB",
                    color: "#FFFFFF",
                    cursor: "pointer",
                  }}
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. MODAL: XÁC NHẬN KÍCH HOẠT / VÔ HIỆU HÓA TRANG */}
      {/* ========================================================================= */}
      {showToggleStatusModal && currentSelectedPage && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(2px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: 20,
          }}
        >
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: 8,
              width: "100%",
              maxWidth: 480,
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "16px 20px",
                background: currentSelectedPage.status === "active" ? "#FEF2F2" : "#ECFDF5",
                borderBottom: "1px solid #E2E8F0",
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <AlertTriangle
                size={20}
                color={currentSelectedPage.status === "active" ? "#DC2626" : "#059669"}
              />
              <span
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: currentSelectedPage.status === "active" ? "#991B1B" : "#065F46",
                }}
              >
                {currentSelectedPage.status === "active"
                  ? "Xác Nhận Vô Hiệu Hóa Trang"
                  : "Xác Nhận Kích Hoạt Lại Trang"}
              </span>
            </div>

            <div style={{ padding: "20px" }}>
              <div style={{ fontSize: 13, color: "#334155", lineHeight: 1.5, marginBottom: 16 }}>
                Bạn có chắc chắn muốn {currentSelectedPage.status === "active" ? "vô hiệu hóa" : "kích hoạt"} trang{" "}
                <strong>{currentSelectedPage.name}</strong> (<code>{currentSelectedPage.code}</code>)?
                {currentSelectedPage.status === "active" && (
                  <div style={{ color: "#DC2626", marginTop: 8, fontSize: 12 }}>
                    ⚠️ Lưu ý: Khi vô hiệu hóa, người dùng thông thường sẽ không thể nhìn thấy hoặc truy cập trang này từ
                    menu điều hướng.
                  </div>
                )}
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button
                  onClick={() => setShowToggleStatusModal(false)}
                  style={{
                    padding: "8px 16px",
                    fontSize: 13,
                    borderRadius: 4,
                    border: "1px solid #CBD5E1",
                    background: "#fff",
                    color: "#475569",
                    cursor: "pointer",
                  }}
                >
                  Hủy
                </button>
                <button
                  onClick={handleConfirmToggleStatus}
                  style={{
                    padding: "8px 20px",
                    fontSize: 13,
                    fontWeight: 600,
                    borderRadius: 4,
                    border: "none",
                    background: currentSelectedPage.status === "active" ? "#DC2626" : "#059669",
                    color: "#fff",
                    cursor: "pointer",
                  }}
                >
                  {currentSelectedPage.status === "active" ? "Đồng ý vô hiệu hóa" : "Kích hoạt trang"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. MODAL: XÁC NHẬN XÓA TRANG */}
      {/* ========================================================================= */}
      {showDeleteModal && currentSelectedPage && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(2px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: 20,
          }}
        >
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: 8,
              width: "100%",
              maxWidth: 480,
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "16px 20px",
                background: "#FEF2F2",
                borderBottom: "1px solid #FECACA",
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <AlertCircle size={20} color="#DC2626" />
              <span style={{ fontSize: 15, fontWeight: 700, color: "#991B1B" }}>Xóa Thông Tin Trang Khỏi Hệ Thống</span>
            </div>

            <div style={{ padding: "20px" }}>
              <div style={{ fontSize: 13, color: "#334155", lineHeight: 1.5, marginBottom: 16 }}>
                Bạn có chắc chắn muốn xóa vĩnh viễn cấu hình trang <strong>{currentSelectedPage.name}</strong> (
                <code>{currentSelectedPage.code}</code>)? Thao tác này không thể hoàn tác.
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button
                  onClick={() => setShowDeleteModal(false)}
                  style={{
                    padding: "8px 16px",
                    fontSize: 13,
                    borderRadius: 4,
                    border: "1px solid #CBD5E1",
                    background: "#fff",
                    color: "#475569",
                    cursor: "pointer",
                  }}
                >
                  Hủy bỏ
                </button>
                <button
                  onClick={handleConfirmDelete}
                  style={{
                    padding: "8px 20px",
                    fontSize: 13,
                    fontWeight: 600,
                    borderRadius: 4,
                    border: "none",
                    background: "#DC2626",
                    color: "#fff",
                    cursor: "pointer",
                  }}
                >
                  Xác nhận xóa
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. MODAL: HỒ SƠ CHI TIẾT TRANG ĐĂNG TẢI / FANPAGE THU THẬP */}
      {/* ========================================================================= */}
      {showCrawledDetailModal && currentCrawledPage && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(2px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: 20,
          }}
        >
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: 8,
              width: "100%",
              maxWidth: 760,
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "16px 20px",
                borderBottom: "1px solid #E2E8F0",
                background: "#071437",
                color: "#fff",
                borderRadius: "8px 8px 0 0",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Share2 size={18} color="#38BDF8" />
                <span style={{ fontSize: 16, fontWeight: 600 }}>
                  Hồ Sơ Nguồn Tin / Trang Đăng Tải Quảng Cáo ({currentCrawledPage.platform})
                </span>
              </div>
              <button
                onClick={() => setShowCrawledDetailModal(false)}
                style={{ background: "transparent", border: "none", color: "#94A3B8", cursor: "pointer" }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: "20px 24px" }}>
              {/* Profile Card Header */}
              <div
                style={{
                  background: "#F8FAFC",
                  border: "1px solid #E2E8F0",
                  borderRadius: 6,
                  padding: 16,
                  marginBottom: 20,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#0F172A", display: "flex", alignItems: "center", gap: 8 }}>
                    {currentCrawledPage.pageName}
                    <span
                      style={{
                        fontSize: 11,
                        padding: "2px 8px",
                        borderRadius: 4,
                        background: "#DBEAFE",
                        color: "#1E40AF",
                        fontWeight: 600,
                      }}
                    >
                      {currentCrawledPage.type}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: "#64748B", marginTop: 4 }}>
                    Page ID: <code>{currentCrawledPage.pageId}</code> | Nền tảng:{" "}
                    <strong>{currentCrawledPage.platform}</strong>
                  </div>
                </div>

                <a
                  href={currentCrawledPage.url}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 12px",
                    background: "#3577DB",
                    color: "#fff",
                    borderRadius: 4,
                    fontSize: 12,
                    textDecoration: "none",
                    fontWeight: 500,
                  }}
                >
                  <ExternalLink size={14} />
                  Mở trang gốc
                </a>
              </div>

              {/* Grid Details */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
                <div style={{ border: "1px solid #E2E8F0", borderRadius: 6, padding: 14 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#1E293B", marginBottom: 8 }}>
                    Thông tin định danh & Người sở hữu
                  </div>
                  <div style={{ fontSize: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                    <div>
                      <span style={{ color: "#64748B" }}>Đơn vị / Chủ sở hữu:</span>
                      <div style={{ fontWeight: 600, color: "#0F172A", marginTop: 2 }}>
                        {currentCrawledPage.ownerName}
                      </div>
                    </div>
                    <div>
                      <span style={{ color: "#64748B" }}>Tình trạng pháp lý:</span>
                      <div style={{ marginTop: 2 }}>
                        {currentCrawledPage.verified ? (
                          <span style={{ color: "#059669", fontWeight: 600 }}>✓ Đã xác minh cơ sở y tế hợp pháp</span>
                        ) : (
                          <span style={{ color: "#DC2626", fontWeight: 600 }}>⚠️ Chưa xác minh / Cơ sở nghi vấn</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ border: "1px solid #E2E8F0", borderRadius: 6, padding: 14 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#1E293B", marginBottom: 8 }}>
                    Thống kê quét dữ liệu quảng cáo
                  </div>
                  <div style={{ fontSize: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#64748B" }}>Tổng số bài quảng cáo đã quét:</span>
                      <strong>{currentCrawledPage.crawledAds} bài</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#64748B" }}>Số bài phát hiện vi phạm:</span>
                      <strong style={{ color: "#DC2626" }}>{currentCrawledPage.violationAds} bài</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#64748B" }}>Tỷ lệ vi phạm:</span>
                      <strong style={{ color: "#DC2626" }}>{currentCrawledPage.violationRate}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#64748B" }}>Lần quét gần nhất:</span>
                      <span>{currentCrawledPage.lastScan}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes & Violations */}
              <div
                style={{
                  background: "#FFFBEB",
                  border: "1px solid #FDE68A",
                  borderRadius: 6,
                  padding: 14,
                  marginBottom: 20,
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 700, color: "#92400E", marginBottom: 4 }}>
                  Ghi chú trích xuất & Đánh giá rủi ro:
                </div>
                <div style={{ fontSize: 12, color: "#78350F", lineHeight: 1.5 }}>
                  {currentCrawledPage.notes}
                </div>
              </div>

              {/* Footer */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, paddingTop: 12, borderTop: "1px solid #E2E8F0" }}>
                <button
                  onClick={() => setShowCrawledDetailModal(false)}
                  style={{
                    padding: "8px 20px",
                    fontSize: 13,
                    fontWeight: 600,
                    borderRadius: 4,
                    border: "none",
                    background: "#3577DB",
                    color: "#FFFFFF",
                    cursor: "pointer",
                  }}
                >
                  Đóng hồ sơ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PageInfoPage;
