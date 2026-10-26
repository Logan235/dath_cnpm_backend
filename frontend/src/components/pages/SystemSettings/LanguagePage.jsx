import React from "react";
import { COLORS } from "@/constants/colors";
import { Plus, SettingsIcon, ChevronDown } from 'lucide-react';
import PageTitleBar from "@/components/PageTitleBar";
import Panel from "@/components/Panel";

const languageRows = [
  { flag: "🇳🇱", name: "Dutch (Nederlands)", code: "nl" },
  { flag: "🇺🇸", name: "English", code: "en" },
  { flag: "🇬🇧", name: "English (UK)", code: "en-GB" },
  { flag: "🇲🇽", name: "Español (México)", code: "es-MX" },
  { flag: "🇪🇸", name: "Español (Spanish)", code: "es" },
  { flag: "🇫🇷", name: "Français", code: "fr" },
  { flag: "🇮🇹", name: "Italiano", code: "it" },
  { flag: "🇧🇷", name: "Português (Brasil)", code: "pt-BR" },
  { flag: "🇷🇺", name: "Русский", code: "ru" },
  { flag: "🇩🇪", name: "Tiếng Đức", code: "de" },
  { flag: "🇹🇷", name: "Türkçe", code: "tr" },
  { flag: "🇻🇳", name: "Vietnamese (Mặc định)", code: "vi" },
].map((r) => ({ ...r, active: true, created: "26/04/2024, 08:46:10" }));

function LanguagePage() {
  const thStyle = {
    background: COLORS.tableHeaderBg,
    color: COLORS.headerTextBlue,
    fontWeight: 700,
    fontSize: 13,
    textAlign: "left",
    verticalAlign: "middle",
    padding: "13px 14px",
    whiteSpace: "nowrap",
  };
  const tdStyle = {
    padding: "10px 14px",
    fontSize: 13,
    color: "#071437",
    borderBottom: "1px solid " + COLORS.rowBorder,
    verticalAlign: "middle",
    whiteSpace: "nowrap",
  };
  return (
    <div>
      <PageTitleBar
        title="NGÔN NGỮ"
        subtitle="Thông tin ngôn ngữ"
        right={
          <button
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              height: 40,
              padding: "0 18px",
              background: COLORS.headerTextBlue,
              color: "#fff",
              border: "none",
              borderRadius: 4,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <Plus size={14} /> Tạo ngôn ngữ mới
          </button>
        }
      />
      <Panel style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={thStyle}>Hành động</th>
                <th style={thStyle}>Họ và tên</th>
                <th style={thStyle}>Mã</th>
                <th style={thStyle}>Được kích hoạt</th>
                <th style={thStyle}>Ngày tạo</th>
              </tr>
            </thead>
            <tbody>
              {languageRows.map((r) => (
                <tr key={r.code}>
                  <td style={tdStyle}>
                    <button
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        height: 30,
                        padding: "0 12px",
                        background: COLORS.headerTextBlue,
                        color: "#fff",
                        border: "none",
                        borderRadius: 4,
                        fontSize: 12,
                        fontWeight: 500,
                        cursor: "pointer",
                      }}
                    >
                      <SettingsIcon size={12} /> Hành động <ChevronDown size={12} />
                    </button>
                  </td>
                  <td style={tdStyle}>
                    <span style={{ display: "inline-flex", alignItems: "center" }}>
                      <span
                        style={{
                          fontSize: 21,
                          lineHeight: 1,
                          marginRight: 10,
                          display: "inline-block",
                        }}
                      >
                        {r.flag}
                      </span>
                      {r.name}
                    </span>
                  </td>
                  <td style={tdStyle}>{r.code}</td>
                  <td style={tdStyle}>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: "rgb(80, 205, 137)",
                        color: "#ffffff",
                        borderRadius: "5.1px",
                        fontSize: "10.2px",
                        fontWeight: 600,
                        height: "18px",
                        lineHeight: "10.2px",
                        padding: "3.9px 6px",
                        boxSizing: "border-box",
                        textAlign: "center",
                        whiteSpace: "nowrap",
                        fontFamily: "Montserrat, sans-serif",
                      }}
                    >
                      Đồng ý
                    </span>
                  </td>
                  <td style={tdStyle}>{r.created}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

export default LanguagePage;