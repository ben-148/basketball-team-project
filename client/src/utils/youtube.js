export function getYoutubeEmbedUrl(url) {
  if (!url) return null;
  let videoId = null;

  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes('youtu.be')) {
      videoId = parsed.pathname.slice(1);
    } else if (parsed.hostname.includes('youtube.com')) {
      videoId = parsed.searchParams.get('v') || parsed.pathname.split('/embed/')[1];
    }
  } catch {
    return null;
  }

  return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
}
