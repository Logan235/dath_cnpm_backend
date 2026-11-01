import React, { useState } from "react";
import { COLORS } from "@/constants/colors";
import PageTitleBar from "@/components/PageTitleBar";
import Panel from "@/components/Panel";
import Tabs from "@/components/Tabs";
import { Save } from "lucide-react";
import { settingsFieldsLeft, settingsFieldsRight } from "@/data/mock/settings";

function SettingsPage() {

  const [tab, setTab] = useState("general");

  // Tab 2 (User Config) state
  const [userSettings, setUserSettings] = useState({
    needEmailActivation: false,
    smsActivation: false,
    useCaptchaOnLogin: false,
    enableCookie: false,
    sessionTimeout: false,
    gravatarPicture: false,
    checkLastXPassword: false,
    enablePasswordExpiration: false,
    passwordResetHours: "24",
  });

  // Tab 3 (Password Security) state
  const [passwordSettings, setPasswordSettings] = useState({
    useDefaultConfig: true,
    minCharCount: "6",
    enableLockOnFailedLogin: true,
    failedLoginCount: "5",
    logoutDuration: "300",
    enable2FA: false,
    oneConcurrentLogin: false,
  });

  // Tab 4 (Email SMTP) state
  const [smtpSettings, setSmtpSettings] = useState({
    senderEmail: "admin@mydomain.com",
    displayName: "mydomain.com mailer",
    smtpHost: "127.0.0.1",
    smtpPort: "25",
    useSSL: false,
    useDefaultAuth: true,
    testEmail: "2asd@hmail.com",
  });

  // Tab 5 (Other settings) state
  const [otherSettings, setOtherSettings] = useState({
    quickThemeSelect: false,
  });

  const fieldInput = {
    width: "100%",
    height: 40,
    border: "1px solid #d5d8dd",
    borderRadius: 4,
    padding: "0 14px",
    fontSize: 13,
    color: "#333",
    outline: "none",
    boxSizing: "border-box",
    background: "#fff",
  };

  const sectionTitleStyle = {
    fontWeight: 700,
    fontSize: 14,
    color: "#071437",
    marginTop: 20,
    marginBottom: 12,
  };

  const checkboxLabelStyle = {
    display: "flex",
    alignItems: "center",
    gap: 10,
    fontSize: 13,
    color: "#333",
    marginBottom: 10,
    cursor: "pointer",
    userSelect: "none",
  };

  const saveButtonStyle = {
    marginTop: 26,
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    height: 40,
    padding: "0 22px",
    background: COLORS.headerTextBlue,
    color: "#fff",
    border: "none",
    borderRadius: 4,
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    boxShadow: "0 1px 3px rgba(53,119,219,0.2)",
  };

  return (
    <div>
      <PageTitleBar title="CÀI ĐẶT" subtitle="Thông tin cài đặt" />
      <Panel style={{ padding: "20px 24px" }}>
        <Tabs
          tabs={[
            { key: "general", label: "Cài đặt chung" },
            { key: "user", label: "Cấu hình người dùng" },
            { key: "password", label: "Bảo mật mật khẩu" },
            { key: "smtp", label: "Email SMTP" },
            { key: "other", label: "Các thiết lập khác" },
          ]}
          active={tab}
          onChange={setTab}
        />

        {/* TAB 1: Cài đặt chung */}
        {tab === "general" && (
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: "#071437", marginBottom: 22 }}>
              Cài đặt chung
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: 40, rowGap: 22 }}>
              {settingsFieldsLeft.map((f, i) => (
                <React.Fragment key={"l" + i}>
                  <div>
                    <div style={{ fontSize: 13, color: "#333", marginBottom: 7 }}>{f.label}</div>
                    <input style={fieldInput} defaultValue={f.value} />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, color: "#333", marginBottom: 7 }}>{settingsFieldsRight[i].label}</div>
                    <input style={fieldInput} defaultValue={settingsFieldsRight[i].value} />
                  </div>
                </React.Fragment>
              ))}
            </div>
            <button style={saveButtonStyle}>
              <Save size={15} /> Lưu tất cả
            </button>
          </div>
        )}

        {/* TAB 2: Cấu hình người dùng */}
        {tab === "user" && (
          <div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 14 }}>
              <label style={checkboxLabelStyle}>
                <input
                  type="checkbox"
                  checked={userSettings.needEmailActivation}
                  onChange={(e) => setUserSettings({ ...userSettings, needEmailActivation: e.target.checked })}
                  style={{ width: 16, height: 16, accentColor: COLORS.headerTextBlue, cursor: "pointer" }}
                />
                <span>Cần email kích hoạt để đăng nhập</span>
              </label>

              <label style={checkboxLabelStyle}>
                <input
                  type="checkbox"
                  checked={userSettings.smsActivation}
                  onChange={(e) => setUserSettings({ ...userSettings, smsActivation: e.target.checked })}
                  style={{ width: 16, height: 16, accentColor: COLORS.headerTextBlue, cursor: "pointer" }}
                />
                <span>Kích hoạt bằng sms</span>
              </label>

              <label style={checkboxLabelStyle}>
                <input
                  type="checkbox"
                  checked={userSettings.useCaptchaOnLogin}
                  onChange={(e) => setUserSettings({ ...userSettings, useCaptchaOnLogin: e.target.checked })}
                  style={{ width: 16, height: 16, accentColor: COLORS.headerTextBlue, cursor: "pointer" }}
                />
                <span>UseCaptchaOnLogin</span>
              </label>
            </div>

            <div style={sectionTitleStyle}>Cho phép cookie</div>
            <label style={checkboxLabelStyle}>
              <input
                type="checkbox"
                checked={userSettings.enableCookie}
                onChange={(e) => setUserSettings({ ...userSettings, enableCookie: e.target.checked })}
                style={{ width: 16, height: 16, accentColor: COLORS.headerTextBlue, cursor: "pointer" }}
              />
              <span>Bật cookie</span>
            </label>

            <div style={sectionTitleStyle}>SessionTimeOut</div>
            <label style={checkboxLabelStyle}>
              <input
                type="checkbox"
                checked={userSettings.sessionTimeout}
                onChange={(e) => setUserSettings({ ...userSettings, sessionTimeout: e.target.checked })}
                style={{ width: 16, height: 16, accentColor: COLORS.headerTextBlue, cursor: "pointer" }}
              />
              <span>IsSessionTimeOutEnabled</span>
            </label>

            <div style={sectionTitleStyle}>Thông tin chung</div>
            <label style={checkboxLabelStyle}>
              <input
                type="checkbox"
                checked={userSettings.gravatarPicture}
                onChange={(e) => setUserSettings({ ...userSettings, gravatarPicture: e.target.checked })}
                style={{ width: 16, height: 16, accentColor: COLORS.headerTextBlue, cursor: "pointer" }}
              />
              <span>AllowUsingGravatarProfilePicture</span>
            </label>

            <div style={sectionTitleStyle}>Mật khẩu</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 14 }}>
              <label style={checkboxLabelStyle}>
                <input
                  type="checkbox"
                  checked={userSettings.checkLastXPassword}
                  onChange={(e) => setUserSettings({ ...userSettings, checkLastXPassword: e.target.checked })}
                  style={{ width: 16, height: 16, accentColor: COLORS.headerTextBlue, cursor: "pointer" }}
                />
                <span>EnableCheckingLastXPasswordWhenPasswordChangeSettingLabel</span>
              </label>

              <label style={checkboxLabelStyle}>
                <input
                  type="checkbox"
                  checked={userSettings.enablePasswordExpiration}
                  onChange={(e) => setUserSettings({ ...userSettings, enablePasswordExpiration: e.target.checked })}
                  style={{ width: 16, height: 16, accentColor: COLORS.headerTextBlue, cursor: "pointer" }}
                />
                <span>EnablePasswordExpirationSettingLabel</span>
              </label>
            </div>

            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 13, color: "#333", marginBottom: 7 }}>
                PasswordResetCodeExpirationHoursSettingLabel
              </div>
              <input
                style={fieldInput}
                value={userSettings.passwordResetHours}
                onChange={(e) => setUserSettings({ ...userSettings, passwordResetHours: e.target.value })}
              />
            </div>

            <button style={saveButtonStyle}>
              <Save size={15} /> Lưu tất cả
            </button>
          </div>
        )}

        {/* TAB 3: Bảo mật mật khẩu */}
        {tab === "password" && (
          <div>
            <div style={sectionTitleStyle}>Mật khẩu phức tạp</div>
            <label style={checkboxLabelStyle}>
              <input
                type="checkbox"
                checked={passwordSettings.useDefaultConfig}
                onChange={(e) => setPasswordSettings({ ...passwordSettings, useDefaultConfig: e.target.checked })}
                style={{ width: 16, height: 16, accentColor: COLORS.headerTextBlue, cursor: "pointer" }}
              />
              <span>Sử dụng cấu hình mặc định</span>
            </label>

            <div style={{ paddingLeft: 26, margin: "10px 0 16px", display: "flex", flexDirection: "column", gap: 6, color: "#8c93a0", fontSize: 13 }}>
              <div>Mật khẩu yêu cầu số</div>
              <div>Mật khẩu phải chứa ký tự thường</div>
              <div>Mật khẩu phải chứa ký tự đặc biệt</div>
              <div>Mật khẩu phải chứa ký tự hoa</div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, color: "#333", marginBottom: 7 }}>Số lượng ký tự tối thiểu</div>
              <input
                style={{ ...fieldInput, background: "#f8f9fb", color: "#666" }}
                value={passwordSettings.minCharCount}
                onChange={(e) => setPasswordSettings({ ...passwordSettings, minCharCount: e.target.value })}
              />
            </div>

            <div style={sectionTitleStyle}>Lock người dùng</div>
            <label style={checkboxLabelStyle}>
              <input
                type="checkbox"
                checked={passwordSettings.enableLockOnFailedLogin}
                onChange={(e) => setPasswordSettings({ ...passwordSettings, enableLockOnFailedLogin: e.target.checked })}
                style={{ width: 16, height: 16, accentColor: COLORS.headerTextBlue, cursor: "pointer" }}
              />
              <span>Bật chức năng Khóa tài khoản người dùng dựa trên số lần đăng nhập thất bại</span>
            </label>

            <div style={{ marginTop: 12, marginBottom: 14 }}>
              <div style={{ fontSize: 13, color: "#333", marginBottom: 7 }}>Số lần đăng nhập thất bại bị lock</div>
              <input
                style={fieldInput}
                value={passwordSettings.failedLoginCount}
                onChange={(e) => setPasswordSettings({ ...passwordSettings, failedLoginCount: e.target.value })}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, color: "#333", marginBottom: 7 }}>Tài khoản bị log out sau khoảng thời gian</div>
              <input
                style={fieldInput}
                value={passwordSettings.logoutDuration}
                onChange={(e) => setPasswordSettings({ ...passwordSettings, logoutDuration: e.target.value })}
              />
            </div>

            <div style={sectionTitleStyle}>Xác thực 2 yếu tố</div>
            <label style={checkboxLabelStyle}>
              <input
                type="checkbox"
                checked={passwordSettings.enable2FA}
                onChange={(e) => setPasswordSettings({ ...passwordSettings, enable2FA: e.target.checked })}
                style={{ width: 16, height: 16, accentColor: COLORS.headerTextBlue, cursor: "pointer" }}
              />
              <span>Cho phép xác thực 2 yếu tố</span>
            </label>

            <div style={sectionTitleStyle}>OneConcurrentLoginPerUser</div>
            <label style={checkboxLabelStyle}>
              <input
                type="checkbox"
                checked={passwordSettings.oneConcurrentLogin}
                onChange={(e) => setPasswordSettings({ ...passwordSettings, oneConcurrentLogin: e.target.checked })}
                style={{ width: 16, height: 16, accentColor: COLORS.headerTextBlue, cursor: "pointer" }}
              />
              <span>OneConcurrentLoginPerUserActive</span>
            </label>

            <button style={saveButtonStyle}>
              <Save size={15} /> Lưu tất cả
            </button>
          </div>
        )}

        {/* TAB 4: Email SMTP */}
        {tab === "smtp" && (
          <div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 13, color: "#333", marginBottom: 7 }}>Địa chỉ email cần gửi</div>
                <input
                  style={fieldInput}
                  value={smtpSettings.senderEmail}
                  onChange={(e) => setSmtpSettings({ ...smtpSettings, senderEmail: e.target.value })}
                />
              </div>

              <div>
                <div style={{ fontSize: 13, color: "#333", marginBottom: 7 }}>Tên hiển thị email</div>
                <input
                  style={fieldInput}
                  value={smtpSettings.displayName}
                  onChange={(e) => setSmtpSettings({ ...smtpSettings, displayName: e.target.value })}
                />
              </div>

              <div>
                <div style={{ fontSize: 13, color: "#333", marginBottom: 7 }}>Smtp Host</div>
                <input
                  style={fieldInput}
                  value={smtpSettings.smtpHost}
                  onChange={(e) => setSmtpSettings({ ...smtpSettings, smtpHost: e.target.value })}
                />
              </div>

              <div>
                <div style={{ fontSize: 13, color: "#333", marginBottom: 7 }}>Smtp Port</div>
                <input
                  style={fieldInput}
                  value={smtpSettings.smtpPort}
                  onChange={(e) => setSmtpSettings({ ...smtpSettings, smtpPort: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6, margin: "16px 0 20px" }}>
              <label style={checkboxLabelStyle}>
                <input
                  type="checkbox"
                  checked={smtpSettings.useSSL}
                  onChange={(e) => setSmtpSettings({ ...smtpSettings, useSSL: e.target.checked })}
                  style={{ width: 16, height: 16, accentColor: COLORS.headerTextBlue, cursor: "pointer" }}
                />
                <span>Sử dụng SSL</span>
              </label>

              <label style={checkboxLabelStyle}>
                <input
                  type="checkbox"
                  checked={smtpSettings.useDefaultAuth}
                  onChange={(e) => setSmtpSettings({ ...smtpSettings, useDefaultAuth: e.target.checked })}
                  style={{ width: 16, height: 16, accentColor: COLORS.headerTextBlue, cursor: "pointer" }}
                />
                <span>Sử dụng thông tin xác thực mặc định</span>
              </label>
            </div>

            <div style={{ borderTop: "1px solid #e3e5e9", paddingTop: 18, marginTop: 18 }}>
              <div style={{ ...sectionTitleStyle, marginTop: 0, marginBottom: 10 }}>Test gửi mail</div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <input
                  style={{ ...fieldInput, width: 340 }}
                  value={smtpSettings.testEmail}
                  onChange={(e) => setSmtpSettings({ ...smtpSettings, testEmail: e.target.value })}
                />
                <button
                  style={{
                    height: 40,
                    padding: "0 20px",
                    background: COLORS.headerTextBlue,
                    color: "#fff",
                    border: "none",
                    borderRadius: 4,
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: "pointer",
                  }}
                >
                  Gửi email mẫu
                </button>
              </div>
            </div>

            <button style={saveButtonStyle}>
              <Save size={15} /> Lưu tất cả
            </button>
          </div>
        )}

        {/* TAB 5: Các thiết lập khác */}
        {tab === "other" && (
          <div>
            <div style={sectionTitleStyle}>QuickThemeSelection</div>
            <label style={checkboxLabelStyle}>
              <input
                type="checkbox"
                checked={otherSettings.quickThemeSelect}
                onChange={(e) => setOtherSettings({ ...otherSettings, quickThemeSelect: e.target.checked })}
                style={{ width: 16, height: 16, accentColor: COLORS.headerTextBlue, cursor: "pointer" }}
              />
              <span>IsQuickThemeSelectEnabled</span>
            </label>

            <button style={saveButtonStyle}>
              <Save size={15} /> Lưu tất cả
            </button>
          </div>
        )}
      </Panel>
    </div>
  );
}

export default SettingsPage;