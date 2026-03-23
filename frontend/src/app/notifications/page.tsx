"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { formatRelativeTime } from "../../lib/utils";
import { useAuth } from "../../contexts/AuthContext";
import { useNotifications } from "../../contexts/NotificationContext";
import { useToast } from "../../contexts/ToastContext";
import type { Notification } from "../../lib/types";

export default function NotificationsPage() {
  const router = useRouter();
  const { auth, isInitialized } = useAuth();
  const { showToast } = useToast();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

  useEffect(() => {
    if (isInitialized && !auth) {
      router.push("/");
    }
  }, [isInitialized, auth, router]);

  const handleClick = async (notif: Notification) => {
    if (!notif.isRead) {
      await markAsRead(notif.id);
    }
    if ((notif.type === "LIKE" || notif.type === "REPLY" || notif.type === "MENTION" || notif.type === "REPOST") && notif.postId) {
      router.push(`/post/${notif.postId}`);
    } else if (notif.type === "FOLLOW" && notif.fromUser?.username) {
      router.push(`/profile/${notif.fromUser.username}`);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllAsRead();
      showToast("すべて既読にしました");
    } catch {
      showToast("既読処理に失敗しました", "error");
    }
  };

  return (
    <div className="min-h-screen pb-14" style={{ background: "#0d1009", color: "#ddd6c8" }}>
      <div className="mx-auto max-w-xl min-h-screen pb-4">
        <div className="sticky top-0 z-50 flex items-center justify-between border-b px-4 py-3.5" style={{ background: "#131a14", borderColor: "#2a3828" }}>
          <button onClick={() => router.back()} className="rounded p-1.5 transition-colors" style={{ color: "#6b7a66" }}>
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>
          </button>
          <h1 className="font-[family-name:var(--font-playfair)] text-xl font-semibold tracking-tight" style={{ color: "#ddd6c8" }}>通知</h1>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="rounded px-3 py-1.5 text-xs font-semibold transition-colors"
              style={{ color: "#c9a84c" }}
            >
              すべて既読
            </button>
          )}
          {unreadCount === 0 && <div className="w-20" />}
        </div>

        {notifications.length === 0 ? (
          <div className="px-4 py-16 text-center">
            <svg className="mx-auto h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="#2a3828" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" /></svg>
            <p className="mt-3 text-sm" style={{ color: "#9a8e7a" }}>通知はまだありません</p>
            <p className="mt-1 text-xs" style={{ color: "#6b7a66" }}>いいね、返信、フォローされると通知が届きます</p>
            <button onClick={() => router.push("/")} className="mt-4 rounded-full px-5 py-2 text-xs font-semibold transition-colors" style={{ background: "#c9a84c", color: "#0d1009" }}>タイムラインに戻る</button>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "#1f2a1e" }}>
            {notifications.map((notif) => (
              <button
                key={notif.id}
                className="flex w-full gap-3 p-4 text-left transition-colors"
                style={{
                  background: !notif.isRead ? "rgba(201,168,76,0.06)" : "transparent",
                  borderLeft: !notif.isRead ? "3px solid #c9a84c" : "3px solid transparent",
                }}
                onClick={() => handleClick(notif)}
              >
                <span
                  className="relative flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full"
                  style={{ background: !notif.isRead ? "rgba(201,168,76,0.1)" : "#131a14", border: !notif.isRead ? "1px solid rgba(201,168,76,0.3)" : "1px solid #1f2a1e" }}
                >
                  {!notif.isRead && (
                    <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full" style={{ background: "#c9a84c", boxShadow: "0 0 6px rgba(201,168,76,0.5)" }} />
                  )}
                  {notif.type === "LIKE" && (
                    <svg className="h-4 w-4" fill="#f06060" viewBox="0 0 24 24"><path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" /></svg>
                  )}
                  {notif.type === "FOLLOW" && (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="#c9a84c" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
                  )}
                  {notif.type === "REPLY" && (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="#c9a84c" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z" /></svg>
                  )}
                  {notif.type === "MENTION" && (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="#c9a84c" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.676.39-1.027.59-1.336.59-.31 0-.66-.2-1.336-.59l-.656-.38c-.524-.3-.71-.96-.464-1.51.4-.89.731-1.82.984-2.784m8.016 0c-.688.06-1.386.09-2.09.09H16.5a4.5 4.5 0 110-9h.75c.704 0 1.402.03 2.09.09m0 9.18c-.253.962-.584 1.892-.985 2.783-.247.55-.06 1.21.463 1.511l.657.38c.676.39 1.027.59 1.336.59.31 0 .66-.2 1.336-.59l.656-.38c.524-.3.71-.96.465-1.51-.4-.89-.732-1.82-.984-2.784z" /></svg>
                  )}
                  {notif.type === "REPOST" && (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="#c9a84c" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.678 48.678 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.017.22-.032.441-.046.662M4.5 12c0 1.232.046 2.453.138 3.662a4.006 4.006 0 003.7 3.7 48.656 48.656 0 007.324 0 4.006 4.006 0 003.7-3.7c.017-.22.032-.441.046-.662" /></svg>
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm" style={{ color: "#ddd6c8" }}>
                    <span className="font-semibold">{notif.fromUser.name}</span>{" "}
                    <span style={{ color: "#6b7a66" }}>@{notif.fromUser.username}</span>
                    {notif.type === "LIKE" && " があなたの投稿にいいねしました"}
                    {notif.type === "FOLLOW" && " があなたをフォローしました"}
                    {notif.type === "REPLY" && " があなたの投稿に返信しました"}
                    {notif.type === "MENTION" && " があなたをメンションしました"}
                    {notif.type === "REPOST" && " があなたの投稿をリポストしました"}
                  </p>
                  {notif.post && (
                    <p className="mt-1 line-clamp-2 text-xs" style={{ color: "#6b7a66" }}>{notif.post.content}</p>
                  )}
                  <p className="mt-1 text-xs" style={{ color: "#6b7a66" }}>{formatRelativeTime(notif.createdAt)}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
