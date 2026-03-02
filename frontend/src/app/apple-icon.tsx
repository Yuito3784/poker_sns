import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #131a14 0%, #0d1009 100%)",
          borderRadius: "36px",
        }}
      >
        <span
          style={{
            fontSize: "110px",
            background: "linear-gradient(135deg, #c9a84c, #9a7c35)",
            backgroundClip: "text",
            color: "transparent",
            fontFamily: "Georgia, serif",
          }}
        >
          ♠
        </span>
      </div>
    ),
    { ...size },
  );
}
