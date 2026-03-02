"use client";

type Props = {
  size?: "sm" | "md";
};

export default function PremiumBadge({ size = "sm" }: Props) {
  const sizeClass = size === "sm"
    ? "px-1.5 py-0.5 text-[9px]"
    : "px-2 py-0.5 text-[10px]";

  return (
    <span className={`inline-flex items-center gap-0.5 rounded font-bold tracking-wider uppercase ${sizeClass}`} style={{
      background: "linear-gradient(135deg, #c9a84c22, #9a7c3515)",
      color: "#c9a84c",
      border: "1px solid rgba(201,168,76,0.35)",
      letterSpacing: "0.06em",
    }}>
      PRO
    </span>
  );
}
