export interface RiotAccount {
  puuid: string;
  gameName: string;
  tagLine: string;
}

export interface RiotRankedEntry {
  leagueId: string;
  queueType: string;
  tier: string;
  rank: string;
  leaguePoints: number;
  wins: number;
  losses: number;
}

export interface RiotMatchParticipant {
  puuid: string;
  summonerName: string;
  championName: string;
  kills: number;
  deaths: number;
  assists: number;
  totalMinionsKilled: number;
  neutralMinionsKilled: number;
  goldEarned: number;
  totalDamageDealtToChampions: number;
  visionScore: number;
  win: boolean;
}

export interface RiotMatchDetail {
  metadata: {
    matchId: string;
    participants: string[];
  };
  info: {
    gameCreation: number;
    gameDuration: number;
    participants: RiotMatchParticipant[];
  };
}

export interface RiotTimeline {
  metadata: {
    matchId: string;
  };
  info: {
    frameInterval: number;
    frames: Array<{
      timestamp: number;
    }>;
  };
}
