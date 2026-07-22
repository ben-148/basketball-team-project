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

  const winningNames = winner === TEAMS[0] ? raskoNames : winner === TEAMS[1] ? shoshanatNames : null;
  const losingNames = winner === TEAMS[0] ? shoshanatNames : winner === TEAMS[1] ? raskoNames : null;

  return (
    <>
      {winner ? (
        <>
          <div className="minigame-summary-pill minigame-summary-pill-winning">
            🏆 <bdi>{winningNames.join(' · ')}</bdi>
          </div>
          <span className="minigame-summary-vs">vs</span>
          <div className="minigame-summary-pill minigame-summary-pill-losing">
            <bdi>{losingNames.join(' · ')}</bdi>
          </div>
        </>
      ) : (
        <>
          <div className="minigame-summary-pill minigame-summary-pill-losing">
            <bdi>{raskoNames.join(' · ')}</bdi>
          </div>
          <span className="minigame-summary-vs">vs</span>
          <div className="minigame-summary-pill minigame-summary-pill-losing">
            <bdi>{shoshanatNames.join(' · ')}</bdi>
          </div>
        </>
      )}
      {benchNames.length > 0 && (
        <div className="minigame-summary-bench-chip">
          🪑 <bdi>{benchNames.join(' · ')}</bdi>
        </div>
      )}
    </>
  );
}
