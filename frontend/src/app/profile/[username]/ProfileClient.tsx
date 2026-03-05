"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import PokerHandDisplay from "../../components/PokerHandDisplay";
import PremiumBadge from "../../components/PremiumBadge";
import { API_BASE, fetchWithAuth } from "../../../lib/api";
import { formatRelativeTime } from "../../../lib/utils";
import { useAuth } from "../../../contexts/AuthContext";
import type { Post, UserProfile, ProfileUser } from "../../../lib/types";

function AvatarDisplay({ profile, size = "lg" }: { profile: { name: string; avatarUrl?: string | null }; size?: "sm" | "lg" }) {
  const sizeClass = size === "lg" ? "h-20 w-20 text-2xl" : "h-10 w-10 text-sm";
  if (profile.avatarUrl) {
    return (
      <img
        src={`${API_BASE}${profile.avatarUrl}`}
        alt={profile.name}
        className={`${sizeClass} rounded-full object-cover`}
        style={{ border: "2px solid rgba(201,168,76,0.25)" }}
      />
    );
  }
  return (
    <div
      className={`flex ${sizeClass} items-center justify-center rounded-full font-bold`}
      style={{
        background: "linear-gradient(135deg, #c9a84c22, #9a7c3515)",
        border: "2px solid rgba(201,168,76,0.25)",
        color: "#c9a84c",
      }}
    >
      {profile.name.charAt(0)}
    </div>
  );
}

export default function ProfileClient() {
  const params = useParams();
  const router = useRouter();
  const username = params.username as string;
  const { auth, isInitialized, setAuth } = useAuth();
  const token = auth?.token ?? null;
  const currentUser = auth?.user ?? null;
  const currentUserId = currentUser?.id ?? null;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [activeTab, setActiveTab] = useState<"posts" | "likes" | "bookmarks">("posts");
  const [showListModal, setShowListModal] = useState<"followers" | "following" | null>(null);
  const [listUsers, setListUsers] = useState<ProfileUser[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  useEffect(() => {
    if (!isInitialized || !username) return;
    fetchProfile();
    if (token) {
      checkFollowing();
      fetchBlockMuteStatus();
    }
  }, [isInitialized, token, username]);

  useEffect(() => {
    if (profile) {
      setEditName(profile.name);
      setEditBio(profile.bio || "");
    }
  }, [profile]);

  useEffect(() => {
    if (profile) {
      if (activeTab === "posts") fetchPosts();
      else if (activeTab === "likes" && token) fetchLikedPosts();
      else if (activeTab === "bookmarks" && currentUserId === profile.id) fetchBookmarks();
    }
  }, [profile, activeTab, currentUserId, token]);

  const fetchProfile = async () => {
    try {
      const res = await fetch(`${API_BASE}/users/${username}`);
      if (!res.ok) {
        throw new Error("プロフィールの取得に失敗しました");
      }
      const data = await res.json();
      setProfile(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "エラーが発生しました";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const fetchPosts = async () => {
    if (!profile) return;
    try {
      const fetchFn = token ? fetchWithAuth : fetch;
      const res = await fetchFn(`${API_BASE}/posts/user/${profile.id}`);
      if (res.ok) {
        const data = await res.json();
        setPosts(data);
      }
    } catch {
      // ignore
    }
  };

  const fetchBookmarks = async () => {
    if (!profile || currentUserId !== profile.id) return;
    try {
      const res = await fetchWithAuth(`${API_BASE}/posts/user/${profile.id}/bookmarks`);
      if (res.ok) setPosts(await res.json());
      else setPosts([]);
    } catch {
      setPosts([]);
    }
  };

  const handlePinPost = async (postId: string) => {
    if (!token || !profile || currentUserId !== profile.id) return;
    try {
      const isCurrentlyPinned = profile.pinnedPostId === postId;
      const res = await fetchWithAuth(
        isCurrentlyPinned ? `${API_BASE}/posts/unpin` : `${API_BASE}/posts/${postId}/pin`,
        { method: "POST" },
      );
      if (!res.ok) throw new Error("ピン留めに失敗しました");
      await fetchProfile();
      await fetchPosts();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "エラーが発生しました";
      setError(message);
    }
  };

  const fetchLikedPosts = async () => {
    if (!profile) return;
    try {
      const res = await fetchWithAuth(`${API_BASE}/posts/user/${profile.id}/likes`);
      if (res.ok) {
        const data = await res.json();
        setPosts(data);
      }
    } catch {
      setPosts([]);
    }
  };

  const fetchFollowers = async () => {
    setLoadingList(true);
    try {
      const res = await fetchWithAuth(`${API_BASE}/users/${username}/followers`);
      if (res.ok) {
        const data = await res.json();
        setListUsers(data);
      }
    } catch {
      setListUsers([]);
    } finally {
      setLoadingList(false);
    }
  };

  const fetchFollowing = async () => {
    setLoadingList(true);
    try {
      const res = await fetchWithAuth(`${API_BASE}/users/${username}/following-list`);
      if (res.ok) {
        const data = await res.json();
        setListUsers(data);
      }
    } catch {
      setListUsers([]);
    } finally {
      setLoadingList(false);
    }
  };

  const openListModal = (type: "followers" | "following") => {
    setShowListModal(type);
    if (type === "followers") fetchFollowers();
    else fetchFollowing();
  };

  const checkFollowing = async () => {
    try {
      const res = await fetchWithAuth(`${API_BASE}/users/${username}/following`);
      if (res.ok) {
        const data = await res.json();
        setIsFollowing(data.isFollowing);
      }
    } catch {
      // ignore
    }
  };

  const fetchBlockMuteStatus = async () => {
    try {
      const res = await fetchWithAuth(`${API_BASE}/users/${username}/block-mute-status`);
      if (res.ok) {
        const data = await res.json();
        setIsBlocked(data.isBlocked);
        setIsMuted(data.isMuted);
      }
    } catch { /* ignore */ }
  };

  const handleToggleBlock = async () => {
    try {
      const res = await fetchWithAuth(`${API_BASE}/users/${username}/block`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setIsBlocked(data.blocked);
        if (data.blocked) setIsFollowing(false);
        setShowMoreMenu(false);
      }
    } catch { /* ignore */ }
  };

  const handleToggleMute = async () => {
    try {
      const res = await fetchWithAuth(`${API_BASE}/users/${username}/mute`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setIsMuted(data.muted);
        setShowMoreMenu(false);
      }
    } catch { /* ignore */ }
  };

  const handleToggleFollow = async () => {
    if (!token) return;
    try {
      const res = await fetchWithAuth(`${API_BASE}/users/${username}/follow`, {
        method: "POST",
      });
      if (!res.ok) {
        throw new Error("フォローに失敗しました");
      }
      const data = await res.json();
      setIsFollowing(data.following);
      await fetchProfile();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "エラーが発生しました";
      setError(message);
    }
  };

  const handleUpdateProfile = async () => {
    if (!token) return;
    try {
      const res = await fetchWithAuth(`${API_BASE}/users/me`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          bio: editBio,
        }),
      });
      if (!res.ok) {
        throw new Error("プロフィールの更新に失敗しました");
      }
      setIsEditing(false);
      await fetchProfile();
      const updatedUser = await res.json();
      if (token) setAuth(token, updatedUser);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "エラーが発生しました";
      setError(message);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token) return;
    setUploadingAvatar(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("avatar", file);
      const res = await fetchWithAuth(`${API_BASE}/users/me/avatar`, {
        method: "PATCH",
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg = typeof data?.message === "string" ? data.message : Array.isArray(data?.message) ? data.message.join(", ") : "アバターのアップロードに失敗しました";
        throw new Error(msg);
      }
      const updatedUser = await res.json();
      if (token) setAuth(token, updatedUser);
      await fetchProfile();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "エラーが発生しました";
      setError(message);
    } finally {
      setUploadingAvatar(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen" style={{ background: "#0d1009" }} />;
  }

  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: "#0d1009" }}>
        <p style={{ color: "#e05050" }}>ユーザーが見つかりません</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "#0d1009", color: "#ddd6c8" }}>
      <header className="sticky top-0 z-50 border-b" style={{ background: "#131a14", borderColor: "#2a3828" }}>
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-2 rounded-lg p-1.5 transition-colors hover:bg-white/5"
            style={{ color: "#9a8e7a" }}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>
            <span className="font-[family-name:var(--font-playfair)] text-lg" style={{ color: "#ddd6c8" }}>プロフィール</span>
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6">
        {error && (
          <div className="mb-3 rounded-lg px-3 py-2 text-sm" style={{ background: "rgba(224,80,80,0.08)", border: "1px solid rgba(224,80,80,0.25)", color: "#e05050" }}>{error}</div>
        )}
        <div className="rounded-xl p-6" style={{ background: "#151c15", border: "1px solid #2a3828" }}>
          <div className="mb-4 flex items-center gap-4">
            <div className="relative">
              <AvatarDisplay profile={profile} size="lg" />
              {currentUserId === profile.id && (
                <label className="absolute -bottom-1 -right-1 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full shadow transition-colors" style={{ background: "#c9a84c", color: "#0d1009" }}>
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" /><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" /></svg>
                  <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={handleAvatarUpload} disabled={uploadingAvatar} />
                </label>
              )}
            </div>
          </div>
          <div className="mb-4 flex items-start justify-between">
            {isEditing ? (
              <div className="flex-1 space-y-3">
                <div>
                  <label className="block text-xs font-medium" style={{ color: "#9a8e7a" }}>名前</label>
                  <input
                    type="text"
                    className="mt-1 w-full rounded-lg px-3 py-2 text-sm outline-none"
                    style={{ background: "#0d1009", border: "1px solid #2a3828", color: "#ddd6c8" }}
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(201,168,76,0.5)"; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = "#2a3828"; }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium" style={{ color: "#9a8e7a" }}>自己紹介</label>
                  <textarea
                    className="mt-1 w-full resize-none rounded-lg px-3 py-2 text-sm outline-none"
                    style={{ background: "#0d1009", border: "1px solid #2a3828", color: "#ddd6c8" }}
                    rows={3}
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(201,168,76,0.5)"; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = "#2a3828"; }}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleUpdateProfile}
                    className="rounded-lg px-4 py-2 text-sm font-semibold transition-colors"
                    style={{ background: "#c9a84c", color: "#0d1009" }}
                  >
                    保存
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      if (profile) {
                        setEditName(profile.name);
                        setEditBio(profile.bio || "");
                      }
                    }}
                    className="rounded-lg px-4 py-2 text-sm transition-colors"
                    style={{ border: "1px solid #2a3828", color: "#9a8e7a" }}
                  >
                    キャンセル
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div>
                  <h1 className="flex items-center gap-2 text-2xl font-bold" style={{ color: "#ddd6c8" }}>
                    {profile.name}
                    {(profile.subscriptionStatus === "active" || profile.subscriptionStatus === "canceled") && <PremiumBadge size="md" />}
                    {currentUserId && currentUserId === profile.id && profile.subscriptionStatus !== "active" && profile.subscriptionStatus !== "canceled" && (
                      <a
                        href="/settings"
                        className="rounded px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors"
                        style={{ background: "rgba(201,168,76,0.1)", color: "#c9a84c", border: "1px solid rgba(201,168,76,0.3)" }}
                      >
                        PRO になる
                      </a>
                    )}
                  </h1>
                  <p style={{ color: "#6b7a66" }}>@{profile.username}</p>
                  {profile.bio && (
                    <p className="mt-2 text-sm" style={{ color: "#9a8e7a" }}>{profile.bio}</p>
                  )}
                </div>
                {currentUserId && currentUserId === profile.id ? (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="rounded-lg px-4 py-2 text-sm font-semibold transition-colors hover:bg-white/5"
                    style={{ border: "1px solid #2a3828", color: "#ddd6c8" }}
                  >
                    編集
                  </button>
                ) : currentUser ? (
                  <div className="flex items-center gap-2">
                    {!isBlocked && (
                      <button
                        onClick={handleToggleFollow}
                        className="rounded-lg px-4 py-2 text-sm font-semibold transition-colors"
                        style={
                          isFollowing
                            ? { border: "1px solid #2a3828", color: "#9a8e7a", background: "transparent" }
                            : { background: "#c9a84c", color: "#0d1009", border: "1px solid transparent" }
                        }
                      >
                        {isFollowing ? "フォロー中" : "フォロー"}
                      </button>
                    )}
                    <div className="relative">
                      <button
                        onClick={() => setShowMoreMenu(!showMoreMenu)}
                        className="rounded-lg p-2 transition-colors hover:bg-white/5"
                        style={{ border: "1px solid #2a3828", color: "#6b7a66" }}
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM12.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM18.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" /></svg>
                      </button>
                      {showMoreMenu && (
                        <div className="absolute right-0 top-full z-20 mt-1 w-44 rounded-xl py-1" style={{ background: "#151c15", border: "1px solid #2a3828", boxShadow: "0 8px 32px rgba(0,0,0,0.6)" }}>
                          <button onClick={handleToggleMute} className="flex w-full items-center gap-2 px-4 py-2 text-sm transition-colors hover:bg-white/5" style={{ color: "#9a8e7a" }}>
                            <svg className="h-4 w-4" style={{ color: "#6b7a66" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75L19.5 12m0 0l2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6l4.72-4.72a.75.75 0 011.28.531V19.94a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.506-1.938-1.354A9.009 9.009 0 012.25 12c0-.83.112-1.633.322-2.395C2.806 8.757 3.63 8.25 4.51 8.25H6.75z" /></svg>
                            {isMuted ? "ミュート解除" : "ミュート"}
                          </button>
                          <button onClick={handleToggleBlock} className="flex w-full items-center gap-2 px-4 py-2 text-sm transition-colors hover:bg-white/5" style={{ color: "#e05050" }}>
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                            {isBlocked ? "ブロック解除" : "ブロック"}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}
              </>
            )}
          </div>

          <div className="flex gap-6 text-sm">
            <div>
              <span className="font-semibold" style={{ color: "#ddd6c8" }}>{profile._count.posts}</span>{" "}
              <span style={{ color: "#6b7a66" }}>投稿</span>
            </div>
            <button
              onClick={() => openListModal("followers")}
              className="text-left hover:underline"
            >
              <span className="font-semibold" style={{ color: "#ddd6c8" }}>{profile._count.followers}</span>{" "}
              <span style={{ color: "#6b7a66" }}>フォロワー</span>
            </button>
            <button
              onClick={() => openListModal("following")}
              className="text-left hover:underline"
            >
              <span className="font-semibold" style={{ color: "#ddd6c8" }}>{profile._count.following}</span>{" "}
              <span style={{ color: "#6b7a66" }}>フォロー中</span>
            </button>
          </div>
        </div>

        <div className="mt-6">
          <div className="flex" style={{ borderBottom: "1px solid #2a3828" }}>
            <button
              onClick={() => setActiveTab("posts")}
              className="px-4 py-2.5 text-sm font-medium transition-colors"
              style={activeTab === "posts" ? { color: "#c9a84c", borderBottom: "2px solid #c9a84c" } : { color: "#6b7a66" }}
            >
              投稿
            </button>
            {currentUser && (
              <button
                onClick={() => setActiveTab("likes")}
                className="px-4 py-2.5 text-sm font-medium transition-colors"
                style={activeTab === "likes" ? { color: "#c9a84c", borderBottom: "2px solid #c9a84c" } : { color: "#6b7a66" }}
              >
                いいね
              </button>
            )}
            {currentUserId === profile.id && (
              <button
                onClick={() => setActiveTab("bookmarks")}
                className="px-4 py-2.5 text-sm font-medium transition-colors"
                style={activeTab === "bookmarks" ? { color: "#c9a84c", borderBottom: "2px solid #c9a84c" } : { color: "#6b7a66" }}
              >
                保存済み
              </button>
            )}
          </div>

          <div className="mt-3 space-y-3">
            {isBlocked ? (
              <div className="rounded-xl px-4 py-8 text-center" style={{ background: "#151c15", border: "1px solid #2a3828" }}>
                <svg className="mx-auto h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="#2a3828" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                <p className="mt-2 text-sm" style={{ color: "#6b7a66" }}>このユーザーをブロックしています</p>
              </div>
            ) : posts.length === 0 ? (
              <p className="py-8 text-center text-sm" style={{ color: "#6b7a66" }}>
                {activeTab === "posts" && "まだ投稿がありません"}
                {activeTab === "likes" && "いいねした投稿がありません"}
                {activeTab === "bookmarks" && "保存した投稿がありません"}
              </p>
            ) : (
              posts.map((post) => (
                <div
                  key={post.id}
                  className="rounded-xl p-4"
                  style={{ background: "#151c15", border: "1px solid #2a3828" }}
                >
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2" style={{ color: "#9a8e7a" }}>
                      {post.isPinned && (
                        <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24" style={{ color: "#c9a84c" }} aria-label="ピン留め"><path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" /></svg>
                      )}
                      {post.author.name}{" "}
                      <span style={{ color: "#6b7a66" }}>@{post.author.username}</span>
                    </span>
                    <span className="flex items-center gap-2" style={{ color: "#6b7a66" }}>
                      {currentUserId === profile.id && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handlePinPost(post.id); }}
                          className="rounded p-1 transition-colors hover:bg-white/5"
                          style={{ color: profile.pinnedPostId === post.id ? "#c9a84c" : "#6b7a66" }}
                          title={profile.pinnedPostId === post.id ? "ピン留めを解除" : "ピン留め"}
                        >
                          <svg className="h-3.5 w-3.5" fill={profile.pinnedPostId === post.id ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" /></svg>
                        </button>
                      )}
                      <span>{formatRelativeTime(post.createdAt)}</span>
                    </span>
                  </div>
                  {post.parentPost && (
                    <div className="mb-2 rounded-lg p-2 text-xs" style={{ background: "#0d1009", border: "1px solid #1f2a1e" }}>
                      <span className="font-medium" style={{ color: "#9a8e7a" }}>{post.parentPost.author.name} <span style={{ color: "#6b7a66" }}>@{post.parentPost.author.username}</span></span>
                      <p className="mt-1 line-clamp-2" style={{ color: "#6b7a66" }}>{post.parentPost.content}</p>
                    </div>
                  )}
                  {post.isPokerHand && post.pokerHand ? (
                    <PokerHandDisplay hand={post.pokerHand} />
                  ) : (
                    <p className="whitespace-pre-wrap text-sm" style={{ color: "#ddd6c8" }}>
                      {post.content}
                    </p>
                  )}
                  {post.isPokerHand && post.content && (
                    <p className="mt-2 whitespace-pre-wrap text-sm pt-2" style={{ color: "#9a8e7a", borderTop: "1px solid #1f2a1e" }}>
                      {post.content}
                    </p>
                  )}
                  <div className="mt-2 flex gap-4 text-xs" style={{ color: "#6b7a66" }}>
                    <span className="flex items-center gap-1">
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /></svg>
                      {post._count?.likes ?? 0}
                    </span>
                    <span className="flex items-center gap-1">
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z" /></svg>
                      {post._count?.replies ?? 0}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {!currentUser && (
          <div className="relative mt-6 overflow-hidden rounded-xl p-5 text-center" style={{ background: "#151c15", border: "1px solid #2a3828" }}>
            <div className="pointer-events-none absolute inset-0 flex items-center justify-between px-6 opacity-10" style={{ color: "#c9a84c" }}>
              <span className="text-4xl">&spades;</span>
              <span className="text-4xl">&hearts;</span>
              <span className="text-4xl">&diams;</span>
              <span className="text-4xl">&clubs;</span>
            </div>
            <p className="relative font-[family-name:var(--font-playfair)] text-sm font-semibold" style={{ color: "#ddd6c8" }}>参加して議論に加わろう</p>
            <p className="relative mt-1 text-xs" style={{ color: "#6b7a66" }}>フォロー・いいねにはアカウントが必要です</p>
            <div className="relative mt-3 flex justify-center">
              <a href="/" className="rounded-lg px-6 py-2 text-xs font-bold transition-colors" style={{ background: "#c9a84c", color: "#0d1009" }}>
                ログイン / 新規登録
              </a>
            </div>
          </div>
        )}
      </main>

      {showListModal && (
        <>
          <div
            className="fixed inset-0 z-40"
            style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
            onClick={() => setShowListModal(null)}
          />
          <div className="fixed left-1/2 top-1/2 z-50 max-h-80 w-full max-w-md -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-xl" style={{ background: "#151c15", border: "1px solid #2a3828", boxShadow: "0 25px 60px rgba(0,0,0,0.7)" }}>
            <div className="flex items-center justify-between p-3" style={{ borderBottom: "1px solid #2a3828" }}>
              <h2 className="text-sm font-semibold" style={{ color: "#ddd6c8" }}>
                {showListModal === "followers" ? "フォロワー" : "フォロー中"}
              </h2>
              <button
                onClick={() => setShowListModal(null)}
                className="transition-colors hover:bg-white/5 rounded px-2 py-1 text-sm"
                style={{ color: "#6b7a66" }}
              >
                閉じる
              </button>
            </div>
            <div className="max-h-64 overflow-y-auto p-3">
              {loadingList ? (
                <p className="text-sm" style={{ color: "#6b7a66" }}>読み込み中...</p>
              ) : listUsers.length === 0 ? (
                <p className="text-sm" style={{ color: "#6b7a66" }}>いません</p>
              ) : (
                <div className="space-y-2">
                  {listUsers.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => {
                        setShowListModal(null);
                        if (typeof window !== "undefined") {
                          window.location.href = `/profile/${u.username}`;
                        }
                      }}
                      className="w-full rounded-lg p-2 text-left transition-colors hover:bg-white/[0.03]"
                      style={{ border: "1px solid #2a3828" }}
                    >
                      <div className="text-sm font-semibold" style={{ color: "#ddd6c8" }}>{u.name}</div>
                      <div className="text-xs" style={{ color: "#6b7a66" }}>@{u.username}</div>
                      {u.bio && (
                        <div className="mt-1 line-clamp-2 text-xs" style={{ color: "#9a8e7a" }}>{u.bio}</div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
