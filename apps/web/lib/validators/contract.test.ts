import { describe, expect, it } from 'vitest';
import {
  contractApproveSchema,
  contractCreateSchema,
  contractRejectSchema,
  contractStatusSchema,
  contractTerminateSchema,
  contractUpdateSchema,
} from './contract';

describe('contractStatusSchema', () => {
  it('accepts valid statuses', () => {
    for (const status of ['PENDING_APPROVAL', 'ACTIVE', 'EXPIRED', 'TERMINATED', 'LOAN']) {
      expect(contractStatusSchema.parse(status)).toBe(status);
    }
  });

  it('rejects invalid status', () => {
    expect(() => contractStatusSchema.parse('INVALID')).toThrow();
  });
});

describe('contractCreateSchema', () => {
  const valid = {
    playerId: 'player-1',
    teamId: 'team-1',
    salary: 150000,
    durationBo3: 10,
    releaseClause: 500000,
  };

  it('accepts valid input', () => {
    expect(contractCreateSchema.parse(valid)).toEqual(valid);
  });

  it('accepts optional fields', () => {
    const input = { ...valid, transferFee: 80000, notes: 'Test note' };
    const result = contractCreateSchema.parse(input);
    expect(result.transferFee).toBe(80000);
    expect(result.notes).toBe('Test note');
  });

  it('rejects missing playerId', () => {
    const { playerId: omittedPlayerId, ...rest } = valid;
    void omittedPlayerId;
    expect(() => contractCreateSchema.parse(rest)).toThrow();
  });

  it('rejects missing teamId', () => {
    const { teamId: omittedTeamId, ...rest } = valid;
    void omittedTeamId;
    expect(() => contractCreateSchema.parse(rest)).toThrow();
  });

  it('rejects negative salary', () => {
    expect(() => contractCreateSchema.parse({ ...valid, salary: -1 })).toThrow();
  });

  it('rejects zero durationBo3', () => {
    expect(() => contractCreateSchema.parse({ ...valid, durationBo3: 0 })).toThrow();
  });

  it('rejects negative durationBo3', () => {
    expect(() => contractCreateSchema.parse({ ...valid, durationBo3: -5 })).toThrow();
  });

  it('rejects zero releaseClause', () => {
    expect(() => contractCreateSchema.parse({ ...valid, releaseClause: 0 })).toThrow();
  });

  it('rejects negative releaseClause', () => {
    expect(() => contractCreateSchema.parse({ ...valid, releaseClause: -100 })).toThrow();
  });

  it('rejects non-integer salary', () => {
    expect(() => contractCreateSchema.parse({ ...valid, salary: 150.5 })).toThrow();
  });

  it('rejects negative transferFee', () => {
    expect(() => contractCreateSchema.parse({ ...valid, transferFee: -1 })).toThrow();
  });

  it('rejects notes over 500 chars', () => {
    expect(() => contractCreateSchema.parse({ ...valid, notes: 'a'.repeat(501) })).toThrow();
  });

  it('accepts notes at 500 chars', () => {
    const result = contractCreateSchema.parse({ ...valid, notes: 'a'.repeat(500) });
    expect(result.notes).toHaveLength(500);
  });

  it('rejects empty playerId', () => {
    expect(() => contractCreateSchema.parse({ ...valid, playerId: '' })).toThrow();
  });
});

describe('contractUpdateSchema', () => {
  it('accepts partial updates', () => {
    const result = contractUpdateSchema.parse({ id: 'c-1', salary: 200000 });
    expect(result).toEqual({ id: 'c-1', salary: 200000 });
  });

  it('rejects missing id', () => {
    expect(() => contractUpdateSchema.parse({ salary: 200000 })).toThrow();
  });

  it('accepts all optional fields', () => {
    const input = {
      id: 'c-1',
      salary: 200000,
      durationBo3: 15,
      releaseClause: 600000,
      transferFee: 100000,
      notes: 'Updated',
    };
    expect(contractUpdateSchema.parse(input)).toEqual(input);
  });

  it('accepts id only', () => {
    expect(contractUpdateSchema.parse({ id: 'c-1' })).toEqual({ id: 'c-1' });
  });
});

describe('contractApproveSchema', () => {
  it('accepts valid id', () => {
    expect(contractApproveSchema.parse({ id: 'c-1' })).toEqual({ id: 'c-1' });
  });

  it('rejects empty id', () => {
    expect(() => contractApproveSchema.parse({ id: '' })).toThrow();
  });
});

describe('contractRejectSchema', () => {
  it('accepts id with reason', () => {
    expect(contractRejectSchema.parse({ id: 'c-1', reason: 'Too expensive' })).toEqual({
      id: 'c-1',
      reason: 'Too expensive',
    });
  });

  it('accepts id without reason', () => {
    expect(contractRejectSchema.parse({ id: 'c-1' })).toEqual({ id: 'c-1' });
  });

  it('rejects reason over 500 chars', () => {
    expect(() =>
      contractRejectSchema.parse({ id: 'c-1', reason: 'x'.repeat(501) }),
    ).toThrow();
  });
});

describe('contractTerminateSchema', () => {
  it('accepts id only', () => {
    const result = contractTerminateSchema.parse({ id: 'c-1' });
    expect(result.id).toBe('c-1');
  });

  it('accepts with terminatedAt date', () => {
    const date = '2026-06-01T00:00:00.000Z';
    const result = contractTerminateSchema.parse({ id: 'c-1', terminatedAt: date });
    expect(result.terminatedAt).toBeInstanceOf(Date);
  });

  it('accepts with reason', () => {
    const result = contractTerminateSchema.parse({ id: 'c-1', reason: 'End of season' });
    expect(result.reason).toBe('End of season');
  });
});
