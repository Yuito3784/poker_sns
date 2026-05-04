#!/usr/bin/env python3
"""
Read video_prompt.txt (or --prompt-file), generate a Hyperframes composition, and render MP4.

Default: builds hyperframes-marketing-reels/compositions/_generated_from_prompt.html
         and renders hyperframes-marketing-reels/output/from_prompt.mp4

  py video.py
  py video.py --preset marketing --output hyperframes-marketing-reels/output/reel.mp4
"""

from __future__ import annotations

import argparse
import html
import re
import shutil
import subprocess
import sys
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parent
HF_DIR = REPO_ROOT / "hyperframes-marketing-reels"
DEFAULT_PROMPT_FILE = REPO_ROOT / "video_prompt.txt"
GENERATED_COMP = HF_DIR / "compositions" / "_generated_from_prompt.html"
DEFAULT_OUTPUT_FROM_PROMPT = HF_DIR / "output" / "from_prompt.mp4"
DEFAULT_MARKETING_OUTPUT = HF_DIR / "output" / "marketing_reel.mp4"

# Tracked default index (marketing reel entry). Used to restore after prompt renders.
INDEX_PATH = HF_DIR / "index.html"


def npx_exe() -> str:
    exe = shutil.which("npx") or shutil.which("npx.cmd")
    if not exe:
        raise FileNotFoundError("npx が PATH で見つかりません。Node.js をインストールし、ターミナルで npx が使える状態にしてください。")
    return exe


def strip_prompt_comments(text: str) -> str:
    """Drop Markdown-style comment lines: '#' followed by whitespace only (keeps #hashtag lines)."""
    lines = []
    for line in text.splitlines():
        s = line.strip()
        if s == "---":
            continue
        if re.match(r"^#\s", s):
            continue
        lines.append(line)
    return "\n".join(lines).strip()


def chunk_text(raw: str, max_chars: int = 260) -> list[str]:
    text = strip_prompt_comments(raw)
    if not text:
        return []
    parts = re.split(r"\n\s*\n+", text)
    parts = [p.strip() for p in parts if p.strip()]
    if not parts:
        parts = [text]
    chunks: list[str] = []
    buf = ""
    for p in parts:
        if len(p) > max_chars:
            if buf:
                chunks.append(buf)
                buf = ""
            start = 0
            while start < len(p):
                chunks.append(p[start : start + max_chars])
                start += max_chars
            continue
        if not buf:
            buf = p
        elif len(buf) + len(p) + 2 <= max_chars:
            buf = f"{buf}\n\n{p}"
        else:
            chunks.append(buf)
            buf = p
    if buf:
        chunks.append(buf)
    return chunks[:40]


def slide_duration_for_chunk(chunk: str) -> float:
    """Seconds per slide (Hyperframes-friendly, bounded)."""
    n = len(chunk)
    return max(3.0, min(8.0, 2.5 + n / 55.0))


def build_generated_html(chunks: list[str]) -> tuple[str, float]:
    durations = [slide_duration_for_chunk(c) for c in chunks]
    total = sum(durations)
    starts: list[float] = []
    t = 0.0
    for d in durations:
        starts.append(t)
        t += d

    slide_divs: list[str] = []
    for i, (chunk, d, st) in enumerate(zip(chunks, durations, starts)):
        body = html.escape(chunk).replace("\n", "<br/>")
        slide_divs.append(
            f"""
    <div class="clip" id="pf-chunk-{i}" data-start="{st:.3f}" data-duration="{d:.3f}" data-track-index="0">
      <div class="pf-card">
        <div class="pf-label">PROMPT → VIDEO</div>
        <div class="pf-body">{body}</div>
      </div>
    </div>"""
        )

    gsap_lines: list[str] = ["    const tl = gsap.timeline({ paused: true });"]
    for i, (d, st) in enumerate(zip(durations, starts)):
        fade_in = st + 0.06
        fade_out = st + d - 0.28
        gsap_lines.append(f'    tl.to("#pf-chunk-{i}", {{ opacity: 1, duration: 0.22, ease: "power2.out" }}, {fade_in:.3f});')
        if fade_out > fade_in:
            gsap_lines.append(f'    tl.to("#pf-chunk-{i}", {{ opacity: 0, duration: 0.24, ease: "power2.in" }}, {fade_out:.3f});')
    gsap_lines.append('    window.__timelines["from-prompt-telop"] = tl;')

    slides_html = "\n".join(slide_divs)
    gsap_block = "\n".join(gsap_lines)

    doc = f"""<!doctype html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=1080, height=1920" />
  <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
  <style>
    @import url("https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700;900&display=swap");
    * {{ margin: 0; padding: 0; box-sizing: border-box; }}
    html, body {{ width: 1080px; height: 1920px; overflow: hidden; font-family: "Noto Sans JP", system-ui, sans-serif; background: #050508; }}
    .clip {{ position: absolute; opacity: 0; inset: 0; }}
    .pf-card {{
      position: absolute;
      top: 120px;
      bottom: 140px;
      left: 44px;
      right: 44px;
      padding: 36px 40px;
      border-radius: 28px;
      background: rgba(12, 12, 20, 0.92);
      border: 1px solid rgba(165, 180, 252, 0.35);
      box-shadow: 0 30px 80px rgba(0,0,0,0.55);
      display: flex;
      flex-direction: column;
      gap: 20px;
    }}
    .pf-label {{
      font-size: 26px;
      font-weight: 800;
      letter-spacing: 0.14em;
      color: #818cf8;
    }}
    .pf-body {{
      font-size: 40px;
      font-weight: 700;
      line-height: 1.55;
      color: #f1f5f9;
      white-space: normal;
      overflow: hidden;
    }}
  </style>
</head>
<body>
  <div id="root" data-composition-id="from-prompt-telop" data-start="0" data-duration="{total:.3f}" data-width="1080" data-height="1920">
{slides_html}
  </div>
  <script>
    window.__timelines = window.__timelines || {{}};
{gsap_block}
  </script>
</body>
</html>
"""
    return doc, total


def build_temporary_index(total_duration: float) -> str:
    d = f"{total_duration:.3f}"
    return f"""<!doctype html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1080, height=1920" />
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <style>
      * {{ margin: 0; padding: 0; box-sizing: border-box; }}
      html, body {{ margin: 0; width: 1080px; height: 1920px; overflow: hidden; background: #050508; }}
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="{d}" data-width="1080" data-height="1920">
      <div
        class="clip"
        data-start="0"
        data-duration="{d}"
        data-track-index="0"
        data-composition-id="from-prompt-telop"
        data-composition-src="compositions/_generated_from_prompt.html"
        style="position: absolute; inset: 0"
      ></div>
    </div>
    <script>
      window.__timelines = window.__timelines || {{}};
      const tl = gsap.timeline({{ paused: true }});
      window.__timelines["main"] = tl;
    </script>
  </body>
</html>
"""


def run_hyperframes_render(output: Path, quality: str) -> None:
    HF_DIR.mkdir(parents=True, exist_ok=True)
    output.parent.mkdir(parents=True, exist_ok=True)
    cmd = [
        npx_exe(),
        "hyperframes",
        "render",
        str(HF_DIR),
        "-o",
        str(output),
        "-q",
        quality,
    ]
    print(" ".join(cmd))
    subprocess.run(cmd, check=True, cwd=str(REPO_ROOT))


def run_lint() -> int:
    cmd = [npx_exe(), "hyperframes", "lint", str(HF_DIR)]
    p = subprocess.run(cmd, cwd=str(REPO_ROOT))
    return int(p.returncode)


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate MP4 from video_prompt.txt via Hyperframes.")
    parser.add_argument(
        "--prompt-file",
        type=Path,
        default=DEFAULT_PROMPT_FILE,
        help="Path to prompt text file (default: ./video_prompt.txt)",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=None,
        help="Output MP4 path",
    )
    parser.add_argument(
        "--preset",
        choices=("from-prompt", "marketing"),
        default="from-prompt",
        help="from-prompt: build slides from prompt text. marketing: render existing 30s reel index.",
    )
    parser.add_argument("--quality", default="standard", choices=("draft", "standard", "high"))
    parser.add_argument("--dry-run", action="store_true", help="Write generated HTML only; do not render.")
    parser.add_argument("--skip-lint", action="store_true", help="Skip npx hyperframes lint before render.")
    args = parser.parse_args()

    prompt_path = args.prompt_file.resolve()
    if not prompt_path.is_file():
        print(f"Prompt file not found: {prompt_path}", file=sys.stderr)
        return 1

    raw_prompt = prompt_path.read_text(encoding="utf-8")
    cleaned = strip_prompt_comments(raw_prompt)
    if not cleaned.strip():
        print("Prompt file is empty after removing # comments.", file=sys.stderr)
        return 1

    if args.preset == "marketing":
        out = (args.output or DEFAULT_MARKETING_OUTPUT).resolve()
        meta_dir = out.parent
        meta_dir.mkdir(parents=True, exist_ok=True)
        (meta_dir / "last_prompt.txt").write_text(raw_prompt, encoding="utf-8")
        if args.dry_run:
            print(f"[dry-run] Would render marketing reel to {out}")
            return 0
        run_hyperframes_render(out, args.quality)
        print(f"Done: {out}")
        return 0

    chunks = chunk_text(raw_prompt)
    if not chunks:
        print("No usable prompt text.", file=sys.stderr)
        return 1

    html_doc, total_d = build_generated_html(chunks)
    GENERATED_COMP.parent.mkdir(parents=True, exist_ok=True)
    GENERATED_COMP.write_text(html_doc, encoding="utf-8")

    if not args.skip_lint:
        lint_rc = run_lint()
        if lint_rc != 0:
            print("hyperframes lint reported errors. Fix _generated_from_prompt.html or adjust prompt.", file=sys.stderr)
            return lint_rc

    out = (args.output or DEFAULT_OUTPUT_FROM_PROMPT).resolve()
    meta_dir = out.parent
    meta_dir.mkdir(parents=True, exist_ok=True)
    (meta_dir / "last_prompt.txt").write_text(raw_prompt, encoding="utf-8")

    if args.dry_run:
        print(f"[dry-run] Wrote {GENERATED_COMP} (duration ~{total_d:.1f}s). Would render to {out}")
        return 0

    if not INDEX_PATH.is_file():
        print(f"Missing {INDEX_PATH}", file=sys.stderr)
        return 1

    original_index = INDEX_PATH.read_text(encoding="utf-8")
    temp_index = build_temporary_index(total_d)
    try:
        INDEX_PATH.write_text(temp_index, encoding="utf-8")
        run_hyperframes_render(out, args.quality)
    finally:
        INDEX_PATH.write_text(original_index, encoding="utf-8")

    print(f"Done: {out}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except FileNotFoundError as e:
        print(str(e), file=sys.stderr)
        raise SystemExit(127)
    except subprocess.CalledProcessError as e:
        print(f"Command failed with exit code {e.returncode}", file=sys.stderr)
        raise SystemExit(e.returncode)
