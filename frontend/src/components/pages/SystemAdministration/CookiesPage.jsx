import React, { useState } from "react";
import { COLORS } from "@/constants/colors";
import Panel from "@/components/Panel";
import Breadcrumb from "@/components/Breadcrumb";
import Pagination from "@/components/Pagination";
import {
  Plus,
  Search,
  Settings,
  ChevronDown,
  Cookie,
  Globe,
  Upload,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Edit3,
  Trash2,
  Eye,
  Power,
  Clock,
  Laptop,
  Check,
  X,
  FileCode,
  Key,
  Copy,
  ExternalLink,
  ShieldCheck,
  Filter,
} from "lucide-react";

// Dữ liệu danh sách Cookies crawler mạng xã hội trong hệ thống
const INITIAL_COOKIES = [
  {
    id: "CK_01",
    stt: 1,
    fileIdentifier: "fb_crawler_pool_01.json",
    platform: "Facebook",
    platformBadgeColor: "#1877F2",
    accountEmail: "crawler.syt.01@gmail.com",
    accountName: "Hệ thống Quét QC FB 01",
    isLive: "true",
    statusLabel: "Còn hiệu lực (Live)",
    lastUsed: "24/08/2026 14:15",
    lastUsedInfo: "Quét 145 bài viết nhóm Dược",
    createdDate: "01/08/2026",
    expireDate: "01/09/2026",
    cookieCount: 14,
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
    keyTokens: [
      { name: "c_user", value: "100089234812345" },
      { name: "xs", value: "32%3AgL7x9...%3A2%3A17234" },
      { name: "fr", value: "0wQe8j.AWX...12" },
      { name: "datr", value: "kJ4aZq...9xL" },
      { name: "sb", value: "mH8bZt...11" },
    ],
    sampleJson: JSON.stringify(
      [
        { domain: ".facebook.com", expirationDate: 1756024800, name: "c_user", value: "100089234812345" },
        { domain: ".facebook.com", expirationDate: 1756024800, name: "xs", value: "32%3AgL7x9P4q...%3A2%3A17234" },
        { domain: ".facebook.com", expirationDate: 1732005600, name: "fr", value: "0wQe8jX1m...AWX" },
        { domain: ".facebook.com", expirationDate: 1787560800, name: "datr", value: "kJ4aZqm18_9xL82" },
        { domain: ".facebook.com", expirationDate: 1787560800, name: "sb", value: "mH8bZtYq_11Xy" },
      ],
      null,
      2
    ),
  },
  {
    id: "CK_02",
    stt: 2,
    fileIdentifier: "fb_reels_scanner.json",
    platform: "Facebook",
    platformBadgeColor: "#1877F2",
    accountEmail: "scanner.reels.med@gmail.com",
    accountName: "Bot Quét Video Reels FB",
    isLive: "true",
    statusLabel: "Còn hiệu lực (Live)",
    lastUsed: "24/08/2026 13:40",
    lastUsedInfo: "Quét 88 video quảng cáo TPCN",
    createdDate: "05/08/2026",
    expireDate: "05/09/2026",
    cookieCount: 12,
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
    keyTokens: [
      { name: "c_user", value: "100094512398711" },
      { name: "xs", value: "48%3AkP9m2...%3A2%3A17245" },
      { name: "fr", value: "1aZx9k.BWY...99" },
    ],
    sampleJson: JSON.stringify(
      [
        { domain: ".facebook.com", name: "c_user", value: "100094512398711" },
        { domain: ".facebook.com", name: "xs", value: "48%3AkP9m2...%3A2%3A17245" },
      ],
      null,
      2
    ),
  },
  {
    id: "CK_03",
    stt: 3,
    fileIdentifier: "tiktok_ads_cookie.json",
    platform: "TikTok",
    platformBadgeColor: "#000000",
    accountEmail: "crawler.tiktok.syt@gmail.com",
    accountName: "Bot Quét TikTok Y Tế",
    isLive: "true",
    statusLabel: "Còn hiệu lực (Live)",
    lastUsed: "24/08/2026 14:00",
    lastUsedInfo: "Quét 210 video TikTok quảng cáo thuốc",
    createdDate: "10/08/2026",
    expireDate: "10/09/2026",
    cookieCount: 18,
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
    keyTokens: [
      { name: "sessionid", value: "8e9f2a7b1c4d5e6f8a9b0c1d2e3f4a5b" },
      { name: "tt_chain_token", value: "a1b2c3d4e5f6..." },
      { name: "sid_tt", value: "8e9f2a7b1c4d5e6f" },
    ],
    sampleJson: JSON.stringify(
      [
        { domain: ".tiktok.com", name: "sessionid", value: "8e9f2a7b1c4d5e6f8a9b0c1d2e3f4a5b" },
        { domain: ".tiktok.com", name: "tt_chain_token", value: "a1b2c3d4e5f6..." },
      ],
      null,
      2
    ),
  },
  {
    id: "CK_04",
    stt: 4,
    fileIdentifier: "fb_group_monitor.json",
    platform: "Facebook",
    platformBadgeColor: "#1877F2",
    accountEmail: "monitor.group.syt@gmail.com",
    accountName: "Hệ thống Quét Nhóm Hội Bác Sĩ",
    isLive: "false",
    statusLabel: "Hết hạn (Expired)",
    lastUsed: "22/08/2026 18:20",
    lastUsedInfo: "Hết hạn phiên đăng nhập",
    createdDate: "15/07/2026",
    expireDate: "15/08/2026",
    cookieCount: 11,
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    keyTokens: [
      { name: "c_user", value: "100078129034567" },
      { name: "xs", value: "12%3AmK8x1...%3A2%3A17199" },
    ],
    sampleJson: JSON.stringify(
      [
        { domain: ".facebook.com", name: "c_user", value: "100078129034567" },
        { domain: ".facebook.com", name: "xs", value: "EXPIRED_SESSION_TOKEN" },
      ],
      null,
      2
    ),
  },
  {
    id: "CK_05",
    stt: 5,
    fileIdentifier: "youtube_medical_ads.json",
    platform: "YouTube",
    platformBadgeColor: "#FF0000",
    accountEmail: "yt.crawler.med@gmail.com",
    accountName: "Bot Quét Video YouTube Ads",
    isLive: "true",
    statusLabel: "Còn hiệu lực (Live)",
    lastUsed: "24/08/2026 11:30",
    lastUsedInfo: "Quét 65 video quảng cáo Đông y",
    createdDate: "01/08/2026",
    expireDate: "01/10/2026",
    cookieCount: 9,
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
    keyTokens: [
      { name: "SAPISID", value: "9kL2mNxPq...11" },
      { name: "HSID", value: "A8bZt9...01" },
      { name: "SSID", value: "Bk8M2...99" },
    ],
    sampleJson: JSON.stringify(
      [
        { domain: ".youtube.com", name: "SAPISID", value: "9kL2mNxPq...11" },
        { domain: ".youtube.com", name: "HSID", value: "A8bZt9...01" },
      ],
      null,
      2
    ),
  },
  {
    id: "CK_06",
    stt: 6,
    fileIdentifier: "fb_page_ads_library.json",
    platform: "Facebook",
    platformBadgeColor: "#1877F2",
    accountEmail: "adslib.scanner@gmail.com",
    accountName: "Quét Thư viện Quảng cáo Meta",
    isLive: "checkpoint",
    statusLabel: "Cần xác minh (Checkpoint)",
    lastUsed: "23/08/2026 09:15",
    lastUsedInfo: "Facebook yêu cầu xác minh 2FA",
    createdDate: "20/07/2026",
    expireDate: "20/08/2026",
    cookieCount: 15,
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
    keyTokens: [
      { name: "c_user", value: "100065432198765" },
      { name: "checkpoint", value: "CHKP_REQUIRED_2FA" },
    ],
    sampleJson: JSON.stringify(
      [
        { domain: ".facebook.com", name: "c_user", value: "100065432198765" },
        { domain: ".facebook.com", name: "checkpoint", value: "true" },
      ],
      null,
      2
    ),
  },
];

function CookiesPage() {
  const [cookiesList, setCookiesList] = useState(INITIAL_COOKIES);
  const [selectedCookie, setSelectedCookie] = useState(INITIAL_COOKIES[0]);

  // Bộ lọc tìm kiếm
  const [searchKeyword, setSearchKeyword] = useState("");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // State các Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCheckLiveModal, setShowCheckLiveModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showToggleStatusModal, setShowToggleStatusModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // State khi test live session
  const [checkingLive, setCheckingLive] = useState(false);
  const [checkResult, setCheckResult] = useState(null);

  // Lọc danh sách cookies
  const filteredCookies = cookiesList.filter((c) => {
    const matchKeyword =
      c.fileIdentifier.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      c.accountEmail.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      c.accountName.toLowerCase().includes(searchKeyword.toLowerCase());

    const matchPlatform = platformFilter === "all" || c.platform === platformFilter;
    const matchStatus = statusFilter === "all" || c.isLive === statusFilter;

    return matchKeyword && matchPlatform && matchStatus;
  });

  const resetFilters = () => {
    setSearchKeyword("");
    setPlatformFilter("all");
    setStatusFilter("all");
  };

  const handleTestLive = (cookieItem) => {
    setSelectedCookie(cookieItem);
    setCheckingLive(true);
    setCheckResult(null);
    setShowCheckLiveModal(true);

    setTimeout(() => {
      setCheckingLive(false);
      if (cookieItem.isLive === "true") {
        setCheckResult({
          success: true,
          message: "Phiên cookies hoàn toàn hợp lệ! Trình duyệt được nhận diện là người dùng đã đăng nhập thành công vào " + cookieItem.platform + ".",
          responseTime: "185 ms",
          accountName: cookieItem.accountName,
        });
      } else if (cookieItem.isLive === "checkpoint") {
        setCheckResult({
          success: false,
          warning: true,
          message: "Tài khoản bị yêu cầu xác minh bảo mật (Checkpoint / 2FA). Vui lòng đăng nhập lại trên trình duyệt để lấy tệp cookies mới.",
          responseTime: "310 ms",
        });
      } else {
        setCheckResult({
          success: false,
          message: "Phiên cookies đã hết hạn (Expired). Không thể truy cập dữ liệu mạng xã hội!",
          responseTime: "420 ms",
        });
      }
    }, 900);
  };

  return (
    <div>
      {/* Top Toolbar Action */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <button
            onClick={() => setShowAddModal(true)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 16px",
              background: COLORS.headerTextBlue,
              color: "#fff",
              border: "none",
              borderRadius: 4,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <Plus size={15} /> Thêm Profile Cookies mới
          </button>
        </div>

        <div style={{ fontSize: 13, color: "#64748B" }}>
          Tổng số: <strong>{cookiesList.length} profile cookies</strong> (Đang Live: <strong>{cookiesList.filter((x) => x.isLive === "true").length}</strong>)
        </div>
      </div>

      {/* Breadcrumb Navigation */}
      <Breadcrumb current="Quản lý cookies" />

      {/* Main Panel */}
      <Panel style={{ padding: "20px 24px" }}>
        {/* Title and Module Description */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#071437", display: "flex", alignItems: "center", gap: 8 }}>
              <Cookie size={18} color={COLORS.headerTextBlue} />
              Quản lý tệp Cookies cho tiến trình cào dữ liệu Crawler tự động
            </div>
            <div style={{ fontSize: 12.5, color: "#64748B", marginTop: 4 }}>
              Lưu trữ và duy trì các phiên đăng nhập mạng xã hội (Facebook, TikTok, YouTube) phục vụ tiến trình thu thập bài viết quảng cáo tự động mà không cần đăng nhập lại.
            </div>
          </div>
        </div>

        {/* Search & Filter Criteria Box */}
        <div
          style={{
            background: "#F8FAFC",
            border: "1px solid #E2E8F0",
            borderRadius: 6,
            padding: "16px 18px",
            marginBottom: 20,
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 700, color: "#1E293B", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
            <Filter size={14} color={COLORS.headerTextBlue} />
            Tìm kiếm & Lọc tệp Cookies:
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1.2fr 1.2fr", gap: 14, marginBottom: 10 }}>
            {/* Tiêu chí 1: Từ khóa */}
            <div>
              <div style={filterLabelStyle}>Mã định danh / Tài khoản đăng nhập</div>
              <div style={{ position: "relative" }}>
                <Search size={14} color="#94A3B8" style={{ position: "absolute", left: 10, top: 11 }} />
                <input
                  style={{ ...inputStyle, paddingLeft: 30 }}
                  placeholder="Nhập tên tệp (fb_crawler.json), email tài khoản..."
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                />
              </div>
            </div>

            {/* Tiêu chí 2: Nền tảng mạng xã hội */}
            <div>
              <div style={filterLabelStyle}>Nền tảng mạng xã hội</div>
              <select style={inputStyle} value={platformFilter} onChange={(e) => setPlatformFilter(e.target.value)}>
                <option value="all">-- Tất cả nền tảng --</option>
                <option value="Facebook">Facebook</option>
                <option value="TikTok">TikTok</option>
                <option value="YouTube">YouTube</option>
              </select>
            </div>

            {/* Tiêu chí 3: Trạng thái IsLive */}
            <div>
              <div style={filterLabelStyle}>Trạng thái phiên (IsLive)</div>
              <select style={inputStyle} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="all">-- Tất cả trạng thái --</option>
                <option value="true">Còn hiệu lực (Live - Hoạt động)</option>
                <option value="false">Hết hạn (Expired)</option>
                <option value="checkpoint">Cần xác minh (Checkpoint)</option>
              </select>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
            <button
              onClick={resetFilters}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 14px",
                background: "#fff",
                color: "#64748B",
                border: "1px solid #CBD5E1",
                borderRadius: 4,
                fontSize: 12.5,
                cursor: "pointer",
              }}
            >
              <RotateCcw size={13} /> Đặt lại bộ lọc
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div style={{ overflowX: "auto", border: "1px solid #EEF0F4", borderRadius: 6 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1000 }}>
            <thead>
              <tr style={{ background: COLORS.tableHeaderBg }}>
                <th style={{ ...thStyle, width: 40, textAlign: "center" }}>
                  <input type="checkbox" style={{ cursor: "pointer" }} />
                </th>
                <th style={{ ...thStyle, width: 45, textAlign: "center" }}>STT</th>
                <th style={{ ...thStyle, width: 220 }}>Mã định danh tệp Cookies</th>
                <th style={{ ...thStyle, width: 110 }}>Nền tảng</th>
                <th style={{ ...thStyle, width: 200 }}>Tài khoản / Mô tả phiên</th>
                <th style={thStyle}>Lần sử dụng gần nhất (LastUsed)</th>
                <th style={{ ...thStyle, width: 120, textAlign: "center" }}>Trạng thái (IsLive)</th>
                <th style={{ ...thStyle, width: 210, textAlign: "center" }}>Thao tác Cookies</th>
              </tr>
            </thead>
            <tbody>
              {filteredCookies.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: "30px 0", color: "#94A3B8", fontSize: 13 }}>
                    Không tìm thấy tệp Cookies nào phù hợp.
                  </td>
                </tr>
              ) : (
                filteredCookies.map((c, idx) => (
                  <tr
                    key={c.id}
                    style={{
                      borderBottom: "1px solid #EEF0F4",
                      background: idx % 2 === 0 ? "#fff" : "#FAFCFF",
                      transition: "background 0.15s",
                    }}
                  >
                    <td style={{ ...tdStyle, textAlign: "center" }}>
                      <input type="checkbox" style={{ cursor: "pointer" }} />
                    </td>
                    <td style={{ ...tdStyle, textAlign: "center", color: "#64748B" }}>{c.stt}</td>
                    <td style={tdStyle}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <FileCode size={14} color="#2563EB" />
                        <code style={{ fontSize: 12.5, fontWeight: 700, color: "#1E293B" }}>{c.fileIdentifier}</code>
                      </div>
                    </td>
                    <td style={tdStyle}>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          background: (c.platformBadgeColor || "#3577DB") + "15",
                          color: c.platformBadgeColor || "#3577DB",
                          border: `1px solid ${c.platformBadgeColor}30`,
                          padding: "2px 8px",
                          borderRadius: 4,
                          display: "inline-block",
                        }}
                      >
                        {c.platform}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ fontWeight: 600, color: "#0F172A", fontSize: 12.5 }}>{c.accountName}</div>
                      <div style={{ fontSize: 11.5, color: "#64748B" }}>{c.accountEmail}</div>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <Clock size={13} color="#64748B" />
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 600, color: "#1E293B" }}>{c.lastUsed}</div>
                          <div style={{ fontSize: 11, color: "#64748B" }}>{c.lastUsedInfo}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ ...tdStyle, textAlign: "center" }}>
                      {c.isLive === "true" && (
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            padding: "3px 8px",
                            borderRadius: 10,
                            background: "#DCFCE7",
                            color: "#15803D",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <CheckCircle2 size={11} /> Live (Hợp lệ)
                        </span>
                      )}
                      {c.isLive === "false" && (
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            padding: "3px 8px",
                            borderRadius: 10,
                            background: "#FEE2E2",
                            color: "#B91C1C",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <XCircle size={11} /> Hết hạn
                        </span>
                      )}
                      {c.isLive === "checkpoint" && (
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            padding: "3px 8px",
                            borderRadius: 10,
                            background: "#FEF3C7",
                            color: "#B45309",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <AlertTriangle size={11} /> Checkpoint
                        </span>
                      )}
                    </td>
                    <td style={{ ...tdStyle, textAlign: "center" }}>
                      <div style={{ display: "inline-flex", gap: 4, flexWrap: "wrap", justifyContent: "center" }}>
                        {/* Nút Kiểm tra Live */}
                        <button
                          onClick={() => handleTestLive(c)}
                          title="Kiểm tra trạng thái phiên trực tiếp (Check Live)"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 3,
                            padding: "4px 8px",
                            fontSize: 11.5,
                            background: "#071437",
                            color: "#fff",
                            border: "none",
                            borderRadius: 4,
                            cursor: "pointer",
                            fontWeight: 600,
                          }}
                        >
                          <RefreshCw size={11} /> Check Live
                        </button>

                        {/* Nút Xem chi tiết */}
                        <button
                          onClick={() => {
                            setSelectedCookie(c);
                            setShowDetailModal(true);
                          }}
                          title="Xem chi tiết tệp cookies"
                          style={{
                            padding: "4px 6px",
                            fontSize: 11.5,
                            background: "#F1F5F9",
                            color: "#334155",
                            border: "1px solid #CBD5E1",
                            borderRadius: 4,
                            cursor: "pointer",
                          }}
                        >
                          <Eye size={12} />
                        </button>

                        {/* Nút Cập nhật / Gia hạn */}
                        <button
                          onClick={() => {
                            setSelectedCookie(c);
                            setShowEditModal(true);
                          }}
                          title="Cập nhật / Nạp chuỗi cookies mới"
                          style={{
                            padding: "4px 6px",
                            fontSize: 11.5,
                            background: "#FEF3C7",
                            color: "#B45309",
                            border: "1px solid #FDE68A",
                            borderRadius: 4,
                            cursor: "pointer",
                          }}
                        >
                          <Edit3 size={12} />
                        </button>

                        {/* Nút Tạm dừng / Kích hoạt */}
                        <button
                          onClick={() => {
                            setSelectedCookie(c);
                            setShowToggleStatusModal(true);
                          }}
                          title="Tạm dừng hoặc kích hoạt đưa vào crawler pool"
                          style={{
                            padding: "4px 6px",
                            fontSize: 11.5,
                            background: "#fff",
                            color: c.isLive === "true" ? "#DC2626" : "#059669",
                            border: "1px solid #CBD5E1",
                            borderRadius: 4,
                            cursor: "pointer",
                          }}
                        >
                          <Power size={12} />
                        </button>

                        {/* Nút Xóa */}
                        <button
                          onClick={() => {
                            setSelectedCookie(c);
                            setShowDeleteModal(true);
                          }}
                          title="Xóa tệp cookies"
                          style={{
                            padding: "4px 6px",
                            fontSize: 11.5,
                            background: "#FEF2F2",
                            color: "#DC2626",
                            border: "1px solid #FECACA",
                            borderRadius: 4,
                            cursor: "pointer",
                          }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div style={{ marginTop: 16 }}>
          <Pagination total={filteredCookies.length} />
        </div>
      </Panel>

      {/* ========================================================================= */}
      {/* CÁC MODAL THỰC TẾ PHỤC VỤ CHỤP ẢNH TỪNG TÍNH NĂNG THEO YÊU CẦU BÁO CÁO */}
      {/* ========================================================================= */}

      {/* 1. MODAL: THÊM MỚI / TẢI LÊN TỆP COOKIES (IMPORT COOKIES) */}
      {showAddModal && (
        <ModalBackdrop onClose={() => setShowAddModal(false)}>
          <div style={{ ...modalBoxStyle, maxWidth: 680 }}>
            <ModalHeader title="Thêm Mới Tệp Cookies Cho Crawler Mạng Xã Hội" onClose={() => setShowAddModal(false)} />
            <div style={modalBodyStyle}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <label style={modalLabelStyle}>Mã định danh tệp Cookies <span style={{ color: "red" }}>*</span></label>
                  <input style={modalInputStyle} placeholder="Ví dụ: fb_crawler_02.json" defaultValue="fb_crawler_02.json" />
                </div>
                <div>
                  <label style={modalLabelStyle}>Nền tảng mạng xã hội <span style={{ color: "red" }}>*</span></label>
                  <select style={modalInputStyle} defaultValue="Facebook">
                    <option value="Facebook">Facebook (Reels / Group / Page)</option>
                    <option value="TikTok">TikTok Video Ads</option>
                    <option value="YouTube">YouTube</option>
                    <option value="Instagram">Instagram</option>
                  </select>
                </div>
                <div>
                  <label style={modalLabelStyle}>Tài khoản đăng nhập mạng xã hội</label>
                  <input style={modalInputStyle} placeholder="Email / Số điện thoại đăng nhập" defaultValue="crawler.med.backup@gmail.com" />
                </div>
                <div>
                  <label style={modalLabelStyle}>Mô tả mục đích sử dụng</label>
                  <input style={modalInputStyle} placeholder="Ví dụ: Bot cào bài viết nhóm Đông y" defaultValue="Bot phụ quét bài viết nhóm Đông y gia truyền" />
                </div>

                {/* Chọn phương thức nạp cookies */}
                <div style={{ gridColumn: "1 / -1", background: "#F8FAFC", padding: "12px 14px", borderRadius: 6, border: "1px solid #E2E8F0" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#1E293B", marginBottom: 8 }}>
                    Phương thức nạp nội dung Cookies:
                  </div>
                  <div style={{ display: "flex", gap: 16, marginBottom: 12 }}>
                    <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}>
                      <input type="radio" name="cookie_method" defaultChecked /> Dán chuỗi JSON Cookies trực tiếp
                    </label>
                    <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}>
                      <input type="radio" name="cookie_method" /> Tải lên tệp tin (.json / .txt)
                    </label>
                  </div>

                  <div>
                    <label style={modalLabelStyle}>Nội dung JSON Cookies (Xuất từ trình duyệt) <span style={{ color: "red" }}>*</span></label>
                    <textarea
                      style={{ ...modalInputStyle, height: 100, fontFamily: "monospace", fontSize: 12, padding: "8px 10px", resize: "none" }}
                      defaultValue={`[\n  {\n    "domain": ".facebook.com",\n    "name": "c_user",\n    "value": "100089234812345"\n  },\n  {\n    "domain": ".facebook.com",\n    "name": "xs",\n    "value": "32%3AgL7x9P4q...%3A2%3A17234"\n  }\n]`}
                    />
                  </div>
                </div>
              </div>
            </div>
            <ModalFooter onCancel={() => setShowAddModal(false)} onConfirm={() => setShowAddModal(false)} confirmLabel="Lưu & Kích hoạt Cookies" />
          </div>
        </ModalBackdrop>
      )}

      {/* 2. MODAL: KIỂM TRA TRẠNG THÁI PHIÊN TRỰC TIẾP (CHECK LIVE) */}
      {showCheckLiveModal && selectedCookie && (
        <ModalBackdrop onClose={() => setShowCheckLiveModal(false)}>
          <div style={{ ...modalBoxStyle, maxWidth: 540 }}>
            <ModalHeader title={`Kiểm Tra Phiên Trực Tiếp: [${selectedCookie.fileIdentifier}]`} onClose={() => setShowCheckLiveModal(false)} />
            <div style={modalBodyStyle}>
              {/* Header target summary */}
              <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", padding: "12px 14px", borderRadius: 6, marginBottom: 16 }}>
                <div style={{ fontSize: 13, color: "#64748B" }}>Tệp Cookies & Nền tảng:</div>
                <div style={{ fontSize: 14.5, fontWeight: 700, color: "#0F172A", marginTop: 2, display: "flex", alignItems: "center", gap: 8 }}>
                  <code>{selectedCookie.fileIdentifier}</code>
                  <span style={{ fontSize: 11, background: "#EBF3FC", color: "#2563EB", padding: "2px 6px", borderRadius: 4 }}>
                    {selectedCookie.platform}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: "#334155", marginTop: 2 }}>Tài khoản: {selectedCookie.accountEmail}</div>
              </div>

              {/* Progress or Result */}
              {checkingLive ? (
                <div style={{ textAlign: "center", padding: "30px 0" }}>
                  <RefreshCw size={28} color={COLORS.headerTextBlue} style={{ animation: "spin 1s linear infinite" }} />
                  <div style={{ marginTop: 12, fontSize: 13.5, color: "#334155", fontWeight: 600 }}>
                    Đang gửi yêu cầu giả lập đến {selectedCookie.platform}...
                  </div>
                  <div style={{ fontSize: 12, color: "#64748B", marginTop: 4 }}>Kiểm tra tính hợp lệ của token phiên đăng nhập.</div>
                </div>
              ) : checkResult ? (
                <div>
                  {checkResult.success && (
                    <div style={{ background: "#DCFCE7", border: "1px solid #86EFAC", padding: "14px 16px", borderRadius: 6, color: "#15803D" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 700 }}>
                        <CheckCircle2 size={20} /> Kết nối thành công! Phiên Cookies hoàn toàn Live
                      </div>
                      <div style={{ fontSize: 12.5, marginTop: 6, lineHeight: 1.5 }}>{checkResult.message}</div>
                      <div style={{ marginTop: 8, fontSize: 12, borderTop: "1px solid #BBF7D0", paddingTop: 6 }}>
                        • Thời gian phản hồi: <strong>{checkResult.responseTime}</strong><br />
                        • Tên phiên nhận diện: <strong>{checkResult.accountName}</strong>
                      </div>
                    </div>
                  )}

                  {checkResult.warning && (
                    <div style={{ background: "#FEF3C7", border: "1px solid #FDE68A", padding: "14px 16px", borderRadius: 6, color: "#B45309" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 700 }}>
                        <AlertTriangle size={20} /> Cảnh báo: Tài khoản bị Checkpoint
                      </div>
                      <div style={{ fontSize: 12.5, marginTop: 6, lineHeight: 1.5 }}>{checkResult.message}</div>
                    </div>
                  )}

                  {!checkResult.success && !checkResult.warning && (
                    <div style={{ background: "#FEE2E2", border: "1px solid #FECACA", padding: "14px 16px", borderRadius: 6, color: "#B91C1C" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 700 }}>
                        <XCircle size={20} /> Phiên Cookies đã hết hạn
                      </div>
                      <div style={{ fontSize: 12.5, marginTop: 6, lineHeight: 1.5 }}>{checkResult.message}</div>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
            <ModalFooter onCancel={() => setShowCheckLiveModal(false)} onConfirm={() => setShowCheckLiveModal(false)} confirmLabel="Đóng kiểm tra" />
          </div>
        </ModalBackdrop>
      )}

      {/* 3. MODAL: XEM CHI TIẾT & NỘI DUNG TỆP COOKIES */}
      {showDetailModal && selectedCookie && (
        <ModalBackdrop onClose={() => setShowDetailModal(false)}>
          <div style={{ ...modalBoxStyle, maxWidth: 680 }}>
            <ModalHeader title={`Chi Tiết Tệp Cookies: [${selectedCookie.fileIdentifier}]`} onClose={() => setShowDetailModal(false)} />
            <div style={modalBodyStyle}>
              {/* Header badge */}
              <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", padding: "14px 16px", borderRadius: 6, marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#0F172A" }}>
                      <code>{selectedCookie.fileIdentifier}</code>
                    </div>
                    <div style={{ fontSize: 12.5, color: "#64748B", marginTop: 2 }}>
                      Nền tảng: <strong>{selectedCookie.platform}</strong> • Tài khoản: <strong>{selectedCookie.accountEmail}</strong>
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      padding: "3px 10px",
                      borderRadius: 12,
                      background: selectedCookie.isLive === "true" ? "#DCFCE7" : "#FEE2E2",
                      color: selectedCookie.isLive === "true" ? "#15803D" : "#B91C1C",
                    }}
                  >
                    {selectedCookie.isLive === "true" ? "✓ Live (Hợp lệ)" : "✕ Hết hạn"}
                  </span>
                </div>
              </div>

              {/* Grid fields */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 16px", background: "#fff", border: "1px solid #EEF0F4", padding: "14px 16px", borderRadius: 6, marginBottom: 14 }}>
                <div>
                  <div style={labelStyle}>Lần sử dụng gần nhất (LastUsed):</div>
                  <div style={{ ...valueStyle, fontWeight: 600, color: "#2563EB" }}>{selectedCookie.lastUsed}</div>
                </div>
                <div>
                  <div style={labelStyle}>Tổng số lượng khóa cookie:</div>
                  <div style={{ ...valueStyle, fontWeight: 600 }}>{selectedCookie.cookieCount} keys</div>
                </div>
                <div>
                  <div style={labelStyle}>Ngày nạp tệp:</div>
                  <div style={{ fontSize: 12, color: "#64748B" }}>{selectedCookie.createdDate}</div>
                </div>
                <div>
                  <div style={labelStyle}>Ngày hết hạn ước tính:</div>
                  <div style={{ fontSize: 12, color: "#64748B" }}>{selectedCookie.expireDate}</div>
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <div style={labelStyle}>User-Agent trình duyệt tương thích:</div>
                  <div style={{ fontSize: 11.5, background: "#F1F5F9", padding: "6px 10px", borderRadius: 4, fontFamily: "monospace", color: "#334155" }}>
                    {selectedCookie.userAgent}
                  </div>
                </div>
              </div>

              {/* Khung xem trước mã JSON */}
              <div style={{ background: "#1E293B", borderRadius: 6, padding: "12px 14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#94A3B8", display: "flex", alignItems: "center", gap: 6 }}>
                    <FileCode size={13} color="#38BDF8" /> Nội dung JSON Cookies đã lưu trữ:
                  </span>
                  <span style={{ fontSize: 11, color: "#64748B" }}>JSON Format (Read-only)</span>
                </div>
                <pre style={{ margin: 0, color: "#38BDF8", fontSize: 11.5, fontFamily: "monospace", maxHeight: 150, overflowY: "auto", background: "#0F172A", padding: "10px 12px", borderRadius: 4 }}>
                  {selectedCookie.sampleJson}
                </pre>
              </div>
            </div>
            <ModalFooter
              onCancel={() => setShowDetailModal(false)}
              onConfirm={() => {
                setShowDetailModal(false);
                handleTestLive(selectedCookie);
              }}
              confirmLabel="Kiểm tra Live ngay"
            />
          </div>
        </ModalBackdrop>
      )}

      {/* 4. MODAL: GIA HẠN / CẬP NHẬT COOKIES */}
      {showEditModal && selectedCookie && (
        <ModalBackdrop onClose={() => setShowEditModal(false)}>
          <div style={{ ...modalBoxStyle, maxWidth: 660 }}>
            <ModalHeader title={`Gia Hạn / Cập Nhật Cookies: [${selectedCookie.fileIdentifier}]`} onClose={() => setShowEditModal(false)} />
            <div style={modalBodyStyle}>
              <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", padding: "12px 14px", borderRadius: 6, marginBottom: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#0F172A" }}>{selectedCookie.fileIdentifier}</div>
                <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>
                  Nền tảng: <strong>{selectedCookie.platform}</strong> • Tài khoản: <strong>{selectedCookie.accountEmail}</strong>
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={modalLabelStyle}>
                  Dán chuỗi JSON Cookies mới <span style={{ color: "red" }}>*</span>
                </label>
                <textarea
                  style={{ ...modalInputStyle, height: 120, fontFamily: "monospace", fontSize: 12, padding: "8px 10px", resize: "none" }}
                  defaultValue={selectedCookie.sampleJson}
                />
                <div style={{ fontSize: 11.5, color: "#64748B", marginTop: 4 }}>
                  Đăng nhập lại vào {selectedCookie.platform} trên trình duyệt, trích xuất tệp cookies mới và dán vào đây để tiếp tục quét tự động.
                </div>
              </div>

              <div style={{ background: "#FEF3C7", border: "1px solid #FDE68A", padding: "10px 12px", borderRadius: 6, fontSize: 12.5, color: "#92400E" }}>
                ⚠️ <strong>Lưu ý:</strong> Cập nhật cookies mới sẽ reset trạng thái phiên sang <strong>Live</strong> và đưa profile vào pool cào dữ liệu ngay lập tức.
              </div>
            </div>
            <ModalFooter onCancel={() => setShowEditModal(false)} onConfirm={() => setShowEditModal(false)} confirmLabel="Lưu & Cập nhật phiên" />
          </div>
        </ModalBackdrop>
      )}

      {/* 5. MODAL: TẠM DỪNG / KÍCH HOẠT PROFILE COOKIES */}
      {showToggleStatusModal && selectedCookie && (
        <ModalBackdrop onClose={() => setShowToggleStatusModal(false)}>
          <div style={{ ...modalBoxStyle, maxWidth: 500 }}>
            <ModalHeader
              title={selectedCookie.isLive === "true" ? "Xác Nhận Tạm Dừng Sử Dụng Cookies" : "Xác Nhận Kích Hoạt Sử Dụng Cookies"}
              onClose={() => setShowToggleStatusModal(false)}
            />
            <div style={modalBodyStyle}>
              <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                <div style={{ background: selectedCookie.isLive === "true" ? "#FEE2E2" : "#DCFCE7", padding: 10, borderRadius: "50%", flexShrink: 0 }}>
                  <Power size={24} color={selectedCookie.isLive === "true" ? "#DC2626" : "#16A34A"} />
                </div>
                <div style={{ fontSize: 13.5, color: "#334155", lineHeight: 1.6 }}>
                  Bạn có chắc chắn muốn {selectedCookie.isLive === "true" ? "tạm dừng đưa profile cookies này vào pool crawler" : "kích hoạt sử dụng lại tệp cookies"}:
                  <div style={{ fontWeight: 700, color: "#0F172A", marginTop: 4, fontSize: 14 }}>
                    <code>{selectedCookie.fileIdentifier}</code> ({selectedCookie.platform})
                  </div>
                </div>
              </div>
            </div>
            <ModalFooter
              onCancel={() => setShowToggleStatusModal(false)}
              onConfirm={() => {
                setCookiesList((prev) =>
                  prev.map((item) =>
                    item.id === selectedCookie.id
                      ? { ...item, isLive: item.isLive === "true" ? "false" : "true" }
                      : item
                  )
                );
                setShowToggleStatusModal(false);
              }}
              confirmLabel={selectedCookie.isLive === "true" ? "Xác nhận tạm dừng" : "Xác nhận kích hoạt"}
              confirmColor={selectedCookie.isLive === "true" ? "#DC2626" : "#059669"}
            />
          </div>
        </ModalBackdrop>
      )}

      {/* 6. MODAL: XÓA PROFILE COOKIES */}
      {showDeleteModal && selectedCookie && (
        <ModalBackdrop onClose={() => setShowDeleteModal(false)}>
          <div style={{ ...modalBoxStyle, maxWidth: 500 }}>
            <ModalHeader title="Xác Nhận Xóa Tệp Cookies Khỏi Hệ Thống" onClose={() => setShowDeleteModal(false)} />
            <div style={modalBodyStyle}>
              <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                <div style={{ background: "#FEE2E2", padding: 10, borderRadius: "50%", flexShrink: 0 }}>
                  <Trash2 size={24} color="#DC2626" />
                </div>
                <div style={{ fontSize: 13.5, color: "#334155", lineHeight: 1.6 }}>
                  Hành động này sẽ xóa vĩnh viễn tệp cookies đăng nhập:
                  <div style={{ fontWeight: 700, color: "#DC2626", marginTop: 4, fontSize: 14 }}>
                    <code>{selectedCookie.fileIdentifier}</code> ({selectedCookie.accountEmail})
                  </div>
                  <div style={{ marginTop: 8, fontSize: 12.5, color: "#64748B" }}>
                    Tiến trình cào dữ liệu sẽ không còn sử dụng profile này để quét mạng xã hội {selectedCookie.platform}.
                  </div>
                </div>
              </div>
            </div>
            <ModalFooter
              onCancel={() => setShowDeleteModal(false)}
              onConfirm={() => {
                setCookiesList((prev) => prev.filter((item) => item.id !== selectedCookie.id));
                setShowDeleteModal(false);
              }}
              confirmLabel="Đồng ý xóa tệp"
              confirmColor="#DC2626"
            />
          </div>
        </ModalBackdrop>
      )}
    </div>
  );
}

// Helper Components & Styles
function ModalBackdrop({ children, onClose }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(15, 23, 42, 0.55)",
        backdropFilter: "blur(2px)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div onClick={(e) => e.stopPropagation()}>{children}</div>
    </div>
  );
}

function ModalHeader({ title, onClose }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "16px 20px",
        borderBottom: "1px solid #EEF0F4",
      }}
    >
      <div style={{ fontSize: 16, fontWeight: 700, color: "#071437" }}>{title}</div>
      <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748B" }}>
        <X size={18} />
      </button>
    </div>
  );
}

function ModalFooter({ onCancel, onConfirm, confirmLabel = "Xác nhận", confirmColor = COLORS.headerTextBlue }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "flex-end",
        gap: 10,
        padding: "14px 20px",
        borderTop: "1px solid #EEF0F4",
        background: "#F8FAFC",
        borderBottomLeftRadius: 8,
        borderBottomRightRadius: 8,
      }}
    >
      <button
        onClick={onCancel}
        style={{
          padding: "8px 16px",
          background: "#fff",
          color: "#475569",
          border: "1px solid #D5D8DD",
          borderRadius: 4,
          fontSize: 13,
          fontWeight: 500,
          cursor: "pointer",
        }}
      >
        Hủy bỏ
      </button>
      <button
        onClick={onConfirm}
        style={{
          padding: "8px 18px",
          background: confirmColor,
          color: "#fff",
          border: "none",
          borderRadius: 4,
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        {confirmLabel}
      </button>
    </div>
  );
}

// Styling tokens
const filterLabelStyle = {
  fontSize: 12,
  color: "#475569",
  marginBottom: 5,
  fontWeight: 600,
};

const labelStyle = {
  fontSize: 12,
  color: "#64748B",
  marginBottom: 3,
  fontWeight: 500,
};

const valueStyle = {
  fontSize: 13,
  color: "#1E293B",
};

const thStyle = {
  background: COLORS.tableHeaderBg,
  color: COLORS.headerTextBlue,
  fontWeight: 700,
  fontSize: 12.5,
  textAlign: "left",
  padding: "11px 12px",
  whiteSpace: "nowrap",
};

const tdStyle = {
  padding: "11px 12px",
  fontSize: 12.5,
  color: "#334155",
  verticalAlign: "middle",
};

const inputStyle = {
  height: 36,
  width: "100%",
  border: "1px solid #d5d8dd",
  borderRadius: 4,
  padding: "0 10px",
  fontSize: 12.5,
  outline: "none",
  boxSizing: "border-box",
  color: "#333",
  background: "#fff",
};

const modalBoxStyle = {
  background: "#fff",
  borderRadius: 8,
  boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
  width: "calc(100vw - 40px)",
  boxSizing: "border-box",
  maxWidth: 620,
  maxHeight: "90vh",
  display: "flex",
  flexDirection: "column",
};

const modalBodyStyle = {
  padding: "18px 20px",
  overflowY: "auto",
};

const modalLabelStyle = {
  display: "block",
  fontSize: 12.5,
  fontWeight: 600,
  color: "#334155",
  marginBottom: 5,
};

const modalInputStyle = {
  width: "100%",
  height: 36,
  padding: "0 10px",
  border: "1px solid #D5D8DD",
  borderRadius: 4,
  fontSize: 13,
  outline: "none",
  boxSizing: "border-box",
  color: "#1E293B",
};

export default CookiesPage;