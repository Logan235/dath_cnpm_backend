import React from "react";
import { COLORS } from "@/constants/colors";
import { ChevronLeft, ChevronsRight, ChevronRightIcon, ChevronDown, ChevronsLeft } from 'lucide-react';

function Pagination({ total = 0, showPageNumber = true }) {
  const circleBtn = {
    width: 30,
    height: 30,
    border: "1px solid " + COLORS.pillBorder,
    background: COLORS.pillGray,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: COLORS.pillText,
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 500,
  };
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: 16,
        fontSize: 12,
        color: "#525252",
      }}
    >
      <div>Tổng số dòng {total}</div>
      <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
        <div style={circleBtn}>
          <ChevronsLeft size={14} />
        </div>
        <div style={circleBtn}>
          <ChevronLeft size={14} />
        </div>
        {total > 0 && showPageNumber && (
          <div style={{ ...circleBtn, background: COLORS.headerTextBlue, borderColor: COLORS.headerTextBlue, color: "#fff", fontWeight: 600 }}>1</div>
        )}
        <div style={circleBtn}>
          <ChevronRightIcon size={14} />
        </div>
        <div style={circleBtn}>
          <ChevronsRight size={14} />
        </div>
        <div
          style={{
            height: 30,
            minWidth: 57,
            border: "1px solid " + COLORS.pillBorder,
            background: COLORS.pillGray,
            borderRadius: 6,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 4,
            marginLeft: 4,
            fontSize: 12,
            fontWeight: 400,
            color: COLORS.pillText,
            padding: "0 8px",
          }}
        >
          10 <ChevronDown size={12} />
        </div>
      </div>
    </div>
  );
}

export default Pagination;