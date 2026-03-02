"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import PostItem from "../../components/PostItem";
import AdCard from "../../components/AdCard";
import { API_BASE, fetchWithAuth } from "../../../lib/api";
import { useAuth } from "../../../contexts/AuthContext";
import { useToast } from "../../../contexts/ToastContext";
import type { Post, Ad } from "../../../lib/types";

const PAGE_SIZE = 20;
const AD_INSERT_EVERY = 3;

export default function HashtagClient() {
  const router = useRouter();
  const params = useParams();
  const tag = decodeURIComponent(params.tag as string);
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
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [ads, setAds] = useState<Ad[]>([]);
  const sentinelRef = useRef<HTMLElement | null>(null);
  const skipRef = useRef(0);
  const hasMoreRef = useRef(false);
  const loadingRef = useRef(false);

  useEffect(() => {
    if (!isInitialized || !tag) return;
    fetchPosts(false);
    fetchAds();
  }, [isInitialized, tag]);

  const fetchAds = async () => {
    try {
      const res = await fetch(`${API_BASE}/ads/feed?limit=10`);
      if (res.ok) {
        const data = await res.json();
        setAds(Array.isArray(data) ? data : []);
      }
    } catch { /* ignore */ }
  };

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMoreRef.current && !loadingRef.current) {
          loadingRef.current = true;
          setLoadingMore(true);
          fetchPosts(true);
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [isInitialized, tag]);

  const fetchPosts = async (append: boolean) => {
    const skip = append ? skipRef.current : 0;
    try {
      const fetchFn = auth ? fetchWithAuth : fetch;
      const res = await fetchFn(`${API_BASE}/posts/hashtag/${encodeURIComponent(tag)}?take=${PAGE_SIZE}&skip=${skip}`);
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

  return (
    <div className="min-h-screen bg-[#eef3ea] text-neutral-900">
      <div className="mx-auto max-w-xl min-h-screen">
        <div className="sticky top-0 z-50 flex items-center gap-4 rounded-b-xl border-b border-amber-500/10 bg-[#1a2f1c] px-4 py-3.5 shadow-[0_2px_12px_rgba(0,0,0,0.15)]">
          <button onClick={() => router.back()} className="rounded-lg p-1.5 text-[#8ba388] transition-colors hover:bg-white/5 hover:text-amber-400">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>
          </button>
          <h1 className="font-[family-name:var(--font-playfair)] text-xl text-[#e8f0e6]">#{tag}</h1>
        </div>

        {!currentUser && (
          <div className="relative mx-3 mt-3 overflow-hidden rounded-xl bg-[#1a2f1c] p-4 text-center">
            <div className="pointer-events-none absolute inset-0 flex items-center justify-between px-6 text-[#2a4a2d] opacity-30">
              <span className="text-4xl">&spades;</span>
              <span className="text-4xl">&hearts;</span>
              <span className="text-4xl">&diams;</span>
              <span className="text-4xl">&clubs;</span>
            </div>
            <p className="relative font-[family-name:var(--font-playfair)] text-sm font-semibold text-[#e8f0e6]">参加して議論に加わろう</p>
            <p className="relative mt-1 text-xs text-[#8ba388]">いいね・返信・フォローにはアカウントが必要です</p>
            <div className="relative mt-2 flex justify-center">
              <a href="/" className="rounded-full bg-amber-500 px-6 py-2 text-xs font-bold text-[#1a2f1c] transition-colors hover:bg-amber-400">
                ログイン / 新規登録
              </a>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <p className="text-sm text-neutral-500">読み込み中...</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <p className="mt-3 text-sm text-neutral-500">#{tag} の投稿はまだありません</p>
          </div>
        ) : (
          <ul className="space-y-2.5 px-3 py-3">
            {(() => {
              const isPremium = currentUser?.subscriptionStatus === "active" || currentUser?.subscriptionStatus === "canceled";
              const items: Array<{ type: "post"; post: Post } | { type: "ad"; ad: Ad }> = [];
              posts.forEach((post, i) => {
                items.push({ type: "post", post });
                if (!isPremium && (i + 1) % AD_INSERT_EVERY === 0 && ads.length > 0) {
                  const adIndex = Math.floor((i + 1) / AD_INSERT_EVERY) - 1;
                  items.push({ type: "ad", ad: ads[adIndex % ads.length] });
                }
              });
              return items.map((item, idx) =>
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
              );
            })()}
            {hasMore && (
              <li ref={(el) => { sentinelRef.current = el; }} className="flex justify-center py-4">
                {loadingMore && <span className="text-sm text-neutral-400">読み込み中...</span>}
              </li>
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
