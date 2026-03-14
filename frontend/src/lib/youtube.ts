const YOUTUBE_REGEX =
  /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})/;

const STRICT_VIDEO_ID = /^[a-zA-Z0-9_-]{11}$/;

export function extractYouTubeId(text: string): string | null {
  const match = text.match(YOUTUBE_REGEX);
  if (!match) return null;
  const id = match[1];
  return STRICT_VIDEO_ID.test(id) ? id : null;
}
