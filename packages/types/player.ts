export type SharedPlayerRole = 'TOP' | 'JUNGLE' | 'MID' | 'ADC' | 'SUPPORT';

export interface PlayerListItem {
  id: string;
  firstName: string;
  lastName: string;
  gameName: string;
  tagLine: string;
  role: SharedPlayerRole;
  marketValue: number;
  marketValueDelta?: number | null;
  salary: number;
  teamId: string;
  teamName: string;
  teamShortCode?: string;
}

export interface MarketValuePoint {
  value: number;
  changedAt: string;
}
