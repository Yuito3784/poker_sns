export default function PostSkeleton() {
  return (
    <li
      className="animate-pulse rounded-lg px-4 py-4"
      style={{ background: "#131a14", border: "1px solid #1f2a1e" }}
    >
      <div className="mb-3 flex items-center gap-2">
        <div className="h-9 w-9 flex-shrink-0 rounded-full" style={{ background: "#1f2a1e" }} />
        <div className="space-y-1.5">
          <div className="h-3 w-24 rounded" style={{ background: "#1f2a1e" }} />
          <div className="h-2.5 w-16 rounded" style={{ background: "#161b14" }} />
        </div>
      </div>
      <div className="ml-11 space-y-2">
        <div className="h-3.5 w-full rounded" style={{ background: "#1f2a1e" }} />
        <div className="h-3.5 w-4/5 rounded" style={{ background: "#1f2a1e" }} />
        <div className="h-3.5 w-3/5 rounded" style={{ background: "#161b14" }} />
      </div>
      <div className="ml-11 mt-3 flex gap-3">
        <div className="h-5 w-10 rounded" style={{ background: "#161b14" }} />
        <div className="h-5 w-10 rounded" style={{ background: "#161b14" }} />
        <div className="h-5 w-10 rounded" style={{ background: "#161b14" }} />
      </div>
    </li>
  );
}
