import { getRankedInfo } from './league';
import { getMatchDetail, getMatchHistory, getMatchTimeline } from './match';
import { RiotApiError } from './client';
import { getAccountByRiotId } from './summoner';

export { RiotApiError, getAccountByRiotId, getMatchDetail, getMatchHistory, getMatchTimeline, getRankedInfo };

export const riotClient = {
  getAccountByRiotId,
  getMatchHistory,
  getMatchDetail,
  getMatchTimeline,
  getRankedInfo,
};
