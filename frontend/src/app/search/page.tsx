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
    <div className="min-h-screen bg-[#eef3ea] text-[#1c2e1a]">
      <div className="mx-auto max-w-xl min-h-screen">
        <div className="sticky top-0 z-50 rounded-b-xl border-b border-amber-500/10 bg-[#1a2f1c] shadow-[0_2px_12px_rgba(0,0,0,0.15)]">
          <div className="flex items-center gap-4 px-4 py-3">
            <button onClick={() => router.back()} className="rounded-lg p-1.5 text-[#8ba388] transition-colors hover:bg-white/5 hover:text-amber-400">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>
            </button>
            <div className="flex-1">
              <input
                type="text"
                className="w-full rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-[#e8f0e6] placeholder:text-[#8ba388] outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30"
                placeholder="ユーザー名やキーワードで検索"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                autoFocus
              />
            </div>
            {searchQuery && (
              <button onClick={() => { setSearchQuery(""); setUsers([]); setPosts([]); }} className="rounded-lg p-2 text-[#8ba388] transition-colors hover:bg-white/5 hover:text-amber-400">✕</button>
            )}
          </div>
          <div className="flex border-t border-white/5">
            <button
              onClick={() => setFilterTab("all")}
              className={`flex-1 py-3 text-center text-sm font-medium transition-colors ${filterTab === "all" ? "border-b-2 border-amber-400 text-amber-400" : "text-[#8ba388] hover:bg-white/5 hover:text-[#e8f0e6]"}`}
            >
              すべて
            </button>
            <button
              onClick={() => setFilterTab("users")}
              className={`flex-1 py-3 text-center text-sm font-medium transition-colors ${filterTab === "users" ? "border-b-2 border-amber-400 text-amber-400" : "text-[#8ba388] hover:bg-white/5 hover:text-[#e8f0e6]"}`}
            >
              ユーザー
            </button>
            <button
              onClick={() => setFilterTab("posts")}
              className={`flex-1 py-3 text-center text-sm font-medium transition-colors ${filterTab === "posts" ? "border-b-2 border-amber-400 text-amber-400" : "text-[#8ba388] hover:bg-white/5 hover:text-[#e8f0e6]"}`}
            >
              投稿
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <p className="text-sm text-neutral-500">検索中...</p>
          </div>
        ) : searchQuery.trim().length < 2 ? (
          <div className="px-4 py-12 text-center">
            <svg className="mx-auto h-12 w-12 text-neutral-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
            <p className="mt-3 text-sm text-neutral-500">2文字以上で検索してください</p>
          </div>
        ) : !hasResults ? (
          <div className="px-4 py-12 text-center">
            <p className="text-sm text-neutral-500">結果が見つかりませんでした</p>
          </div>
        ) : (
          <>
            {showUsers && users.length > 0 && (
              <div className="border-b border-[#d1e0cc]">
                <h3 className="border-b border-[#d1e0cc] px-4 py-2 text-xs font-semibold text-neutral-600">ユーザー</h3>
                <div className="divide-y divide-[#d1e0cc]">
                  {users.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => router.push(`/profile/${user.username}`)}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[#f0fdf4]/60"
                    >
                      {user.avatarUrl ? (
                        <img src={`${API_BASE}${user.avatarUrl}`} alt={user.name} className="h-10 w-10 rounded-full object-cover" />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-sm font-bold text-amber-700">{user.name.charAt(0)}</div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-[#1c2e1a]">{user.name}</div>
                        <div className="text-sm text-neutral-500">@{user.username}</div>
                        {user.bio && <p className="mt-1 truncate text-xs text-neutral-600">{user.bio}</p>}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {showPosts && posts.length > 0 && (
              <div>
                {filterTab === "all" && users.length > 0 && <h3 className="border-b border-[#d1e0cc] px-4 py-2 text-xs font-semibold text-neutral-600">投稿</h3>}
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
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center" style={{ background: "#0d1009" }}><span style={{ color: "#7a7260" }}>読み込み中...</span></div>}>
      <SearchContent />
    </Suspense>
  );
}
