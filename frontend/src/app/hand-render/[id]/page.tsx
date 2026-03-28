import HandRenderClient from "./HandRenderClient";

const API_BASE = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function HandRenderPage({ params }: Props) {
  const { id } = await params;

  let hand = null;
  try {
    const res = await fetch(`${API_BASE}/posts/${id}`, {
      cache: "no-store",
    });
    if (res.ok) {
      const post = await res.json();
      hand = post.pokerHand || null;
    }
  } catch {
    // ignore
  }

  if (!hand) {
    return <div id="hand-error">NO_HAND</div>;
  }

  return <HandRenderClient hand={hand} />;
}
