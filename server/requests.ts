import { randomUUID } from 'node:crypto';
import { PREFIX, type Redis } from './redis';
import { fingerprint } from './fingerprint';
import type { Session } from './session';

const CLAIM = `
local clock = redis.call('TIME')
if tonumber(clock[1]) * 1000 >= tonumber(ARGV[3]) then return {'expired'} end
local raw = redis.call('GET', KEYS[1])
if raw then
  local request = cjson.decode(raw)
  if request.fingerprint ~= ARGV[1] then return {'conflict'} end
  return {'existing', request.runId}
end
redis.call('SET', KEYS[1], cjson.encode({fingerprint=ARGV[1], runId=ARGV[2]}), 'PXAT', ARGV[3])
return {'created', ARGV[2]}
`;
export type RequestClaim = { status: 'created' | 'existing'; runId: string } | { status: 'conflict' | 'expired' };
export class RequestStore {
  constructor(private redis: Redis) {}
  async lookup(session: Session, requestId: string): Promise<{ fingerprint: string; runId: string } | null> {
    if (!/^[A-Za-z0-9_-]{8,100}$/.test(requestId) || session.expiresAt <= Date.now() / 1000) return null;
    const raw = await this.redis.command<string | null>('GET', `${PREFIX}request:${fingerprint([session.id, requestId])}`);
    return raw ? JSON.parse(raw) : null;
  }
  /** Only a newly created claim can execute. Existing claims read their run, never restart it. */
  async claim(session: Session, requestId: string, payloadFingerprint: string): Promise<RequestClaim> {
    if (!/^[a-f0-9]{64}$/.test(session.id) || !/^[A-Za-z0-9_-]{8,100}$/.test(requestId) || !/^[a-f0-9]{64}$/.test(payloadFingerprint)) throw new Error('Invalid request identity');
    const key = `${PREFIX}request:${fingerprint([session.id, requestId])}`;
    const result = await this.redis.command<string[]>('EVAL', CLAIM, 1, key, payloadFingerprint, randomUUID(), session.expiresAt * 1000);
    if (result[0] === 'created' || result[0] === 'existing') return { status: result[0], runId: result[1] };
    if (result[0] === 'conflict' || result[0] === 'expired') return { status: result[0] };
    throw new Error('Invalid request storage response');
  }
}
