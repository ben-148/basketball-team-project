import { TEAMS, BENCH } from '../constants.js';

function names(rows) {
  return (rows || []).map((row) => row.player.name);
}

export default function MiniGameTeamPills({ raskoScore, shoshanatScore, teams }) {
  const winner =
    raskoScore > shoshanatScore ? TEAMS[0] : shoshanatScore > raskoScore ? TEAMS[1] : null;

  const raskoNames = names(teams[TEAMS[0]]);
  const shoshanatNames = names(teams[TEAMS[1]]);
  const benchNames = names(teams[BENCH]);

  const raskoIsWinner = winner === TEAMS[0];
  const shoshanatIsWinner = winner === TEAMS[1];

  return (
    <>
      <div className={`minigame-summary-pill ${raskoIsWinner ? 'minigame-summary-pill-winning' : 'minigame-summary-pill-losing'}`}>
        {raskoIsWinner && '🏆 '}
        <bdi>{raskoNames.join(' · ')}</bdi>
      </div>
      <span className="minigame-summary-vs">vs</span>
      <div className={`minigame-summary-pill ${shoshanatIsWinner ? 'minigame-summary-pill-winning' : 'minigame-summary-pill-losing'}`}>
        {shoshanatIsWinner && '🏆 '}
        <bdi>{shoshanatNames.join(' · ')}</bdi>
      </div>
      {benchNames.length > 0 && (
        <div className="minigame-summary-bench-chip">
          🪑 <bdi>{benchNames.join(' · ')}</bdi>
        </div>
      )}
    </>
  );
}
