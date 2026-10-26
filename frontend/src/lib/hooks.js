"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "./api";
import { getSession } from "./auth";

/**
 * Tải dữ liệu từ một API GET.
 *   const { data, loading, error, reload } = useApi("/violations/1");
 * path = null -> chưa gọi (VD chờ chọn dòng).
 */
export function useApi(path, query) {
  const [state, setState] = useState({ data: null, loading: !!path, error: null });
  const [tick, setTick] = useState(0);
  const key = JSON.stringify(query || {});

  useEffect(() => {
    if (!path) {
      setState({ data: null, loading: false, error: null });
      return;
    }
    let alive = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    api
      .get(path, query)
      .then((data) => alive && setState({ data, loading: false, error: null }))
      .catch((error) => alive && setState((s) => ({ ...s, loading: false, error })));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, key, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { ...state, reload, setData: (data) => setState((s) => ({ ...s, data })) };
}

/**
 * Danh sách có phân trang + bộ lọc (API trả { data, total, page, pageSize } hoặc mảng).
 *   const list = usePaged("/violations", { status: "" });
 *   list.rows, list.total, list.page, list.setPage(2), list.setFilter("status", "NEW"), list.reload()
 */
export function usePaged(path, initialFilters = {}, { pageSize: initialPageSize = 20 } = {}) {
  const [filters, setFilters] = useState(initialFilters);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const { data, loading, error, reload } = useApi(path, { ...filters, page, pageSize });

  // API trả mảng (không phân trang ở backend) -> chia trang ở trình duyệt
  const rows = Array.isArray(data) ? data.slice((page - 1) * pageSize, page * pageSize) : data?.data || [];
  const total = Array.isArray(data) ? data.length : data?.total ?? rows.length;

  const setFilter = useCallback((k, v) => {
    setFilters((f) => ({ ...f, [k]: v }));
    setPage(1);
  }, []);
  const resetFilters = useCallback(() => {
    setFilters(initialFilters);
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    rows,
    total,
    page,
    pageSize,
    setPage,
    setPageSize: (n) => {
      setPageSize(n);
      setPage(1);
    },
    filters,
    setFilter,
    setFilters: (f) => {
      setFilters(f);
      setPage(1);
    },
    resetFilters,
    loading,
    error,
    reload,
    raw: data,
  };
}

/** Danh sách lựa chọn cho <select> lấy từ API, VD useOptions("/facility-types", r => ({value:r.id,label:r.name})) */
export function useOptions(path, map, query) {
  const { data } = useApi(path, { pageSize: 200, ...(query || {}) });
  const rows = Array.isArray(data) ? data : data?.data || [];
  return rows.map(map);
}

/** Phiên đăng nhập hiện tại (đọc từ localStorage, cập nhật khi tab khác đăng nhập/đăng xuất) */
export function useSession() {
  const [session, setSession] = useState(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setSession(getSession());
    setReady(true);
    const onStorage = () => setSession(getSession());
    window.addEventListener("storage", onStorage);
    window.addEventListener("admonitor-session", onStorage);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("admonitor-session", onStorage);
    };
  }, []);
  const can = useCallback((perm) => !!session?.permissions?.includes(perm), [session]);
  return { session, ready, can, role: session?.role || null };
}

/** Chạy một thao tác (gọi API) có trạng thái đang chạy, tránh bấm 2 lần */
export function useAction() {
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const run = useCallback(async (fn) => {
    if (busyRef.current) return undefined;
    busyRef.current = true;
    setBusy(true);
    try {
      return await fn();
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, []);
  return [busy, run];
}

/** Đọc tham số trên URL (?id=...) phía client */
export function useQueryParam(name) {
  const [value, setValue] = useState(null);
  useEffect(() => {
    const read = () => setValue(new URLSearchParams(window.location.search).get(name));
    read();
    window.addEventListener("popstate", read);
    return () => window.removeEventListener("popstate", read);
  }, [name]);
  return value;
}
