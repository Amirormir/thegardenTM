export type SharedPlayerRole = 'TOP' | 'JUNGLE' | 'MID' | 'ADC' | 'SUPPORT';

export interface PlayerListItem {
  id: string;
  displayName: string;
  firstName: string;
  lastName: string;
  gameName: string;
  tagLine: string;
  imageUrl?: string | null;
  role: SharedPlayerRole;
  secondaryRoles?: SharedPlayerRole[];
  marketValue: number;
  marketValueDelta?: number | null;
  salary: number;
  teamId?: string | null;
  teamName: string;
  teamShortCode?: string | null;
  teamLogoUrl?: string | null;
}

export interface MarketValuePoint {
  value: number;
  changedAt: string;
}
