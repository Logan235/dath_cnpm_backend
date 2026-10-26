import React from "react";
import { COLORS } from "@/constants/colors";

function PageTitleBar({ title, subtitle, right }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        margin: "20px 0 18px",
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
        <span style={{ fontWeight: 700, fontSize: 16, color: "#071437" }}>{title}</span>
        {subtitle && <span style={{ fontWeight: 400, fontSize: 14, color: "#9aa0ac" }}>{subtitle}</span>}
      </div>
      {right}
    </div>
  );
}

export default PageTitleBar;