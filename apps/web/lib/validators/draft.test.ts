import { describe, expect, it } from 'vitest';
import {
  draftCreateSchema,
  draftEligibleMatchesSchema,
  draftIdSchema,
  draftListInputSchema,
} from './draft';

describe('draftIdSchema', () => {
  it('accepts a valid id', () => {
    expect(draftIdSchema.parse({ id: 'draft_123' })).toEqual({ id: 'draft_123' });
  });

  it('rejects an empty id', () => {
    expect(() => draftIdSchema.parse({ id: '' })).toThrow();
  });
});

describe('draftListInputSchema', () => {
  it('accepts undefined', () => {
    expect(draftListInputSchema.parse(undefined)).toBeUndefined();
  });

  it('accepts a status array', () => {
    const parsed = draftListInputSchema.parse({ status: ['LOBBY', 'IN_PROGRESS'] });
    expect(parsed?.status).toEqual(['LOBBY', 'IN_PROGRESS']);
  });

  it('rejects unknown status values', () => {
    expect(() =>
      draftListInputSchema.parse({ status: ['NOPE'] as never }),
    ).toThrow();
  });

  it('rejects limit out of range', () => {
    expect(() => draftListInputSchema.parse({ limit: 0 })).toThrow();
    expect(() => draftListInputSchema.parse({ limit: 999 })).toThrow();
  });

  it('accepts format + teamId + seasonId combo', () => {
    const parsed = draftListInputSchema.parse({
      format: 'BO3',
      teamId: 'team_1',
      seasonId: 'season_1',
    });
    expect(parsed).toEqual({ format: 'BO3', teamId: 'team_1', seasonId: 'season_1' });
  });
});

describe('draftEligibleMatchesSchema', () => {
  it('accepts undefined', () => {
    expect(draftEligibleMatchesSchema.parse(undefined)).toBeUndefined();
  });

  it('accepts seasonId', () => {
    expect(draftEligibleMatchesSchema.parse({ seasonId: 'season_1' })).toEqual({
      seasonId: 'season_1',
    });
  });
});

describe('draftCreateSchema', () => {
  it('accepts a complete payload', () => {
    const parsed = draftCreateSchema.parse({
      matchId: 'match_1',
      gameNumber: 2,
      blueSide: 'HOME',
      fearless: false,
    });
    expect(parsed).toMatchObject({
      matchId: 'match_1',
      gameNumber: 2,
      blueSide: 'HOME',
      fearless: false,
    });
  });

  it('defaults fearless to true when omitted', () => {
    const parsed = draftCreateSchema.parse({
      matchId: 'match_1',
      gameNumber: 1,
      blueSide: 'AWAY',
    });
    expect(parsed.fearless).toBe(true);
  });

  it('rejects gameNumber < 1', () => {
    expect(() =>
      draftCreateSchema.parse({ matchId: 'm', gameNumber: 0, blueSide: 'HOME' }),
    ).toThrow();
  });

  it('rejects gameNumber > 5', () => {
    expect(() =>
      draftCreateSchema.parse({ matchId: 'm', gameNumber: 6, blueSide: 'HOME' }),
    ).toThrow();
  });

  it('rejects unknown blueSide', () => {
    expect(() =>
      draftCreateSchema.parse({
        matchId: 'm',
        gameNumber: 1,
        blueSide: 'BLUE' as never,
      }),
    ).toThrow();
  });

  it('rejects missing matchId', () => {
    expect(() =>
      draftCreateSchema.parse({ gameNumber: 1, blueSide: 'HOME' } as never),
    ).toThrow();
  });
});
