"use client";

/**
 * デフォルトアバター（Xの卵アイコンのような初期アイコン）
 * avatarUrl が無いときに表示する共通コンポーネント
 */
export default function DefaultAvatar({
  name,
  className = "",
  style,
}: {
  name?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`flex items-center justify-center overflow-hidden rounded-full ${className}`}
      style={{
        background: "linear-gradient(135deg, #2a3328 0%, #1a2018 50%, #252d22 100%)",
        border: "1.5px solid rgba(201,168,76,0.2)",
        ...style,
      }}
      aria-hidden
    >
      {/* 卵型（oval）のシルエット - Xのデフォルトアイコン風 */}
      <svg
        viewBox="0 0 24 24"
        className="h-[55%] w-[55%]"
        fill="rgba(201,168,76,0.35)"
        aria-hidden
      >
        <ellipse cx="12" cy="14" rx="7" ry="9" />
      </svg>
    </div>
  );
}
