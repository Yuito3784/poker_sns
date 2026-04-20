import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "PokerTALK - テーブルの外でも、ポーカーを語ろう";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

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

export default async function Image() {
  const fontData = await loadFont().catch(() => null);

  const fonts = fontData
    ? [{ name: "NotoSansJP", data: fontData, style: "normal" as const, weight: 400 as const }]
    : [];
  const fontFamily = fontData ? "NotoSansJP, sans-serif" : "sans-serif";

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

        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: "20px", marginBottom: "28px" }}>
          <span
            style={{
              fontSize: "80px",
              color: "#c9a84c",
            }}
          >
            &#9824;
          </span>
          <span
            style={{
              fontSize: "72px",
              fontWeight: 700,
              color: "#ddd6c8",
              letterSpacing: "-3px",
            }}
          >
            PokerTALK
          </span>
        </div>

        {/* Tagline */}
        <p
          style={{
            fontSize: "34px",
            color: "#7a7260",
            textAlign: "center",
            maxWidth: "820px",
            lineHeight: 1.45,
            margin: "0 0 40px",
          }}
        >
          テーブルの外でも、ポーカーを語ろう
        </p>

        {/* Feature chips */}
        <div style={{ display: "flex", gap: "16px" }}>
          {["ハンドを語る", "仲間と議論", "セッションを記録"].map((feat, i) => (
            <div
              key={feat}
              style={{
                padding: "10px 24px",
                background: "rgba(201, 168, 76, 0.12)",
                border: "1px solid rgba(201, 168, 76, 0.3)",
                borderRadius: "100px",
                color: "#c9a84c",
                fontSize: "20px",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <span>{["&#9824;", "&#9829;", "&#9830;"][i]}</span>
              {feat}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
