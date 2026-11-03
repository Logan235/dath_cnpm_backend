"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { LOGO_SRC } from "@/assets/icons";
import Link from "next/link";
import { PORTALS, ROLE_ORDER, homeFor } from "@/config/portals";
import { getApiBase, getLastRole, getSession, loginWithRole, saveSession } from "@/lib/auth";
import { label } from "@/lib/labels";

function errorText(result, roleLabel) {
  if (result.status === 0) {
    return `Không kết nối được máy chủ ${getApiBase()}. Kiểm tra backend đã chạy (npm run start:dev) chưa.`;
  }
  if (result.status === 401) return result.message || "Email hoặc mật khẩu không đúng.";
  if (result.status === 403) {
    const roles = result.data?.availableRoles || [];
    if (roles.length) {
      return `Tài khoản này không có vai trò "${roleLabel}". Vai trò được cấp: ${roles.map((r) => label("role", r)).join(", ")}.`;
    }
    return `Tài khoản này không có vai trò "${roleLabel}".`;
  }
  if (result.status === 400) return "Vai trò không hợp lệ. Hãy chọn lại vai trò.";
  return result.message || "Đăng nhập không thành công. Thử lại sau ít phút.";
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [role, setRole] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [suggestRoles, setSuggestRoles] = useState([]);

  useEffect(() => {
    // Đã đăng nhập rồi thì vào thẳng khu vực của mình
    const s = getSession();
    if (s?.accessToken) {
      router.replace(homeFor(s));
      return;
    }
    const last = getLastRole();
    if (PORTALS[last]) setRole(last);
    if (new URLSearchParams(window.location.search).get("expired")) {
      setNotice("Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.");
    }

    // Xử lý callback từ Google OAuth: backend redirect về /login?token=xxx&role=xxx
    const token = searchParams?.get("token");
    const roleParam = searchParams?.get("role");
    if (token && roleParam && PORTALS[roleParam]) {
      // Lưu session vào localStorage
      saveSession({
        accessToken: token,
        refreshToken: "", // Google OAuth không trả refresh token, backend sẽ cấp mới khi cần
        role: roleParam,
        user: null, // Sẽ được fetch khi vào PortalShell
        permissions: [],
        availableRoles: [roleParam],
        needsRoleRequest: false,
      });
      // Chuyển hướng đến trang chủ của vai trò
      router.replace(homeFor({ role: roleParam }));
    }
  }, [router, searchParams]);

  const goAfterLogin = (session) => {
    const portal = PORTALS[session.role];
    const next = new URLSearchParams(window.location.search).get("next") || "";
    const okNext = portal && (next.startsWith(portal.base + "/") || next.startsWith("/citizen/"));
    router.replace(okNext ? next : homeFor(session));
  };

  const doLogin = async (chosenRole) => {
    setError("");
    setSuggestRoles([]);
    setSubmitting(true);
    let result = await loginWithRole({ email: email.trim(), password, role: chosenRole });
    if (!result.ok && result.status === 403 && result.data?.error === "ROLE_NOT_GRANTED") {
      const roles = (result.data.availableRoles || []).filter((r) => PORTALS[r]);
      if (!roles.length && result.data.accountType === "OFFICIAL") {
        // Cán bộ (email cơ quan) chưa được cấp vai trò: đăng nhập không vai trò rồi sang trang xin cấp quyền
        result = await loginWithRole({ email: email.trim(), password });
        setSubmitting(false);
        if (result.ok) router.replace("/role-request");
        else setError(errorText(result, ""));
        return;
      }
      setSuggestRoles(roles);
    }
    setSubmitting(false);
    if (!result.ok) {
      setError(errorText(result, PORTALS[chosenRole]?.roleLabel || ""));
      return;
    }
    goAfterLogin(result.session);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!role) {
      setError("Hãy chọn vai trò trước khi đăng nhập.");
      return;
    }
    if (!email.trim() || !password) {
      setError("Hãy nhập email và mật khẩu.");
      return;
    }
    await doLogin(role);
  };

  return (
    <div className="login-page">
      <div className="login-frame">
        <aside className="login-brand">
          <div className="login-brand-org">
            <img src={LOGO_SRC} alt="" className="login-brand-logo" />
            <div>
              <div className="login-brand-org-name">Sở Y tế</div>
              <div className="login-brand-org-city">TP. Hồ Chí Minh</div>
            </div>
          </div>
          <div className="login-brand-body">
            <span className="login-brand-rule" aria-hidden="true" />
            <p className="login-brand-title">AI phát hiện dấu hiệu vi phạm trong y tế</p>
            <p className="login-brand-text">
              Giám sát quảng cáo khám chữa bệnh trên không gian mạng, đối chiếu với giấy phép và văn bản pháp lý.
            </p>
          </div>
        </aside>

        <main className="login-panel">
          <h1 className="login-title">Đăng nhập</h1>
          <p className="login-sub">Đăng nhập tài khoản công dân hoặc email công vụ để truy cập hệ thống.</p>

          {notice && <div className="login-notice">{notice}</div>}

          {/* Nút đăng nhập Google OAuth */}
          <div style={{ marginBottom: 20 }}>
            <button
              type="button"
              className="ui-btn ui-btn-outline"
              style={{ width: "100%", justifyContent: "center", display: "flex", alignItems: "center", gap: 10, padding: "10px 16px" }}
              onClick={() => {
                const apiBase = getApiBase();
                window.location.href = `${apiBase}/auth/google`;
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.1 0-5.74-2.09-6.68-4.91H1.32v3.15C3.32 21.32 7.37 24 12 24z"/>
                <path fill="#FBBC05" d="M5.32 14.29c-.24-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.56H1.32C.48 8.24 0 10.06 0 12s.48 3.76 1.32 5.44l4-3.15z"/>
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.37 0 3.32 2.68 1.32 6.56l4 3.15c.94-2.82 3.58-4.96 6.68-4.96z"/>
              </svg>
              <span>Đăng nhập bằng Google (Gmail)</span>
            </button>
          </div>

          <div style={{ display: "flex", alignItems: "center", margin: "16px 0", color: "var(--ink-soft)", fontSize: 13 }}>
            <div style={{ flex: 1, height: 1, background: "#e2e8f0" }} />
            <span style={{ padding: "0 10px" }}>hoặc đăng nhập bằng Email / Mật khẩu</span>
            <div style={{ flex: 1, height: 1, background: "#e2e8f0" }} />
          </div>

          <form onSubmit={handleSubmit} noValidate>

            <label className="login-label" htmlFor="login-email">Email</label>
            <input
              id="login-email"
              className="login-input"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ten@donvi.gov.vn"
            />

            <label className="login-label" htmlFor="login-password">Mật khẩu</label>
            <div className="login-password">
              <input
                id="login-password"
                className="login-input"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="login-eye"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {error && (
              <div className="login-error" role="alert">
                {error}
                {suggestRoles.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                    {suggestRoles.map((r) => (
                      <button
                        key={r}
                        type="button"
                        className="ui-btn ui-btn-secondary ui-btn-sm"
                        onClick={() => {
                          setRole(r);
                          doLogin(r);
                        }}
                      >
                        Vào với vai trò {label("role", r)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <button type="submit" className="login-submit" disabled={submitting}>
              {submitting ? "Đang đăng nhập…" : "Đăng nhập"}
            </button>
          </form>

          <div className="login-links">
            <span>
              Chưa có tài khoản? <Link href="/register">Đăng ký</Link>
            </span>
            <Link href="/citizen/pre-check">Tiếp tục không cần đăng nhập →</Link>
          </div>
          <p className="login-foot-note">
            Người dân không cần đăng nhập vẫn kiểm tra quảng cáo, tra cứu cơ sở và gửi phản ánh được. Cán bộ đăng ký bằng
            email cơ quan (ví dụ @syt.com) sẽ được chuyển sang trang gửi form xin cấp quyền.
          </p>
        </main>
      </div>
    </div>
  );
}
