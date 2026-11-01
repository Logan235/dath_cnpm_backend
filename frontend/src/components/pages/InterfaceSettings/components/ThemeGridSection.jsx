import React from "react";
import Panel from "@/components/Panel";
import { THEMES_LIST } from "./ThemePreviews";

function ThemeGridSection({ selectedTheme, onSelectTheme }) {
  return (
    <Panel style={{ padding: "20px 24px", marginBottom: 20 }}>
      <div
        style={{
          fontSize: 13.5,
          fontWeight: 700,
          color: "#071437",
          marginBottom: 18,
          letterSpacing: "0.2px",
        }}
      >
        CÀI ĐẶT GIAO DIỆN
      </div>

      {/* 5-column Grid of Themes */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: 16,
          marginBottom: 10,
        }}
      >
        {THEMES_LIST.map((theme) => {
          const isSelected = selectedTheme === theme.id;
          const PreviewComp = theme.Component;
          return (
            <div
              key={theme.id}
              onClick={() => onSelectTheme(theme.id)}
              style={{
                border: isSelected ? "1.5px solid #3577DB" : "1px solid #E2E8F0",
                background: isSelected ? "#F4F8FF" : "#FFFFFF",
                borderRadius: 8,
                padding: 10,
                cursor: "pointer",
                transition: "all 0.2s ease",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                boxShadow: isSelected ? "0 2px 8px rgba(53,119,219,0.15)" : "0 1px 3px rgba(0,0,0,0.02)",
              }}
            >
              <div
                style={{
                  width: "100%",
                  height: 105,
                  borderRadius: 5,
                  overflow: "hidden",
                  border: "1px solid #E5E7EB",
                  background: "#F8FAFC",
                  marginBottom: 10,
                }}
              >
                <PreviewComp />
              </div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: isSelected ? 600 : 500,
                  color: "#3577DB",
                  textAlign: "center",
                }}
              >
                {theme.name}
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

export default ThemeGridSection;
