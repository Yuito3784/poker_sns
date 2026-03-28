import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Poker SNS - プロフィール";
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

export default async function Image({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;

  const [fontData, userData] = await Promise.all([
    loadFont().catch(() => null),
    fetch(`${API_BASE}/users/${username}/meta`, { next: { revalidate: 3600 } })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null),
  ]);

  const fonts = fontData
    ? [{ name: "NotoSansJP", data: fontData, style: "normal" as const, weight: 400 as const }]
    : [];
  const fontFamily = fontData ? "NotoSansJP, sans-serif" : "sans-serif";

  if (!userData) {
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

  const initial = (userData.name || userData.username || "?")[0].toUpperCase();
  const bio = userData.bio
    ? userData.bio.slice(0, 80) + (userData.bio.length > 80 ? "..." : "")
    : "";

  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #0d1009 0%, #131a14 50%, #0d1009 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "60px",
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

        {/* Logo top-right */}
        <div
          style={{
            position: "absolute",
            top: "32px",
            right: "40px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <span style={{ fontSize: "24px", color: "#c9a84c" }}>&#9824;</span>
          <span style={{ fontSize: "18px", fontWeight: 700, color: "#c9a84c" }}>Poker SNS</span>
        </div>

        {/* Avatar */}
        <div
          style={{
            width: "80px",
            height: "80px",
            borderRadius: "50%",
            border: "3px solid #c9a84c",
            background: "#192118",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "32px",
            fontWeight: 700,
            color: "#c9a84c",
            marginBottom: "20px",
          }}
        >
          {initial}
        </div>

        {/* Name */}
        <div
          style={{
            fontSize: "36px",
            fontWeight: 700,
            color: "#ddd6c8",
            marginBottom: "6px",
          }}
        >
          {userData.name || userData.username}
        </div>

        {/* Username */}
        <div
          style={{
            fontSize: "22px",
            color: "#c9a84c",
            marginBottom: "16px",
          }}
        >
          @{userData.username}
        </div>

        {/* Bio */}
        {bio && (
          <div
            style={{
              fontSize: "18px",
              color: "#7a7260",
              textAlign: "center",
              maxWidth: "700px",
              lineHeight: 1.5,
              marginBottom: "24px",
            }}
          >
            {bio}
          </div>
        )}

        {/* Stats */}
        <div
          style={{
            display: "flex",
            gap: "40px",
            fontSize: "16px",
            color: "#7a7260",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <span style={{ fontSize: "24px", fontWeight: 700, color: "#ddd6c8" }}>
              {userData._count?.posts ?? 0}
            </span>
            <span>Posts</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <span style={{ fontSize: "24px", fontWeight: 700, color: "#ddd6c8" }}>
              {userData._count?.followers ?? 0}
            </span>
            <span>Followers</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <span style={{ fontSize: "24px", fontWeight: 700, color: "#ddd6c8" }}>
              {userData._count?.following ?? 0}
            </span>
            <span>Following</span>
          </div>
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
