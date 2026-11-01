import React, { useState } from "react";
import { COLORS } from "@/constants/colors";
import Panel from "@/components/Panel";
import { Save, ChevronDown } from "lucide-react";

function LayoutTabsSection() {
  const [activeTab, setActiveTab] = useState("layout"); // "layout" | "menu" | "toolbar"
  const [darkMode, setDarkMode] = useState(false);

  const [menuSettings, setMenuSettings] = useState({
    theme: "Sáng",
    fixedMenu: true,
    allowCollapse: true,
    defaultCollapsed: false,
    hoverableAside: true,
    showSearch: false,
  });

  const [toolbarSettings, setToolbarSettings] = useState({
    desktopFixedHeader: false,
    mobileFixedHeader: false,
  });

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
    <Panel style={{ padding: "18px 24px", marginBottom: 20 }}>
      {/* Navigation Sub-tabs */}
      <div style={{ display: "flex", gap: 24, borderBottom: "1px solid #E2E8F0", marginBottom: 18 }}>
        {[
          { key: "layout", label: "Bố trí" },
          { key: "menu", label: "Menu" },
          { key: "toolbar", label: "UiCustomization_Toolbar" },
        ].map((t) => {
          const isActive = activeTab === t.key;
          return (
            <div
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              style={{
                paddingBottom: 10,
                fontSize: 13,
                fontWeight: isActive ? 600 : 500,
                color: isActive ? "#3577DB" : "#333",
                borderBottom: isActive ? "2px solid #3577DB" : "2px solid transparent",
                cursor: "pointer",
                marginBottom: -1,
              }}
            >
              {t.label}
            </div>
          );
        })}
      </div>

      {/* TAB 1: Bố trí */}
      {activeTab === "layout" && (
        <div>
          <div style={{ margin: "14px 0" }}>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: "#333" }}>
              <input
                type="checkbox"
                checked={darkMode}
                onChange={(e) => setDarkMode(e.target.checked)}
                style={{ width: 16, height: 16, accentColor: COLORS.headerTextBlue, cursor: "pointer" }}
              />
              <span>UiCustomization_DarkMode</span>
            </label>
          </div>

          <button style={saveBtnStyle}>
            <Save size={15} /> Lưu làm mặc định hệ thống
          </button>
        </div>
      )}

      {/* TAB 2: Menu */}
      {activeTab === "menu" && (
        <div>
          <div style={{ marginBottom: 16, maxWidth: 300 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#071437", marginBottom: 8 }}>
              Giao diện Menu
            </div>
            <div style={{ position: "relative" }}>
              <select
                style={{
                  width: "100%",
                  height: 38,
                  border: "1px solid #d5d8dd",
                  borderRadius: 4,
                  padding: "0 12px",
                  fontSize: 13,
                  outline: "none",
                  background: "#fff",
                  appearance: "none",
                  WebkitAppearance: "none",
                  cursor: "pointer",
                }}
                value={menuSettings.theme}
                onChange={(e) => setMenuSettings({ ...menuSettings, theme: e.target.value })}
              >
                <option value="Sáng">Sáng</option>
                <option value="Tối">Tối</option>
              </select>
              <ChevronDown
                size={16}
                color={COLORS.headerTextBlue}
                style={{ position: "absolute", right: 12, top: 11, pointerEvents: "none" }}
              />
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10, margin: "16px 0" }}>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: "#333" }}>
              <input
                type="checkbox"
                checked={menuSettings.fixedMenu}
                onChange={(e) => setMenuSettings({ ...menuSettings, fixedMenu: e.target.checked })}
                style={{ width: 16, height: 16, accentColor: COLORS.headerTextBlue, cursor: "pointer" }}
              />
              <span>Menu cố định</span>
            </label>

            <label style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: "#333" }}>
              <input
                type="checkbox"
                checked={menuSettings.allowCollapse}
                onChange={(e) => setMenuSettings({ ...menuSettings, allowCollapse: e.target.checked })}
                style={{ width: 16, height: 16, accentColor: COLORS.headerTextBlue, cursor: "pointer" }}
              />
              <span>Cho phép thu nhỏ sang một bên</span>
            </label>

            <label style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: "#333" }}>
              <input
                type="checkbox"
                checked={menuSettings.defaultCollapsed}
                onChange={(e) => setMenuSettings({ ...menuSettings, defaultCollapsed: e.target.checked })}
                style={{ width: 16, height: 16, accentColor: COLORS.headerTextBlue, cursor: "pointer" }}
              />
              <span>Mặc định thu nhỏ sang một bên</span>
            </label>

            <label style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: "#333" }}>
              <input
                type="checkbox"
                checked={menuSettings.hoverableAside}
                onChange={(e) => setMenuSettings({ ...menuSettings, hoverableAside: e.target.checked })}
                style={{ width: 16, height: 16, accentColor: COLORS.headerTextBlue, cursor: "pointer" }}
              />
              <span>UiCustomization_HoverableAside</span>
            </label>

            <label style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: "#333" }}>
              <input
                type="checkbox"
                checked={menuSettings.showSearch}
                onChange={(e) => setMenuSettings({ ...menuSettings, showSearch: e.target.checked })}
                style={{ width: 16, height: 16, accentColor: COLORS.headerTextBlue, cursor: "pointer" }}
              />
              <span>ShowMenuSearchInput</span>
            </label>
          </div>

          <button style={saveBtnStyle}>
            <Save size={15} /> Lưu làm mặc định hệ thống
          </button>
        </div>
      )}

      {/* TAB 3: UiCustomization_Toolbar */}
      {activeTab === "toolbar" && (
        <div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, margin: "14px 0" }}>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: "#333" }}>
              <input
                type="checkbox"
                checked={toolbarSettings.desktopFixedHeader}
                onChange={(e) => setToolbarSettings({ ...toolbarSettings, desktopFixedHeader: e.target.checked })}
                style={{ width: 16, height: 16, accentColor: COLORS.headerTextBlue, cursor: "pointer" }}
              />
              <span>UiCustomization_Toolbar_DesktopFixedHeader</span>
            </label>

            <label style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: "#333" }}>
              <input
                type="checkbox"
                checked={toolbarSettings.mobileFixedHeader}
                onChange={(e) => setToolbarSettings({ ...toolbarSettings, mobileFixedHeader: e.target.checked })}
                style={{ width: 16, height: 16, accentColor: COLORS.headerTextBlue, cursor: "pointer" }}
              />
              <span>UiCustomization_Toolbar_MobileFixedHeader</span>
            </label>
          </div>

          <button style={saveBtnStyle}>
            <Save size={15} /> Lưu làm mặc định hệ thống
          </button>
        </div>
      )}
    </Panel>
  );
}

export default LayoutTabsSection;
