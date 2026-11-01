"use client";

/**
 * Gọi API backend (NestJS). Tự gắn access token, tự làm mới token khi hết hạn,
 * đổi lỗi của backend thành thông báo tiếng Việt dễ đọc.
 *
 *   const page = await api.get("/violations", { status: "NEW", page: 1 });
 *   await api.post(`/violations/${id}/assess`, { withinAuthority: true, hasEnoughInfo: true });
 *   await api.upload("/legal-documents/import", file);
 *   await api.download("/violations/export", { status: "NEW" }, "ho-so-vi-pham.xlsx");
 */

import { clearSession, getApiBase, getSession, saveSession } from "./auth";

export class ApiError extends Error {
  constructor(status, message, data) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

function buildUrl(path, query) {
  const url = new URL(getApiBase() + path);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null || v === "" || (Array.isArray(v) && !v.length)) continue;
      url.searchParams.set(k, Array.isArray(v) ? v.join(",") : String(v));
    }
  }
  return url.toString();
}

const DEFAULT_MESSAGES = {
  0: "Không kết nối được máy chủ. Kiểm tra backend đã chạy (npm run start:dev) chưa.",
  400: "Dữ liệu chưa hợp lệ.",
  401: "Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.",
  403: "Bạn không có quyền thực hiện thao tác này.",
  404: "Không tìm thấy dữ liệu.",
  409: "Dữ liệu bị trùng.",
  413: "File quá lớn.",
  500: "Máy chủ gặp lỗi. Thử lại sau ít phút.",
};

function messageOf(status, data) {
  const m = data?.message;
  if (Array.isArray(m) && m.length) return m.join("; ");
  if (typeof m === "string" && m && m !== "Internal server error") return m;
  return DEFAULT_MESSAGES[status] || DEFAULT_MESSAGES[Math.floor(status / 100) * 100] || "Có lỗi xảy ra.";
}

// Chỉ làm mới token một lần cho nhiều request cùng hết hạn
let refreshing = null;
async function refreshTokens() {
  const s = getSession();
  if (!s?.refreshToken) return false;
  if (!refreshing) {
    refreshing = fetch(getApiBase() + "/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: s.refreshToken, role: s.role || undefined }),
    })
      .then(async (res) => {
        if (!res.ok) return false;
        const d = await res.json();
        saveSession({
          ...s,
          accessToken: d.accessToken,
          refreshToken: d.refreshToken,
          role: d.role,
          user: d.user,
          permissions: d.permissions || [],
          availableRoles: d.availableRoles || [],
        });
        return true;
      })
      .catch(() => false)
      .finally(() => {
        setTimeout(() => (refreshing = null), 0);
      });
  }
  return refreshing;
}

const PUBLIC_PREFIXES = ["/citizen", "/login", "/register", "/role-request"];

function redirectToLogin() {
  if (typeof window === "undefined") return;
  const path = window.location.pathname;
  if (PUBLIC_PREFIXES.some((p) => path === p || path.startsWith(p + "/"))) return;
  window.location.href = `/login?expired=1&next=${encodeURIComponent(path + window.location.search)}`;
}

function filenameFrom(res, fallback) {
  const cd = res.headers.get("content-disposition") || "";
  const star = /filename\*=UTF-8''([^;]+)/i.exec(cd);
  if (star) {
    try {
      return decodeURIComponent(star[1]);
    } catch {
      /* bỏ qua */
    }
  }
  const plain = /filename="?([^";]+)"?/i.exec(cd);
  return plain ? plain[1] : fallback;
}

/**
 * @param {string} method
 * @param {string} path  ví dụ "/violations"
 * @param {{query?: object, body?: any, formData?: FormData, blob?: boolean, auth?: boolean}} opts
 */
export async function request(method, path, opts = {}, _retried = false) {
  const { query, body, formData, blob = false, auth = true } = opts;
  const session = auth ? getSession() : null;
  const headers = {};
  if (session?.accessToken) headers.Authorization = `Bearer ${session.accessToken}`;
  let payload;
  if (formData) payload = formData;
  else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(buildUrl(path, query), { method, headers, body: payload });
  } catch {
    throw new ApiError(0, DEFAULT_MESSAGES[0], null);
  }

  if (res.status === 401 && session?.accessToken && !_retried && path !== "/auth/login") {
    if (await refreshTokens()) return request(method, path, opts, true);
    clearSession();
    redirectToLogin();
    // Trang công khai vẫn chạy được khi không có token
    return request(method, path, { ...opts, auth: false }, true);
  }

  if (blob && res.ok) {
    return { blob: await res.blob(), filename: filenameFrom(res, "tai-lieu") };
  }

  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }
  if (!res.ok) throw new ApiError(res.status, messageOf(res.status, data), data);
  return data;
}

/** Tên file an toàn: bỏ dấu tiếng Việt, thay ký tự không hợp lệ */
function safeFileName(name) {
  return String(name || "tai-lieu")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/[^\w.\-]+/g, "-")
    .replace(/-+/g, "-");
}

function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = safeFileName(filename);
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const api = {
  get: (path, query) => request("GET", path, { query }),
  post: (path, body, query) => request("POST", path, { body: body ?? {}, query }),
  patch: (path, body) => request("PATCH", path, { body: body ?? {} }),
  put: (path, body) => request("PUT", path, { body: body ?? {} }),
  del: (path) => request("DELETE", path),
  /** Upload 1 file (field "file") hoặc nhiều file (field "files") kèm các trường khác */
  upload: (path, fileOrFiles, { fields, query, field } = {}) => {
    const fd = new FormData();
    const list = Array.isArray(fileOrFiles) ? fileOrFiles : [fileOrFiles];
    const name = field || (Array.isArray(fileOrFiles) ? "files" : "file");
    list.filter(Boolean).forEach((f) => fd.append(name, f, f.name));
    if (fields) {
      for (const [k, v] of Object.entries(fields)) {
        if (v !== undefined && v !== null && v !== "") fd.append(k, typeof v === "object" ? JSON.stringify(v) : String(v));
      }
    }
    return request("POST", path, { formData: fd, query });
  },
  /** Tải file (Excel, Word...) về máy */
  download: async (path, query, fallbackName) => {
    const { blob, filename } = await request("GET", path, { query, blob: true });
    saveBlob(blob, filename && filename !== "tai-lieu" ? filename : fallbackName || filename);
  },
};

/** Đường dẫn file đã upload lên backend (/uploads/...) */
export function fileUrl(path) {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  return getApiBase() + (path.startsWith("/") ? path : "/" + path);
}

/** Đường dẫn ngoài có thể mở được (thêm https:// nếu thiếu) */
export function externalUrl(u) {
  if (!u) return "";
  return /^https?:\/\//i.test(u) ? u : `https://${u}`;
}
