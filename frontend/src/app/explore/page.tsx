"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import PostItem from "../components/PostItem";
import AdCard from "../components/AdCard";
import { API_BASE, fetchWithAuth } from "../../lib/api";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import type { Post, Ad } from "../../lib/types";

const PAGE_SIZE = 20;
const AD_INSERT_EVERY = 3;

export default function ExplorePage() {
  const router = useRouter();
  const { auth, isInitialized } = useAuth();
  const currentUser = auth?.user ?? null;
  const { showToast } = useToast();

  const updatePost = (postId: string, updater: (p: Post) => Post) => {
    setPosts((prev) => prev.map((p) => p.id === postId ? updater(p) : p));
  };

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [period, setPeriod] = useState<"24h" | "7d">("24h");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [ads, setAds] = useState<Ad[]>([]);
  const sentinelRef = useRef<HTMLElement | null>(null);
  const skipRef = useRef(0);
  const hasMoreRef = useRef(false);
  const loadingRef = useRef(false);

  useEffect(() => {
    if (isInitialized && !auth) {
      router.push("/");
    }
  }, [isInitialized, auth, router]);

  useEffect(() => {
    if (!currentUser) return;
    setLoading(true);
    setPosts([]);
    skipRef.current = 0;
    fetchTrending(false);
  }, [currentUser, period]);

  useEffect(() => {
    if (currentUser) fetchAds();
  }, [currentUser]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMoreRef.current && !loadingRef.current) {
          loadingRef.current = true;
          setLoadingMore(true);
          fetchTrending(true);
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [currentUser, period]);

  const fetchAds = async () => {
    try {
      const res = await fetch(`${API_BASE}/ads/feed?limit=10`);
      if (res.ok) {
        const data = await res.json();
        setAds(Array.isArray(data) ? data : []);
      }
    } catch { /* ignore */ }
  };

  const fetchTrending = async (append: boolean) => {
    const skip = append ? skipRef.current : 0;
    try {
      const res = await fetchWithAuth(`${API_BASE}/posts/trending?period=${period}&take=${PAGE_SIZE}&skip=${skip}`);
      if (res.ok) {
        const items: Post[] = await res.json();
        const more = items.length === PAGE_SIZE;
        setHasMore(more);
        hasMoreRef.current = more;
        skipRef.current = skip + items.length;
        if (append) {
          setPosts((prev) => {
            const seen = new Set(prev.map((p) => p.id));
            return [...prev, ...items.filter((p) => !seen.has(p.id))];
          });
        } else {
          setPosts(items);
          skipRef.current = items.length;
        }
      }
    } catch { /* ignore */ }
    finally {
      setLoading(false);
      setLoadingMore(false);
      loadingRef.current = false;
    }
  };

  const handleToggleLike = async (postId: string) => {
    const post = posts.find((p) => p.id === postId);
    if (!post) return;
    const wasLiked = post.isLiked;
    updatePost(postId, (p) => ({
      ...p,
      isLiked: !wasLiked,
      _count: { ...p._count!, likes: (p._count?.likes ?? 0) + (wasLiked ? -1 : 1), replies: p._count?.replies ?? 0 },
    }));
    showToast(wasLiked ? "いいねを取り消しました" : "いいねしました");
    try {
      const res = await fetchWithAuth(`${API_BASE}/posts/${postId}/like`, { method: "POST" });
      if (!res.ok) throw new Error();
    } catch {
      updatePost(postId, (p) => ({
        ...p,
        isLiked: wasLiked,
        _count: { ...p._count!, likes: (p._count?.likes ?? 0) + (wasLiked ? 1 : -1), replies: p._count?.replies ?? 0 },
      }));
      showToast("エラーが発生しました", "error");
    }
  };

  const handleToggleRepost = async (postId: string) => {
    const post = posts.find((p) => p.id === postId);
    if (!post) return;
    const wasReposted = post.isReposted;
    updatePost(postId, (p) => ({
      ...p,
      isReposted: !wasReposted,
      _count: { ...p._count!, reposts: (p._count?.reposts ?? 0) + (wasReposted ? -1 : 1), likes: p._count?.likes ?? 0, replies: p._count?.replies ?? 0 },
    }));
    showToast(wasReposted ? "リポストを取り消しました" : "リポストしました");
    try {
      const res = await fetchWithAuth(`${API_BASE}/posts/${postId}/repost`, { method: "POST" });
      if (!res.ok) throw new Error();
    } catch {
      updatePost(postId, (p) => ({
        ...p,
        isReposted: wasReposted,
        _count: { ...p._count!, reposts: (p._count?.reposts ?? 0) + (wasReposted ? 1 : -1), likes: p._count?.likes ?? 0, replies: p._count?.replies ?? 0 },
      }));
      showToast("エラーが発生しました", "error");
    }
  };

  const handleToggleBookmark = async (postId: string) => {
    const post = posts.find((p) => p.id === postId);
    if (!post) return;
    const wasBookmarked = post.isBookmarked;
    updatePost(postId, (p) => ({ ...p, isBookmarked: !wasBookmarked }));
    showToast(wasBookmarked ? "ブックマークを解除しました" : "ブックマークに追加しました");
    try {
      const res = await fetchWithAuth(`${API_BASE}/posts/${postId}/bookmark`, { method: "POST" });
      if (!res.ok) throw new Error();
    } catch {
      updatePost(postId, (p) => ({ ...p, isBookmarked: wasBookmarked }));
      showToast("エラーが発生しました", "error");
    }
  };

  const handleToggleFollow = async (username: string) => {
    const targetPost = posts.find((p) => p.author.username === username);
    const wasFollowing = targetPost?.isFollowingAuthor ?? false;
    setPosts((prev) => prev.map((p) =>
      p.author.username === username ? { ...p, isFollowingAuthor: !wasFollowing } : p
    ));
    showToast(wasFollowing ? "フォローを解除しました" : "フォローしました");
    try {
      const res = await fetchWithAuth(`${API_BASE}/users/${username}/follow`, { method: "POST" });
      if (!res.ok) throw new Error();
    } catch {
      setPosts((prev) => prev.map((p) =>
        p.author.username === username ? { ...p, isFollowingAuthor: wasFollowing } : p
      ));
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
      updatePost(postId, (p) => ({
        ...p,
        _count: { ...p._count!, replies: (p._count?.replies ?? 0) + 1, likes: p._count?.likes ?? 0 },
      }));
      showToast("返信しました");
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

  const buildFeedItems = () => {
    const isPremium = currentUser?.subscriptionStatus === "active" || currentUser?.subscriptionStatus === "canceled";
    const items: Array<{ type: "post"; post: Post } | { type: "ad"; ad: Ad }> = [];
    posts.forEach((post, i) => {
      items.push({ type: "post", post });
      if (!isPremium && (i + 1) % AD_INSERT_EVERY === 0 && ads.length > 0) {
        const adIndex = Math.floor((i + 1) / AD_INSERT_EVERY) - 1;
        items.push({ type: "ad", ad: ads[adIndex % ads.length] });
      }
    });
    return items;
  };

  return (
    <div className="min-h-screen bg-[#0d1009] text-[#ddd6c8]">
      <div className="mx-auto max-w-xl min-h-screen">
        <div className="sticky top-0 z-50 rounded-b-xl border-b border-amber-500/10 bg-[#1a2f1c] shadow-[0_2px_12px_rgba(0,0,0,0.15)]">
          <div className="flex items-center gap-4 px-4 py-3">
            <button onClick={() => router.back()} className="rounded-lg p-1.5 text-[#8ba388] transition-colors hover:bg-white/5 hover:text-amber-400">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>
            </button>
            <h1 className="font-[family-name:var(--font-playfair)] text-xl text-[#e8f0e6]">トレンド</h1>
          </div>
          <div className="flex border-t border-white/5">
            <button
              onClick={() => setPeriod("24h")}
              className={`flex-1 py-2.5 text-center text-sm font-medium transition-colors ${period === "24h" ? "border-b-2 border-amber-400 text-amber-400" : "text-[#8ba388] hover:bg-white/5 hover:text-[#e8f0e6]"}`}
            >
              24時間
            </button>
            <button
              onClick={() => setPeriod("7d")}
              className={`flex-1 py-2.5 text-center text-sm font-medium transition-colors ${period === "7d" ? "border-b-2 border-amber-400 text-amber-400" : "text-[#8ba388] hover:bg-white/5 hover:text-[#e8f0e6]"}`}
            >
              7日間
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <p className="text-sm text-[#6b7a66]">読み込み中...</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <svg className="mx-auto h-12 w-12 text-[#4a5245]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.047 8.287 8.287 0 009 9.601a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 00.495-7.468 5.99 5.99 0 00-1.925 3.547 5.975 5.975 0 01-2.133-1.001A3.75 3.75 0 0012 18z" /></svg>
            <p className="mt-3 text-sm text-[#6b7a66]">この期間のトレンド投稿がありません</p>
          </div>
        ) : (
          <ul className="space-y-2.5 px-3 py-3">
            {buildFeedItems().map((item, idx) =>
              item.type === "post" ? (
                <PostItem
                  key={item.post.id}
                  post={item.post}
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
              ) : (
                <AdCard key={`ad-${idx}-${item.ad.id}`} ad={item.ad} />
              ),
            )}
            {hasMore && (
              <li ref={(el) => { sentinelRef.current = el; }} className="flex justify-center py-4">
                {loadingMore && <span className="text-sm text-[#6b7a66]">読み込み中...</span>}
              </li>
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
