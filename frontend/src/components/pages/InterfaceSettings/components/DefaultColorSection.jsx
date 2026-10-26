import React, { useState } from "react";
import { COLORS } from "@/constants/colors";
import Panel from "@/components/Panel";
import { Save } from "lucide-react";

function DefaultColorSection() {
  const [selectedPreset, setSelectedPreset] = useState("mau1"); // "mau1" | "mau2"

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
          THIẾT LẬP MÀU MẶC ĐỊNH
        </span>{" "}
        <span style={{ fontWeight: 400, color: "#7E8299", fontSize: 13 }}>
          (Chọn nhanh màu mặc định)
        </span>
      </div>

      {/* Color Preset Cards */}
      <div style={{ display: "flex", gap: 18, marginBottom: 10 }}>
        {/* Mau 1 */}
        <div
          onClick={() => setSelectedPreset("mau1")}
          style={{
            border: selectedPreset === "mau1" ? "1.5px solid #3577DB" : "1px solid #E2E8F0",
            background: selectedPreset === "mau1" ? "#F4F8FF" : "#FFFFFF",
            borderRadius: 6,
            padding: 10,
            cursor: "pointer",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
            width: 140,
            boxShadow: selectedPreset === "mau1" ? "0 2px 6px rgba(53,119,219,0.12)" : "none",
          }}
        >
          <div
            style={{
              width: 120,
              height: 70,
              background: "#FFFFFF",
              border: "1px solid #D5DFF2",
              borderRadius: 4,
            }}
          />
          <div style={{ fontSize: 12.5, fontWeight: selectedPreset === "mau1" ? 600 : 500, color: "#3577DB" }}>
            Màu 1
          </div>
        </div>

        {/* Mau 2 */}
        <div
          onClick={() => setSelectedPreset("mau2")}
          style={{
            border: selectedPreset === "mau2" ? "1.5px solid #3577DB" : "1px solid #E2E8F0",
            background: selectedPreset === "mau2" ? "#F4F8FF" : "#FFFFFF",
            borderRadius: 6,
            padding: 10,
            cursor: "pointer",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
            width: 140,
            boxShadow: selectedPreset === "mau2" ? "0 2px 6px rgba(53,119,219,0.12)" : "none",
          }}
        >
          <div
            style={{
              width: 120,
              height: 70,
              background: "#005AA9",
              borderRadius: 4,
            }}
          />
          <div style={{ fontSize: 12.5, fontWeight: selectedPreset === "mau2" ? 600 : 500, color: selectedPreset === "mau2" ? "#3577DB" : "#333" }}>
            Màu 2
          </div>
        </div>
      </div>

      <button style={saveBtnStyle}>
        <Save size={15} /> Lưu làm mặc định hệ thống
      </button>
    </Panel>
  );
}

export default DefaultColorSection;
