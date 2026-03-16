"use client";

import { useRouter } from "next/navigation";
import { API_BASE, fetchWithAuth } from "../../lib/api";
import { formatRelativeTime } from "../../lib/utils";
import type { Notification } from "../../lib/types";

type Props = {
  notifications: Notification[];
  token: string;
  onClose: () => void;
  onRefresh: () => void;
};

export default function NotificationDropdown({ notifications, token, onClose, onRefresh }: Props) {
  const router = useRouter();

  const handleClick = async (notif: Notification) => {
    if (!notif.isRead && token) {
      try {
        await fetchWithAuth(`${API_BASE}/notifications/${notif.id}/read`, {
          method: "PATCH",
        });
        onRefresh();
      } catch {
        // ignore
      }
    }
    onClose();
    if ((notif.type === "LIKE" || notif.type === "REPLY" || notif.type === "MENTION" || notif.type === "REPOST") && notif.postId) {
      router.push(`/post/${notif.postId}`);
    } else if (notif.type === "FOLLOW" && notif.fromUser?.username) {
      router.push(`/profile/${notif.fromUser.username}`);
    }
  };

  return (
    <div className="divide-y divide-[#1f2a1e]">
      {notifications.length === 0 ? (
        <p className="p-4 text-center text-sm text-[#7a7260]">通知はありません</p>
      ) : (
        notifications.map((notif) => (
          <button
            key={notif.id}
            className={`w-full p-3 text-left text-sm hover:bg-white/[0.03] ${!notif.isRead ? "bg-[#131a14]" : ""}`}
            onClick={() => handleClick(notif)}
          >
            <div className="flex items-start gap-2">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center">
                {notif.type === "LIKE" && <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 24 24"><path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" /></svg>}
                {notif.type === "FOLLOW" && <svg className="h-5 w-5 text-[#7a7260]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>}
                {notif.type === "REPLY" && <svg className="h-5 w-5" style={{ color: "#c9a84c" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z" /></svg>}
                {notif.type === "MENTION" && <svg className="h-5 w-5" style={{ color: "#c9a84c" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.676.39-1.027.59-1.336.59-.31 0-.66-.2-1.336-.59l-.656-.38c-.524-.3-.71-.96-.464-1.51.4-.89.731-1.82.984-2.784m8.016 0c-.688.06-1.386.09-2.09.09H16.5a4.5 4.5 0 110-9h.75c.704 0 1.402.03 2.09.09m0 9.18c-.253.962-.584 1.892-.985 2.783-.247.55-.06 1.21.463 1.511l.657.38c.676.39 1.027.59 1.336.59.31 0 .66-.2 1.336-.59l.656-.38c.524-.3.71-.96.465-1.51-.4-.89-.732-1.82-.984-2.784z" /></svg>}
                {notif.type === "REPOST" && <svg className="h-5 w-5" style={{ color: "#c9a84c" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.678 48.678 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.017.22-.032.441-.046.662M4.5 12c0 1.232.046 2.453.138 3.662a4.006 4.006 0 003.7 3.7 48.656 48.656 0 007.324 0 4.006 4.006 0 003.7-3.7c.017-.22.032-.441.046-.662" /></svg>}
              </span>
              <div className="flex-1">
                <p>
                  <span className="font-semibold">{notif.fromUser.name}</span>{" "}
                  {notif.type === "LIKE" && "があなたの投稿にいいねしました"}
                  {notif.type === "FOLLOW" && "があなたをフォローしました"}
                  {notif.type === "REPLY" && "があなたの投稿に返信しました"}
                  {notif.type === "MENTION" && "があなたをメンションしました"}
                  {notif.type === "REPOST" && "があなたの投稿をリポストしました"}
                </p>
                {notif.post && (
                  <p className="mt-1 text-xs text-[#7a7260] line-clamp-2">{notif.post.content}</p>
                )}
                <p className="mt-1 text-xs text-[#6b7a66]">{formatRelativeTime(notif.createdAt)}</p>
              </div>
            </div>
          </button>
        ))
      )}
    </div>
  );
}
