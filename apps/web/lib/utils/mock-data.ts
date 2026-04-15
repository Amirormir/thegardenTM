import type { MatchSummary, PlayerListItem, TeamStanding, TeamSummary } from '@nexus/types';

export const teams: TeamSummary[] = [
  { id: 'team-1', name: 'Astral Wolves', slug: 'astral-wolves', shortCode: 'AW', logoUrl: null },
  { id: 'team-2', name: 'Crimson Nova', slug: 'crimson-nova', shortCode: 'CN', logoUrl: null },
  { id: 'team-3', name: 'Golden Echo', slug: 'golden-echo', shortCode: 'GE', logoUrl: null },
  { id: 'team-4', name: 'Void Sentinels', slug: 'void-sentinels', shortCode: 'VS', logoUrl: null },
];

export const players: PlayerListItem[] = [
  { id: 'player-1', displayName: 'WolfEdge', firstName: 'Luca', lastName: 'Rossi', gameName: 'WolfEdge', tagLine: 'EUW', role: 'TOP', marketValue: 920000, salary: 210000, teamId: 'team-1', teamName: 'Astral Wolves' },
  { id: 'player-2', displayName: 'Orbit', firstName: 'Nassim', lastName: 'Benali', gameName: 'Orbit', tagLine: 'EUW', role: 'JUNGLE', marketValue: 880000, salary: 195000, teamId: 'team-1', teamName: 'Astral Wolves' },
  { id: 'player-3', displayName: 'Midline', firstName: 'Victor', lastName: 'Martins', gameName: 'Midline', tagLine: 'EUW', role: 'MID', marketValue: 940000, salary: 225000, teamId: 'team-1', teamName: 'Astral Wolves' },
  { id: 'player-4', displayName: 'Aero', firstName: 'Theo', lastName: 'Lambert', gameName: 'Aero', tagLine: 'EUW', role: 'ADC', marketValue: 960000, salary: 230000, teamId: 'team-1', teamName: 'Astral Wolves' },
  { id: 'player-5', displayName: 'Bulwark', firstName: 'Samir', lastName: 'Khan', gameName: 'Bulwark', tagLine: 'EUW', role: 'SUPPORT', marketValue: 720000, salary: 170000, teamId: 'team-1', teamName: 'Astral Wolves' },
  { id: 'player-6', displayName: 'Riftcore', firstName: 'Ethan', lastName: 'Mercier', gameName: 'Riftcore', tagLine: 'EUW', role: 'TOP', marketValue: 780000, salary: 180000, teamId: 'team-2', teamName: 'Crimson Nova' },
  { id: 'player-7', displayName: 'Pulse', firstName: 'Ilyes', lastName: 'Chevalier', gameName: 'Pulse', tagLine: 'EUW', role: 'JUNGLE', marketValue: 845000, salary: 192000, teamId: 'team-2', teamName: 'Crimson Nova' },
  { id: 'player-8', displayName: 'ScarletFox', firstName: 'Noah', lastName: 'Petit', gameName: 'ScarletFox', tagLine: 'EUW', role: 'MID', marketValue: 905000, salary: 220000, teamId: 'team-2', teamName: 'Crimson Nova' },
  { id: 'player-9', displayName: 'Hexa', firstName: 'Adam', lastName: 'Durand', gameName: 'Hexa', tagLine: 'EUW', role: 'ADC', marketValue: 890000, salary: 208000, teamId: 'team-2', teamName: 'Crimson Nova' },
  { id: 'player-10', displayName: 'Parry', firstName: 'Yanis', lastName: 'Masson', gameName: 'Parry', tagLine: 'EUW', role: 'SUPPORT', marketValue: 670000, salary: 162000, teamId: 'team-2', teamName: 'Crimson Nova' },
  { id: 'player-11', displayName: 'GoldenPalm', firstName: 'Leo', lastName: 'Renaud', gameName: 'GoldenPalm', tagLine: 'EUW', role: 'TOP', marketValue: 730000, salary: 176000, teamId: 'team-3', teamName: 'Golden Echo' },
  { id: 'player-12', displayName: 'Catalyst', firstName: 'Mehdi', lastName: 'Fernandes', gameName: 'Catalyst', tagLine: 'EUW', role: 'JUNGLE', marketValue: 760000, salary: 184000, teamId: 'team-3', teamName: 'Golden Echo' },
  { id: 'player-13', displayName: 'EchoLux', firstName: 'Rayan', lastName: 'Lopez', gameName: 'EchoLux', tagLine: 'EUW', role: 'MID', marketValue: 830000, salary: 200000, teamId: 'team-3', teamName: 'Golden Echo' },
  { id: 'player-14', displayName: 'Sunfire', firstName: 'Jules', lastName: 'Pereira', gameName: 'Sunfire', tagLine: 'EUW', role: 'ADC', marketValue: 815000, salary: 196000, teamId: 'team-3', teamName: 'Golden Echo' },
  { id: 'player-15', displayName: 'Halo', firstName: 'Ibrahim', lastName: 'Costa', gameName: 'Halo', tagLine: 'EUW', role: 'SUPPORT', marketValue: 640000, salary: 154000, teamId: 'team-3', teamName: 'Golden Echo' },
  { id: 'player-16', displayName: 'Nightfall', firstName: 'Mathis', lastName: 'Leroy', gameName: 'Nightfall', tagLine: 'EUW', role: 'TOP', marketValue: 860000, salary: 200000, teamId: 'team-4', teamName: 'Void Sentinels' },
  { id: 'player-17', displayName: 'Vanta', firstName: 'Nolan', lastName: 'Garcia', gameName: 'Vanta', tagLine: 'EUW', role: 'JUNGLE', marketValue: 900000, salary: 214000, teamId: 'team-4', teamName: 'Void Sentinels' },
  { id: 'player-18', displayName: 'ZeroPulse', firstName: 'Ayman', lastName: 'Robert', gameName: 'ZeroPulse', tagLine: 'EUW', role: 'MID', marketValue: 980000, salary: 235000, teamId: 'team-4', teamName: 'Void Sentinels' },
  { id: 'player-19', displayName: 'Abyssal', firstName: 'Tom', lastName: 'Bernard', gameName: 'Abyssal', tagLine: 'EUW', role: 'ADC', marketValue: 970000, salary: 232000, teamId: 'team-4', teamName: 'Void Sentinels' },
  { id: 'player-20', displayName: 'Wardlock', firstName: 'Bilal', lastName: 'Lemoine', gameName: 'Wardlock', tagLine: 'EUW', role: 'SUPPORT', marketValue: 690000, salary: 166000, teamId: 'team-4', teamName: 'Void Sentinels' },
];

export const standings: TeamStanding[] = [
  { id: 'team-4', name: 'Void Sentinels', slug: 'void-sentinels', shortCode: 'VS', logoUrl: null, wins: 5, losses: 1, mapWins: 11, mapLosses: 4, points: 16 },
  { id: 'team-1', name: 'Astral Wolves', slug: 'astral-wolves', shortCode: 'AW', logoUrl: null, wins: 4, losses: 2, mapWins: 10, mapLosses: 6, points: 13 },
  { id: 'team-2', name: 'Crimson Nova', slug: 'crimson-nova', shortCode: 'CN', logoUrl: null, wins: 2, losses: 4, mapWins: 7, mapLosses: 10, points: 8 },
  { id: 'team-3', name: 'Golden Echo', slug: 'golden-echo', shortCode: 'GE', logoUrl: null, wins: 1, losses: 5, mapWins: 4, mapLosses: 12, points: 4 },
];

export const matches: MatchSummary[] = [
  { id: 'match-1', seasonId: 'season-2026-spring', homeTeamId: 'team-1', awayTeamId: 'team-2', scheduledAt: '2026-04-04T18:00:00.000Z', format: 'BO3', homeScore: 2, awayScore: 1, isCompleted: true },
  { id: 'match-2', seasonId: 'season-2026-spring', homeTeamId: 'team-4', awayTeamId: 'team-3', scheduledAt: '2026-04-05T18:00:00.000Z', format: 'BO3', homeScore: 2, awayScore: 0, isCompleted: true },
  { id: 'match-3', seasonId: 'season-2026-spring', homeTeamId: 'team-1', awayTeamId: 'team-4', scheduledAt: '2026-04-11T18:00:00.000Z', format: 'BO5', homeScore: 0, awayScore: 0, isCompleted: false },
];

export const recentLeaders = [
  { label: 'KDA', value: '6.8', player: 'ZeroPulse', trend: 'up' as const },
  { label: 'CS/MIN', value: '9.4', player: 'Aero', trend: 'up' as const },
  { label: 'Dmg/min', value: '812', player: 'ScarletFox', trend: 'down' as const },
];

export const roleBudget = [
  { role: 'TOP', value: 200000 },
  { role: 'JUNGLE', value: 214000 },
  { role: 'MID', value: 235000 },
  { role: 'ADC', value: 232000 },
  { role: 'SUPPORT', value: 166000 },
];
