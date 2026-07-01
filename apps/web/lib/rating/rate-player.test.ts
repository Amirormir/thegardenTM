import { describe, expect, it } from 'vitest';
import type { RatingRole } from './config';
import {
  ratePlayer,
  summarizeBoNote,
  type RatingPlayerInput,
  type RatingTeamInput,
} from './rate-player';

/**
 * Les figures EXACTES de §4.5/§4.8 (Ahri 66.7, support-line 66.3, …) ont été
 * produites par un prototype dont les vecteurs d'entrée COMPLETS ne sont pas
 * dans la spec (seuls K/D/A + quelques stats dérivées sont donnés). On ne peut
 * donc pas les reproduire au point près. Ces tests valident à la place les
 * PROPRIÉTÉS structurelles exigées par §7, avec des lignes-archétypes
 * représentatives — c'est le vrai contrat de l'algorithme.
 */

// Adversaire de même rôle (baselines réalistes elo semi-pro).
const OPP: Record<RatingRole, { damagePerMin: number; goldPerMin: number }> = {
  TOP: { damagePerMin: 520, goldPerMin: 400 },
  JUNGLE: { damagePerMin: 420, goldPerMin: 360 },
  MID: { damagePerMin: 640, goldPerMin: 420 },
  ADC: { damagePerMin: 700, goldPerMin: 430 },
  SUPPORT: { damagePerMin: 300, goldPerMin: 250 },
};

const WIN_TEAM: RatingTeamInput = {
  totalGold: 60000,
  dragonKills: 2,
  baronKills: 0,
  turretKills: 5,
  inhibitorKills: 0,
};

function score(
  player: RatingPlayerInput,
  ownTeam: RatingTeamInput = WIN_TEAM,
  enemyGold = 55000,
  durationMinutes = 30,
) {
  return ratePlayer({
    player,
    opponent: OPP[player.role],
    ownTeam,
    enemyTeam: { totalGold: enemyGold },
    durationMinutes,
  }).note;
}

// Ligne « support-type » : 2/4/14, CS 1.4/min, vision 1.7/min, or & dégâts faibles.
function supportLine(role: RatingRole): RatingPlayerInput {
  return {
    role,
    kills: 2,
    deaths: 4,
    assists: 14,
    killParticipation: 0.65,
    damageShare: 0.1,
    goldShare: 0.14,
    damagePerMin: 270,
    goldPerMin: 250,
    csPerMin: 1.4,
    visionScore: 51,
    rawDamageTaken: 9000,
    rawSelfMitigated: 9000,
    result: 'WIN',
  };
}

// Ligne « carry-type » : 10/3/6, CS 8.5/min, gros or & dégâts, vision 0.4/min.
function carryLine(role: RatingRole): RatingPlayerInput {
  return {
    role,
    kills: 10,
    deaths: 3,
    assists: 6,
    killParticipation: 0.62,
    damageShare: 0.3,
    goldShare: 0.24,
    damagePerMin: 780,
    goldPerMin: 470,
    csPerMin: 8.5,
    visionScore: 12,
    rawDamageTaken: 6000,
    rawSelfMitigated: 4000,
    result: 'WIN',
  };
}

describe('ratePlayer — role awareness (§4.5 / §7.3)', () => {
  it('a support-profile line scores far higher as SUPPORT than as ADC', () => {
    const asSupport = score(supportLine('SUPPORT'));
    const asAdc = score(supportLine('ADC'));
    // La même ligne vaut nettement plus dans son rôle naturel.
    expect(asSupport).toBeGreaterThan(asAdc);
    expect(asSupport - asAdc).toBeGreaterThan(20);
  });

  it('a carry-profile line scores higher as ADC/carry than as SUPPORT', () => {
    const asAdc = score(carryLine('ADC'));
    const asSupport = score(carryLine('SUPPORT'));
    // Vision faible + dégâts peu valorisés en support => punie en SUPPORT.
    expect(asAdc).toBeGreaterThan(asSupport);
  });

  it('the same raw line lands very differently across roles (rôle-aware baselines)', () => {
    const spread = ['SUPPORT', 'ADC', 'TOP', 'MID'].map((r) =>
      score(supportLine(r as RatingRole)),
    );
    const max = Math.max(...spread);
    const min = Math.min(...spread);
    // Écart significatif purement dû au rôle attribué (§4.5).
    expect(max - min).toBeGreaterThan(15);
  });
});

describe('ratePlayer — bounds & extremes (§7.2 / §7.4)', () => {
  it('a truly catastrophic game (0/8/0, everything at the floor, stomp loss) scores <= 5', () => {
    const cata: RatingPlayerInput = {
      role: 'TOP',
      kills: 0,
      deaths: 8,
      assists: 0,
      killParticipation: 0.05,
      damageShare: 0.03,
      goldShare: 0.1,
      damagePerMin: 80,
      goldPerMin: 150,
      csPerMin: 2,
      visionScore: 5,
      rawDamageTaken: 3000,
      rawSelfMitigated: 1000,
      result: 'LOSS',
    };
    const note = score(
      cata,
      { totalGold: 40000, dragonKills: 0, baronKills: 0, turretKills: 0, inhibitorKills: 0 },
      70000,
      32,
    );
    expect(note).toBeLessThanOrEqual(5);
  });

  it('in a total stomp, at least two winners exceed 88 (two 100s are possible)', () => {
    const stompTeam: RatingTeamInput = {
      totalGold: 75000,
      dragonKills: 4,
      baronKills: 2,
      turretKills: 9,
      inhibitorKills: 2,
    };
    const ahri: RatingPlayerInput = {
      role: 'MID',
      kills: 14,
      deaths: 0,
      assists: 8,
      killParticipation: 0.85,
      damageShare: 0.34,
      goldShare: 0.26,
      damagePerMin: 900,
      goldPerMin: 560,
      csPerMin: 9.5,
      visionScore: 20,
      rawDamageTaken: 8000,
      rawSelfMitigated: 6000,
      result: 'WIN',
    };
    const lee: RatingPlayerInput = {
      role: 'JUNGLE',
      kills: 6,
      deaths: 1,
      assists: 14,
      killParticipation: 0.9,
      damageShare: 0.2,
      goldShare: 0.2,
      damagePerMin: 520,
      goldPerMin: 430,
      csPerMin: 6.5,
      visionScore: 35,
      rawDamageTaken: 14000,
      rawSelfMitigated: 12000,
      result: 'WIN',
    };
    const notes = [score(ahri, stompTeam, 45000, 28), score(lee, stompTeam, 45000, 28)];
    expect(notes.filter((n) => n > 88).length).toBeGreaterThanOrEqual(2);
    expect(Math.max(...notes)).toBe(100);
  });

  it('every note stays within [0, 100]', () => {
    const roles: RatingRole[] = ['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT'];
    for (const role of roles) {
      for (const line of [supportLine(role), carryLine(role)]) {
        const n = score(line);
        expect(n).toBeGreaterThanOrEqual(0);
        expect(n).toBeLessThanOrEqual(100);
      }
    }
  });
});

describe('ratePlayer — passenger penalty (§4.6)', () => {
  it('penalises a low-impact carry dragged along in a win, but never a support', () => {
    const base = {
      kills: 1,
      deaths: 2,
      assists: 3,
      killParticipation: 0.25, // < 0.35
      damageShare: 0.05, // < 0.6 * EXP
      goldShare: 0.15,
      damagePerMin: 200,
      goldPerMin: 300,
      csPerMin: 5,
      visionScore: 15,
      rawDamageTaken: 5000,
      rawSelfMitigated: 3000,
      result: 'WIN' as const,
    };
    const adc = ratePlayer({
      player: { ...base, role: 'ADC' },
      opponent: OPP.ADC,
      ownTeam: WIN_TEAM,
      enemyTeam: { totalGold: 55000 },
      durationMinutes: 30,
    });
    // La pénalité passager retire des points (elle est intégrée à la note).
    expect(adc.passengerPenalty).toBe(8);

    const sup = ratePlayer({
      player: { ...base, role: 'SUPPORT', damageShare: 0.05 },
      opponent: OPP.SUPPORT,
      ownTeam: WIN_TEAM,
      enemyTeam: { totalGold: 55000 },
      durationMinutes: 30,
    });
    expect(sup.passengerPenalty).toBe(0);
  });
});

describe('summarizeBoNote (§4.9)', () => {
  it('weights game notes by duration and adds a small bonus for a series win', () => {
    const games = [
      { note: 40, durationMinutes: 12 },
      { note: 80, durationMinutes: 36 }, // game longue = plus de poids
    ];
    // Moyenne pondérée = (40*12 + 80*36) / 48 = 70, +3 pour la série gagnée.
    expect(summarizeBoNote(games, true)).toBe(73);
    expect(summarizeBoNote(games, false)).toBe(70);
  });

  it('ignores zero-duration games and stays within [0, 100]', () => {
    expect(summarizeBoNote([{ note: 99, durationMinutes: 30 }], true)).toBe(100);
    expect(summarizeBoNote([{ note: 50, durationMinutes: 0 }], false)).toBe(0);
    expect(summarizeBoNote([], true)).toBe(0);
  });
});
