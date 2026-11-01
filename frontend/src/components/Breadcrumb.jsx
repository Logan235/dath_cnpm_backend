import React from "react";
import { COLORS } from "@/constants/colors";
import { ICON_HOME } from "@/assets/icons";

function Breadcrumb({ current }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        fontSize: 14,
        color: COLORS.breadcrumbDark,
        margin: "20px 0 18px",
      }}
    >
      <img src={ICON_HOME} alt="" style={{ width: 16, height: 16, objectFit: "contain" }} />
      <span style={{ color: COLORS.breadcrumbDark }}>Trang chủ</span>
      <span style={{ color: "#aaa" }}>|</span>
      <span style={{ color: "#1a1a1a", fontWeight: 500 }}>{current}</span>
    </div>
  );
}

export default Breadcrumb;