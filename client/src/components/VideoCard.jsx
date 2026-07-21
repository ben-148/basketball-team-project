import { getYoutubeEmbedUrl } from '../utils/youtube.js';

export default function VideoCard({ video }) {
  const embedUrl = getYoutubeEmbedUrl(video.youtubeUrl);

  return (
    <div className="video-card">
      {embedUrl ? (
        <div className="video-embed">
          <iframe
            src={embedUrl}
            title={video.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : (
        <p>Invalid YouTube URL</p>
      )}
      <h4>{video.title}</h4>
      {video.description && <p>{video.description}</p>}
    </div>
  );
}
