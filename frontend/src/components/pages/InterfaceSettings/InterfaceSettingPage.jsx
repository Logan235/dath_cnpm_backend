import React, { useState } from "react";
import { ICON_THEME } from "@/assets/icons";
import ThemeGridSection from "./components/ThemeGridSection";
import LayoutTabsSection from "./components/LayoutTabsSection";
import DefaultColorSection from "./components/DefaultColorSection";
import OtherSettingsSection from "./components/OtherSettingsSection";

function InterfaceSettingPage() {
  const [selectedTheme, setSelectedTheme] = useState("default");

  return (
    <div>
      {/* Top Page Title */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "16px 0 16px" }}>
        <img src={ICON_THEME} alt="" style={{ width: 18, height: 18, objectFit: "contain" }} />
        <span style={{ fontSize: 15, fontWeight: 700, color: "#071437" }}>Cài đặt giao diện</span>
      </div>

      {/* Panel 1: Theme Grid Selection */}
      <ThemeGridSection
        selectedTheme={selectedTheme}
        onSelectTheme={setSelectedTheme}
      />

      {/* Panel 2: Layout / Menu / Toolbar Settings */}
      <LayoutTabsSection />

      {/* Panel 3: Quick Color Presets */}
      <DefaultColorSection />

      {/* Panel 4: Color Accordions & Logo Upload Settings */}
      <OtherSettingsSection />
    </div>
  );
}

export default InterfaceSettingPage;
