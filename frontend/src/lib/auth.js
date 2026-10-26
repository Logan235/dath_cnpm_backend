"use client";

/**
 * Lưu phiên đăng nhập ở localStorage và gọi API xác thực của backend (NestJS, cổng 3001).
 * Đây chỉ là chặn ở phía giao diện; backend tự kiểm tra vai trò và quyền trong JWT ở mọi API.
 */

const SESSION_KEY = "admonitor.session";
const LAST_ROLE_KEY = "admonitor.lastRole";

// Mặc định gọi backend cùng máy với trang web, cổng 3001
// (mở bằng điện thoại qua IP LAN vẫn chạy). Có thể ghi đè bằng NEXT_PUBLIC_API_URL.
export function getApiBase() {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "");
  if (typeof window !== "undefined") {
    return `${window.location.protocol}//${window.location.hostname}:3001`;
  }
  return "http://localhost:3001";
}

function safeStorage() {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

export function getSession() {
  const ls = safeStorage();
  if (!ls) return null;
  try {
    const raw = ls.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveSession(session) {
  const ls = safeStorage();
  if (!ls) return;
  try {
    ls.setItem(SESSION_KEY, JSON.stringify(session));
    if (session?.role) ls.setItem(LAST_ROLE_KEY, session.role);
  } catch {
    /* bỏ qua: chế độ ẩn danh / bị chặn lưu trữ */
  }
  notifySessionChange();
}

function notifySessionChange() {
  try {
    window.dispatchEvent(new Event("admonitor-session"));
  } catch {
    /* bỏ qua */
  }
}

export function clearSession() {
  const ls = safeStorage();
  try {
    ls?.removeItem(SESSION_KEY);
  } catch {
    /* bỏ qua */
  }
  notifySessionChange();
}

export function getLastRole() {
  try {
    return safeStorage()?.getItem(LAST_ROLE_KEY) || "";
  } catch {
    return "";
  }
}

function toSession(data) {
  return {
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    role: data.role || null,
    user: data.user,
    permissions: data.permissions || [],
    availableRoles: data.availableRoles || [],
    needsRoleRequest: !!data.needsRoleRequest,
  };
}

async function postJson(path, body) {
  let res;
  try {
    res = await fetch(`${getApiBase()}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    return { ok: false, status: 0, message: "network", data: null };
  }
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* body rỗng */
  }
  if (!res.ok) {
    const message = Array.isArray(data?.message) ? data.message.join(", ") : data?.message;
    return { ok: false, status: res.status, message: message || "", data };
  }
  return { ok: true, status: res.status, data };
}

/**
 * Đăng nhập. `role` bỏ trống: backend tự chọn vai trò (hoặc không có vai trò với cán bộ chưa được cấp quyền).
 * Trả về { ok: true, session } hoặc { ok: false, status, message, data }.
 */
export async function loginWithRole({ email, password, role }) {
  const r = await postJson("/auth/login", { email, password, ...(role ? { role } : {}) });
  if (!r.ok) return r;
  const session = toSession(r.data);
  saveSession(session);
  return { ok: true, session };
}

/** Đăng ký tài khoản (email thường -> Người dân, email cơ quan -> Cán bộ chờ cấp quyền) */
export async function registerAccount(payload) {
  return postJson("/auth/register", payload);
}

/** Đổi vai trò đang dùng (tài khoản có nhiều vai trò) hoặc nhận vai trò mới sau khi được duyệt */
export async function refreshWithRole(role) {
  const s = getSession();
  if (!s?.refreshToken) return { ok: false, status: 401, message: "" };
  const r = await postJson("/auth/refresh", { refreshToken: s.refreshToken, ...(role ? { role } : {}) });
  if (!r.ok) return r;
  const session = toSession(r.data);
  saveSession(session);
  return { ok: true, session };
}

export async function logout() {
  const s = getSession();
  if (s?.accessToken) {
    try {
      await fetch(`${getApiBase()}/auth/logout`, { method: "POST", headers: { Authorization: `Bearer ${s.accessToken}` } });
    } catch {
      /* mất mạng vẫn xóa phiên ở máy */
    }
  }
  clearSession();
}

export function hasPermission(session, perm) {
  return !!session?.permissions?.includes(perm);
}

/**
 * Xác minh token với backend. status: "ok" | "unauthorized" | "offline"
 */
export async function fetchMe(accessToken) {
  try {
    const res = await fetch(`${getApiBase()}/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (res.status === 401) return { status: "unauthorized" };
    if (!res.ok) return { status: "offline" };
    return { status: "ok", data: await res.json() };
  } catch {
    return { status: "offline" };
  }
}

/**
 * Ghép đường dẫn con vào khu vực (portal) hiện tại, ví dụ đang ở /cyber-security/ads
 * thì portalPath("/detail?id=1") => "/cyber-security/detail?id=1".
 */
export function portalPath(subPath) {
  const sub = subPath.startsWith("/") ? subPath : `/${subPath}`;
  if (typeof window === "undefined") return sub;
  const seg = window.location.pathname.split("/")[1] || "";
  return seg ? `/${seg}${sub}` : sub;
}
