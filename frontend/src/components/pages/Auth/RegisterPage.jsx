"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import { LOGO_SRC } from "@/assets/icons";
import { homeFor } from "@/config/portals";
import { loginWithRole, registerAccount } from "@/lib/auth";
import { Alert, Button, Card, Field, TextInput } from "@/components/ui";

const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$.!%*?&]).{8,}$/;
// Danh sách mặc định — quản trị viên đổi được ở tham số OFFICIAL_EMAIL_DOMAINS
const OFFICIAL_HINT = ["syt.com", "syt.gov.vn", "ca.gov.vn"];

export default function RegisterPage() {
  const router = useRouter();
  const [v, setV] = useState({ fullName: "", email: "", phoneNumber: "", password: "", confirm: "" });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setV({ ...v, [k]: e.target.value });
  const domain = (v.email.split("@")[1] || "").toLowerCase();
  const looksOfficial = OFFICIAL_HINT.some((d) => domain === d || domain.endsWith("." + d));

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!v.fullName.trim()) errs.fullName = "Nhập họ và tên";
    if (!/^\S+@\S+\.\S+$/.test(v.email.trim())) errs.email = "Email không hợp lệ";
    if (!PASSWORD_RULE.test(v.password)) errs.password = "Tối thiểu 8 ký tự, có chữ hoa, chữ thường, số và ký tự đặc biệt (@$.!%*?&)";
    if (v.confirm !== v.password) errs.confirm = "Mật khẩu nhập lại không khớp";
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setBusy(true);
    setError("");
    const r = await registerAccount({
      email: v.email.trim(),
      password: v.password,
      fullName: v.fullName.trim(),
      phoneNumber: v.phoneNumber.trim() || undefined,
    });
    if (!r.ok) {
      setBusy(false);
      setError(r.status === 0 ? "Không kết nối được máy chủ." : r.message || "Đăng ký không thành công.");
      return;
    }
    // Đăng nhập luôn: người dân -> khu vực người dân; cán bộ (email cơ quan) -> trang xin cấp quyền
    const login = await loginWithRole({ email: v.email.trim(), password: v.password });
    setBusy(false);
    if (login.ok) router.replace(homeFor(login.session));
    else router.replace("/login");
  };

  return (
    <div className="solo-page">
      <div className="solo-box">
        <Link href="/citizen/pre-check" className="solo-brand">
          <img src={LOGO_SRC} alt="" />
          <strong>Sở Y tế TP. Hồ Chí Minh</strong>
        </Link>
        <Card title="Đăng ký tài khoản">
          <Alert tone="info">
            <strong>Email thường</strong> (gmail, outlook...) → tài khoản <strong>Người dân</strong>, dùng được ngay.
            <br />
            <strong>Email cơ quan</strong> (@{OFFICIAL_HINT.join(", @")}) → tài khoản <strong>Cán bộ</strong>: sau khi đăng ký, bạn gửi form xin cấp
            quyền để quản trị viên / lãnh đạo duyệt.
          </Alert>
          <form onSubmit={submit} noValidate>
            <div className="ui-form">
              <Field label="Họ và tên" required error={errors.fullName} htmlFor="r-name">
                <TextInput id="r-name" value={v.fullName} onChange={set("fullName")} autoComplete="name" invalid={!!errors.fullName} />
              </Field>
              <Field label="Số điện thoại" htmlFor="r-phone">
                <TextInput id="r-phone" value={v.phoneNumber} onChange={set("phoneNumber")} autoComplete="tel" />
              </Field>
              <Field
                label="Email"
                required
                span="all"
                htmlFor="r-email"
                error={errors.email}
                hint={domain ? (looksOfficial ? "Email cơ quan: tài khoản cán bộ, cần gửi form xin cấp quyền." : "Email thường: tài khoản người dân.") : undefined}
              >
                <TextInput id="r-email" type="email" value={v.email} onChange={set("email")} autoComplete="email" invalid={!!errors.email} />
              </Field>
              <Field label="Mật khẩu" required error={errors.password} htmlFor="r-pass" hint="Tối thiểu 8 ký tự, có chữ hoa, chữ thường, số và ký tự đặc biệt">
                <TextInput id="r-pass" type="password" value={v.password} onChange={set("password")} autoComplete="new-password" invalid={!!errors.password} />
              </Field>
              <Field label="Nhập lại mật khẩu" required error={errors.confirm} htmlFor="r-confirm">
                <TextInput id="r-confirm" type="password" value={v.confirm} onChange={set("confirm")} autoComplete="new-password" invalid={!!errors.confirm} />
              </Field>
            </div>
            {error && (
              <Alert tone="danger" style={{ marginTop: 14, marginBottom: 0 }}>
                {error}
              </Alert>
            )}
            <div className="ui-between ui-mt">
              <span style={{ fontSize: 13 }}>
                Đã có tài khoản? <Link className="ui-link" href="/login">Đăng nhập</Link>
              </span>
              <Button type="submit" icon={UserPlus} loading={busy} size="lg">
                Đăng ký
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
