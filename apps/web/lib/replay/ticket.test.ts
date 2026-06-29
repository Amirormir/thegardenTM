import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { createUploadTicket, verifyUploadTicket } from './ticket';

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
    const expected = createHmac('sha256', SECRET).update(exp).digest('base64url');
    expect(sig).toBe(expected);
  });
});
