import { describe, expect, it } from 'vitest';
import { parsedReplaySchema } from './replay';

function createPlayer(index: number, overrides: Record<string, unknown> = {}) {
  const side = index < 5 ? 'BLUE' : 'RED';
  const role = ['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT'][index % 5];
  const result = side === 'BLUE' ? 'WIN' : 'LOSS';

  return {
    position_in_team: index % 5,
    role,
    side,
    riot_name: `player${index}#EUW`,
    champion_internal: `champion-${index}`,
    champion_display: `Champion ${index}`,
    prisma: {
      champion: `champion-${index}`,
      kills: index,
      deaths: 1,
      assists: 2,
      cs: 100,
      gold: 10000,
      damage: 20000,
      visionScore: 20,
      side,
      result,
    },
    enriched: {
      kda: 3,
      cs_per_min: 7.5,
      gold_per_min: 400,
      damage_per_min: 700,
      damage_taken_per_min: 500,
      kill_participation: 0.6,
      damage_share: 0.2,
      gold_share: 0.2,
      physical_pct: 0.4,
      magic_pct: 0.5,
      true_pct: 0.1,
    },
    items: [1001, 2003, 3006, 0, 0, 0, 3363],
    raw_damage_taken: 15000,
    raw_self_mitigated: 12000,
    ...overrides,
  };
}

function createReplay(overrides: Record<string, unknown> = {}) {
  return {
    game: {
      duration_seconds: 1800,
      duration_minutes: 30,
      game_version: '15.10',
      game_mode: 'CLASSIC',
      rofl_version: 'ROFL',
    },
    teams: [
      {
        side: 'BLUE',
        result: 'WIN',
        total_kills: 20,
        total_gold: 50000,
        total_damage: 80000,
        total_damage_taken: 70000,
        turret_kills: 8,
        dragon_kills: 3,
        baron_kills: 1,
        inhibitor_kills: 2,
      },
      {
        side: 'RED',
        result: 'LOSS',
        total_kills: 10,
        total_gold: 42000,
        total_damage: 65000,
        total_damage_taken: 82000,
        turret_kills: 2,
        dragon_kills: 1,
        baron_kills: 0,
        inhibitor_kills: 0,
      },
    ],
    players: Array.from({ length: 10 }, (_, index) => createPlayer(index)),
    ...overrides,
  };
}

describe('parsedReplaySchema', () => {
  it('fills missing items with seven empty slots', () => {
    const replay = createReplay({
      players: Array.from({ length: 10 }, (_, index) =>
        createPlayer(index, index === 0 ? { items: undefined } : {}),
      ),
    });

    const result = parsedReplaySchema.parse(replay);

    expect(result.players[0]?.items).toEqual([0, 0, 0, 0, 0, 0, 0]);
  });

  it('pads short item arrays to seven slots', () => {
    const replay = createReplay({
      players: Array.from({ length: 10 }, (_, index) =>
        createPlayer(index, index === 0 ? { items: [1001, 3158, 3363] } : {}),
      ),
    });

    const result = parsedReplaySchema.parse(replay);

    expect(result.players[0]?.items).toEqual([1001, 3158, 3363, 0, 0, 0, 0]);
  });
});
