/**
 * Adaptateur serveur : convertit les lignes de stats enregistrées d'une game
 * en notes /100, en résolvant l'adversaire de même rôle (§4.3) et en n'utilisant
 * que les totaux d'équipe fournis. Le moteur de valeur est appliqué séparément
 * dans la transaction `recordResult` (voir `match.ts`).
 */

import { MIN_GAME_MINUTES, type RatingRole } from '@/lib/rating/config';
import {
  ratePlayer,
  type RatingPlayerInput,
  type RatingTeamInput,
} from '@/lib/rating/rate-player';

export interface GameRatingStat {
  playerId: string;
  side: 'BLUE' | 'RED';
  role: RatingRole;
  kills: number;
  deaths: number;
  assists: number;
  killParticipation: number;
  damageShare: number;
  goldShare: number;
  damagePerMin: number;
  goldPerMin: number;
  csPerMin: number;
  visionScore: number;
  rawDamageTaken: number;
  rawSelfMitigated: number;
  result: 'WIN' | 'LOSS';
}

export interface GameTeamStats {
  blue: RatingTeamInput;
  red: RatingTeamInput;
}

export interface ComputeGameNotesParams {
  stats: GameRatingStat[];
  teamStats: GameTeamStats | undefined;
  durationMinutes: number;
}

function toPlayerInput(stat: GameRatingStat): RatingPlayerInput {
  return {
    role: stat.role,
    kills: stat.kills,
    deaths: stat.deaths,
    assists: stat.assists,
    killParticipation: stat.killParticipation,
    damageShare: stat.damageShare,
    goldShare: stat.goldShare,
    damagePerMin: stat.damagePerMin,
    goldPerMin: stat.goldPerMin,
    csPerMin: stat.csPerMin,
    visionScore: stat.visionScore,
    rawDamageTaken: stat.rawDamageTaken,
    rawSelfMitigated: stat.rawSelfMitigated,
    result: stat.result,
  };
}

/**
 * Renvoie une Map playerId -> note /100. Vide si la game est inéligible
 * (durée < MIN_GAME_MINUTES) ou si les totaux d'équipe manquent (mode STRICT
 * indispensable au sous-score objectifs et à la domination).
 */
export function computeGameNotes({
  stats,
  teamStats,
  durationMinutes,
}: ComputeGameNotesParams): Map<string, number> {
  const notes = new Map<string, number>();
  if (durationMinutes < MIN_GAME_MINUTES || !teamStats) return notes;

  const bySideRole = new Map<string, GameRatingStat>();
  for (const stat of stats) bySideRole.set(`${stat.side}-${stat.role}`, stat);

  for (const stat of stats) {
    const oppSide = stat.side === 'BLUE' ? 'RED' : 'BLUE';
    const opponent =
      bySideRole.get(`${oppSide}-${stat.role}`) ??
      stats.find((s) => s.side === oppSide);
    if (!opponent) continue; // impossible en pratique (10 joueurs, 2 camps)

    const ownTeam = stat.side === 'BLUE' ? teamStats.blue : teamStats.red;
    const enemyTeam = stat.side === 'BLUE' ? teamStats.red : teamStats.blue;

    const { note } = ratePlayer({
      player: toPlayerInput(stat),
      opponent: {
        damagePerMin: opponent.damagePerMin,
        goldPerMin: opponent.goldPerMin,
      },
      ownTeam,
      enemyTeam: { totalGold: enemyTeam.totalGold },
      durationMinutes,
    });
    notes.set(stat.playerId, note);
  }

  return notes;
}
