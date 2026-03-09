"use client";

import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "../../contexts/AuthContext";

type Props = {
  unreadCount?: number;
};

export default function MobileBottomNav({ unreadCount = 0 }: Props) {
  const { auth } = useAuth();
  const currentUser = auth?.user ?? null;
  const pathname = usePathname();
  const router = useRouter();

  if (!currentUser) return null;

  const isHome = pathname === "/";
  const isSearch = pathname?.startsWith("/search");
  const isNotifications = pathname?.startsWith("/notifications");
  const isProfile = pathname?.startsWith("/profile");

  const baseColor = "#6b7a66";
  const activeColor = "#c9a84c";

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around py-2 md:hidden"
      style={{
        background: "#080a08",
        borderTop: "1px solid #1f2a1e",
        boxShadow: "0 -2px 20px rgba(0,0,0,0.5)",
        paddingBottom: "calc(0.5rem + env(safe-area-inset-bottom, 0px))",
      }}
    >
      <button
        onClick={() => router.push("/")}
        className="flex flex-col items-center gap-0.5 p-2"
        style={{ color: isHome ? activeColor : baseColor }}
        aria-label="ホーム"
      >
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
        </svg>
      </button>
      <button
        onClick={() => router.push("/search")}
        className="flex flex-col items-center gap-0.5 p-2 transition-colors"
        style={{ color: isSearch ? activeColor : baseColor }}
        aria-label="検索"
      >
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
      </button>
      <button
        onClick={() => router.push("/notifications")}
        className="relative flex flex-col items-center gap-0.5 p-2 transition-colors"
        style={{ color: isNotifications ? activeColor : baseColor }}
        aria-label="通知"
      >
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
        </svg>
        {unreadCount > 0 && (
          <span
            className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold"
            style={{ background: "#c9a84c", color: "#0d1009" }}
          >
            {unreadCount}
          </span>
        )}
      </button>
      <button
        onClick={() => router.push(`/profile/${currentUser.username}`)}
        className="flex flex-col items-center gap-0.5 p-2 transition-colors"
        style={{ color: isProfile ? activeColor : baseColor }}
        aria-label="プロフィール"
      >
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
        </svg>
      </button>
    </nav>
  );
}

