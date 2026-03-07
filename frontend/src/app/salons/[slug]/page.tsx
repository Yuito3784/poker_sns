"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { fetchWithAuth, API_BASE } from "../../../lib/api";
import { useAuth } from "../../../contexts/AuthContext";
import type { Salon, SalonPost } from "../../../lib/types";

export default function SalonDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const { auth, isInitialized } = useAuth();
  const [salon, setSalon] = useState<Salon | null>(null);
  const [posts, setPosts] = useState<SalonPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPost, setNewPost] = useState("");
  const [posting, setPosting] = useState(false);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (isInitialized && !auth) router.push("/");
  }, [isInitialized, auth, router]);

  useEffect(() => {
    if (slug) fetchSalon();
  }, [slug]);

  const fetchSalon = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth(`/salons/${slug}`);
      if (res.ok) {
        const data = await res.json();
        setSalon(data);
        if (data.isMember || data.isOwner) fetchPosts(data.id);
      }
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  };

  const fetchPosts = async (salonId: string) => {
    try {
      const res = await fetchWithAuth(`/salons/${salonId}/posts`);
      if (res.ok) setPosts(await res.json());
    } catch { /* ignore */ }
  };

  const handleJoin = async () => {
    if (!salon) return;
    setJoining(true);
    try {
      const res = await fetchWithAuth(`/salons/${salon.id}/join`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        if (data.checkoutUrl) window.location.href = data.checkoutUrl;
      }
    } catch { /* ignore */ } finally {
      setJoining(false);
    }
  };

  const handlePost = async () => {
    if (!salon || !newPost.trim()) return;
    setPosting(true);
    try {
      const res = await fetchWithAuth(`/salons/${salon.id}/posts`, {
        method: "POST",
        body: JSON.stringify({ content: newPost }),
      });
      if (res.ok) {
        setNewPost("");
        fetchPosts(salon.id);
      }
    } catch { /* ignore */ } finally {
      setPosting(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center" style={{ background: "#0d1009", color: "#4a5245" }}>読み込み中...</div>;
  if (!salon) return <div className="min-h-screen flex items-center justify-center" style={{ background: "#0d1009", color: "#4a5245" }}>サロンが見つかりません</div>;

  const canView = salon.isMember || salon.isOwner;

  return (
    <div className="min-h-screen" style={{ background: "#0d1009" }}>
      <div className="mx-auto max-w-2xl px-4 py-8">
        <button onClick={() => router.push("/salons")} className="mb-4 text-sm" style={{ color: "#c9a84c" }}>
          &larr; サロン一覧に戻る
        </button>

        <div className="rounded-xl p-6" style={{ background: "#131a14", border: "1px solid #1f2a1e" }}>
          <h1 className="text-xl font-bold" style={{ color: "#ddd6c8" }}>{salon.name}</h1>
          <p className="mt-2 text-sm" style={{ color: "#7a7260" }}>{salon.description}</p>
          <div className="mt-3 flex items-center gap-4 text-xs" style={{ color: "#4a5245" }}>
            <span>by {salon.owner?.name}</span>
            <span>{salon._count?.members || 0} メンバー</span>
            <span>{salon.monthlyPrice.toLocaleString()}円/月</span>
          </div>

          {!canView && (
            <button
              onClick={handleJoin}
              disabled={joining}
              className="mt-4 rounded-lg px-6 py-2.5 text-sm font-semibold"
              style={{ background: "#c9a84c", color: "#0d1009", opacity: joining ? 0.5 : 1 }}
            >
              {joining ? "処理中..." : `参加する (${salon.monthlyPrice.toLocaleString()}円/月)`}
            </button>
          )}
        </div>

        {canView && (
          <div className="mt-6">
            <div className="rounded-xl p-4" style={{ background: "#131a14", border: "1px solid #1f2a1e" }}>
              <textarea
                placeholder="サロンに投稿..."
                value={newPost}
                onChange={(e) => setNewPost(e.target.value)}
                className="w-full resize-none rounded-lg px-3 py-2 text-sm"
                style={{ background: "#192118", border: "1px solid #2a3828", color: "#ddd6c8" }}
                rows={3}
              />
              <div className="mt-2 flex justify-end">
                <button
                  onClick={handlePost}
                  disabled={posting || !newPost.trim()}
                  className="rounded-lg px-4 py-2 text-sm font-semibold"
                  style={{ background: "#c9a84c", color: "#0d1009", opacity: posting || !newPost.trim() ? 0.5 : 1 }}
                >
                  {posting ? "投稿中..." : "投稿"}
                </button>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {posts.map((post) => (
                <div key={post.id} className="rounded-xl p-4" style={{ background: "#131a14", border: "1px solid #1f2a1e" }}>
                  <div className="flex items-center gap-2 text-xs" style={{ color: "#4a5245" }}>
                    <span className="font-semibold" style={{ color: "#ddd6c8" }}>{post.author.name}</span>
                    <span>@{post.author.username}</span>
                    <span>{new Date(post.createdAt).toLocaleDateString("ja-JP")}</span>
                  </div>
                  <p className="mt-2 text-sm whitespace-pre-wrap" style={{ color: "#ddd6c8" }}>{post.content}</p>
                </div>
              ))}
              {posts.length === 0 && (
                <div className="py-8 text-center text-sm" style={{ color: "#4a5245" }}>まだ投稿がありません</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
