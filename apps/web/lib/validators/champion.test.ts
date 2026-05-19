import { describe, expect, it } from 'vitest';
import {
  championIdSchema,
  championListInputSchema,
  championSyncSchema,
  championUpdateSchema,
} from './champion';

describe('championIdSchema', () => {
  it('accepts a valid id', () => {
    expect(championIdSchema.parse({ id: 'Aatrox' })).toEqual({ id: 'Aatrox' });
  });

  it('rejects an empty id', () => {
    expect(() => championIdSchema.parse({ id: '' })).toThrow();
  });

  it('rejects ids longer than 64 chars', () => {
    expect(() => championIdSchema.parse({ id: 'x'.repeat(65) })).toThrow();
  });
});

describe('championListInputSchema', () => {
  it('accepts undefined input', () => {
    expect(championListInputSchema.parse(undefined)).toBeUndefined();
  });

  it('accepts an empty object', () => {
    expect(championListInputSchema.parse({})).toEqual({});
  });

  it('accepts onlyEnabled + search', () => {
    const parsed = championListInputSchema.parse({ onlyEnabled: false, search: 'ahri' });
    expect(parsed).toEqual({ onlyEnabled: false, search: 'ahri' });
  });

  it('rejects search longer than 64 chars', () => {
    expect(() => championListInputSchema.parse({ search: 'x'.repeat(65) })).toThrow();
  });
});

describe('championUpdateSchema', () => {
  it('accepts id + roles', () => {
    const parsed = championUpdateSchema.parse({ id: 'Ahri', roles: ['MID'] });
    expect(parsed.roles).toEqual(['MID']);
  });

  it('accepts id + enabled toggle', () => {
    expect(championUpdateSchema.parse({ id: 'Ahri', enabled: false })).toEqual({
      id: 'Ahri',
      enabled: false,
    });
  });

  it('rejects unknown roles', () => {
    expect(() =>
      championUpdateSchema.parse({ id: 'Ahri', roles: ['INVALID'] as never }),
    ).toThrow();
  });

  it('rejects more than 5 roles', () => {
    expect(() =>
      championUpdateSchema.parse({
        id: 'Ahri',
        roles: ['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT', 'TOP'],
      }),
    ).toThrow();
  });

  it('rejects missing id', () => {
    expect(() => championUpdateSchema.parse({ roles: ['MID'] })).toThrow();
  });
});

describe('championSyncSchema', () => {
  it('accepts undefined', () => {
    expect(championSyncSchema.parse(undefined)).toBeUndefined();
  });

  it('accepts force flag', () => {
    expect(championSyncSchema.parse({ force: true })).toEqual({ force: true });
  });
});
