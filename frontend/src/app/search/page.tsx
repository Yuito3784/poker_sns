"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PostItem from "../components/PostItem";
import { API_BASE, fetchWithAuth } from "../../lib/api";
import { useAuth } from "../../contexts/AuthContext";
import type { Post, ProfileUser, User } from "../../lib/types";

type FilterTab = "all" | "users" | "posts";

function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const { auth, isInitialized } = useAuth();
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
      const [usersRes, postsRes] = await Promise.all([
        fetchUsers ? fetchWithAuth(`${API_BASE}/search/users?q=${encodeURIComponent(searchQuery)}`) : null,
        fetchPosts ? fetchWithAuth(`${API_BASE}/search/posts?q=${encodeURIComponent(searchQuery)}`) : null,
      ]);
      const u = fetchUsers && usersRes?.ok ? await usersRes.json() : [];
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
    setActionLoading(`like-${postId}`);
    try {
      await fetchWithAuth(`${API_BASE}/posts/${postId}/like`, { method: "POST" });
      handleSearch();
    } catch {
      /* ignore */
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleRepost = async (postId: string) => {
    if (!token) return;
    setActionLoading(`repost-${postId}`);
    try {
      await fetchWithAuth(`${API_BASE}/posts/${postId}/repost`, { method: "POST" });
      handleSearch();
    } catch {
      /* ignore */
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleBookmark = async (postId: string) => {
    if (!token) return;
    setActionLoading(`bookmark-${postId}`);
    try {
      await fetchWithAuth(`${API_BASE}/posts/${postId}/bookmark`, { method: "POST" });
      handleSearch();
    } catch {
      /* ignore */
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleFollow = async (username: string) => {
    try {
      await fetchWithAuth(`${API_BASE}/users/${username}/follow`, { method: "POST" });
      handleSearch();
    } catch {
      /* ignore */
    }
  };

  const handleReply = async (postId: string) => {
    if (!replyContent.trim()) return;
    try {
      await fetchWithAuth(`${API_BASE}/posts/${postId}/replies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: replyContent }),
      });
      setReplyContent("");
      setReplyingTo(null);
      handleSearch();
    } catch {
      /* ignore */
    }
  };

  const handleDelete = async (postId: string) => {
    try {
      await fetchWithAuth(`${API_BASE}/posts/${postId}`, { method: "DELETE" });
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    } catch {
      /* ignore */
    }
  };

  const hasResults = users.length > 0 || posts.length > 0;
  const showUsers = filterTab === "all" || filterTab === "users";
  const showPosts = filterTab === "all" || filterTab === "posts";

  return (
    <div className="min-h-screen" style={{ background: "#0d1009", color: "#ddd6c8" }}>
      <div className="mx-auto max-w-xl min-h-screen">
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
            <p className="mt-3 text-sm" style={{ color: "#6b7a66" }}>2文字以上で検索してください</p>
          </div>
        ) : !hasResults ? (
          <div className="px-4 py-12 text-center">
            <p className="text-sm" style={{ color: "#6b7a66" }}>結果が見つかりませんでした</p>
          </div>
        ) : (
          <>
            {showUsers && users.length > 0 && (
              <div style={{ borderBottom: "1px solid #2a3828" }}>
                <h3 className="px-4 py-2 text-xs font-semibold uppercase tracking-wider" style={{ color: "#6b7a66", borderBottom: "1px solid #1f2a1e" }}>ユーザー</h3>
                <div>
                  {users.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => router.push(`/profile/${user.username}`)}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.03]"
                      style={{ borderBottom: "1px solid #1f2a1e" }}
                    >
                      {user.avatarUrl ? (
                        <img src={`${API_BASE}${user.avatarUrl}`} alt={user.name} className="h-10 w-10 rounded-full object-cover" style={{ border: "1.5px solid rgba(201,168,76,0.2)" }} />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold" style={{ background: "linear-gradient(135deg, #c9a84c22, #9a7c3515)", border: "1.5px solid rgba(201,168,76,0.25)", color: "#c9a84c" }}>{user.name.charAt(0)}</div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold" style={{ color: "#ddd6c8" }}>{user.name}</div>
                        <div className="text-sm" style={{ color: "#6b7a66" }}>@{user.username}</div>
                        {user.bio && <p className="mt-1 truncate text-xs" style={{ color: "#9a8e7a" }}>{user.bio}</p>}
                      </div>
                    </button>
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
