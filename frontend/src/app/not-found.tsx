import Link from "next/link";

export default function NotFound() {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center px-4"
      style={{ backgroundColor: "#0d1009", color: "#ddd6c8" }}
    >
      <h1
        className="mb-2 text-6xl font-bold"
        style={{ color: "#c9a84c", fontFamily: "var(--font-playfair)" }}
      >
        404
      </h1>
      <p className="mb-6 text-lg" style={{ color: "#7a7260" }}>
        ページが見つかりませんでした
      </p>
      <Link
        href="/"
        className="rounded-lg px-6 py-3 text-sm font-semibold transition-opacity hover:opacity-90"
        style={{ backgroundColor: "#c9a84c", color: "#0d1009" }}
      >
        ホームに戻る
      </Link>
    </div>
  );
}
