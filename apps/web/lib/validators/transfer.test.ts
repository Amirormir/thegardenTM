import { describe, expect, it } from 'vitest';
import {
  transferOfferCreateSchema,
  transferOfferIdSchema,
  transferOfferRespondSchema,
  transferOffersByTeamSchema,
} from './transfer';

describe('transferOfferCreateSchema', () => {
  const valid = {
    playerId: 'player-1',
    fromTeamId: 'team-1',
    offeredFee: 500000,
  };

  it('accepts valid input', () => {
    expect(transferOfferCreateSchema.parse(valid)).toEqual(valid);
  });

  it('accepts with optional message', () => {
    const input = { ...valid, message: 'Interested in your player' };
    expect(transferOfferCreateSchema.parse(input).message).toBe('Interested in your player');
  });

  it('rejects missing playerId', () => {
    const { playerId: _, ...rest } = valid;
    expect(() => transferOfferCreateSchema.parse(rest)).toThrow();
  });

  it('rejects missing fromTeamId', () => {
    const { fromTeamId: _, ...rest } = valid;
    expect(() => transferOfferCreateSchema.parse(rest)).toThrow();
  });

  it('rejects negative offeredFee', () => {
    expect(() => transferOfferCreateSchema.parse({ ...valid, offeredFee: -1 })).toThrow();
  });

  it('accepts zero offeredFee', () => {
    expect(transferOfferCreateSchema.parse({ ...valid, offeredFee: 0 }).offeredFee).toBe(0);
  });

  it('rejects non-integer offeredFee', () => {
    expect(() => transferOfferCreateSchema.parse({ ...valid, offeredFee: 100.5 })).toThrow();
  });

  it('rejects message over 500 chars', () => {
    expect(() =>
      transferOfferCreateSchema.parse({ ...valid, message: 'm'.repeat(501) }),
    ).toThrow();
  });

  it('rejects empty playerId', () => {
    expect(() => transferOfferCreateSchema.parse({ ...valid, playerId: '' })).toThrow();
  });

  it('rejects empty fromTeamId', () => {
    expect(() => transferOfferCreateSchema.parse({ ...valid, fromTeamId: '' })).toThrow();
  });
});

describe('transferOfferRespondSchema', () => {
  it('accepts id only', () => {
    expect(transferOfferRespondSchema.parse({ id: 'offer-1' })).toEqual({ id: 'offer-1' });
  });

  it('accepts id with rejectionReason', () => {
    const result = transferOfferRespondSchema.parse({
      id: 'offer-1',
      rejectionReason: 'Too low',
    });
    expect(result.rejectionReason).toBe('Too low');
  });

  it('rejects empty id', () => {
    expect(() => transferOfferRespondSchema.parse({ id: '' })).toThrow();
  });

  it('rejects rejectionReason over 500 chars', () => {
    expect(() =>
      transferOfferRespondSchema.parse({ id: 'o-1', rejectionReason: 'r'.repeat(501) }),
    ).toThrow();
  });
});

describe('transferOfferIdSchema', () => {
  it('accepts valid id', () => {
    expect(transferOfferIdSchema.parse({ id: 'offer-1' })).toEqual({ id: 'offer-1' });
  });

  it('rejects empty id', () => {
    expect(() => transferOfferIdSchema.parse({ id: '' })).toThrow();
  });
});

describe('transferOffersByTeamSchema', () => {
  it('accepts teamId only', () => {
    expect(transferOffersByTeamSchema.parse({ teamId: 'team-1' })).toEqual({
      teamId: 'team-1',
    });
  });

  it('accepts with direction incoming', () => {
    const result = transferOffersByTeamSchema.parse({ teamId: 'team-1', direction: 'incoming' });
    expect(result.direction).toBe('incoming');
  });

  it('accepts with direction outgoing', () => {
    const result = transferOffersByTeamSchema.parse({ teamId: 'team-1', direction: 'outgoing' });
    expect(result.direction).toBe('outgoing');
  });

  it('rejects invalid direction', () => {
    expect(() =>
      transferOffersByTeamSchema.parse({ teamId: 'team-1', direction: 'both' }),
    ).toThrow();
  });

  it('rejects empty teamId', () => {
    expect(() => transferOffersByTeamSchema.parse({ teamId: '' })).toThrow();
  });
});
