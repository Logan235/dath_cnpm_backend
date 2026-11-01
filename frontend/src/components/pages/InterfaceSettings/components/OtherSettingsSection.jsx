import React, { useState } from "react";
import { COLORS } from "@/constants/colors";
import Panel from "@/components/Panel";
import { Save } from "lucide-react";
import ColorSettingsAccordion from "./ColorSettingsAccordion";
import LogoSettingsSection from "./LogoSettingsSection";

function OtherSettingsSection() {
  const [subTab, setSubTab] = useState("color"); // "color" | "logo"

  const saveBtnStyle = {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    height: 38,
    padding: "0 18px",
    background: COLORS.headerTextBlue,
    color: "#fff",
    border: "none",
    borderRadius: 4,
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    boxShadow: "0 1px 3px rgba(53,119,219,0.2)",
    marginTop: 18,
  };

  return (
    <Panel style={{ padding: "20px 24px", marginBottom: 20 }}>
      <div style={{ marginBottom: 16 }}>
        <span style={{ fontSize: 13.5, fontWeight: 700, color: "#071437" }}>
          CÁC THIẾT LẬP KHÁC
        </span>{" "}
        <span style={{ fontWeight: 400, color: "#7E8299", fontSize: 13 }}>
          (Thay đổi giao diện người dùng)
        </span>
      </div>

      {/* Sub-tabs */}
      <div style={{ display: "flex", gap: 14, borderBottom: "1px solid #E2E8F0", marginBottom: 18, paddingBottom: 8 }}>
        <button
          onClick={() => setSubTab("color")}
          style={{
            padding: "6px 14px",
            borderRadius: 4,
            border: "none",
            background: subTab === "color" ? "#EBF3FC" : "transparent",
            color: "#3577DB",
            fontWeight: subTab === "color" ? 600 : 500,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          Cài đặt màu sắc
        </button>
        <button
          onClick={() => setSubTab("logo")}
          style={{
            padding: "6px 14px",
            borderRadius: 4,
            border: "none",
            background: subTab === "logo" ? "#EBF3FC" : "transparent",
            color: "#3577DB",
            fontWeight: subTab === "logo" ? 600 : 500,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          Cài đặt logo
        </button>
      </div>

      {/* Sub-tab 1: Color accordions */}
      {subTab === "color" && <ColorSettingsAccordion />}

      {/* Sub-tab 2: Logo settings */}
      {subTab === "logo" && <LogoSettingsSection />}

      <button style={saveBtnStyle}>
        <Save size={15} /> Lưu làm mặc định hệ thống
      </button>
    </Panel>
  );
}

export default OtherSettingsSection;
