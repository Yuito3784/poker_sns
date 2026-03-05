"use client";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center px-4"
      style={{ backgroundColor: "#0d1009", color: "#ddd6c8" }}
    >
      <h1
        className="mb-2 text-6xl font-bold"
        style={{ color: "#c9a84c", fontFamily: "var(--font-playfair)" }}
      >
        500
      </h1>
      <p className="mb-6 text-lg" style={{ color: "#9a8e7a" }}>
        サーバーエラーが発生しました
      </p>
      <button
        onClick={reset}
        className="rounded-lg px-6 py-3 text-sm font-semibold transition-opacity hover:opacity-90"
        style={{ backgroundColor: "#c9a84c", color: "#0d1009" }}
      >
        もう一度試す
      </button>
    </div>
  );
}
