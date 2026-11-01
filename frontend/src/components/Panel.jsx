import React from "react";
import { COLORS } from "@/constants/colors";

function Panel({ children, style }) {
  return (
    <div
      style={{
        background: "rgba(255, 255, 255, 0.5)",
        border: "1px solid #e3e5e9",
        borderRadius: 8,
        padding: 22,
        boxShadow: "0 1px 1px rgba(0,0,0,0.02)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export default Panel;