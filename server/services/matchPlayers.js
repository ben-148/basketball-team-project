function normalize(value) {
  return value.trim().toLowerCase();
}

// Matches an extracted name against the player roster: exact name match first (high confidence),
// then known aliases (medium confidence), otherwise unmatched.
export function matchPlayerName(nameInFile, players, aliases) {
  const norm = normalize(nameInFile);

  const exact = players.find((p) => normalize(p.name) === norm);
  if (exact) {
    return { playerId: exact._id.toString(), matchType: 'exact' };
  }

  const aliasHit = aliases.find((a) => normalize(a.alias) === norm);
  if (aliasHit) {
    const player = players.find((p) => p._id.toString() === aliasHit.playerId);
    if (player) {
      return { playerId: player._id.toString(), matchType: 'alias' };
    }
  }

  return { playerId: null, matchType: 'none' };
}
