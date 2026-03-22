"use client";

import { API_BASE } from "../../lib/api";
import DefaultAvatar from "./DefaultAvatar";

type Size = "xs" | "sm" | "md" | "lg" | "xl" | "2xl";

const sizeMap: Record<Size, string> = {
  xs: "h-6 w-6",
  sm: "h-8 w-8",
  md: "h-9 w-9",
  lg: "h-10 w-10",
  xl: "h-20 w-20",
  "2xl": "h-16 w-16",
};

export default function Avatar({
  avatarUrl,
  name,
  size = "md",
  className = "",
  style,
}: {
  avatarUrl: string | null | undefined;
  name: string;
  size?: Size;
  className?: string;
  style?: React.CSSProperties;
}) {
  const sizeClass = sizeMap[size];
  if (avatarUrl) {
    const src = avatarUrl.startsWith("http") ? avatarUrl : `${API_BASE}${avatarUrl}`;
    return (
      <img
        src={src}
        alt={name}
        loading="lazy"
        className={`${sizeClass} flex-shrink-0 rounded-full object-cover ${className}`}
        style={{ border: "1.5px solid rgba(201,168,76,0.2)", ...style }}
      />
    );
  }
  return (
    <DefaultAvatar
      name={name}
      className={`${sizeClass} flex-shrink-0 ${className}`}
      style={style}
    />
  );
}
