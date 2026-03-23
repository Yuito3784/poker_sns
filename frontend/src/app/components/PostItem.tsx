"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Avatar from "./Avatar";
import PokerHandDisplay from "./PokerHandDisplay";
import PremiumBadge from "./PremiumBadge";
import YouTubeEmbed from "./YouTubeEmbed";
import { formatRelativeTime } from "../../lib/utils";
import { API_BASE, uploadsUrl } from "../../lib/api";
import { analytics } from "../../lib/analytics";
import { useToast } from "../../contexts/ToastContext";
import { extractYouTubeId } from "../../lib/youtube";
import type { Post, User } from "../../lib/types";

function renderContentWithHashtags(content: string): ReactNode[] {
  const parts = content.split(/(#[a-zA-Z0-9_\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]+)/g);
  return parts.map((part, i) => {
    if (part.startsWith("#") && part.length > 1) {
      const tag = part.slice(1);
      return (
        <a
          key={i}
          href={`/hashtag/${encodeURIComponent(tag)}`}
          className="font-medium transition-colors hover:underline"
          style={{ color: "#c9a84c" }}
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </a>
      );
    }
    return part;
  });
}

type Props = {
  post: Post;
  currentUser: User | null;
  replyingTo: string | null;
  replyContent: string;
  actionLoading?: string | null;
  showFollowButton?: boolean;
  onSetReplyingTo: (id: string | null) => void;
  onSetReplyContent: (content: string) => void;
  onToggleLike: (postId: string) => void;
  onToggleRepost: (postId: string) => void;
  onToggleBookmark: (postId: string) => void;
  onToggleFollow: (username: string) => void;
  onReply: (postId: string) => void;
  onDelete: (postId: string) => void;
};

export default function PostItem({
  post,
  currentUser,
  replyingTo,
  replyContent,
  actionLoading,
  onSetReplyingTo,
  onSetReplyContent,
  onToggleLike,
  onToggleRepost,
  onToggleBookmark,
  onToggleFollow,
  onReply,
  onDelete,
  showFollowButton = true,
}: Props) {
  const router = useRouter();
  const { showToast } = useToast();
  const [postMenuOpen, setPostMenuOpen] = useState(false);
  const [copiedPostId, setCopiedPostId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [likeAnimating, setLikeAnimating] = useState(false);
  const [shareMenuOpen, setShareMenuOpen] = useState(false);

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't navigate if clicking on interactive elements
    const target = e.target as HTMLElement;
    if (target.closest("button, a, textarea, input")) return;
    router.push(`/post/${post.id}`);
  };

  return (
    <li
      className="group cursor-pointer rounded-lg transition-all"
      style={{
        background: "#151c15",
        border: "1px solid #2a3828",
        boxShadow: "0 2px 12px rgba(0,0,0,0.3)",
      }}
      onClick={handleCardClick}
      onMouseEnter={(e) => { (e.currentTarget as HTMLLIElement).style.borderColor = "#3a4a38"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLLIElement).style.borderColor = "#2a3828"; }}
    >
      <div className="px-4 pt-4 pb-2">
        {/* Header */}
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <button
              onClick={() => router.push(`/profile/${post.author.username}`)}
              className="flex items-center gap-2.5 text-left"
            >
              <Avatar avatarUrl={post.author.avatarUrl} name={post.author.name} size="md" />
              <div className="flex items-center gap-1.5">
                <span
                  className="font-semibold tracking-tight hover:underline"
                  style={{ color: "#ddd6c8" }}
                >
                  {post.author.name}
                </span>
                {(post.author.subscriptionStatus === "active" || post.author.subscriptionStatus === "canceled") && (
                  <PremiumBadge />
                )}
                <span className="text-xs" style={{ color: "#6b7a66" }}>
                  @{post.author.username}
                </span>
              </div>
            </button>
            {showFollowButton && currentUser && post.author.id !== currentUser.id && (
              <button
                onClick={() => onToggleFollow(post.author.username)}
                className="rounded px-2.5 py-0.5 text-xs font-semibold tracking-wide uppercase transition-all"
                style={
                  post.isFollowingAuthor
                    ? {
                        border: "1px solid #2a3828",
                        color: "#9a8e7a",
                        background: "transparent",
                        letterSpacing: "0.04em",
                      }
                    : {
                        background: "#c9a84c",
                        color: "#0d1009",
                        border: "1px solid transparent",
                        letterSpacing: "0.04em",
                      }
                }
              >
                {post.isFollowingAuthor ? "フォロー中" : "フォロー"}
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {post.isPremiumOnly && (
              <span className="rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wider" style={{ background: "rgba(201,168,76,0.12)", color: "#c9a84c", border: "1px solid rgba(201,168,76,0.25)" }}>PREMIUM</span>
            )}
            <span className="text-xs" style={{ color: "#6b7a66" }}>
              {formatRelativeTime(post.createdAt)}
            </span>
            {currentUser && post.author.id === currentUser.id && (
              <div className="relative">
                <button
                  onClick={() => setPostMenuOpen(!postMenuOpen)}
                  className="rounded p-1 transition-colors"
                  style={{ color: "#6b7a66" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#9a8e7a"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#6b7a66"; }}
                  aria-label="メニュー"
                >
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                    <circle cx="5" cy="12" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="19" cy="12" r="1.5" />
                  </svg>
                </button>
                {postMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setPostMenuOpen(false)} aria-hidden />
                    <div
                      className="absolute right-0 top-full z-20 mt-1 w-36 rounded-lg py-1"
                      style={{
                        background: "#131a14",
                        border: "1px solid #2a3828",
                        boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
                      }}
                    >
                      <button
                        onClick={() => { setShowDeleteConfirm(true); setPostMenuOpen(false); }}
                        className="w-full px-3 py-2 text-left text-sm transition-colors hover:bg-red-900/20"
                        style={{ color: "#e05050" }}
                      >
                        削除
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="ml-11">
          {post.parentPost && (
            <div
              className="mb-2.5 rounded-lg p-2.5 text-xs"
              style={{
                background: "#0d1009",
                border: "1px solid #1f2a1e",
              }}
            >
              <span className="font-semibold" style={{ color: "#9a8e7a" }}>
                {post.parentPost.author.name}{" "}
                <span style={{ color: "#6b7a66" }}>@{post.parentPost.author.username}</span>
              </span>
              <p className="mt-1 line-clamp-2" style={{ color: "#9a8e7a" }}>
                {post.parentPost.content}
              </p>
            </div>
          )}
          {post.isPokerHand ? (
            <>
              {post.content && (
                <p className="mb-2.5 whitespace-pre-wrap text-[15px] leading-relaxed" style={{ color: "#ddd6c8" }}>
                  {renderContentWithHashtags(post.content)}
                </p>
              )}
              {post.pokerHand && <PokerHandDisplay hand={post.pokerHand} />}
            </>
          ) : (
            <p className="whitespace-pre-wrap text-[15px] leading-relaxed" style={{ color: "#ddd6c8" }}>
              {renderContentWithHashtags(post.content)}
            </p>
          )}
          {post.content && (() => {
            const ytId = extractYouTubeId(post.content);
            return ytId ? <YouTubeEmbed videoId={ytId} /> : null;
          })()}
          {post.imageUrl && (
            <div className="mt-2.5">
              <img
                src={uploadsUrl(post.imageUrl)}
                alt={post.content ? `${post.author.name}の投稿画像` : "投稿画像"}
                loading="lazy"
                className="max-h-80 rounded-lg object-cover"
                style={{ border: "1px solid #1f2a1e" }}
                onError={(e) => {
                  const target = e.currentTarget;
                  target.style.display = "none";
                  const fallback = document.createElement("div");
                  fallback.className = "flex h-32 items-center justify-center rounded-lg text-xs";
                  fallback.style.cssText = "background:#0d1009;border:1px solid #1f2a1e;color:#4a5245";
                  fallback.textContent = "画像を読み込めませんでした";
                  target.parentElement?.appendChild(fallback);
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Action Bar */}
      <div
        className="ml-11 mr-4 mb-3 flex items-center gap-0.5 border-t pt-2"
        style={{ borderColor: "#1a2218" }}
      >
        {/* Like */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleLike(post.id);
            setLikeAnimating(true);
            setTimeout(() => setLikeAnimating(false), 400);
          }}
          disabled={actionLoading === `like-${post.id}`}
          className={`group flex items-center gap-1 rounded px-2 py-1.5 text-xs transition-colors disabled:opacity-50 ${
            post.isLiked ? "text-red-400" : "hover:text-red-400"
          }`}
          style={{ color: post.isLiked ? "#f06060" : "#6b7a66" }}
          aria-label="いいね"
        >
          <svg
            className={`h-[17px] w-[17px] transition-transform group-hover:scale-110 ${likeAnimating ? "animate-like-pop" : ""}`}
            fill={post.isLiked ? "currentColor" : "none"}
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={post.isLiked ? 0 : 1.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
          </svg>
          <span className="tabular-nums">{post._count?.likes ?? 0}</span>
        </button>

        {/* Reply */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSetReplyingTo(replyingTo === post.id ? null : post.id);
            onSetReplyContent("");
          }}
          className="group flex items-center gap-1 rounded px-2 py-1.5 text-xs transition-colors"
          style={{ color: replyingTo === post.id ? "#c9a84c" : "#6b7a66" }}
          aria-label="返信"
        >
          <svg className="h-[17px] w-[17px] transition-transform group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z" />
          </svg>
          <span className="tabular-nums">{post._count?.replies ?? 0}</span>
        </button>

        {/* Repost */}
        <button
          onClick={(e) => { e.stopPropagation(); onToggleRepost(post.id); }}
          disabled={actionLoading === `repost-${post.id}`}
          className="group flex items-center gap-1 rounded px-2 py-1.5 text-xs transition-colors disabled:opacity-50"
          style={{ color: post.isReposted ? "#c9a84c" : "#6b7a66" }}
          aria-label="リポスト"
        >
          <svg className="h-[17px] w-[17px] transition-transform group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.678 48.678 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.017.22-.032.441-.046.662M4.5 12c0 1.232.046 2.453.138 3.662a4.006 4.006 0 003.7 3.7 48.656 48.656 0 007.324 0 4.006 4.006 0 003.7-3.7c.017-.22.032-.441.046-.662" />
          </svg>
          <span className="tabular-nums">{post._count?.reposts ?? 0}</span>
        </button>

        {/* Bookmark */}
        <button
          onClick={(e) => { e.stopPropagation(); onToggleBookmark(post.id); }}
          disabled={actionLoading === `bookmark-${post.id}`}
          className="group rounded px-2 py-1.5 text-xs transition-colors disabled:opacity-50"
          style={{ color: post.isBookmarked ? "#c9a84c" : "#6b7a66" }}
          aria-label="ブックマーク"
        >
          <svg className="h-[17px] w-[17px] transition-transform group-hover:scale-110" fill={post.isBookmarked ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
          </svg>
        </button>

        {/* Share menu */}
        <div className="relative">
          <button
            onClick={(e) => { e.stopPropagation(); setShareMenuOpen(!shareMenuOpen); }}
            className="group rounded px-2 py-1.5 transition-colors hover:text-[#c9a84c]"
            style={{ color: "#6b7a66" }}
            aria-label="共有"
            title="共有"
          >
            <svg className="h-[17px] w-[17px] transition-transform group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
          </button>
          {shareMenuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShareMenuOpen(false)} aria-hidden />
              <div
                className="absolute right-0 z-20 mt-1 w-44 rounded-lg py-1 shadow-lg"
                style={{ background: "#131a14", border: "1px solid #2a3828" }}
              >
                {/* Copy link */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const url = typeof window !== "undefined" ? `${window.location.origin}/post/${post.id}` : "";
                    navigator.clipboard?.writeText(url).then(() => {
                      showToast("リンクをコピーしました");
                      analytics.shareClick("copy");
                    }).catch(() => {});
                    setShareMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-xs transition-colors"
                  style={{ color: "#ddd6c8" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(201,168,76,0.08)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} style={{ color: "#6b7a66" }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                  </svg>
                  リンクをコピー
                </button>
                {/* Quote */}
                <a
                  href={`/?quote=${post.id}`}
                  onClick={(e) => { e.stopPropagation(); setShareMenuOpen(false); }}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-xs transition-colors"
                  style={{ color: "#ddd6c8" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = "rgba(201,168,76,0.08)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = "transparent"; }}
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} style={{ color: "#6b7a66" }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                  </svg>
                  引用ポスト
                </a>
                {/* Divider */}
                <div className="my-1 border-t" style={{ borderColor: "#1f2a1e" }} />
                {/* Share on X */}
                <a
                  href={(() => {
                    const url = typeof window !== "undefined"
                      ? `${window.location.origin}/post/${post.id}?utm_source=pokersns&utm_medium=share&utm_campaign=post_share`
                      : "";
                    const text = post.isPokerHand ? "ポーカーハンド" : (post.content?.slice(0, 30) ?? "");
                    return `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
                  })()}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => { e.stopPropagation(); analytics.shareClick("x"); setShareMenuOpen(false); }}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-xs transition-colors"
                  style={{ color: "#ddd6c8" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = "rgba(201,168,76,0.08)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = "transparent"; }}
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" style={{ color: "#6b7a66" }}>
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                  X でシェア
                </a>
                {/* Share on LINE */}
                <a
                  href={(() => {
                    const url = typeof window !== "undefined"
                      ? `${window.location.origin}/post/${post.id}?utm_source=pokersns&utm_medium=share&utm_campaign=post_share`
                      : "";
                    return `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(url)}`;
                  })()}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => { e.stopPropagation(); analytics.shareClick("line"); setShareMenuOpen(false); }}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-xs transition-colors"
                  style={{ color: "#ddd6c8" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = "rgba(201,168,76,0.08)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = "transparent"; }}
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" style={{ color: "#6b7a66" }}>
                    <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
                  </svg>
                  LINE でシェア
                </a>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Reply form */}
      {replyingTo === post.id && (
        <div
          className="mx-4 mb-3 ml-[3.75rem] space-y-2 border-t pt-3"
          style={{ borderColor: "#1f2a1e" }}
        >
          <textarea
            className="w-full resize-none rounded-lg px-3 py-2 text-sm outline-none transition-colors"
            style={{
              background: "#0d1009",
              border: "1px solid #1f2a1e",
              color: "#ddd6c8",
            }}
            rows={2}
            placeholder="返信を入力..."
            value={replyContent}
            onChange={(e) => onSetReplyContent(e.target.value)}
            autoFocus
            onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(201,168,76,0.4)"; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = "#1f2a1e"; }}
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => { onSetReplyingTo(null); onSetReplyContent(""); }}
              className="rounded px-3 py-1.5 text-xs transition-colors"
              style={{ color: "#9a8e7a" }}
            >
              キャンセル
            </button>
            <button
              onClick={() => onReply(post.id)}
              className="rounded px-4 py-1.5 text-xs font-semibold transition-colors disabled:opacity-40"
              style={{ background: "#c9a84c", color: "#0d1009" }}
              disabled={!replyContent.trim()}
            >
              返信
            </button>
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm"
          style={{ background: "rgba(0,0,0,0.7)" }}
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div
            className="mx-4 w-full max-w-sm rounded-xl p-5"
            style={{
              background: "#131a14",
              border: "1px solid #2a3828",
              boxShadow: "0 25px 60px rgba(0,0,0,0.7)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-2 text-base font-semibold" style={{ color: "#ddd6c8" }}>
              投稿を削除しますか？
            </h3>
            <p className="mb-4 text-sm" style={{ color: "#9a8e7a" }}>
              この操作は取り消せません。
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="rounded px-4 py-2 text-sm font-medium transition-colors"
                style={{ border: "1px solid #2a3828", color: "#9a8e7a" }}
              >
                キャンセル
              </button>
              <button
                onClick={() => { onDelete(post.id); setShowDeleteConfirm(false); }}
                className="rounded px-4 py-2 text-sm font-semibold transition-colors"
                style={{ background: "rgba(176,48,48,0.85)", color: "#fca5a5" }}
              >
                削除する
              </button>
            </div>
          </div>
        </div>
      )}
    </li>
  );
}
