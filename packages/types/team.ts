export interface TeamStanding {
  id: string;
  name: string;
  slug: string;
  shortCode: string;
  logoUrl: string | null;
  wins: number;
  losses: number;
  mapWins: number;
  mapLosses: number;
  points: number;
}

export interface TeamSummary {
  id: string;
  name: string;
  slug: string;
  shortCode: string;
  logoUrl: string | null;
}

export interface TeamMarketValueEntry {
  id: string;
  name: string;
  slug: string;
  shortCode: string;
  logoUrl: string | null;
  playerCount: number;
  totalMarketValue: number;
  averageMarketValue: number;
  totalSalary: number;
}
