import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api/client.js';
import VideoCard from '../components/VideoCard.jsx';
import { STAT_FIELDS as STAT_LABELS, BENCH } from '../constants.js';
import { formatDate } from '../utils/date.js';

export default function PlayerPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.players
      .get(id)
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="page-container">Loading...</div>;
  if (error) return <div className="page-container error-text">{error}</div>;
  if (!data) return null;

  const { player, lifetime, gameLog, videos } = data;

  const metaParts = [];
  if (player.age != null) metaParts.push(`Age ${player.age}`);
  if (player.dateOfBirth) metaParts.push(`Born ${formatDate(player.dateOfBirth)}`);

  return (
    <div className="page-container">
      <Link to="/" className="back-link">
        &larr; Back to team
      </Link>

      <div className="player-hero">
        <img
          className="player-header-photo"
          src={player.photo || 'https://placehold.co/300x300?text=No+Photo'}
          alt={player.name}
        />
        <div>
          <h1 className="player-hero-name">{player.name}</h1>
          {metaParts.length > 0 && <p className="player-hero-meta">{metaParts.join(' · ')}</p>}
          {player.bio && <p className="player-bio">{player.bio}</p>}
        </div>
      </div>

      <section>
        <h2 className="section-title">Career Stats ({lifetime.gamesPlayed} played)</h2>
        <div className="stat-grid">
          {STAT_LABELS.map(([field, label]) => (
            <div key={field} className="stat-tile">
              <div className="stat-value">{lifetime[field]}</div>
              <div className="stat-label">{label}</div>
            </div>
          ))}
          <div className="stat-tile">
            <div className="stat-value">{lifetime.benchCount}</div>
            <div className="stat-label">🪑 ספסל</div>
          </div>
        </div>
      </section>

      <section>
        <h2 className="section-title">Session Log</h2>
        {gameLog.length === 0 ? (
          <p>No session stats recorded yet.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Team</th>
                  <th>Score</th>
                  {STAT_LABELS.map(([field, label]) => (
                    <th key={field}>{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {gameLog.map((row) => {
                  const link = row.type === 'legacy' ? `/legacy-sessions/${row.gameId}` : `/sessions/${row.sessionId}`;
                  return (
                    <tr key={row._id}>
                      <td>
                        <Link to={link}>{formatDate(row.date)}</Link>
                      </td>
                      <td>{row.team === BENCH ? '🪑 Bench' : row.team}</td>
                      <td>
                        {row.raskoScore}-{row.shoshanatScore}
                      </td>
                      {STAT_LABELS.map(([field]) => (
                        <td key={field}>{row[field]}</td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2 className="section-title">Videos</h2>
        {videos.length === 0 ? (
          <p>No videos tagged to this player yet.</p>
        ) : (
          <div className="video-grid">
            {videos.map((v) => (
              <VideoCard key={v._id} video={v} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
