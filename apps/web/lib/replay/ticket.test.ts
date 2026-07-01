import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  ReplayUploadConfigError,
  createUploadTicket,
  resolveReplayUploadTarget,
  verifyUploadTicket,
} from './ticket';

const SECRET = 'unit-test-secret';

describe('replay upload ticket', () => {
  it('creates a token that verifies with the same secret', () => {
    const { token, exp } = createUploadTicket(SECRET, 300);
    expect(token).toContain('.');
    expect(exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
    expect(verifyUploadTicket(SECRET, token)).toBe(true);
  });

  it('rejects a token signed with a different secret', () => {
    const { token } = createUploadTicket(SECRET, 300);
    expect(verifyUploadTicket('other-secret', token)).toBe(false);
  });

  it('rejects an expired token', () => {
    const { token } = createUploadTicket(SECRET, -10);
    expect(verifyUploadTicket(SECRET, token)).toBe(false);
  });

  it('rejects a tampered signature', () => {
    const { token } = createUploadTicket(SECRET, 300);
    const [exp] = token.split('.');
    expect(verifyUploadTicket(SECRET, `${exp}.deadbeef`)).toBe(false);
  });

  it('rejects malformed tokens', () => {
    expect(verifyUploadTicket(SECRET, 'no-dot')).toBe(false);
    expect(verifyUploadTicket(SECRET, '')).toBe(false);
    expect(verifyUploadTicket(SECRET, '.abc')).toBe(false);
  });

  it('matches the base64url HMAC format the Python service recomputes', () => {
    const { token } = createUploadTicket(SECRET, 300);
    const [exp, sig] = token.split('.');
    expect(exp).toBeDefined();
    expect(sig).toBeDefined();
    if (!exp || !sig) throw new Error('Malformed token in test setup.');
    const expected = createHmac('sha256', SECRET).update(exp).digest('base64url');
    expect(sig).toBe(expected);
  });

  it('builds the direct upload URL from the replay service base URL', () => {
    expect(
      resolveReplayUploadTarget({
        serviceUrl: 'https://replay-service.up.railway.app',
        requestHost: 'thegarden.vercel.app',
        isProduction: true,
      }).uploadUrl,
    ).toBe('https://replay-service.up.railway.app/replays');
  });

  it('does not append the replay path twice', () => {
    expect(
      resolveReplayUploadTarget({
        serviceUrl: 'https://replay-service.up.railway.app/replays',
        requestHost: 'thegarden.vercel.app',
        isProduction: true,
      }).uploadUrl,
    ).toBe('https://replay-service.up.railway.app/replays');
  });

  it('rejects localhost replay targets in production', () => {
    expect(() =>
      resolveReplayUploadTarget({
        serviceUrl: 'http://127.0.0.1:8000',
        requestHost: 'thegarden.vercel.app',
        isProduction: true,
      }),
    ).toThrow(ReplayUploadConfigError);
  });

  it('rejects replay targets that point back to the web app in production', () => {
    expect(() =>
      resolveReplayUploadTarget({
        serviceUrl: 'https://thegarden.vercel.app',
        requestHost: 'thegarden.vercel.app',
        isProduction: true,
      }),
    ).toThrow(ReplayUploadConfigError);
  });

  it('allows the local default in development', () => {
    expect(
      resolveReplayUploadTarget({
        serviceUrl: undefined,
        requestHost: 'localhost:3004',
        isProduction: false,
      }).uploadUrl,
    ).toBe('http://127.0.0.1:8000/replays');
  });
});
