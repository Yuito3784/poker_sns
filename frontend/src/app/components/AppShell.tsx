"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Avatar from "./Avatar";
import PremiumBadge from "./PremiumBadge";
import SidebarAds from "./SidebarAds";
import AffiliateCard from "./AffiliateCard";
import MobileBottomNav from "./MobileBottomNav";
import { API_BASE, fetchWithAuth } from "../../lib/api";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import type { Notification } from "../../lib/types";
import type { AffiliatePartner } from "../../lib/types";

const SIDEBAR_EXCLUDE_PATHS = ["/lp", "/forgot-password", "/reset-password", "/verify-email", "/tokushoho"];

function shouldShowSidebars(pathname: string): boolean {
  if (!pathname) return false;
  return !SIDEBAR_EXCLUDE_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { auth, isInitialized, clearAuth } = useAuth();
  const currentUser = auth?.user ?? null;
  const token = auth?.token ?? null;
  const { showToast } = useToast();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [rightSidebarSearch, setRightSidebarSearch] = useState("");
  const [featuredPartners, setFeaturedPartners] = useState<AffiliatePartner[]>([]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const showShell = isInitialized && currentUser && shouldShowSidebars(pathname ?? "");

  useEffect(() => {
    if (!token || !currentUser) return;
    const fetchNotifications = async () => {
      try {
        const res = await fetchWithAuth(`${API_BASE}/notifications`);
        if (res.ok) {
          const data = await res.json();
          setNotifications(Array.isArray(data) ? data : []);
        }
      } catch {
        /* ignore */
      }
    };
    fetchNotifications();
  }, [token, currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    const fetchSidebarPartners = async () => {
      try {
        const res = await fetch(`${API_BASE}/affiliates/sidebar?limit=3`);
        if (res.ok) {
          const data = await res.json();
          setFeaturedPartners(Array.isArray(data) ? data : []);
        }
      } catch {
        /* ignore */
      }
    };
    fetchSidebarPartners();
  }, [currentUser]);

  const handleLogout = async () => {
    try {
      await fetchWithAuth(`${API_BASE}/auth/logout`, { method: "POST" });
    } catch {
      /* ignore */
    }
    clearAuth();
    router.push("/");
  };

  if (!showShell) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen" style={{ background: "#0d1009", color: "#ddd6c8" }}>
      <div className="mx-auto flex min-h-screen max-w-[1280px]">
        {/* Left Sidebar */}
        <aside
          className="sticky top-0 hidden h-screen w-20 flex-col justify-between p-2 md:flex lg:w-64 lg:px-3 lg:py-3"
          style={{ background: "#080a08", borderRight: "1px solid #1f2a1e" }}
        >
          <div>
            <div className="mb-6 flex items-center gap-2.5 px-2 py-2">
              <span
                className="hidden font-[family-name:var(--font-playfair)] text-lg font-semibold tracking-tight lg:inline"
                style={{ color: "#ddd6c8" }}
              >
                Poker SNS
              </span>
            </div>
            <nav className="space-y-0.5">
              <button onClick={() => router.push("/")} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 lg:text-sm" style={{ color: pathname === "/" ? "#c9a84c" : "#6b7a66", background: pathname === "/" ? "rgba(201,168,76,0.06)" : "transparent" }}>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>
                <span className="hidden lg:inline">ホーム</span>
              </button>
              <button onClick={() => router.push("/search")} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-white/[0.03] lg:text-sm" style={{ color: "#6b7a66" }} onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#9a8e7a"; }} onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#6b7a66"; }}>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
                <span className="hidden lg:inline">検索</span>
              </button>
              <button onClick={() => router.push("/notifications")} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-white/[0.03] lg:text-sm" style={{ color: pathname === "/notifications" ? "#c9a84c" : "#6b7a66" }} onMouseEnter={(e) => { if (pathname !== "/notifications") (e.currentTarget as HTMLButtonElement).style.color = "#9a8e7a"; }} onMouseLeave={(e) => { if (pathname !== "/notifications") (e.currentTarget as HTMLButtonElement).style.color = "#6b7a66"; }}>
                <div className="relative">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" /></svg>
                  {unreadCount > 0 && <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold" style={{ background: "#c9a84c", color: "#0d1009" }}>{unreadCount}</span>}
                </div>
                <span className="hidden lg:inline">通知</span>
              </button>
              <button onClick={() => router.push("/explore")} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-white/[0.03] lg:text-sm" style={{ color: "#6b7a66" }} onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#9a8e7a"; }} onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#6b7a66"; }}>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.047 8.287 8.287 0 009 9.601a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 00.495-7.468 5.99 5.99 0 00-1.925 3.547 5.975 5.975 0 01-2.133-1.001A3.75 3.75 0 0012 18z" /></svg>
                <span className="hidden lg:inline">トレンド</span>
              </button>
              <button onClick={() => router.push("/bookmarks")} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-white/[0.03] lg:text-sm" style={{ color: "#6b7a66" }} onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#9a8e7a"; }} onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#6b7a66"; }}>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" /></svg>
                <span className="hidden lg:inline">ブックマーク</span>
              </button>
              <button onClick={() => showToast("サロンは今後実装予定です", "info")} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-white/[0.03] lg:text-sm" style={{ color: "#6b7a66" }} onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#9a8e7a"; }} onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#6b7a66"; }}>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" /></svg>
                <span className="hidden lg:inline">サロン</span>
              </button>
              <button onClick={() => showToast("コーチングは今後実装予定です", "info")} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-white/[0.03] lg:text-sm" style={{ color: "#6b7a66" }} onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#9a8e7a"; }} onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#6b7a66"; }}>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 00-.491 6.347A48.62 48.62 0 0112 20.904a48.62 48.62 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.636 50.636 0 00-2.658-.813A59.906 59.906 0 0112 3.493a59.903 59.903 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" /></svg>
                <span className="hidden lg:inline">コーチング</span>
              </button>
              <button onClick={() => router.push("/partners")} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-white/[0.03] lg:text-sm" style={{ color: "#6b7a66" }} onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#9a8e7a"; }} onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#6b7a66"; }}>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.562.562 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" /></svg>
                <span className="hidden lg:inline">おすすめ</span>
              </button>
              <button onClick={() => router.push("/settings")} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-white/[0.03] lg:text-sm" style={{ color: "#6b7a66" }} onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#9a8e7a"; }} onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#6b7a66"; }}>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                <span className="hidden lg:inline">設定</span>
              </button>
            </nav>
            <button
              onClick={() => {
                if (currentUser && !currentUser.emailVerified) {
                  showToast("メールアドレスの認証が必要です", "error");
                  return;
                }
                router.push("/?compose=1");
              }}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all"
              style={{ background: "#c9a84c", color: "#0d1009" }}
            >
              <svg className="h-5 w-5 lg:hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              <span className="hidden lg:inline">投稿する</span>
            </button>
          </div>
          <div className="border-t pt-2" style={{ borderColor: "#1f2a1e" }}>
            <button
              onClick={() => router.push(`/profile/${currentUser!.username}`)}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-2 transition-colors hover:bg-white/[0.03]"
            >
              <Avatar avatarUrl={currentUser!.avatarUrl} name={currentUser!.name} size="sm" />
              <div className="hidden flex-1 text-left lg:block">
                <div className="flex items-center gap-1.5 text-sm font-semibold" style={{ color: "#ddd6c8" }}>
                  {currentUser!.name}
                  {(currentUser!.subscriptionStatus === "active" || currentUser!.subscriptionStatus === "canceled") && <PremiumBadge />}
                </div>
                <div className="text-xs" style={{ color: "#6b7a66" }}>@{currentUser!.username}</div>
              </div>
            </button>
            <button
              onClick={handleLogout}
              className="mt-0.5 flex w-full items-center gap-3 rounded-lg px-2 py-2 text-sm transition-colors hover:bg-red-900/20"
              style={{ color: "#6b7a66" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#e05050"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#6b7a66"; }}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" /></svg>
              <span className="hidden lg:inline">ログアウト</span>
            </button>
            <div className="mt-2 hidden border-t pt-2 lg:block" style={{ borderColor: "#1f2a1e" }}>
              <div className="flex flex-wrap gap-x-2 gap-y-0.5 px-2">
                <a href="/terms" className="text-[10px] transition-colors hover:underline" style={{ color: "#2a3828" }}>利用規約</a>
                <span className="text-[10px]" style={{ color: "#2a3828" }}>·</span>
                <a href="/privacy" className="text-[10px] transition-colors hover:underline" style={{ color: "#2a3828" }}>プライバシー</a>
                <span className="text-[10px]" style={{ color: "#2a3828" }}>·</span>
                <a href="/tokushoho" className="text-[10px] transition-colors hover:underline" style={{ color: "#2a3828" }}>特定商取引法</a>
              </div>
              <p className="mt-0.5 px-2 text-[9px]" style={{ color: "#1f2a1e" }}>© 2026 Poker SNS</p>
            </div>
          </div>
        </aside>

        {/* Main Column */}
        <main className="min-h-screen flex-1 pb-20 md:max-w-xl md:pb-0" style={{ background: "#0d1009" }}>
          {children}
        </main>

        {/* Right Sidebar */}
        <aside className="sticky top-0 hidden h-screen flex-shrink-0 flex-col px-4 xl:flex xl:w-80 xl:pt-3">
          <div
            className="flex-shrink-0 rounded-lg px-4 py-2.5 transition-all"
            style={{ background: "#131a14", border: "1px solid #1f2a1e" }}
          >
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const q = rightSidebarSearch.trim();
                if (q) router.push(`/search?q=${encodeURIComponent(q)}`);
              }}
              className="flex items-center gap-2"
            >
              <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="#6b7a66" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
              <input
                type="text"
                className="flex-1 bg-transparent text-sm outline-none"
                placeholder="検索"
                style={{ color: "#ddd6c8" }}
                value={rightSidebarSearch}
                onChange={(e) => setRightSidebarSearch(e.target.value)}
              />
            </form>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto pt-3">
            <SidebarAds />
            {featuredPartners.length > 0 && (
              <div className="mt-3 rounded-lg p-4" style={{ background: "#131a14", border: "1px solid #1f2a1e" }}>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "#6b7a66" }}>
                  おすすめサービス
                </h3>
                <div className="space-y-2">
                  {featuredPartners.map((partner) => (
                    <AffiliateCard key={partner.id} partner={partner} referrer="sidebar" compact />
                  ))}
                </div>
                <button
                  onClick={() => router.push("/partners")}
                  className="mt-3 w-full text-center text-xs font-medium transition-colors hover:underline"
                  style={{ color: "#c9a84c" }}
                >
                  すべて見る
                </button>
              </div>
            )}
          </div>
        </aside>
      </div>
      <MobileBottomNav unreadCount={unreadCount} />
    </div>
  );
}
