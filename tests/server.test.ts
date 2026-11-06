import { test } from 'node:test';
import assert from 'node:assert/strict';
import { issueSession, verifySession, sessionCookie, readSessionCookie } from '../server/session';
import { fingerprint } from '../server/fingerprint';
import { serveApi } from '../server/http';
import { RestRedis } from '../server/redis';
const secret = 'a'.repeat(64);
const origin = 'http://localhost:5173';
const context = { origin, secure: false, sessionSecret: secret };

test('sessions authenticate, expire at 24 hours, and reject tampering', () => {
  const { token, session } = issueSession(secret, 1800000000);
  assert.deepEqual(verifySession(token, secret, 1800000001), session);
  assert.equal(verifySession(token, secret, session.expiresAt), null);
  assert.equal(verifySession(token, secret, session.issuedAt - 1), null);
  assert.equal(verifySession(token.replace(/^1/, '2'), secret, 1800000001), null);
  assert.equal(verifySession(token, 'b'.repeat(64), 1800000001), null);
  assert.throws(() => issueSession('short'));
  const cookie = sessionCookie(token, true);
  assert.match(cookie, /__Host-market-scout=/); assert.match(cookie, /HttpOnly; SameSite=Strict; Path=/); assert.match(cookie, /; Secure$/);
  assert.equal(readSessionCookie(`${cookie}; __Host-market-scout=duplicate`, true), undefined);
});
test('request fingerprints are order independent for objects and bind all data', () => {
  assert.equal(fingerprint({ a: 1, b: 2 }), fingerprint({ b: 2, a: 1 }));
  assert.notEqual(fingerprint([1, 2]), fingerprint([2, 1]));
  assert.notEqual(fingerprint({ notes: 'a' }), fingerprint({ notes: 'b' }));
  assert.throws(() => fingerprint({ a: undefined }));
});
test('HTTP rejects cross-origin mutations and oversized bodies', async () => {
  const post = (headers: Record<string, string>, body = '{}') => new Request(origin + '/api/screen', { method: 'POST', body, headers });
  assert.equal((await serveApi(post({ origin: 'https://other.example', 'content-type': 'application/json' }), context)).status, 403);
  assert.equal((await serveApi(post({ 'content-type': 'text/plain' }), context)).status, 415);
  assert.equal((await serveApi(post({ 'content-type': 'application/json' }, 'x'.repeat(100001)), context)).status, 413);
  assert.equal((await serveApi(post({ 'content-type': 'application/json' }, '{'), context)).status, 400);
});
test('storage failures leave public deterministic tools available', async () => {
  assert.equal((await serveApi(new Request(origin + '/api/runs'), context)).status, 503);
  const response = await serveApi(new Request(origin + '/api/brief', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ criteria: { version: '1', requiredServices: [], geography: 'physical' }, selection: {} }) }), context);
  assert.equal(response.status, 200);
  assert.equal((await response.json()).comparison.uniqueCompanies, 19);
  assert.throws(() => new RestRedis('http://example.com', 'token'));
});
