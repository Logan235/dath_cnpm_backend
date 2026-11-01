import React, { useState } from "react";
import { Upload } from "lucide-react";
import logoMain from "@/assets/web_logo.png";
import logoSmall from "@/assets/small_web_logo.png";
import logoLogin from "@/assets/web_logo_login.jpeg";

function LogoSettingsSection() {
  const [logoSettings, setLogoSettings] = useState({
    main: {
      width: "200",
      height: "200",
      bgColor: "#871717",
      bgTrans: "100",
      darkBgColor: "",
      darkBgTrans: "100",
    },
    small: {
      width: "100",
      height: "100",
      bgColor: "#000000",
      bgTrans: "100",
      darkBgColor: "#000000",
      darkBgTrans: "100",
    },
    login: {
      width: "",
      height: "50",
      bgColor: "#000000",
      bgTrans: "100",
      darkBgColor: "#000000",
      darkBgTrans: "100",
    },
  });

  const logoInputStyle = {
    height: 34,
    border: "1px solid #d5d8dd",
    borderRadius: "4px 0 0 4px",
    padding: "0 10px",
    fontSize: 13,
    outline: "none",
    width: 140,
    boxSizing: "border-box",
  };

  const unitBadgeStyle = {
    height: 34,
    background: "#F1F5F9",
    border: "1px solid #d5d8dd",
    borderLeft: "none",
    borderRadius: "0 4px 4px 0",
    padding: "0 10px",
    display: "flex",
    alignItems: "center",
    fontSize: 12.5,
    color: "#7E8299",
    boxSizing: "border-box",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* LOGO 1: Logo Chính */}
      <div style={{ border: "1px solid #EEF0F4", borderRadius: 6, overflow: "hidden" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 16px", background: "#F8FAFC", borderBottom: "1px solid #EEF0F4" }}>
          <span style={{ fontSize: 13.5, fontWeight: 700, color: "#071437" }}>Logo</span>
          <span style={{ fontSize: 12.5, color: "#3577DB", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4 }}>
            <Upload size={13} /> Tải lên
          </span>
        </div>

        <div style={{ padding: 18, display: "grid", gridTemplateColumns: "220px 1fr", gap: 24, alignItems: "start", background: "#FFFFFF" }}>
          {/* Left Preview */}
          <div
            style={{
              width: 220,
              height: 140,
              border: "1px solid #E2E8F0",
              borderRadius: 4,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 12,
              background: "#FFFFFF",
              boxSizing: "border-box",
            }}
          >
            <img
              src={logoMain}
              alt="GSOFT Logo"
              style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
            />
          </div>

          {/* Right Form Fields */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center" }}>
              <div style={{ width: 140, fontSize: 12.5, color: "#333", fontWeight: 500 }}>Chiều ngang</div>
              <div style={{ display: "flex" }}>
                <input
                  style={logoInputStyle}
                  value={logoSettings.main.width}
                  onChange={(e) => setLogoSettings({ ...logoSettings, main: { ...logoSettings.main, width: e.target.value } })}
                />
                <div style={unitBadgeStyle}>px</div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center" }}>
              <div style={{ width: 140, fontSize: 12.5, color: "#333", fontWeight: 500 }}>Chiều cao</div>
              <div style={{ display: "flex" }}>
                <input
                  style={logoInputStyle}
                  value={logoSettings.main.height}
                  onChange={(e) => setLogoSettings({ ...logoSettings, main: { ...logoSettings.main, height: e.target.value } })}
                />
                <div style={unitBadgeStyle}>px</div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center" }}>
              <div style={{ width: 140, fontSize: 12.5, color: "#333", fontWeight: 500 }}>Màu nền</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="color"
                  value={logoSettings.main.bgColor}
                  onChange={(e) => setLogoSettings({ ...logoSettings, main: { ...logoSettings.main, bgColor: e.target.value } })}
                  style={{ width: 36, height: 28, border: "none", cursor: "pointer", borderRadius: 3 }}
                />
                <input
                  style={{ ...logoInputStyle, width: 90, borderRadius: 4 }}
                  value={logoSettings.main.bgColor}
                  onChange={(e) => setLogoSettings({ ...logoSettings, main: { ...logoSettings.main, bgColor: e.target.value } })}
                />
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center" }}>
              <div style={{ width: 140, fontSize: 12.5, color: "#333", fontWeight: 500 }}>Transparent</div>
              <input
                style={{ ...logoInputStyle, width: 120, borderRadius: 4 }}
                value={logoSettings.main.bgTrans}
                onChange={(e) => setLogoSettings({ ...logoSettings, main: { ...logoSettings.main, bgTrans: e.target.value } })}
              />
            </div>

            <div style={{ display: "flex", alignItems: "center" }}>
              <div style={{ width: 140, fontSize: 12.5, color: "#333", fontWeight: 500 }}>Màu nền dark mode</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="color"
                  value={logoSettings.main.darkBgColor || "#000000"}
                  onChange={(e) => setLogoSettings({ ...logoSettings, main: { ...logoSettings.main, darkBgColor: e.target.value } })}
                  style={{ width: 36, height: 28, border: "none", cursor: "pointer", borderRadius: 3 }}
                />
                <input
                  style={{ ...logoInputStyle, width: 90, borderRadius: 4 }}
                  value={logoSettings.main.darkBgColor}
                  onChange={(e) => setLogoSettings({ ...logoSettings, main: { ...logoSettings.main, darkBgColor: e.target.value } })}
                />
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center" }}>
              <div style={{ width: 140, fontSize: 12.5, color: "#333", fontWeight: 500 }}>Transparent</div>
              <input
                style={{ ...logoInputStyle, width: 120, borderRadius: 4 }}
                value={logoSettings.main.darkBgTrans}
                onChange={(e) => setLogoSettings({ ...logoSettings, main: { ...logoSettings.main, darkBgTrans: e.target.value } })}
              />
            </div>
          </div>
        </div>
      </div>

      {/* LOGO 2: Logo nhỏ */}
      <div style={{ border: "1px solid #EEF0F4", borderRadius: 6, overflow: "hidden" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 16px", background: "#F8FAFC", borderBottom: "1px solid #EEF0F4" }}>
          <span style={{ fontSize: 13.5, fontWeight: 700, color: "#071437" }}>Logo nhỏ</span>
          <span style={{ fontSize: 12.5, color: "#3577DB", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4 }}>
            <Upload size={13} /> Tải lên
          </span>
        </div>

        <div style={{ padding: 18, display: "grid", gridTemplateColumns: "220px 1fr", gap: 24, alignItems: "start", background: "#FFFFFF" }}>
          {/* Left Preview */}
          <div
            style={{
              width: 220,
              height: 140,
              border: "1px solid #E2E8F0",
              borderRadius: 4,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#FFFFFF",
              padding: 12,
              boxSizing: "border-box",
            }}
          >
            <img
              src={logoSmall}
              alt="Small Logo"
              style={{ maxWidth: 80, maxHeight: 80, objectFit: "contain" }}
            />
          </div>

          {/* Right Form Fields */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center" }}>
              <div style={{ width: 140, fontSize: 12.5, color: "#333", fontWeight: 500 }}>Chiều ngang</div>
              <div style={{ display: "flex" }}>
                <input
                  style={logoInputStyle}
                  value={logoSettings.small.width}
                  onChange={(e) => setLogoSettings({ ...logoSettings, small: { ...logoSettings.small, width: e.target.value } })}
                />
                <div style={unitBadgeStyle}>px</div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center" }}>
              <div style={{ width: 140, fontSize: 12.5, color: "#333", fontWeight: 500 }}>Chiều cao</div>
              <div style={{ display: "flex" }}>
                <input
                  style={logoInputStyle}
                  value={logoSettings.small.height}
                  onChange={(e) => setLogoSettings({ ...logoSettings, small: { ...logoSettings.small, height: e.target.value } })}
                />
                <div style={unitBadgeStyle}>px</div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center" }}>
              <div style={{ width: 140, fontSize: 12.5, color: "#333", fontWeight: 500 }}>Màu nền</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="color"
                  value={logoSettings.small.bgColor}
                  onChange={(e) => setLogoSettings({ ...logoSettings, small: { ...logoSettings.small, bgColor: e.target.value } })}
                  style={{ width: 36, height: 28, border: "none", cursor: "pointer", borderRadius: 3 }}
                />
                <input
                  style={{ ...logoInputStyle, width: 90, borderRadius: 4 }}
                  value={logoSettings.small.bgColor}
                  onChange={(e) => setLogoSettings({ ...logoSettings, small: { ...logoSettings.small, bgColor: e.target.value } })}
                />
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center" }}>
              <div style={{ width: 140, fontSize: 12.5, color: "#333", fontWeight: 500 }}>Transparent</div>
              <input
                style={{ ...logoInputStyle, width: 120, borderRadius: 4 }}
                value={logoSettings.small.bgTrans}
                onChange={(e) => setLogoSettings({ ...logoSettings, small: { ...logoSettings.small, bgTrans: e.target.value } })}
              />
            </div>

            <div style={{ display: "flex", alignItems: "center" }}>
              <div style={{ width: 140, fontSize: 12.5, color: "#333", fontWeight: 500 }}>Màu nền dark mode</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="color"
                  value={logoSettings.small.darkBgColor}
                  onChange={(e) => setLogoSettings({ ...logoSettings, small: { ...logoSettings.small, darkBgColor: e.target.value } })}
                  style={{ width: 36, height: 28, border: "none", cursor: "pointer", borderRadius: 3 }}
                />
                <input
                  style={{ ...logoInputStyle, width: 90, borderRadius: 4 }}
                  value={logoSettings.small.darkBgColor}
                  onChange={(e) => setLogoSettings({ ...logoSettings, small: { ...logoSettings.small, darkBgColor: e.target.value } })}
                />
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center" }}>
              <div style={{ width: 140, fontSize: 12.5, color: "#333", fontWeight: 500 }}>Transparent</div>
              <input
                style={{ ...logoInputStyle, width: 120, borderRadius: 4 }}
                value={logoSettings.small.darkBgTrans}
                onChange={(e) => setLogoSettings({ ...logoSettings, small: { ...logoSettings.small, darkBgTrans: e.target.value } })}
              />
            </div>
          </div>
        </div>
      </div>

      {/* LOGO 3: Logo trang đăng nhập */}
      <div style={{ border: "1px solid #EEF0F4", borderRadius: 6, overflow: "hidden" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 16px", background: "#F8FAFC", borderBottom: "1px solid #EEF0F4" }}>
          <span style={{ fontSize: 13.5, fontWeight: 700, color: "#071437" }}>Logo trang đăng nhập</span>
          <span style={{ fontSize: 12.5, color: "#3577DB", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4 }}>
            <Upload size={13} /> Tải lên
          </span>
        </div>

        <div style={{ padding: 18, display: "grid", gridTemplateColumns: "220px 1fr", gap: 24, alignItems: "start", background: "#FFFFFF" }}>
          {/* Left Preview */}
          <div
            style={{
              width: 220,
              height: 140,
              border: "1px solid #E2E8F0",
              borderRadius: 4,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#FFFFFF",
              padding: 10,
              boxSizing: "border-box",
            }}
          >
            <img
              src={logoLogin}
              alt="Logo Trang Đăng Nhập"
              style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
            />
          </div>

          {/* Right Form Fields */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center" }}>
              <div style={{ width: 140, fontSize: 12.5, color: "#333", fontWeight: 500 }}>Chiều ngang</div>
              <div style={{ display: "flex" }}>
                <input
                  style={logoInputStyle}
                  value={logoSettings.login.width}
                  placeholder=""
                  onChange={(e) => setLogoSettings({ ...logoSettings, login: { ...logoSettings.login, width: e.target.value } })}
                />
                <div style={unitBadgeStyle}>px</div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center" }}>
              <div style={{ width: 140, fontSize: 12.5, color: "#333", fontWeight: 500 }}>Chiều cao</div>
              <div style={{ display: "flex" }}>
                <input
                  style={logoInputStyle}
                  value={logoSettings.login.height}
                  onChange={(e) => setLogoSettings({ ...logoSettings, login: { ...logoSettings.login, height: e.target.value } })}
                />
                <div style={unitBadgeStyle}>px</div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center" }}>
              <div style={{ width: 140, fontSize: 12.5, color: "#333", fontWeight: 500 }}>Màu nền</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="color"
                  value={logoSettings.login.bgColor}
                  onChange={(e) => setLogoSettings({ ...logoSettings, login: { ...logoSettings.login, bgColor: e.target.value } })}
                  style={{ width: 36, height: 28, border: "none", cursor: "pointer", borderRadius: 3 }}
                />
                <input
                  style={{ ...logoInputStyle, width: 90, borderRadius: 4 }}
                  value={logoSettings.login.bgColor}
                  onChange={(e) => setLogoSettings({ ...logoSettings, login: { ...logoSettings.login, bgColor: e.target.value } })}
                />
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center" }}>
              <div style={{ width: 140, fontSize: 12.5, color: "#333", fontWeight: 500 }}>Transparent</div>
              <input
                style={{ ...logoInputStyle, width: 120, borderRadius: 4 }}
                value={logoSettings.login.bgTrans}
                onChange={(e) => setLogoSettings({ ...logoSettings, login: { ...logoSettings.login, bgTrans: e.target.value } })}
              />
            </div>

            <div style={{ display: "flex", alignItems: "center" }}>
              <div style={{ width: 140, fontSize: 12.5, color: "#333", fontWeight: 500 }}>Màu nền dark mode</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="color"
                  value={logoSettings.login.darkBgColor}
                  onChange={(e) => setLogoSettings({ ...logoSettings, login: { ...logoSettings.login, darkBgColor: e.target.value } })}
                  style={{ width: 36, height: 28, border: "none", cursor: "pointer", borderRadius: 3 }}
                />
                <input
                  style={{ ...logoInputStyle, width: 90, borderRadius: 4 }}
                  value={logoSettings.login.darkBgColor}
                  onChange={(e) => setLogoSettings({ ...logoSettings, login: { ...logoSettings.login, darkBgColor: e.target.value } })}
                />
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center" }}>
              <div style={{ width: 140, fontSize: 12.5, color: "#333", fontWeight: 500 }}>Transparent</div>
              <input
                style={{ ...logoInputStyle, width: 120, borderRadius: 4 }}
                value={logoSettings.login.darkBgTrans}
                onChange={(e) => setLogoSettings({ ...logoSettings, login: { ...logoSettings.login, darkBgTrans: e.target.value } })}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LogoSettingsSection;
