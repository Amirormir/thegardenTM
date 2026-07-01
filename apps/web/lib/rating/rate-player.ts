/**
 * PARTIE 1 — Note de performance /100 par joueur et par game.
 *
 * Port fidèle de l'implémentation de référence Python (§4.8 de la spec).
 * N'utilise QUE des champs réellement disponibles dans `ParsedReplay`
 * (+ objectifs au niveau équipe, attribués au prorata de la KP — mode STRICT).
 *
 * Rôle-aware : baselines, poids, pénalités et adversaire de référence dépendent
 * tous du rôle (§4.5). La note n'est pas nul-somme : deux 100 sont possibles.
 */

import {
  BASE_DEATHS,
  BO_WIN_BONUS,
  DEATH_PEN_PER,
  DEATH_TOLERANCE,
  DOM_SCALE,
  ELITE_HI,
  ELITE_LO,
  EXP_CS_PM,
  EXP_DMG_SHARE,
  EXP_GOLD_SHARE,
  EXP_VIS_PM,
  LOSS_SCALE,
  OBJ_NORM,
  OBJ_WEIGHTS,
  PASSENGER_PEN,
  type RatingRole,
  WEIGHTS,
  WIN_BASE,
  WIN_ELITE,
} from './config';
import { clamp, norm, normSigned, roundTo } from './math';

/** Stats d'un joueur nécessaires à la note (dérivées de `ParsedReplay.players[i]`). */
export interface RatingPlayerInput {
  role: RatingRole;
  kills: number;
  deaths: number;
  assists: number;
  killParticipation: number;
  damageShare: number;
  goldShare: number;
  /** enriched.damage_per_min */
  damagePerMin: number;
  /** enriched.gold_per_min */
  goldPerMin: number;
  /** enriched.cs_per_min */
  csPerMin: number;
  visionScore: number;
  rawDamageTaken: number;
  rawSelfMitigated: number;
  result: 'WIN' | 'LOSS';
}

/** Totaux d'équipe nécessaires (dérivés de `ParsedReplay.teams[side]`). */
export interface RatingTeamInput {
  totalGold: number;
  dragonKills: number;
  baronKills: number;
  turretKills: number;
  inhibitorKills: number;
}

export interface RatePlayerArgs {
  player: RatingPlayerInput;
  /** Joueur adverse de MÊME rôle (§4.3). */
  opponent: Pick<RatingPlayerInput, 'damagePerMin' | 'goldPerMin'>;
  ownTeam: RatingTeamInput;
  enemyTeam: Pick<RatingTeamInput, 'totalGold'>;
  durationMinutes: number;
}

export interface RatePlayerResult {
  /** Note finale bornée [0, 100], arrondie à 0.1. */
  note: number;
  /** Les 10 sous-scores 0..1, dans l'ordre de SUBSCORE_KEYS. */
  subs: number[];
  aggregate: number;
  deathPenalty: number;
  passengerPenalty: number;
  context: number;
}

function teamObjStrength(t: RatingTeamInput): number {
  const w =
    OBJ_WEIGHTS.dragon * t.dragonKills +
    OBJ_WEIGHTS.baron * t.baronKills +
    OBJ_WEIGHTS.turret * t.turretKills +
    OBJ_WEIGHTS.inhib * t.inhibitorKills;
  return norm(w, OBJ_NORM[0], OBJ_NORM[1]);
}

export function ratePlayer({
  player,
  opponent,
  ownTeam,
  enemyTeam,
  durationMinutes,
}: RatePlayerArgs): RatePlayerResult {
  const role = player.role;
  const durMin = durationMinutes;
  const span = durMin / 30.0;

  const sKda = norm(
    (player.kills + player.assists) / Math.max(1, player.deaths),
    1.0,
    6.0,
  );
  const sKp = norm(player.killParticipation, 0.3, 0.75);
  const sDs = norm(
    player.damageShare,
    0.5 * EXP_DMG_SHARE[role],
    1.6 * EXP_DMG_SHARE[role],
  );
  const sDpm = norm(
    player.damagePerMin / Math.max(1.0, opponent.damagePerMin),
    0.6,
    1.8,
  );
  const sGd = normSigned(player.goldPerMin - opponent.goldPerMin, 0.0, 120.0);
  const sGs = norm(
    player.goldShare,
    0.6 * EXP_GOLD_SHARE[role],
    1.4 * EXP_GOLD_SHARE[role],
  );
  const sCs = norm(player.csPerMin, 0.5 * EXP_CS_PM[role], 1.25 * EXP_CS_PM[role]);
  const sVis = norm(
    player.visionScore / Math.max(1.0, durMin),
    0.4 * EXP_VIS_PM[role],
    1.4 * EXP_VIS_PM[role],
  );
  const sTank = norm(
    (player.rawDamageTaken + player.rawSelfMitigated) / Math.max(1.0, durMin),
    400,
    1600,
  );
  const sObj =
    teamObjStrength(ownTeam) *
    (0.5 + 0.5 * clamp(player.killParticipation, 0, 1));

  const subs = [sKda, sKp, sDs, sDpm, sGd, sGs, sCs, sVis, sTank, sObj];
  const weights = WEIGHTS[role];
  const aggregate = subs.reduce((acc, s, i) => acc + weights[i]! * s, 0);

  const expDeaths = BASE_DEATHS[role] * span;
  const deathPenalty =
    Math.max(0.0, player.deaths - DEATH_TOLERANCE * expDeaths) * DEATH_PEN_PER;

  const passengerPenalty =
    player.result === 'WIN' &&
    role !== 'SUPPORT' &&
    player.killParticipation < 0.35 &&
    player.damageShare < 0.6 * EXP_DMG_SHARE[role]
      ? PASSENGER_PEN
      : 0.0;

  const dom = clamp((ownTeam.totalGold - enemyTeam.totalGold) / DOM_SCALE, -1, 1);
  let context: number;
  if (player.result === 'WIN') {
    const elite = clamp((aggregate - ELITE_LO) / ELITE_HI, 0, 1);
    context = clamp(dom, 0, 1) * (WIN_BASE + WIN_ELITE * elite);
  } else {
    context = -LOSS_SCALE * clamp(-dom, 0, 1) * (1 - aggregate);
  }

  const note = clamp(
    roundTo(100 * aggregate + context - deathPenalty - passengerPenalty, 1),
    0,
    100,
  );

  return { note, subs, aggregate, deathPenalty, passengerPenalty, context };
}

/**
 * Note résumé d'un BO (§4.9) : moyenne des notes de game pondérée par la durée
 * (games longues = plus de signal), + BO_WIN_BONUS si la série est gagnée.
 * Purement un affichage — les mises à jour de valeur se font par game (§5.5).
 */
export function summarizeBoNote(
  games: { note: number; durationMinutes: number }[],
  seriesWon: boolean,
): number {
  const eligible = games.filter((g) => g.durationMinutes > 0);
  if (eligible.length === 0) return 0;
  const totalWeight = eligible.reduce((acc, g) => acc + g.durationMinutes, 0);
  const weighted = eligible.reduce((acc, g) => acc + g.note * g.durationMinutes, 0);
  const mean = weighted / totalWeight;
  return clamp(roundTo(mean + (seriesWon ? BO_WIN_BONUS : 0), 1), 0, 100);
}
