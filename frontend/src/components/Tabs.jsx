import React from "react";
import { COLORS } from "@/constants/colors";

function Tabs({ tabs, active, onChange }) {
  return (
    <div
      className="tabs-row"
      style={{ display: "flex", flexWrap: "wrap", columnGap: 32, rowGap: 10, borderBottom: "1px solid #e3e5e9", marginBottom: 24 }}
    >
      {tabs.map((t) => (
        <div
          key={t.key}
          onClick={() => onChange(t.key)}
          style={{
            padding: "0 2px 12px 2px",
            fontSize: 14,
            fontWeight: 500,
            color: active === t.key ? COLORS.headerTextBlue : "#333",
            borderBottom: active === t.key ? "2px solid " + COLORS.headerTextBlue : "2px solid transparent",
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          {t.label}
        </div>
      ))}
    </div>
  );
}

export default Tabs;