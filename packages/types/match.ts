export type SharedMatchFormat = 'BO1' | 'BO3' | 'BO5';

export interface MatchSummary {
  id: string;
  seasonId: string;
  homeTeamId: string;
  awayTeamId: string;
  scheduledAt: string;
  format: SharedMatchFormat;
  homeScore: number;
  awayScore: number;
  isCompleted: boolean;
}
