"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { LOGO_SRC } from "@/assets/icons";
import Link from "next/link";
import { PORTALS, ROLE_ORDER, homeFor } from "@/config/portals";
import { getApiBase, getLastRole, getSession, loginWithRole } from "@/lib/auth";
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
  }, [router]);

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
          <p className="login-sub">Chọn vai trò, sau đó nhập tài khoản được cấp cho vai trò đó.</p>

          {notice && <div className="login-notice">{notice}</div>}

          <form onSubmit={handleSubmit} noValidate>
            <fieldset className="login-roles">
              <legend className="login-label">Vai trò</legend>
              {ROLE_ORDER.map((key) => {
                const p = PORTALS[key];
                const checked = role === key;
                return (
                  <label key={key} className={`login-role${checked ? " is-checked" : ""}`}>
                    <input
                      type="radio"
                      name="role"
                      value={key}
                      checked={checked}
                      onChange={() => {
                        setRole(key);
                        setError("");
                      }}
                    />
                    <span className="login-role-name">{p.roleLabel}</span>
                    <span className="login-role-module">{p.moduleLabel}</span>
                  </label>
                );
              })}
            </fieldset>

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
