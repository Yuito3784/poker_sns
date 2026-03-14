"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Avatar from "../components/Avatar";
import PostItem from "../components/PostItem";
import { API_BASE, fetchWithAuth } from "../../lib/api";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import type { Post, ProfileUser, User } from "../../lib/types";

type FilterTab = "all" | "users" | "posts";

/** 検索で取得したユーザー一覧にフォロー状態を付与。検索APIと同じ認証で /search/following-status を呼ぶ */
async function mergeFollowingStatus(
  users: ProfileUser[],
): Promise<Array<ProfileUser & { isFollowing: boolean }> | null> {
  if (users.length === 0) return null;
  try {
    const idsParam = users.map((u) => u.id).join(",");
    const res = await fetchWithAuth(
      `${API_BASE}/search/following-status?ids=${encodeURIComponent(idsParam)}`,
      { method: "GET", cache: "no-store" },
    );
    if (res.ok) {
      const status = (await res.json()) as Record<string, boolean | string>;
      return users.map((usr) => ({
        ...usr,
        isFollowing: status[usr.id] === true || status[usr.id] === "true",
      }));
    }
    return mergeFollowingStatusFallback(users);
  } catch {
    return mergeFollowingStatusFallback(users);
  }
}

/** batch API が使えない場合のフォールバック: 各ユーザーの following を個別取得（最大10件） */
async function mergeFollowingStatusFallback(
  users: ProfileUser[],
): Promise<Array<ProfileUser & { isFollowing: boolean }> | null> {
  const limit = 10;
  try {
    const results = await Promise.all(
      users.slice(0, limit).map(async (usr) => {
        const res = await fetchWithAuth(
          `${API_BASE}/users/${encodeURIComponent(usr.username)}/following`,
          { cache: "no-store" },
        );
        if (!res.ok) return { ...usr, isFollowing: false };
        const data = (await res.json()) as { isFollowing?: boolean };
        return { ...usr, isFollowing: data.isFollowing === true };
      }),
    );
    const rest = users.slice(limit).map((usr) => ({ ...usr, isFollowing: usr.isFollowing === true }));
    return [...results, ...rest];
  } catch {
    return null;
  }
}

function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const { auth, isInitialized } = useAuth();
  const { showToast } = useToast();
  const token = auth?.token ?? null;
  const currentUser = auth?.user ?? null;

  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [users, setUsers] = useState<ProfileUser[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (isInitialized && !auth) {
      router.push("/");
    }
  }, [isInitialized, auth, router]);

  useEffect(() => {
    setSearchQuery(initialQuery);
  }, [initialQuery]);

  const handleSearch = useCallback(async () => {
    if (!token || !searchQuery.trim()) return;
    setLoading(true);
    try {
      const fetchUsers = filterTab !== "posts";
      const fetchPosts = filterTab !== "users";
      const cacheBust = `_t=${Date.now()}`;
      const [usersRes, postsRes] = await Promise.all([
        fetchUsers ? fetchWithAuth(`${API_BASE}/search/users?q=${encodeURIComponent(searchQuery)}&${cacheBust}`) : null,
        fetchPosts ? fetchWithAuth(`${API_BASE}/search/posts?q=${encodeURIComponent(searchQuery)}&${cacheBust}`) : null,
      ]);
      let rawUsers: ProfileUser[] = fetchUsers && usersRes?.ok ? await usersRes.json() : [];
      if (!Array.isArray(rawUsers)) rawUsers = [];
      let u = rawUsers.map((usr: ProfileUser) => ({ ...usr, isFollowing: usr.isFollowing === true }));
      if (u.length > 0 && token) {
        const merged = await mergeFollowingStatus(u);
        if (merged) u = merged;
      }
      const p = fetchPosts && postsRes?.ok ? await postsRes.json() : [];
      setUsers(u);
      setPosts(p);
      const params = new URLSearchParams({ q: searchQuery.trim() });
      router.replace(`/search?${params.toString()}`, { scroll: false });
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [token, searchQuery, filterTab, router]);

  useEffect(() => {
    if (searchQuery.trim().length >= 2 && token) {
      const t = setTimeout(() => handleSearch(), 300);
      return () => clearTimeout(t);
    } else if (searchQuery.trim().length < 2) {
      setUsers([]);
      setPosts([]);
    }
  }, [searchQuery, filterTab, token, handleSearch]);

  const handleToggleLike = async (postId: string) => {
    if (!token) return;
    const post = posts.find((p) => p.id === postId);
    if (!post) return;
    const wasLiked = post.isLiked;
    setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, isLiked: !wasLiked, _count: { ...p._count!, likes: (p._count?.likes ?? 0) + (wasLiked ? -1 : 1), replies: p._count?.replies ?? 0 } } : p));
    showToast(wasLiked ? "いいねを取り消しました" : "いいねしました");
    try {
      const res = await fetchWithAuth(`${API_BASE}/posts/${postId}/like`, { method: "POST" });
      if (!res.ok) throw new Error();
    } catch {
      setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, isLiked: wasLiked, _count: { ...p._count!, likes: (p._count?.likes ?? 0) + (wasLiked ? 1 : -1), replies: p._count?.replies ?? 0 } } : p));
      showToast("エラーが発生しました", "error");
    }
  };

  const handleToggleRepost = async (postId: string) => {
    if (!token) return;
    const post = posts.find((p) => p.id === postId);
    if (!post) return;
    const wasReposted = post.isReposted;
    setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, isReposted: !wasReposted, _count: { ...p._count!, reposts: (p._count?.reposts ?? 0) + (wasReposted ? -1 : 1), likes: p._count?.likes ?? 0, replies: p._count?.replies ?? 0 } } : p));
    showToast(wasReposted ? "リポストを取り消しました" : "リポストしました");
    try {
      const res = await fetchWithAuth(`${API_BASE}/posts/${postId}/repost`, { method: "POST" });
      if (!res.ok) throw new Error();
    } catch {
      setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, isReposted: wasReposted, _count: { ...p._count!, reposts: (p._count?.reposts ?? 0) + (wasReposted ? 1 : -1), likes: p._count?.likes ?? 0, replies: p._count?.replies ?? 0 } } : p));
      showToast("エラーが発生しました", "error");
    }
  };

  const handleToggleBookmark = async (postId: string) => {
    if (!token) return;
    const post = posts.find((p) => p.id === postId);
    if (!post) return;
    const wasBookmarked = post.isBookmarked;
    setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, isBookmarked: !wasBookmarked } : p));
    showToast(wasBookmarked ? "ブックマークを解除しました" : "ブックマークに追加しました");
    try {
      const res = await fetchWithAuth(`${API_BASE}/posts/${postId}/bookmark`, { method: "POST" });
      if (!res.ok) throw new Error();
    } catch {
      setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, isBookmarked: wasBookmarked } : p));
      showToast("エラーが発生しました", "error");
    }
  };

  const handleToggleFollow = async (username: string) => {
    const wasFollowing = users.find((u) => u.username === username)?.isFollowing;
    setUsers((prev) => prev.map((u) => (u.username === username ? { ...u, isFollowing: !wasFollowing } : u)));
    showToast(wasFollowing ? "フォローを解除しました" : "フォローしました");
    try {
      const res = await fetchWithAuth(`${API_BASE}/users/${username}/follow`, { method: "POST" });
      if (!res.ok) throw new Error();
      const data = (await res.json()) as { following: boolean };
      setUsers((prev) =>
        prev.map((u) => (u.username === username ? { ...u, isFollowing: data.following === true } : u))
      );
    } catch {
      setUsers((prev) => prev.map((u) => (u.username === username ? { ...u, isFollowing: wasFollowing === true } : u)));
      showToast("エラーが発生しました", "error");
    }
  };

  const handleReply = async (postId: string) => {
    if (!replyContent.trim()) return;
    try {
      const res = await fetchWithAuth(`${API_BASE}/posts/${postId}/replies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: replyContent }),
      });
      if (!res.ok) throw new Error();
      setReplyContent("");
      setReplyingTo(null);
      showToast("返信しました");
      handleSearch();
    } catch {
      showToast("返信に失敗しました", "error");
    }
  };

  const handleDelete = async (postId: string) => {
    try {
      const res = await fetchWithAuth(`${API_BASE}/posts/${postId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      showToast("投稿を削除しました");
    } catch {
      showToast("削除に失敗しました", "error");
    }
  };

  const hasResults = users.length > 0 || posts.length > 0;
  const showUsers = filterTab === "all" || filterTab === "users";
  const showPosts = filterTab === "all" || filterTab === "posts";

  return (
    <div className="min-h-screen pb-14" style={{ background: "#0d1009", color: "#ddd6c8" }}>
      <div className="mx-auto max-w-xl min-h-screen pb-4">
        <div className="sticky top-0 z-50 border-b" style={{ background: "#131a14", borderColor: "#2a3828" }}>
          <div className="flex items-center gap-4 px-4 py-3">
            <button onClick={() => router.back()} className="rounded-lg p-1.5 transition-colors hover:bg-white/5" style={{ color: "#9a8e7a" }}>
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>
            </button>
            <div className="flex-1">
              <input
                type="text"
                className="w-full rounded-lg px-4 py-2 text-sm outline-none transition-colors"
                style={{
                  background: "#0d1009",
                  border: "1px solid #2a3828",
                  color: "#ddd6c8",
                }}
                placeholder="ユーザー名やキーワードで検索"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(201,168,76,0.5)"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "#2a3828"; }}
                autoFocus
              />
            </div>
            {searchQuery && (
              <button onClick={() => { setSearchQuery(""); setUsers([]); setPosts([]); }} className="rounded-lg p-2 transition-colors hover:bg-white/5" style={{ color: "#9a8e7a" }}>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            )}
          </div>
          <div className="flex" style={{ borderTop: "1px solid #1f2a1e" }}>
            {(["all", "users", "posts"] as FilterTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilterTab(tab)}
                className="flex-1 py-3 text-center text-sm font-medium transition-colors"
                style={
                  filterTab === tab
                    ? { color: "#c9a84c", borderBottom: "2px solid #c9a84c" }
                    : { color: "#6b7a66" }
                }
              >
                {tab === "all" ? "すべて" : tab === "users" ? "ユーザー" : "投稿"}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <p className="text-sm" style={{ color: "#6b7a66" }}>検索中...</p>
          </div>
        ) : searchQuery.trim().length < 2 ? (
          <div className="px-4 py-12 text-center">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="#2a3828" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
            <p className="mt-3 text-sm" style={{ color: "#9a8e7a" }}>2文字以上で検索してください</p>
            <p className="mt-1 text-xs" style={{ color: "#6b7a66" }}>ユーザー名や投稿内容で検索できます</p>
          </div>
        ) : !hasResults ? (
          <div className="px-4 py-12 text-center">
            <svg className="mx-auto h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="#2a3828" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
            <p className="mt-3 text-sm" style={{ color: "#9a8e7a" }}>結果が見つかりませんでした</p>
            <p className="mt-1 text-xs" style={{ color: "#6b7a66" }}>別のキーワードで検索してみてください</p>
          </div>
        ) : (
          <>
            {showUsers && users.length > 0 && (
              <div style={{ borderBottom: "1px solid #2a3828" }}>
                <h3 className="px-4 py-2 text-xs font-semibold uppercase tracking-wider" style={{ color: "#6b7a66", borderBottom: "1px solid #1f2a1e" }}>ユーザー</h3>
                <div>
                  {users.map((user) => (
                    <div
                      key={user.id}
                      className="flex w-full items-center gap-3 px-4 py-3 transition-colors hover:bg-white/[0.03]"
                      style={{ borderBottom: "1px solid #1f2a1e" }}
                    >
                      <button
                        onClick={() => router.push(`/profile/${user.username}`)}
                        className="flex min-w-0 flex-1 items-center gap-3 text-left"
                      >
                        <Avatar avatarUrl={user.avatarUrl} name={user.name} size="lg" />
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold" style={{ color: "#ddd6c8" }}>{user.name}</div>
                          <div className="text-sm" style={{ color: "#6b7a66" }}>@{user.username}</div>
                          {user.bio && <p className="mt-1 truncate text-xs" style={{ color: "#9a8e7a" }}>{user.bio}</p>}
                        </div>
                      </button>
                      {currentUser && currentUser.id !== user.id && (
                        <button
                          type="button"
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleToggleFollow(user.username); }}
                          disabled={actionLoading === `follow-${user.username}`}
                          className="shrink-0 rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-60"
                          style={
                            user.isFollowing === true
                              ? { border: "1px solid #2a3828", color: "#9a8e7a", background: "transparent" }
                              : { background: "#c9a84c", color: "#0d1009", border: "1px solid transparent" }
                          }
                        >
                          {actionLoading === `follow-${user.username}` ? "..." : user.isFollowing === true ? "フォロー中" : "フォロー"}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {showPosts && posts.length > 0 && (
              <div>
                {filterTab === "all" && users.length > 0 && <h3 className="px-4 py-2 text-xs font-semibold uppercase tracking-wider" style={{ color: "#6b7a66", borderBottom: "1px solid #1f2a1e" }}>投稿</h3>}
                <ul className="space-y-2.5 px-3 py-3">
                  {posts.map((post) => (
                    <PostItem
                      key={post.id}
                      post={post}
                      currentUser={currentUser}
                      replyingTo={replyingTo}
                      replyContent={replyContent}
                      actionLoading={actionLoading}
                      onSetReplyingTo={setReplyingTo}
                      onSetReplyContent={setReplyContent}
                      onToggleLike={handleToggleLike}
                      onToggleRepost={handleToggleRepost}
                      onToggleBookmark={handleToggleBookmark}
                      onToggleFollow={handleToggleFollow}
                      onReply={handleReply}
                      onDelete={handleDelete}
                    />
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center" style={{ background: "#0d1009" }}><span style={{ color: "#6b7a66" }}>読み込み中...</span></div>}>
      <SearchContent />
    </Suspense>
  );
}
