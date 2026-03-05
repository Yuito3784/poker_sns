"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, FormEvent } from "react";
import PokerHandDisplay from "../../components/PokerHandDisplay";
import { API_BASE, fetchWithAuth } from "../../../lib/api";
import { formatRelativeTime } from "../../../lib/utils";
import { useAuth } from "../../../contexts/AuthContext";
import { useToast } from "../../../contexts/ToastContext";
import type { Post, Reply } from "../../../lib/types";

export default function PostDetailClient() {
  const params = useParams();
  const router = useRouter();
  const postId = params.id as string;
  const { auth, isInitialized } = useAuth();
  const currentUser = auth?.user ?? null;
  const { showToast } = useToast();
  const [post, setPost] = useState<Post | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [replyContent, setReplyContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (!isInitialized || !postId) return;
    fetchPost();
    fetchReplies();
  }, [isInitialized, postId]);

  const fetchPost = async () => {
    try {
      const res = await fetch(`${API_BASE}/posts/${postId}`, auth ? {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      } : {});
      if (!res.ok) throw new Error("投稿の取得に失敗しました");
      setPost(await res.json());
    } catch (err: unknown) {
      if (err instanceof TypeError && err.message === "Failed to fetch") {
        setError("サーバーに接続できません。ネットワーク接続を確認してください。");
      } else {
        setError(err instanceof Error ? err.message : "エラーが発生しました");
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchReplies = async () => {
    try {
      const res = await fetch(`${API_BASE}/posts/${postId}/replies`);
      if (res.ok) setReplies(await res.json());
    } catch {
      // ignore
    }
  };

  const handleToggleLike = async () => {
    if (!post) return;
    const wasLiked = post.isLiked;
    setPost((prev) => prev ? {
      ...prev,
      isLiked: !wasLiked,
      _count: { ...prev._count!, likes: (prev._count?.likes ?? 0) + (wasLiked ? -1 : 1), replies: prev._count?.replies ?? 0 },
    } : prev);
    showToast(wasLiked ? "いいねを取り消しました" : "いいねしました");
    try {
      const res = await fetchWithAuth(`${API_BASE}/posts/${post.id}/like`, { method: "POST" });
      if (!res.ok) throw new Error();
    } catch {
      setPost((prev) => prev ? {
        ...prev,
        isLiked: wasLiked,
        _count: { ...prev._count!, likes: (prev._count?.likes ?? 0) + (wasLiked ? 1 : -1), replies: prev._count?.replies ?? 0 },
      } : prev);
      showToast("エラーが発生しました", "error");
    }
  };

  const handleToggleRepost = async () => {
    if (!post) return;
    const wasReposted = post.isReposted;
    setPost((prev) => prev ? {
      ...prev,
      isReposted: !wasReposted,
      _count: { ...prev._count!, reposts: (prev._count?.reposts ?? 0) + (wasReposted ? -1 : 1), likes: prev._count?.likes ?? 0, replies: prev._count?.replies ?? 0 },
    } : prev);
    showToast(wasReposted ? "リポストを取り消しました" : "リポストしました");
    try {
      const res = await fetchWithAuth(`${API_BASE}/posts/${post.id}/repost`, { method: "POST" });
      if (!res.ok) throw new Error();
    } catch {
      setPost((prev) => prev ? {
        ...prev,
        isReposted: wasReposted,
        _count: { ...prev._count!, reposts: (prev._count?.reposts ?? 0) + (wasReposted ? 1 : -1), likes: prev._count?.likes ?? 0, replies: prev._count?.replies ?? 0 },
      } : prev);
      showToast("エラーが発生しました", "error");
    }
  };

  const handleToggleBookmark = async () => {
    if (!post) return;
    const wasBookmarked = post.isBookmarked;
    setPost((prev) => prev ? { ...prev, isBookmarked: !wasBookmarked } : prev);
    showToast(wasBookmarked ? "ブックマークを解除しました" : "ブックマークに追加しました");
    try {
      const res = await fetchWithAuth(`${API_BASE}/posts/${post.id}/bookmark`, { method: "POST" });
      if (!res.ok) throw new Error();
    } catch {
      setPost((prev) => prev ? { ...prev, isBookmarked: wasBookmarked } : prev);
      showToast("エラーが発生しました", "error");
    }
  };

  const handleToggleFollow = async () => {
    if (!post) return;
    const wasFollowing = post.isFollowingAuthor;
    setPost((prev) => prev ? { ...prev, isFollowingAuthor: !wasFollowing } : prev);
    showToast(wasFollowing ? "フォローを解除しました" : "フォローしました");
    try {
      const res = await fetchWithAuth(`${API_BASE}/users/${post.author.username}/follow`, { method: "POST" });
      if (!res.ok) throw new Error();
    } catch {
      setPost((prev) => prev ? { ...prev, isFollowingAuthor: wasFollowing } : prev);
      showToast("エラーが発生しました", "error");
    }
  };

  const handleDeletePost = async () => {
    if (!post) return;
    try {
      const res = await fetchWithAuth(`${API_BASE}/posts/${post.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      showToast("投稿を削除しました");
      router.push("/");
    } catch {
      showToast("削除に失敗しました", "error");
    }
  };

  const handleReply = async (e: FormEvent) => {
    e.preventDefault();
    if (!replyContent.trim()) return;
    setError(null);
    try {
      const res = await fetchWithAuth(`${API_BASE}/posts/${postId}/replies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: replyContent }),
      });
      if (!res.ok) throw new Error("返信に失敗しました");
      setReplyContent("");
      setPost((prev) => prev ? {
        ...prev,
        _count: { ...prev._count!, replies: (prev._count?.replies ?? 0) + 1, likes: prev._count?.likes ?? 0 },
      } : prev);
      showToast("返信しました");
      await fetchReplies();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    }
  };

  const handleCopyLink = () => {
    const url = typeof window !== "undefined" ? `${window.location.origin}/post/${postId}` : "";
    navigator.clipboard?.writeText(url).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 1500);
    }).catch(() => {});
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0d1009]">
        <p className="text-[#7a7260]">読み込み中...</p>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0d1009]">
        <div className="text-center">
          <p className="text-red-400">投稿が見つかりません</p>
          <button onClick={() => router.push("/")} className="mt-4 text-sm text-[#c9a84c] hover:underline">ホームに戻る</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d1009] text-[#ddd6c8]">
      <div className="mx-auto max-w-xl min-h-screen">
        {/* Header */}
        <div className="sticky top-0 z-50 flex items-center gap-4 rounded-b-xl border-b border-amber-500/10 bg-[#1a2f1c] px-4 py-3.5 shadow-[0_2px_12px_rgba(0,0,0,0.15)]">
          <button onClick={() => router.back()} className="rounded-lg p-1.5 text-[#8ba388] transition-colors hover:bg-white/5 hover:text-amber-400">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>
          </button>
          <h1 className="font-[family-name:var(--font-playfair)] text-xl text-[#e8f0e6]">投稿</h1>
        </div>

        {/* Post */}
        <div className="border-b border-[#1f2a1e] px-4 py-4">
          {/* Author row */}
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => window.location.href = `/profile/${post.author.username}`}>
                {post.author.avatarUrl ? (
                  <img src={`${API_BASE}${post.author.avatarUrl}`} alt={post.author.name} className="h-10 w-10 rounded-full object-cover" />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-amber-100 to-amber-200 text-sm font-bold text-amber-800">
                    {post.author.name.charAt(0)}
                  </div>
                )}
              </button>
              <div>
                <button onClick={() => window.location.href = `/profile/${post.author.username}`} className="text-sm font-semibold hover:underline">
                  {post.author.name}
                </button>
                <p className="text-xs text-[#7a7260]">@{post.author.username}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {currentUser && post.author.id !== currentUser.id && (
                <button
                  onClick={handleToggleFollow}
                  disabled={actionLoading === "follow"}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
                    post.isFollowingAuthor
                      ? "border border-[#2a3828] text-[#7a7260] hover:border-red-800 hover:text-red-400"
                      : "bg-[#c9a84c] text-[#0d1009] hover:bg-[#d4b965]"
                  }`}
                >
                  {post.isFollowingAuthor ? "フォロー中" : "フォロー"}
                </button>
              )}
              {currentUser && post.author.id === currentUser.id && (
                <button onClick={() => setShowDeleteConfirm(true)} className="rounded-full px-2.5 py-1 text-xs text-red-400 hover:bg-red-900/20">
                  削除
                </button>
              )}
            </div>
          </div>

          {/* Quote post */}
          {post.parentPost && (
            <div className="mb-3 rounded-xl border border-[#1f2a1e] bg-[#192118] p-3 text-xs text-[#7a7260]">
              <span className="font-medium text-[#7a7260]">{post.parentPost.author.name} <span className="text-[#4a5245]">@{post.parentPost.author.username}</span></span>
              <p className="mt-1 line-clamp-2">{post.parentPost.content}</p>
            </div>
          )}

          {/* Content */}
          {post.isPokerHand ? (
            <>
              {post.content && (
                <p className="mb-3 whitespace-pre-wrap text-[15px] leading-relaxed">{post.content}</p>
              )}
              {post.pokerHand && <PokerHandDisplay hand={post.pokerHand} />}
            </>
          ) : (
            <p className="whitespace-pre-wrap text-[15px] leading-relaxed">{post.content}</p>
          )}

          {/* Post image */}
          {post.imageUrl && (
            <div className="mt-3">
              <img
                src={`${API_BASE}${post.imageUrl}`}
                alt="投稿画像"
                className="max-h-96 rounded-xl border border-[#1f2a1e] object-cover"
                onError={(e) => {
                  const target = e.currentTarget;
                  target.style.display = "none";
                  const fallback = document.createElement("div");
                  fallback.className = "flex h-32 items-center justify-center rounded-xl border border-[#1f2a1e] bg-[#192118] text-xs text-[#4a5245]";
                  fallback.textContent = "画像を読み込めませんでした";
                  target.parentElement?.appendChild(fallback);
                }}
              />
            </div>
          )}

          {/* Timestamp */}
          <p className="mt-3 text-xs text-[#4a5245]">
            {new Date(post.createdAt).toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}
          </p>

          {/* Stats */}
          <div className="mt-3 flex gap-4 border-t border-[#1f2a1e] pt-3 text-xs text-[#7a7260]">
            <span className="flex items-center gap-1.5">
              <svg className="h-4 w-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /></svg>
              <span><span className="font-semibold text-[#ddd6c8]">{post._count?.likes ?? 0}</span> いいね</span>
            </span>
            <span className="flex items-center gap-1.5">
              <svg className="h-4 w-4 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z" /></svg>
              <span><span className="font-semibold text-[#ddd6c8]">{post._count?.replies ?? 0}</span> 返信</span>
            </span>
            <span className="flex items-center gap-1.5">
              <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.678 48.678 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.017.22-.032.441-.046.662M4.5 12c0 1.232.046 2.453.138 3.662a4.006 4.006 0 003.7 3.7 48.656 48.656 0 007.324 0 4.006 4.006 0 003.7-3.7c.017-.22.032-.441.046-.662" /></svg>
              <span><span className="font-semibold text-[#ddd6c8]">{post._count?.reposts ?? 0}</span> リポスト</span>
            </span>
          </div>

          {/* Action buttons */}
          <div className="mt-3 flex items-center justify-around border-t border-[#1f2a1e] pt-3">
            {currentUser ? (
              <>
                <button
                  onClick={handleToggleLike}
                  disabled={actionLoading === "like"}
                  className={`group flex items-center gap-1.5 rounded-full px-3 py-2 text-xs transition-colors disabled:opacity-50 ${
                    post.isLiked ? "text-red-500" : "text-[#7a7260] hover:text-red-400"
                  }`}
                >
                  <svg className="h-5 w-5 transition-transform group-hover:scale-110" fill={post.isLiked ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={post.isLiked ? 0 : 1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                  </svg>
                  <span>いいね</span>
                </button>
                <button
                  onClick={handleToggleRepost}
                  disabled={actionLoading === "repost"}
                  className={`group flex items-center gap-1.5 rounded-full px-3 py-2 text-xs transition-colors disabled:opacity-50 ${
                    post.isReposted ? "text-emerald-500" : "text-[#7a7260] hover:text-emerald-400"
                  }`}
                >
                  <svg className="h-5 w-5 transition-transform group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.678 48.678 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.017.22-.032.441-.046.662M4.5 12c0 1.232.046 2.453.138 3.662a4.006 4.006 0 003.7 3.7 48.656 48.656 0 007.324 0 4.006 4.006 0 003.7-3.7c.017-.22.032-.441.046-.662" />
                  </svg>
                  <span>リポスト</span>
                </button>
                <button
                  onClick={handleToggleBookmark}
                  disabled={actionLoading === "bookmark"}
                  className={`group flex items-center gap-1.5 rounded-full px-3 py-2 text-xs transition-colors disabled:opacity-50 ${
                    post.isBookmarked ? "text-blue-500" : "text-[#7a7260] hover:text-blue-400"
                  }`}
                >
                  <svg className="h-5 w-5 transition-transform group-hover:scale-110" fill={post.isBookmarked ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
                  </svg>
                  <span>保存</span>
                </button>
                <a
                  href={`/?quote=${post.id}`}
                  className="group flex items-center gap-1.5 rounded-full px-3 py-2 text-xs text-neutral-500 transition-colors hover:text-blue-500"
                >
              <svg className="h-5 w-5 transition-transform group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
              </svg>
              <span>引用</span>
            </a>
            <button
              onClick={handleCopyLink}
              className="group flex items-center gap-1.5 rounded-full px-3 py-2 text-xs text-[#6b7a66] transition-colors hover:text-[#c9a84c]"
            >
              {copiedLink ? (
                <svg className="h-5 w-5 text-[#c9a84c]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              ) : (
                <svg className="h-5 w-5 transition-transform group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 000 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
                </svg>
              )}
              <span>{copiedLink ? "コピー済" : "共有"}</span>
            </button>
            <a
              href={(() => {
                const url = typeof window !== "undefined" ? `${window.location.origin}/post/${postId}` : "";
                const text = post.isPokerHand ? `🃏 ポーカーハンド` : (post.content?.slice(0, 30) ?? "");
                return `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
              })()}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-1.5 rounded-full px-3 py-2 text-xs text-[#6b7a66] transition-colors hover:text-[#ddd6c8]"
            >
              <svg className="h-5 w-5 transition-transform group-hover:scale-110" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              <span>X</span>
            </a>
            <a
              href={(() => {
                const url = typeof window !== "undefined" ? `${window.location.origin}/post/${postId}` : "";
                return `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(url)}`;
              })()}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-1.5 rounded-full px-3 py-2 text-xs text-[#6b7a66] transition-colors hover:text-[#00b900]"
            >
              <svg className="h-5 w-5 transition-transform group-hover:scale-110" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
              </svg>
              <span>LINE</span>
            </a>
            <button
              onClick={() => {
                const url = typeof window !== "undefined" ? `${window.location.origin}/post/${postId}` : "";
                navigator.clipboard.writeText(url);
              }}
              aria-label="Discordで共有"
              title="Discordで共有"
              className="group flex items-center gap-1.5 rounded-full px-3 py-2 text-xs text-[#6b7a66] transition-colors hover:text-[#5865F2]"
            >
              <svg className="h-5 w-5 transition-transform group-hover:scale-110" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.8732.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189z" />
              </svg>
              <span>Discord</span>
            </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleCopyLink}
                  className="group flex items-center gap-1.5 rounded-full px-3 py-2 text-xs text-[#6b7a66] transition-colors hover:text-[#c9a84c]"
                >
                  {copiedLink ? (
                    <svg className="h-5 w-5 text-[#c9a84c]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5 transition-transform group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 000 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
                    </svg>
                  )}
                  <span>{copiedLink ? "コピー済" : "共有"}</span>
                </button>
                <a
                  href={(() => {
                    const url = typeof window !== "undefined" ? `${window.location.origin}/post/${postId}` : "";
                    const text = post.isPokerHand ? `🃏 ポーカーハンド` : (post.content?.slice(0, 30) ?? "");
                    return `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
                  })()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-1.5 rounded-full px-3 py-2 text-xs text-[#6b7a66] transition-colors hover:text-[#ddd6c8]"
                >
                  <svg className="h-5 w-5 transition-transform group-hover:scale-110" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                  <span>X</span>
                </a>
                <a
                  href={(() => {
                    const url = typeof window !== "undefined" ? `${window.location.origin}/post/${postId}` : "";
                    return `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(url)}`;
                  })()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-1.5 rounded-full px-3 py-2 text-xs text-[#6b7a66] transition-colors hover:text-[#00b900]"
                >
                  <svg className="h-5 w-5 transition-transform group-hover:scale-110" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
                  </svg>
                  <span>LINE</span>
                </a>
                <button
                  onClick={() => {
                    const url = typeof window !== "undefined" ? `${window.location.origin}/post/${postId}` : "";
                    navigator.clipboard.writeText(url);
                  }}
                  aria-label="Discordで共有"
                  title="Discordで共有"
                  className="group flex items-center gap-1.5 rounded-full px-3 py-2 text-xs text-[#6b7a66] transition-colors hover:text-[#5865F2]"
                >
                  <svg className="h-5 w-5 transition-transform group-hover:scale-110" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.8732.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189z" />
                  </svg>
                  <span>Discord</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Reply form / CTA */}
        <div className="border-b border-[#1f2a1e] px-4 py-3">
          {error && (
            <div className="mb-3 rounded-lg border border-red-900/30 bg-red-900/10 px-3 py-2 text-sm text-red-400">{error}</div>
          )}
          {currentUser ? (
            <form onSubmit={handleReply} className="flex gap-3">
              {currentUser.avatarUrl ? (
                <img src={`${API_BASE}${currentUser.avatarUrl}`} alt={currentUser.name} className="mt-1 h-8 w-8 flex-shrink-0 rounded-full object-cover" />
              ) : (
                <div className="mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-100 to-amber-200 text-xs font-bold text-amber-800">
                  {currentUser.name.charAt(0)}
                </div>
              )}
              <div className="flex-1">
                <textarea
                  className="w-full resize-none rounded-lg border-0 bg-transparent px-1 py-1 text-sm text-[#ddd6c8] outline-none placeholder:text-[#4a5245]"
                  rows={2}
                  placeholder="返信を投稿..."
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="rounded-full bg-[#c9a84c] px-4 py-1.5 text-xs font-semibold text-[#0d1009] transition-colors hover:bg-[#d4b965] disabled:opacity-40"
                    disabled={!replyContent.trim()}
                  >
                    返信
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <div className="relative overflow-hidden rounded-xl bg-[#1a2f1c] p-5 text-center">
              <div className="pointer-events-none absolute inset-0 flex items-center justify-between px-6 text-[#2a4a2d] opacity-30">
                <span className="text-4xl">&spades;</span>
                <span className="text-4xl">&hearts;</span>
                <span className="text-4xl">&diams;</span>
                <span className="text-4xl">&clubs;</span>
              </div>
              <p className="relative font-[family-name:var(--font-playfair)] text-sm font-semibold text-[#e8f0e6]">参加して議論に加わろう</p>
              <p className="relative mt-1 text-xs text-[#8ba388]">いいね・返信・ブックマークにはアカウントが必要です</p>
              <div className="relative mt-3 flex justify-center">
                <a href="/" className="rounded-full bg-amber-500 px-6 py-2 text-xs font-bold text-[#1a2f1c] transition-colors hover:bg-amber-400">
                  ログイン / 新規登録
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Replies */}
        <div>
          {replies.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-[#4a5245]">まだ返信がありません</p>
          ) : (
            <ul>
              {replies.map((reply) => (
                <li key={reply.id} className="border-b border-[#1f2a1e] px-4 py-3">
                  <div className="flex gap-3">
                    <button onClick={() => window.location.href = `/profile/${reply.author.username}`} className="flex-shrink-0">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-amber-100 to-amber-200 text-xs font-bold text-amber-800">
                        {reply.author.name.charAt(0)}
                      </div>
                    </button>
                    <div className="flex-1">
                      <div className="flex items-baseline gap-1.5">
                        <button onClick={() => window.location.href = `/profile/${reply.author.username}`} className="text-sm font-semibold hover:underline">
                          {reply.author.name}
                        </button>
                        <span className="text-xs text-[#4a5245]">@{reply.author.username}</span>
                        <span className="text-xs text-[#4a5245]">{formatRelativeTime(reply.createdAt)}</span>
                      </div>
                      <p className="mt-0.5 whitespace-pre-wrap text-sm leading-relaxed text-[#ddd6c8]">{reply.content}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Delete confirmation dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowDeleteConfirm(false)}>
          <div className="mx-4 w-full max-w-sm rounded-2xl border border-[#1f2a1e] bg-[#131a14] p-6 shadow-xl shadow-black/30" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-[#ddd6c8]">投稿を削除しますか？</h3>
            <p className="mt-2 text-sm text-[#7a7260]">この操作は取り消せません。</p>
            <div className="mt-4 flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 rounded-full border border-[#2a3828] py-2 text-sm font-medium text-[#7a7260] transition-colors hover:bg-[#192118]"
              >
                キャンセル
              </button>
              <button
                onClick={() => { setShowDeleteConfirm(false); handleDeletePost(); }}
                className="flex-1 rounded-full bg-red-500 py-2 text-sm font-medium text-white transition-colors hover:bg-red-600"
              >
                削除する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
