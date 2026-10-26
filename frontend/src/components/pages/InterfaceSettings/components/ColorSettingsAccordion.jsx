import React, { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

function ColorSettingsAccordion() {
  const [expandedSections, setExpandedSections] = useState({
    generalColor: false,
    sidebarColor: false,
    headerColor: false,
    tableColor: false,
    inputColor: false,
    toolbarColor: false,
  });

  const toggleSection = (key) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const accordionPillStyle = () => ({
    background: "#E8F0FE",
    borderRadius: 5.5,
    padding: "10px 14px",
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 13,
    fontWeight: 500,
    color: "#071437",
    cursor: "pointer",
    userSelect: "none",
    transition: "background 0.2s",
  });

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
      {/* Column 1 */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <div
            style={accordionPillStyle()}
            onClick={() => toggleSection("generalColor")}
          >
            {expandedSections.generalColor ? <ChevronUp size={15} color="#3577DB" /> : <ChevronDown size={15} color="#3577DB" />}
            <span>Cài đặt màu chung</span>
          </div>
          {expandedSections.generalColor && (
            <div style={{ padding: "12px", background: "#F8FAFC", borderRadius: "0 0 5px 5px", marginTop: 2, border: "1px solid #E2E8F0" }}>
              <div style={{ fontSize: 12, color: "#555", marginBottom: 6 }}>Màu chủ đạo (Primary Color)</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input type="color" defaultValue="#3577DB" style={{ width: 32, height: 32, border: "none", cursor: "pointer" }} />
                <input type="text" defaultValue="#3577DB" style={{ height: 30, padding: "0 8px", border: "1px solid #d5d8dd", borderRadius: 4, fontSize: 12, width: 90 }} />
              </div>
            </div>
          )}
        </div>

        <div>
          <div
            style={accordionPillStyle()}
            onClick={() => toggleSection("tableColor")}
          >
            {expandedSections.tableColor ? <ChevronUp size={15} color="#3577DB" /> : <ChevronDown size={15} color="#3577DB" />}
            <span>TableColorSetting</span>
          </div>
          {expandedSections.tableColor && (
            <div style={{ padding: "12px", background: "#F8FAFC", borderRadius: "0 0 5px 5px", marginTop: 2, border: "1px solid #E2E8F0" }}>
              <div style={{ fontSize: 12, color: "#555", marginBottom: 6 }}>Màu nền tiêu đề bảng (Header Bg)</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input type="color" defaultValue="#D5DFF2" style={{ width: 32, height: 32, border: "none", cursor: "pointer" }} />
                <input type="text" defaultValue="#D5DFF2" style={{ height: 30, padding: "0 8px", border: "1px solid #d5d8dd", borderRadius: 4, fontSize: 12, width: 90 }} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Column 2 */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <div
            style={accordionPillStyle()}
            onClick={() => toggleSection("sidebarColor")}
          >
            {expandedSections.sidebarColor ? <ChevronUp size={15} color="#3577DB" /> : <ChevronDown size={15} color="#3577DB" />}
            <span>Cài đặt Sidebar</span>
          </div>
          {expandedSections.sidebarColor && (
            <div style={{ padding: "12px", background: "#F8FAFC", borderRadius: "0 0 5px 5px", marginTop: 2, border: "1px solid #E2E8F0" }}>
              <div style={{ fontSize: 12, color: "#555", marginBottom: 6 }}>Màu nền Sidebar</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input type="color" defaultValue="#FFFFFF" style={{ width: 32, height: 32, border: "none", cursor: "pointer" }} />
                <input type="text" defaultValue="#FFFFFF" style={{ height: 30, padding: "0 8px", border: "1px solid #d5d8dd", borderRadius: 4, fontSize: 12, width: 90 }} />
              </div>
            </div>
          )}
        </div>

        <div>
          <div
            style={accordionPillStyle()}
            onClick={() => toggleSection("inputColor")}
          >
            {expandedSections.inputColor ? <ChevronUp size={15} color="#3577DB" /> : <ChevronDown size={15} color="#3577DB" />}
            <span>InputColorSetting</span>
          </div>
          {expandedSections.inputColor && (
            <div style={{ padding: "12px", background: "#F8FAFC", borderRadius: "0 0 5px 5px", marginTop: 2, border: "1px solid #E2E8F0" }}>
              <div style={{ fontSize: 12, color: "#555", marginBottom: 6 }}>Màu viền Input Focus</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input type="color" defaultValue="#3577DB" style={{ width: 32, height: 32, border: "none", cursor: "pointer" }} />
                <input type="text" defaultValue="#3577DB" style={{ height: 30, padding: "0 8px", border: "1px solid #d5d8dd", borderRadius: 4, fontSize: 12, width: 90 }} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Column 3 */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <div
            style={accordionPillStyle()}
            onClick={() => toggleSection("headerColor")}
          >
            {expandedSections.headerColor ? <ChevronUp size={15} color="#3577DB" /> : <ChevronDown size={15} color="#3577DB" />}
            <span>Cài đặt Header</span>
          </div>
          {expandedSections.headerColor && (
            <div style={{ padding: "12px", background: "#F8FAFC", borderRadius: "0 0 5px 5px", marginTop: 2, border: "1px solid #E2E8F0" }}>
              <div style={{ fontSize: 12, color: "#555", marginBottom: 6 }}>Màu nền Top Header</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input type="color" defaultValue="#FFFFFF" style={{ width: 32, height: 32, border: "none", cursor: "pointer" }} />
                <input type="text" defaultValue="#FFFFFF" style={{ height: 30, padding: "0 8px", border: "1px solid #d5d8dd", borderRadius: 4, fontSize: 12, width: 90 }} />
              </div>
            </div>
          )}
        </div>

        <div>
          <div
            style={accordionPillStyle()}
            onClick={() => toggleSection("toolbarColor")}
          >
            {expandedSections.toolbarColor ? <ChevronUp size={15} color="#3577DB" /> : <ChevronDown size={15} color="#3577DB" />}
            <span>ToolbarSetting</span>
          </div>
          {expandedSections.toolbarColor && (
            <div style={{ padding: "12px", background: "#F8FAFC", borderRadius: "0 0 5px 5px", marginTop: 2, border: "1px solid #E2E8F0" }}>
              <div style={{ fontSize: 12, color: "#555", marginBottom: 6 }}>Màu nút Toolbar Action</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input type="color" defaultValue="#3577DB" style={{ width: 32, height: 32, border: "none", cursor: "pointer" }} />
                <input type="text" defaultValue="#3577DB" style={{ height: 30, padding: "0 8px", border: "1px solid #d5d8dd", borderRadius: 4, fontSize: 12, width: 90 }} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ColorSettingsAccordion;
