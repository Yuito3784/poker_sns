"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Avatar from "../../components/Avatar";
import PostItem from "../../components/PostItem";
import PremiumBadge from "../../components/PremiumBadge";
import { API_BASE, fetchWithAuth } from "../../../lib/api";
import { useAuth } from "../../../contexts/AuthContext";
import { useToast } from "../../../contexts/ToastContext";
import type { Post, UserProfile, ProfileUser } from "../../../lib/types";

function AvatarDisplay({ profile, size = "lg" }: { profile: { name: string; avatarUrl?: string | null }; size?: "sm" | "lg" }) {
  return (
    <Avatar
      avatarUrl={profile.avatarUrl ?? null}
      name={profile.name}
      size={size === "lg" ? "xl" : "lg"}
      style={{ border: "2px solid rgba(201,168,76,0.25)" }}
    />
  );
}

export default function ProfileClient() {
  const params = useParams();
  const router = useRouter();
  const username = params.username as string;
  const { auth, isInitialized, setAuth, clearAuth } = useAuth();
  const { showToast } = useToast();
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
  const [editUsername, setEditUsername] = useState("");
  const [editBio, setEditBio] = useState("");
  const [activeTab, setActiveTab] = useState<"posts" | "likes" | "bookmarks">("posts");
  const [showListModal, setShowListModal] = useState<"followers" | "following" | null>(null);
  const [listUsers, setListUsers] = useState<ProfileUser[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");

  const displaySubStatus = profile
    ? currentUserId === profile.id
      ? (currentUser?.subscriptionStatus ?? profile.subscriptionStatus)
      : profile.subscriptionStatus
    : undefined;

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
      setEditUsername(profile.username);
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

  // 自分のプロフィール表示時は課金状況を取得して Auth を同期し、バッジ/PROボタンの表示を整合させる
  useEffect(() => {
    if (!token || !profile || !auth || profile.id !== currentUserId) return;
    const syncSubscription = async () => {
      try {
        const res = await fetchWithAuth(`${API_BASE}/subscriptions/status`);
        if (!res.ok) return;
        const data = await res.json().catch(() => null);
        if (!data?.status) return;
        setAuth(auth.token, { ...auth.user, subscriptionStatus: data.status });
      } catch {
        /* ignore */
      }
    };
    void syncSubscription();
  }, [token, profile?.id, currentUserId]); // auth は setAuth で更新するため依存に含めない（ループ防止）

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

  const updatePost = (postId: string, updater: (p: Post) => Post) => {
    setPosts((prev) => prev.map((p) => p.id === postId ? updater(p) : p));
  };

  const handleToggleLike = async (postId: string) => {
    const post = posts.find((p) => p.id === postId);
    if (!post) return;
    const wasLiked = post.isLiked;
    updatePost(postId, (p) => ({
      ...p, isLiked: !wasLiked,
      _count: { ...p._count!, likes: (p._count?.likes ?? 0) + (wasLiked ? -1 : 1), replies: p._count?.replies ?? 0 },
    }));
    showToast(wasLiked ? "いいねを取り消しました" : "いいねしました");
    try {
      const res = await fetchWithAuth(`${API_BASE}/posts/${postId}/like`, { method: "POST" });
      if (!res.ok) throw new Error();
    } catch {
      updatePost(postId, (p) => ({
        ...p, isLiked: wasLiked,
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
      ...p, isReposted: !wasReposted,
      _count: { ...p._count!, reposts: (p._count?.reposts ?? 0) + (wasReposted ? -1 : 1), likes: p._count?.likes ?? 0, replies: p._count?.replies ?? 0 },
    }));
    showToast(wasReposted ? "リポストを取り消しました" : "リポストしました");
    try {
      const res = await fetchWithAuth(`${API_BASE}/posts/${postId}/repost`, { method: "POST" });
      if (!res.ok) throw new Error();
    } catch {
      updatePost(postId, (p) => ({
        ...p, isReposted: wasReposted,
        _count: { ...p._count!, reposts: (p._count?.reposts ?? 0) + (wasReposted ? 1 : -1), likes: p._count?.likes ?? 0, replies: p._count?.replies ?? 0 },
      }));
      showToast("エラーが発生しました", "error");
    }
  };

  const handleToggleBookmarkPost = async (postId: string) => {
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

  const handleToggleFollowFromPost = async (targetUsername: string) => {
    const targetPost = posts.find((p) => p.author.username === targetUsername);
    const wasFollowing = targetPost?.isFollowingAuthor ?? false;
    setPosts((prev) => prev.map((p) =>
      p.author.username === targetUsername ? { ...p, isFollowingAuthor: !wasFollowing } : p
    ));
    showToast(wasFollowing ? "フォローを解除しました" : "フォローしました");
    try {
      const res = await fetchWithAuth(`${API_BASE}/users/${targetUsername}/follow`, { method: "POST" });
      if (!res.ok) throw new Error();
    } catch {
      setPosts((prev) => prev.map((p) =>
        p.author.username === targetUsername ? { ...p, isFollowingAuthor: wasFollowing } : p
      ));
      showToast("エラーが発生しました", "error");
    }
  };

  const handleReplyToPost = async (postId: string) => {
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
        ...p, _count: { ...p._count!, replies: (p._count?.replies ?? 0) + 1, likes: p._count?.likes ?? 0 },
      }));
      showToast("返信しました");
    } catch {
      showToast("返信に失敗しました", "error");
    }
  };

  const handleDeletePost = async (postId: string) => {
    try {
      const res = await fetchWithAuth(`${API_BASE}/posts/${postId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      showToast("投稿を削除しました");
    } catch {
      showToast("削除に失敗しました", "error");
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

  const handleLogout = async () => {
    try {
      await fetchWithAuth(`${API_BASE}/auth/logout`, { method: "POST" });
    } catch {
      // ignore
    }
    clearAuth();
    router.push("/");
  };

  const handleToggleBlock = async () => {
    try {
      const res = await fetchWithAuth(`${API_BASE}/users/${username}/block`, { method: "POST" });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setIsBlocked(data.blocked);
      if (data.blocked) setIsFollowing(false);
      setShowMoreMenu(false);
      showToast(data.blocked ? "ブロックしました" : "ブロックを解除しました");
    } catch {
      showToast("エラーが発生しました", "error");
    }
  };

  const handleToggleMute = async () => {
    try {
      const res = await fetchWithAuth(`${API_BASE}/users/${username}/mute`, { method: "POST" });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setIsMuted(data.muted);
      setShowMoreMenu(false);
      showToast(data.muted ? "ミュートしました" : "ミュートを解除しました");
    } catch {
      showToast("エラーが発生しました", "error");
    }
  };

  const handleToggleFollow = async () => {
    if (!token) return;
    const wasFollowing = isFollowing;
    setIsFollowing(!wasFollowing);
    showToast(wasFollowing ? "フォローを解除しました" : "フォローしました");
    try {
      const res = await fetchWithAuth(`${API_BASE}/users/${username}/follow`, {
        method: "POST",
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setIsFollowing(data.following);
      await fetchProfile();
    } catch {
      setIsFollowing(wasFollowing);
      showToast("エラーが発生しました", "error");
    }
  };

  const handleUpdateProfile = async () => {
    if (!token) return;
    setError(null);
    const u = editUsername.trim();
    if (u && (u.length < 3 || u.length > 20)) {
      setError("ユーザー名は3〜20文字で入力してください。");
      return;
    }
    if (u && !/^[a-zA-Z0-9_]+$/.test(u)) {
      setError("ユーザー名は英数字とアンダースコアのみ使用できます。");
      return;
    }
    try {
      const res = await fetchWithAuth(`${API_BASE}/users/me`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          username: (u && u !== profile?.username ? u : undefined),
          bio: editBio,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg = Array.isArray(data?.message) ? data.message.join(", ") : data?.message ?? "プロフィールの更新に失敗しました";
        throw new Error(msg);
      }
      setIsEditing(false);
      const updatedUser = await res.json();
      if (token) setAuth(token, updatedUser);
      showToast("プロフィールを更新しました");
      if (updatedUser.username && updatedUser.username !== profile?.username) {
        router.replace(`/profile/${updatedUser.username}`);
        return;
      }
      await fetchProfile();
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
      showToast("アバターを更新しました");
      await fetchProfile();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "エラーが発生しました";
      setError(message);
      showToast(message, "error");
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
            <div className="group/avatar relative">
              <AvatarDisplay profile={profile} size="lg" />
              {currentUserId === profile.id && (
                <>
                  <label className="absolute inset-0 flex cursor-pointer items-center justify-center rounded-full bg-black/0 transition-all group-hover/avatar:bg-black/40">
                    <svg className="h-6 w-6 text-white opacity-0 transition-opacity group-hover/avatar:opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" /><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" /></svg>
                    <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={handleAvatarUpload} disabled={uploadingAvatar} />
                  </label>
                  <span className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full shadow" style={{ background: "#c9a84c", color: "#0d1009" }}>
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" /><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" /></svg>
                  </span>
                </>
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
                  <label className="block text-xs font-medium" style={{ color: "#9a8e7a" }}>ユーザー名（@）</label>
                  <input
                    type="text"
                    className="mt-1 w-full rounded-lg px-3 py-2 text-sm outline-none"
                    style={{ background: "#0d1009", border: "1px solid #2a3828", color: "#ddd6c8" }}
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 20))}
                    onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(201,168,76,0.5)"; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = "#2a3828"; }}
                    placeholder="3〜20文字・英数字と_"
                  />
                  <p className="mt-0.5 text-[11px]" style={{ color: "#6b7a66" }}>プロフィールURLに使われます。変更すると @{editUsername || "..."} になります。</p>
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
                        setEditUsername(profile.username);
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
                    {(displaySubStatus === "active" || displaySubStatus === "canceled") && <PremiumBadge size="md" />}
                    {currentUserId === profile.id && displaySubStatus !== "active" && displaySubStatus !== "canceled" && (
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
                {currentUser && (
                  <div className="flex items-center gap-2">
                    {currentUserId === profile.id ? (
                      <button
                        onClick={() => setIsEditing(true)}
                        className="rounded-lg px-4 py-2 text-sm font-semibold transition-colors hover:bg-white/5"
                        style={{ border: "1px solid #2a3828", color: "#ddd6c8" }}
                      >
                        編集
                      </button>
                    ) : (
                      !isBlocked && (
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
                      )
                    )}
                    <div className="relative">
                      <button
                        onClick={() => setShowMoreMenu(!showMoreMenu)}
                        className="rounded-lg p-2 transition-colors hover:bg-white/5"
                        style={{ border: "1px solid #2a3828", color: "#6b7a66" }}
                        aria-label="その他メニュー"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM12.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM18.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" /></svg>
                      </button>
                      {showMoreMenu && (
                        <div className="absolute right-0 top-full z-20 mt-1 w-44 rounded-xl py-1" style={{ background: "#151c15", border: "1px solid #2a3828", boxShadow: "0 8px 32px rgba(0,0,0,0.6)" }}>
                          {currentUserId === profile.id ? (
                            <>
                              <button
                                onClick={() => { setShowMoreMenu(false); router.push("/settings"); }}
                                className="flex w-full items-center gap-2 px-4 py-2 text-sm transition-colors hover:bg-white/5"
                                style={{ color: "#9a8e7a" }}
                              >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M3.75 6H7.5m-3.75 12H7.5m0-6h12.75M3.75 12H7.5" /></svg>
                                設定
                              </button>
                              <button
                                onClick={() => { setShowMoreMenu(false); handleLogout(); }}
                                className="flex w-full items-center gap-2 px-4 py-2 text-sm transition-colors hover:bg-white/5"
                                style={{ color: "#e05050" }}
                              >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6A2.25 2.25 0 005.25 5.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" /></svg>
                                ログアウト
                              </button>
                            </>
                          ) : (
                            <>
                              <button onClick={handleToggleMute} className="flex w-full items-center gap-2 px-4 py-2 text-sm transition-colors hover:bg-white/5" style={{ color: "#9a8e7a" }}>
                                <svg className="h-4 w-4" style={{ color: "#6b7a66" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75L19.5 12m0 0l2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6l4.72-4.72a.75.75 0 011.28.531V19.94a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.506-1.938-1.354A9.009 9.009 0 012.25 12c0-.83.112-1.633.322-2.395C2.806 8.757 3.63 8.25 4.51 8.25H6.75z" /></svg>
                                {isMuted ? "ミュート解除" : "ミュート"}
                              </button>
                              <button onClick={handleToggleBlock} className="flex w-full items-center gap-2 px-4 py-2 text-sm transition-colors hover:bg-white/5" style={{ color: "#e05050" }}>
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                                {isBlocked ? "ブロック解除" : "ブロック"}
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
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
          <div className="flex justify-around border-b" style={{ borderColor: "#2a3828" }}>
            <button
              onClick={() => setActiveTab("posts")}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-center transition-colors"
              style={activeTab === "posts" ? { color: "#c9a84c", borderBottom: "2px solid #c9a84c" } : { color: "#6b7a66" }}
            >
              投稿
            </button>
            {currentUser && (
              <button
                onClick={() => setActiveTab("likes")}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-center transition-colors"
                style={activeTab === "likes" ? { color: "#c9a84c", borderBottom: "2px solid #c9a84c" } : { color: "#6b7a66" }}
              >
                いいね
              </button>
            )}
            {currentUserId === profile.id && (
              <button
                onClick={() => setActiveTab("bookmarks")}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-center transition-colors"
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
              <div className="py-12 text-center">
                <p className="text-sm" style={{ color: "#9a8e7a" }}>
                  {activeTab === "posts" && "まだ投稿がありません"}
                  {activeTab === "likes" && "いいねした投稿がありません"}
                  {activeTab === "bookmarks" && "保存した投稿がありません"}
                </p>
                <p className="mt-1 text-xs" style={{ color: "#6b7a66" }}>
                  {activeTab === "posts" && "最初の投稿をしてみましょう"}
                  {activeTab === "likes" && "気に入った投稿にいいねしましょう"}
                  {activeTab === "bookmarks" && "後で読みたい投稿をブックマークしましょう"}
                </p>
              </div>
            ) : (
              <ul className="space-y-2.5">
                {posts.map((post) => (
                  <div key={post.id}>
                    {post.isPinned && (
                      <div className="mb-1 flex items-center gap-1.5 px-3 text-xs" style={{ color: "#c9a84c" }}>
                        <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" /></svg>
                        <span>ピン留めされた投稿</span>
                      </div>
                    )}
                    {currentUserId === profile.id && (
                      <div className="mb-1 flex justify-end px-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); handlePinPost(post.id); }}
                          className="rounded p-1 text-xs transition-colors hover:bg-white/5"
                          style={{ color: profile.pinnedPostId === post.id ? "#c9a84c" : "#6b7a66" }}
                          title={profile.pinnedPostId === post.id ? "ピン留めを解除" : "ピン留め"}
                        >
                          <svg className="h-3.5 w-3.5" fill={profile.pinnedPostId === post.id ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" /></svg>
                        </button>
                      </div>
                    )}
                    <PostItem
                      post={post}
                      currentUser={currentUser}
                      replyingTo={replyingTo}
                      replyContent={replyContent}
                      actionLoading={null}
                      onSetReplyingTo={setReplyingTo}
                      onSetReplyContent={setReplyContent}
                      onToggleLike={handleToggleLike}
                      onToggleRepost={handleToggleRepost}
                      onToggleBookmark={handleToggleBookmarkPost}
                      onToggleFollow={handleToggleFollowFromPost}
                      onReply={handleReplyToPost}
                      onDelete={handleDeletePost}
                      showFollowButton={currentUserId !== profile.id}
                    />
                  </div>
                ))}
              </ul>
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
            className="fixed inset-0 z-40 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
            onClick={() => setShowListModal(null)}
          >
          <div
            className="z-50 max-h-[80vh] w-full max-w-md overflow-hidden rounded-xl"
            style={{ background: "#151c15", border: "1px solid #2a3828", boxShadow: "0 25px 60px rgba(0,0,0,0.7)" }}
            onClick={(e) => e.stopPropagation()}
          >
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
                        router.push(`/profile/${u.username}`);
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
          </div>
        </>
      )}
    </div>
  );
}
