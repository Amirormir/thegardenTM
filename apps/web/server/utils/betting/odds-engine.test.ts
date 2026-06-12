import { describe, expect, it } from 'vitest';
import {
  clampProb,
  computeOdds,
  DEFAULT_ENGINE_CONFIG,
  probToOdds,
  seedRatings,
  updateElo,
  winProbability,
} from './odds-engine';

const { margin, probClampMin, probClampMax } = DEFAULT_ENGINE_CONFIG;

function odds(ratingHome: number, ratingAway: number) {
  return computeOdds({
    ratingHome,
    ratingAway,
    margin,
    clampMin: probClampMin,
    clampMax: probClampMax,
  });
}

describe('winProbability', () => {
  it('returns 0.5 for equal ratings', () => {
    expect(winProbability(1500, 1500)).toBeCloseTo(0.5, 10);
  });

  it('is symmetric (P(A) + P(B) = 1)', () => {
    const pa = winProbability(1640, 1480);
    const pb = winProbability(1480, 1640);
    expect(pa + pb).toBeCloseTo(1, 10);
  });

  it('gives the higher-rated team a higher probability', () => {
    expect(winProbability(1700, 1300)).toBeGreaterThan(0.5);
    expect(winProbability(1300, 1700)).toBeLessThan(0.5);
  });

  it('matches the Elo reference (400 pts gap ~ 0.909)', () => {
    expect(winProbability(1700, 1300)).toBeCloseTo(0.909, 3);
  });
});

describe('probToOdds', () => {
  it('produces ~1.89 for a 50/50 with the default 6% margin', () => {
    expect(probToOdds(0.5, 0.06)).toBe(1.89);
  });

  it('rounds to 2 decimals and never goes below the floor', () => {
    expect(probToOdds(0.99, 0.06)).toBeGreaterThanOrEqual(1.01);
    expect(Number.isInteger(probToOdds(0.5, 0.06) * 100)).toBe(true);
  });
});

describe('computeOdds — depends on the gap, not the absolute level', () => {
  it('balanced match -> ~1.89 / 1.89', () => {
    const o = odds(1500, 1500);
    expect(o.oddsHome).toBe(1.89);
    expect(o.oddsAway).toBe(1.89);
  });

  it('the two title favorites and the two bottom teams produce IDENTICAL odds for the same gap', () => {
    const topClash = odds(1700, 1650); // gap 50, high absolute
    const bottomClash = odds(1400, 1350); // gap 50, low absolute
    expect(topClash.oddsHome).toBe(bottomClash.oddsHome);
    expect(topClash.oddsAway).toBe(bottomClash.oddsAway);
  });

  it('clear favorite -> low odds, underdog -> high odds', () => {
    const o = odds(1700, 1300);
    expect(o.oddsHome).toBeLessThan(1.3);
    expect(o.oddsAway).toBeGreaterThan(4);
  });

  it('clamp prevents absurd odds even with a huge rating gap', () => {
    const o = odds(2200, 900);
    // P(home) clamped at 0.9 -> odds >= 1/(0.9*1.06) ~ 1.05, never 1.01-ish nonsense
    expect(o.oddsHome).toBeGreaterThanOrEqual(1.04);
    expect(o.oddsAway).toBeLessThan(10);
  });

  it('stores fair (unclamped) probabilities for the Elo update', () => {
    const o = odds(2200, 900);
    expect(o.probHome).toBeGreaterThan(0.9); // fair value, above the 0.9 clamp
    expect(o.probHome + o.probAway).toBeCloseTo(1, 10);
  });
});

describe('clampProb', () => {
  it('bounds the value within [min, max]', () => {
    expect(clampProb(0.02, 0.1, 0.9)).toBe(0.1);
    expect(clampProb(0.98, 0.1, 0.9)).toBe(0.9);
    expect(clampProb(0.5, 0.1, 0.9)).toBe(0.5);
  });
});

describe('seedRatings', () => {
  it('spaces ratings evenly between the bounds', () => {
    const map = seedRatings(['a', 'b', 'c', 'd', 'e'], { seedMin: 1300, seedMax: 1700 });
    expect(map.get('a')).toBe(1700);
    expect(map.get('b')).toBe(1600);
    expect(map.get('c')).toBe(1500);
    expect(map.get('d')).toBe(1400);
    expect(map.get('e')).toBe(1300);
  });

  it('respects manual overrides', () => {
    const map = seedRatings(['a', 'b', 'c'], {
      seedMin: 1300,
      seedMax: 1700,
      overrides: { b: 1900 },
    });
    expect(map.get('a')).toBe(1700);
    expect(map.get('b')).toBe(1900);
    expect(map.get('c')).toBe(1300);
  });

  it('handles a single team', () => {
    const map = seedRatings(['solo'], { seedMin: 1300, seedMax: 1700 });
    expect(map.get('solo')).toBe(1500);
  });
});

describe('updateElo — progressive, no brutal swings', () => {
  it('moves the rating toward the result but by less than K', () => {
    const before = 1500;
    const after = updateElo({
      rating: before,
      expected: 0.5,
      score: 1,
      k: 24,
      gamesPlayed: 5,
      warmupGames: 2,
    });
    expect(after).toBeGreaterThan(before);
    expect(after - before).toBeLessThanOrEqual(24);
    expect(after - before).toBeCloseTo(12, 6); // 24 * (1 - 0.5)
  });

  it('a single upset does not flip the favorite/underdog ordering', () => {
    // Favorite 1700 loses once to underdog 1300.
    const pFav = winProbability(1700, 1300);
    const favAfter = updateElo({
      rating: 1700,
      expected: pFav,
      score: 0,
      k: 24,
      gamesPlayed: 5,
      warmupGames: 2,
    });
    const dogAfter = updateElo({
      rating: 1300,
      expected: 1 - pFav,
      score: 1,
      k: 24,
      gamesPlayed: 5,
      warmupGames: 2,
    });
    expect(1700 - favAfter).toBeLessThan(24); // small drop
    expect(favAfter).toBeGreaterThan(dogAfter); // still the favorite
  });

  it('halves K during the warm-up games', () => {
    const warm = updateElo({
      rating: 1500,
      expected: 0.5,
      score: 1,
      k: 24,
      gamesPlayed: 0,
      warmupGames: 2,
    });
    const normal = updateElo({
      rating: 1500,
      expected: 0.5,
      score: 1,
      k: 24,
      gamesPlayed: 5,
      warmupGames: 2,
    });
    expect(warm - 1500).toBeCloseTo(6, 6); // 12 * 0.5
    expect(normal - 1500).toBeCloseTo(12, 6);
  });
});
