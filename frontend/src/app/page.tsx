"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { homeFor } from "@/config/portals";
import { getSession } from "@/lib/auth";

// Trang gốc "/": đã đăng nhập thì vào khu vực của vai trò; chưa đăng nhập thì vào khu vực công khai
// (người dân dùng được không cần đăng nhập, có nút Đăng nhập cho cán bộ).
export default function HomePage() {
  const router = useRouter();
  useEffect(() => {
    router.replace(homeFor(getSession()));
  }, [router]);
  return null;
}
