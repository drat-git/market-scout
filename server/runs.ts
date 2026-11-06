import { PREFIX, type Redis } from './redis';
import type { Session } from './session';
import type { Run, Dataset } from '../shared/schema';
import { mergeAdditions } from '../shared/research-artifacts';
function visibleRun(run: Run): Run {
  if (run.status !== 'active' || Date.now() - Date.parse(run.startedAt) < 135000) return run;
  return { ...run, status: 'partial', finishedAt: new Date(Date.parse(run.startedAt) + 120000).toISOString(), message: 'Execution was interrupted before a final result was saved. Retained artifacts are incomplete; a new request requires an explicit restart.', events: run.events.map(e => e.state === 'active' ? { ...e, state: 'partial' } : e) };
}

export type StoredRun = { revision: number; run: Run };
const SAVE = `
local clock = redis.call('TIME')
if tonumber(clock[1]) * 1000 >= tonumber(ARGV[4]) then return 'expired' end
local raw = redis.call('HGET', KEYS[1], ARGV[1])
local revision = 0
if raw then revision = cjson.decode(raw).revision end
if revision ~= tonumber(ARGV[2]) then return 'conflict' end
redis.call('HSET', KEYS[1], ARGV[1], ARGV[3])
redis.call('PEXPIREAT', KEYS[1], ARGV[4])
return 'saved'
`;
export class RunStore {
  constructor(private redis: Redis) {}
  private key(session: Session) {
    if (!/^[a-f0-9]{64}$/.test(session.id) || session.expiresAt <= Math.floor(Date.now() / 1000)) throw new Error('Session expired');
    return `${PREFIX}runs:${session.id}`;
  }
  async save(session: Session, run: Run, expectedRevision = 0) {
    if (!/^[A-Za-z0-9_-]{1,100}$/.test(run.id) || !Number.isSafeInteger(expectedRevision) || expectedRevision < 0) throw new Error('Invalid run identity');
    const value = JSON.stringify({ run, revision: expectedRevision + 1 });
    if (Buffer.byteLength(value) > 1_000_000) throw new Error('Run artifact too large');
    return this.redis.command<string>('EVAL', SAVE, 1, this.key(session), run.id, expectedRevision, value, session.expiresAt * 1000);
  }
  async get(session: Session, id: string): Promise<StoredRun | null> {
    if (!/^[A-Za-z0-9_-]{1,100}$/.test(id)) return null;
    const raw = await this.redis.command<string | null>('HGET', this.key(session), id);
    if (raw === null) return null;
    const stored = JSON.parse(raw) as StoredRun;
    return { ...stored, run: visibleRun(stored.run) };
  }
  async cancel(session: Session, id: string) {
    const existing = await this.get(session, id);
    if (!existing) return false;
    if (existing.run.status === 'active') await this.redis.command('SET', `${this.key(session)}:cancel:${id}`, '1', 'EXAT', session.expiresAt);
    return true;
  }
  async cancelled(session: Session, id: string) { return await this.redis.command('GET', `${this.key(session)}:cancel:${id}`) === '1'; }
  async dataset(session: Session, base: Dataset) {
    const values = await this.redis.command<string[]>('HVALS', this.key(session));
    return values.reduce((data, raw) => { const stored = JSON.parse(raw) as StoredRun; return stored.run.research ? mergeAdditions(data, stored.run.research.additions) : data; }, base);
  }
  async list(session: Session) {
    const values = await this.redis.command<string[]>('HVALS', this.key(session));
    return values.map(raw => JSON.parse(raw) as StoredRun).map(({ revision, run }) => ({ revision, run: visibleRun(run) })).map(({ revision, run }) => ({ revision, id: run.id, kind: run.kind, status: run.status, startedAt: run.startedAt, finishedAt: run.finishedAt, message: run.message })).sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  }
}
