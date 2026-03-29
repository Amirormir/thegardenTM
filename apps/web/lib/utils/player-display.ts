type NullableText = string | null | undefined;

function normalizePlayerText(value: NullableText) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function resolveStoredPlayerDisplayName(player: {
  displayName?: NullableText;
  firstName?: NullableText;
  lastName?: NullableText;
  gameName?: NullableText;
}) {
  const explicitDisplayName = normalizePlayerText(player.displayName);

  if (explicitDisplayName) {
    return explicitDisplayName;
  }

  const firstName = normalizePlayerText(player.firstName);
  const lastName = normalizePlayerText(player.lastName);
  const gameName = normalizePlayerText(player.gameName);

  if (firstName && (!lastName || lastName === firstName)) {
    return firstName;
  }

  return gameName ?? firstName ?? lastName ?? 'Joueur';
}

export function buildPlayerRiotId(player: {
  gameName?: NullableText;
  tagLine?: NullableText;
}) {
  const gameName = normalizePlayerText(player.gameName) ?? 'unknown';
  const tagLine = normalizePlayerText(player.tagLine);

  return tagLine ? `${gameName}#${tagLine}` : gameName;
}

export function getPlayerInitials(value: NullableText) {
  const normalized = normalizePlayerText(value) ?? '??';
  return normalized.slice(0, 2).toUpperCase();
}
