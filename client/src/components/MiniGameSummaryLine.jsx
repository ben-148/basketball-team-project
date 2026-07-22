import MiniGameTeamPills from './MiniGameTeamPills.jsx';

export default function MiniGameSummaryLine({ index, raskoScore, shoshanatScore, teams }) {
  return (
    <div className="minigame-summary-line">
      <span className="minigame-summary-title">Mini-Game #{index + 1}</span>
      <span className="minigame-summary-dot">&middot;</span>
      <span className="minigame-summary-score">
        {raskoScore} - {shoshanatScore}
      </span>
      <span className="minigame-summary-dot">&middot;</span>
      <MiniGameTeamPills raskoScore={raskoScore} shoshanatScore={shoshanatScore} teams={teams} />
    </div>
  );
}
