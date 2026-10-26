import React from "react";
import { COLORS } from "@/constants/colors";

function Footer() {
  return (
    <div
      style={{
        height: 57,
        display: "flex",
        alignItems: "center",
        fontSize: 12,
        color: COLORS.footerDark,
        fontWeight: 600,
        padding: "0 4px",
      }}
    >
      AI phát hiện dấu hiệu vi phạm trong y tế | API: v13.1.0 | Client: v13.1.0 [07062026]
    </div>
  );
}

export default Footer;