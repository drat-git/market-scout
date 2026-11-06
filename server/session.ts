import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export const SESSION_SECONDS = 24 * 60 * 60;
export type Session = { id: string; issuedAt: number; expiresAt: number };
function secretCheck(secret: string) {
  if (Buffer.byteLength(secret) < 32) throw new Error('Session protection is not configured');
}
function mac(value: string, secret: string) { return createHmac('sha256', secret).update(value).digest('base64url'); }
export function issueSession(secret: string, now = Math.floor(Date.now() / 1000)) {
  secretCheck(secret);
  const session = { id: randomBytes(32).toString('hex'), issuedAt: now, expiresAt: now + SESSION_SECONDS };
  const payload = `1.${session.id}.${session.issuedAt}.${session.expiresAt}`;
  return { session, token: `${payload}.${mac(payload, secret)}` };
}
export function verifySession(token: string | undefined, secret: string, now = Math.floor(Date.now() / 1000)): Session | null {
  secretCheck(secret);
  if (!token || !/^1\.[a-f0-9]{64}\.\d{10}\.\d{10}\.[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const parts = token.split('.');
  const signature = mac(parts.slice(0, 4).join('.'), secret);
  if (!timingSafeEqual(Buffer.from(signature), Buffer.from(parts[4]))) return null;
  const issuedAt = Number(parts[2]), expiresAt = Number(parts[3]);
  if (expiresAt - issuedAt !== SESSION_SECONDS || issuedAt > now || expiresAt <= now) return null;
  return { id: parts[1], issuedAt, expiresAt };
}
export function sessionCookie(token: string, secure: boolean) {
  return `${secure ? '__Host-market-scout' : 'market-scout-local'}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_SECONDS}${secure ? '; Secure' : ''}`;
}
export function readSessionCookie(header: string | null, secure: boolean): string | undefined {
  const name = secure ? '__Host-market-scout' : 'market-scout-local';
  const values = (header ?? '').split(';').map(x => x.trim()).filter(x => x.startsWith(`${name}=`));
  return values.length === 1 ? values[0].slice(name.length + 1) : undefined;
}
