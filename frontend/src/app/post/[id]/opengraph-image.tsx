import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Poker SNS - 投稿";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const API_BASE = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

async function loadFont() {
  const res = await fetch(
    "https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700&display=swap"
  );
  const css = await res.text();
  const match = css.match(/src: url\((.+?)\) format\('(opentype|truetype|woff2)'\)/);
  if (!match) return null;
  const fontRes = await fetch(match[1]);
  return fontRes.arrayBuffer();
}

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [fontData, postData] = await Promise.all([
    loadFont().catch(() => null),
    fetch(`${API_BASE}/posts/${id}/meta`, { next: { revalidate: 3600 } })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null),
  ]);

  const fonts = fontData
    ? [{ name: "NotoSansJP", data: fontData, style: "normal" as const, weight: 400 as const }]
    : [];
  const fontFamily = fontData ? "NotoSansJP, sans-serif" : "sans-serif";

  if (!postData) {
    return new ImageResponse(
      (
        <div
          style={{
            background: "linear-gradient(135deg, #0d1009 0%, #131a14 50%, #0d1009 100%)",
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily,
          }}
        >
          <span style={{ color: "#c9a84c", fontSize: "64px", marginRight: "16px" }}>&#9824;</span>
          <span style={{ fontSize: "48px", color: "#ddd6c8", fontWeight: 700 }}>Poker SNS</span>
        </div>
      ),
      { ...size, fonts },
    );
  }

  const contentText = postData.content
    ? postData.content.slice(0, 120) + (postData.content.length > 120 ? "..." : "")
    : "";
  const initial = (postData.author.name || postData.author.username || "?")[0].toUpperCase();

  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #0d1009 0%, #131a14 50%, #0d1009 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          padding: "48px 56px",
          position: "relative",
          fontFamily,
        }}
      >
        {/* Suit watermarks */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-around",
            fontSize: "220px",
            color: "rgba(201,168,76,0.03)",
            padding: "0 40px",
          }}
        >
          <span>&#9824;</span>
          <span>&#9829;</span>
          <span>&#9830;</span>
          <span>&#9827;</span>
        </div>

        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
            marginBottom: "28px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                border: "2px solid #c9a84c",
                background: "#192118",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "20px",
                fontWeight: 700,
                color: "#c9a84c",
              }}
            >
              {initial}
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: "20px", fontWeight: 700, color: "#ddd6c8" }}>
                {postData.author.name || postData.author.username}
              </span>
              <span style={{ fontSize: "18px", color: "#c9a84c" }}>
                @{postData.author.username}
              </span>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "26px", color: "#c9a84c" }}>&#9824;</span>
            <span
              style={{
                fontSize: "20px",
                fontWeight: 700,
                color: "#c9a84c",
                letterSpacing: "-0.5px",
              }}
            >
              Poker SNS
            </span>
          </div>
        </div>

        {/* Content */}
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "flex-start",
            fontSize: "28px",
            lineHeight: 1.5,
            color: "#ddd6c8",
            maxHeight: "180px",
            overflow: "hidden",
          }}
        >
          {contentText}
        </div>

        {/* Divider */}
        <div
          style={{
            width: "100%",
            height: "1px",
            background: "linear-gradient(90deg, transparent, #2a3828, #c9a84c40, #2a3828, transparent)",
            margin: "20px 0",
          }}
        />

        {/* Stats */}
        <div
          style={{
            display: "flex",
            gap: "36px",
            fontSize: "16px",
            color: "#7a7260",
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ color: "#9a7c35" }}>&#9829;</span> {postData._count?.likes ?? 0} Likes
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ color: "#9a7c35" }}>&#128172;</span> {postData._count?.replies ?? 0} Replies
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ color: "#9a7c35" }}>&#128257;</span> {postData._count?.reposts ?? 0} Reposts
          </span>
        </div>
      </div>
    ),
    {
      ...size,
      fonts,
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=86400",
      },
    },
  );
}
