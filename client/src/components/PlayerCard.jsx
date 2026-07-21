import { Link } from 'react-router-dom';

export default function PlayerCard({ player }) {
  return (
    <Link to={`/players/${player._id}`} className="player-card">
      <div className="player-card-inner">
        <div className="player-card-photo-wrap">
          <img
            className="player-card-photo"
            src={player.photo || 'https://placehold.co/300x300?text=No+Photo'}
            alt={player.name}
          />
        </div>
        <div className="player-card-body">
          <h3>{player.name}</h3>
          {player.age != null && <p>Age {player.age}</p>}
        </div>
      </div>
    </Link>
  );
}
