import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import PlayerCard from '../components/PlayerCard.jsx';
import LastSessionSection from '../components/LastSessionSection.jsx';

export default function Home() {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.players
      .list()
      .then(setPlayers)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <section className="hero">
        <div className="hero-content">
          <p className="hero-eyebrow">Welcome to the</p>
          <h1 className="hero-title">
            RASKO <span className="text-accent">BALL</span>
          </h1>
          <p className="hero-tagline">Hustle. Heart. Hoops.</p>
        </div>
      </section>

      <LastSessionSection />

      <div className="page-container">
        <h2 className="section-title">Our Roster</h2>
        {loading && <p>Loading players...</p>}
        {error && <p className="error-text">{error}</p>}
        {!loading && !error && players.length === 0 && <p>No players yet.</p>}
        {!loading && !error && players.length > 0 && (
          <div className="player-grid">
            {players.map((p) => (
              <PlayerCard key={p._id} player={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
