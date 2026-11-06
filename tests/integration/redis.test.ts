import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, execFile, type ChildProcess } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { RequestStore } from '../../server/requests';
import { PREFIX, type Redis } from '../../server/redis';
import { issueSession } from '../../server/session';
import { fingerprint } from '../../server/fingerprint';
import { RunStore } from '../../server/runs';
import { research } from '../../shared/research';
import { DEFAULT_CRITERIA } from '../../shared/schema';
import { serveApi } from '../../server/http';
const exec = promisify(execFile);
const secret = 'test-secret-'.repeat(6);
const month = new Date().toISOString().slice(0, 7);
let process: ChildProcess, directory: string, socket: string;
const redis: Redis = { async command<T>(...args: (string | number)[]) {
  const { stdout } = await exec(globalThis.process.env.REDIS_CLI_BIN ?? 'redis-cli', ['-s', socket, '--json', ...args.map(String)], { maxBuffer: 3_000_000 });
  if (stdout.startsWith('error:')) throw new Error(stdout);
  return JSON.parse(stdout) as T;
} };
before(async () => {
  directory = await mkdtemp(join(tmpdir(), 'ms-redis-')); socket = join(directory, 'redis.sock');
  process = spawn(globalThis.process.env.REDIS_SERVER_BIN ?? 'redis-server', ['--port', '0', '--unixsocket', socket, '--unixsocketperm', '700', '--save', '', '--appendonly', 'no', '--dir', directory], { stdio: ['ignore', 'pipe', 'pipe'] });
  let logs = ''; process.stdout?.on('data', chunk => { logs += chunk; }); process.stderr?.on('data', chunk => { logs += chunk; });
  await new Promise<void>((resolve, reject) => { process.once('spawn', resolve); process.once('error', reject); });
  let ready = false;
  for (let i = 0; i < 60; i++) { try { await redis.command('PING'); ready = true; break; } catch { await new Promise(r => setTimeout(r, 50)); } }
  assert.ok(ready, `Dedicated Redis process did not start: ${logs}`);
});
after(async () => { if (process && process.exitCode === null) { const exited = new Promise(r => process.once('exit', r)); process.kill('SIGTERM'); await exited; } if (directory) await rm(directory, { recursive: true, force: true }); });
beforeEach(async () => { await redis.command('FLUSHDB'); }); // Only this test-owned Unix-socket server.

test('concurrent duplicate requests create one execution and preserve payload identity', async () => {
  const store = new RequestStore(redis), session = issueSession(secret).session;
  const results = await Promise.all(Array.from({ length: 20 }, () => store.claim(session, 'request-1', fingerprint({ operation: 'research', market: 'austin' }))));
  assert.equal(results.filter(r => r.status === 'created').length, 1);
  assert.equal(results.filter(r => r.status === 'existing').length, 19);
  assert.equal(new Set(results.filter(r => 'runId' in r).map(r => r.runId)).size, 1);
  assert.equal((await store.claim(session, 'request-1', fingerprint({ market: 'different' }))).status, 'conflict');
  const other = await store.claim(issueSession(secret).session, 'request-1', fingerprint({ market: 'different' }));
  assert.equal(other.status, 'created');
});
test('expired request sessions cannot create executions', async () => {
  const session = issueSession(secret).session; session.expiresAt = 1;
  assert.equal((await new RequestStore(redis).claim(session, 'request-1', fingerprint({}))).status, 'expired');
});
test('run reads are isolated by session, expire, and preserve newest revisions', async () => {
  const store = new RunStore(redis), a = issueSession(secret), b = issueSession(secret);
  const run = research('austin', DEFAULT_CRITERIA, 'private-run');
  assert.equal(await store.save(a.session, run), 'saved');
  assert.equal(await store.get(b.session, run.id), null);
  assert.deepEqual(await store.list(b.session), []);
  assert.equal((await store.get(a.session, run.id))?.revision, 1);
  assert.equal(await store.save(a.session, run, 0), 'conflict');
  assert.equal(await store.save(a.session, { ...run, message: 'New stage' }, 1), 'saved');
  const ttl = await redis.command<number>('TTL', PREFIX + 'runs:' + a.session.id);
  assert.ok(ttl > 86390 && ttl <= 86400);
  const context = { origin: 'https://example.com', secure: true, sessionSecret: secret, redis };
  const response = await serveApi(new Request(`https://example.com/api/runs/${run.id}`, { headers: { cookie: `__Host-market-scout=${b.token}` } }), context);
  assert.equal(response.status, 404);
  const authorized = await serveApi(new Request(`https://example.com/api/runs/${run.id}`, { headers: { cookie: `__Host-market-scout=${a.token}` } }), context);
  assert.equal(authorized.status, 200);
  assert.equal((await authorized.json()).run.message, 'New stage');
  a.session.expiresAt = 1; await assert.rejects(() => store.get(a.session, run.id));
});
test('session endpoint issues protected cookies and progress reads never create work', async () => {
  const context = { origin: 'https://example.com', secure: true, sessionSecret: secret, redis };
  assert.equal((await serveApi(new Request(context.origin + '/api/runs'), context)).status, 401);
  const created = await serveApi(new Request(context.origin + '/api/session', { method: 'POST', headers: { 'content-type': 'application/json', origin: context.origin }, body: '{}' }), context);
  assert.equal(created.status, 201); assert.match(created.headers.get('set-cookie')!, /HttpOnly.*Secure/);
  const before = await redis.command('DBSIZE');
  const list = await serveApi(new Request(context.origin + '/api/runs', { headers: { cookie: created.headers.get('set-cookie')! } }), context);
  assert.equal(list.status, 200); assert.deepEqual(await list.json(), { runs: [] });
  assert.equal(await redis.command('DBSIZE'), before);
});

test('HTTP research persists results, reuses duplicate requests, and isolates status reads', async () => {
  let executions = 0;
  const { session, token } = issueSession(secret);
  const headers = { cookie: `__Host-market-scout=${token}`, 'content-type': 'application/json', origin: 'https://example.com' };
  const context = { origin: 'https://example.com', secure: true, sessionSecret: secret, redis, model: { name: 'synthetic-model', async generate() { executions++; return { value: { leads: [] }, sources: [], responseId: 'synthetic', inputTokens: 1, outputTokens: 1, webSearchCalls: 0 }; } } };
  const input = { requestId: 'request-http', marketId: 'austin', criteria: DEFAULT_CRITERIA };
  const post = () => new Request(context.origin + '/api/research', { method: 'POST', headers, body: JSON.stringify(input) });
  const [a,b] = await Promise.all([serveApi(post(), context), serveApi(post(), context)]);
  assert.equal(executions, 1);
  const values = await Promise.all([a.json(), b.json()]);
  assert.equal(values[0].runId, values[1].runId);
  assert.ok(values.some(v => v.reused));
  assert.equal((await new RunStore(redis).get(session, values[0].runId))?.run.status, 'completed');
  const status = await serveApi(new Request(context.origin + '/api/requests/request-http', { headers }), context);
  assert.equal(status.status, 200); assert.equal((await status.json()).run.status, 'completed');
  const other = issueSession(secret);
  assert.equal((await serveApi(new Request(context.origin + '/api/requests/request-http', { headers: { cookie: `__Host-market-scout=${other.token}` } }), context)).status, 404);
  const changed = await serveApi(new Request(context.origin + '/api/research', { method: 'POST', headers, body: JSON.stringify({ ...input, marketId: 'san-antonio' }) }), context);
  assert.equal(changed.status, 409); assert.equal(executions, 1);
});
test('HTTP cancellation interrupts the model and preserves a final stored state', async () => {
  const { token } = issueSession(secret);
  const headers = { cookie: `__Host-market-scout=${token}`, 'content-type': 'application/json', origin: 'https://example.com' };
  const context = { origin: 'https://example.com', secure: true, sessionSecret: secret, redis, model: { name: 'synthetic-model', async generate(_stage: unknown,_instructions: unknown,_input: unknown,_schema: unknown,signal: AbortSignal): Promise<never> { return new Promise((_resolve,reject) => { signal.addEventListener('abort', () => reject(signal.reason), { once: true }); }); } } };
  const running = serveApi(new Request(context.origin + '/api/research', { method: 'POST', headers, body: JSON.stringify({ requestId: 'request-cancel', marketId: 'austin', criteria: DEFAULT_CRITERIA }) }), context);
  let runId = '';
  for (let i=0; i<100; i++) {
    const read = await serveApi(new Request(context.origin + '/api/requests/request-cancel', { headers }), context);
    if (read.ok) { const value = await read.json(); if (value.run) { runId = value.runId; break; } }
    await new Promise(resolve => setTimeout(resolve,20));
  }
  assert.ok(runId);
  const cancel = await serveApi(new Request(context.origin + `/api/runs/${runId}/cancel`, { method: 'POST', headers, body: '{}' }), context);
  assert.equal(cancel.status, 200);
  assert.equal((await (await running).json()).run.status, 'cancelled');
});

test('screen and brief load new evidence only from the authorized session', async () => {
  const { baseline } = await import('../../shared/baseline');
  const { emptyAdditions } = await import('../../shared/research-artifacts');
  const owner = issueSession(secret), stranger = issueSession(secret);
  const run = research('austin', DEFAULT_CRITERIA, 'private-candidate-run');
  const additions = emptyAdditions();
  additions.companies.push({ ...baseline.companies[0], id: 'private-company', origin: 'new' });
  additions.relationships.push({ id: 'private-company@austin', companyId: 'private-company', marketId: 'austin', evidenceIds: [] });
  run.research = { marketId: 'austin', model: 'synthetic', leads: [], sources: [], candidates: [], additions, usage: [] };
  await new RunStore(redis).save(owner.session, run);
  const context = { origin: 'https://example.com', secure: true, sessionSecret: secret, redis };
  const call = (token: string, endpoint: string, body: unknown) => serveApi(new Request(context.origin + endpoint, { method: 'POST', headers: { cookie: `__Host-market-scout=${token}`, 'content-type': 'application/json' }, body: JSON.stringify(body) }), context);
  assert.equal((await call(owner.token, '/api/screen', { ids: ['private-company@austin'], criteria: DEFAULT_CRITERIA })).status, 200);
  assert.equal((await call(stranger.token, '/api/screen', { ids: ['private-company@austin'], criteria: DEFAULT_CRITERIA })).status, 400);
  const response = await call(owner.token, '/api/brief', { selection: { 'private-company@austin': 'accepted' }, criteria: DEFAULT_CRITERIA });
  assert.equal(response.status, 200); assert.equal((await response.json()).comparison.uniqueCompanies, 20);
});
test('interrupted active runs are shown as partial without mutating stored artifacts on read', async () => {
  const { session } = issueSession(secret), store = new RunStore(redis);
  const run = research('austin', DEFAULT_CRITERIA, 'stale-run');
  run.status = 'active'; run.finishedAt = ''; run.startedAt = new Date(Date.now()-140000).toISOString();
  run.events = [{ stage: 'Discovery', state: 'active', at: run.startedAt, detail: 'Searching' }];
  await store.save(session, run);
  assert.equal((await store.get(session, run.id))?.run.status, 'partial');
  const raw = JSON.parse(await redis.command<string>('HGET', `${PREFIX}runs:${session.id}`, run.id));
  assert.equal(raw.run.status, 'active');
});
