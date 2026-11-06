import { z } from 'zod';
import { baseline } from '../shared/baseline';
import { CriteriaSchema, MarketIdSchema } from '../shared/schema';
import { OpenAIResearchModel, type ResearchModel } from './model';
import { executeResearch, PROMPT_VERSION } from './research-pipeline';
import { RequestStore } from './requests';
import { fingerprint } from './fingerprint';
import type { retrievePage } from './source-reader';
import { handleApi } from '../shared/api';
import { issueSession, readSessionCookie, sessionCookie, verifySession } from './session';
import { RestRedis, type Redis } from './redis';
import { localStorage } from './local-redis';
import { RunStore } from './runs';

export type ServerContext = { origin: string; secure: boolean; sessionSecret?: string; redis?: Redis; model?: ResearchModel; retrieve?: typeof retrievePage };
export function configuredModel(env: NodeJS.ProcessEnv): ResearchModel | undefined {
  return env.OPENAI_API_KEY ? new OpenAIResearchModel(env.OPENAI_API_KEY, env.AI_MODEL || 'gpt-6.1-terra') : undefined;
}
const ResearchInput = z.object({ marketId: MarketIdSchema, criteria: CriteriaSchema, requestId: z.string().regex(/^[A-Za-z0-9_-]{8,100}$/) }).strict();
export function configuredStorage(env: NodeJS.ProcessEnv): Redis | undefined {
  if (env.LOCAL_REDIS_URL && env.NODE_ENV !== 'production' && !env.VERCEL) return localStorage(env.LOCAL_REDIS_URL);
  if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) return undefined;
  return new RestRedis(env.UPSTASH_REDIS_REST_URL, env.UPSTASH_REDIS_REST_TOKEN);
}
function json(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers } });
}
async function readJson(req: Request) {
  const reader = req.body?.getReader();
  if (!reader) return {};
  const chunks: Uint8Array[] = []; let total = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > 100_000) { await reader.cancel(); throw new RangeError('Request too large'); }
    chunks.push(value);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
}
export async function serveApi(req: Request, context: ServerContext): Promise<Response> {
  const path = new URL(req.url).pathname;
  try {
    if (!['GET', 'POST'].includes(req.method)) return json({ error: 'Method not allowed' }, 405);
    if (req.method === 'POST') {
      const origin = req.headers.get('origin');
      if ((origin && origin !== context.origin) || req.headers.get('sec-fetch-site') === 'cross-site') return json({ error: 'Cross-origin request rejected' }, 403);
      if (req.headers.get('content-type')?.split(';')[0].trim() !== 'application/json') return json({ error: 'JSON content type required' }, 415);
    }
    if (path === '/api/status' && req.method === 'GET') {
      let storageReady = false;
      try { storageReady = !!context.redis && await context.redis.command('PING') === 'PONG'; } catch { /* Unavailable storage is a readiness result. */ }
      const missing = [...(!context.model ? ['OpenAI API key'] : []), ...(!storageReady ? ['Redis connection'] : []), ...(!context.sessionSecret || context.sessionSecret.length < 32 ? ['Session secret'] : [])];
      return json({ researchReady: missing.length === 0, missing });
    }
    if (path === '/api/research' || path === '/api/session' || path.startsWith('/api/requests/') || path === '/api/runs' || path.startsWith('/api/runs/')) {
      if (!context.redis || !context.sessionSecret || Buffer.byteLength(context.sessionSecret) < 32) return json({ error: 'Server session storage is not configured. Baseline tools remain available.' }, 503);
      const token = readSessionCookie(req.headers.get('cookie'), context.secure);
      const session = verifySession(token, context.sessionSecret);
      if (path === '/api/session') {
        if (req.method === 'GET') return json({ active: !!session, expiresAt: session ? new Date(session.expiresAt * 1000).toISOString() : null });
        if (req.method !== 'POST') return json({ error: 'Use POST to establish a session.' }, 405);
        const input = await readJson(req);
        if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).length) return json({ error: 'Session request must be an empty object.' }, 400);
        await context.redis.command('PING');
        if (session) return json({ expiresAt: new Date(session.expiresAt * 1000).toISOString() });
        const created = issueSession(context.sessionSecret);
        return json({ expiresAt: new Date(created.session.expiresAt * 1000).toISOString() }, 201, { 'Set-Cookie': sessionCookie(created.token, context.secure) });
      }
      if (!session) return json({ error: 'Session missing or expired. Start a new session to run research.' }, 401);
      const store = new RunStore(context.redis);
      const requests = new RequestStore(context.redis);
      if (path === '/api/research') {
        if (req.method !== 'POST') return json({ error: 'Use POST to start research.' }, 405);
        const parsed = ResearchInput.safeParse(await readJson(req));
        if (!parsed.success) return json({ error: 'Invalid research request.' }, 400);
        if (!context.model) return json({ error: 'OpenAI is not configured. No research was started.' }, 503);
        const input = parsed.data;
        const claim = await requests.claim(session, input.requestId, fingerprint({ marketId: input.marketId, criteria: input.criteria, datasetVersion: baseline.version, promptVersion: PROMPT_VERSION, model: context.model.name }));
        if (claim.status === 'conflict') return json({ error: 'This request ID was already used with different settings.' }, 409);
        if (claim.status === 'expired') return json({ error: 'Session expired.' }, 401);
        if (claim.status === 'existing') {
          const saved = await store.get(session, claim.runId);
          return json({ runId: claim.runId, run: saved?.run ?? null, reused: true }, saved?.run.status === 'active' || !saved ? 202 : 200);
        }
        if (!('runId' in claim)) return json({ error: 'Request claim unavailable.' }, 503);
        const runId = claim.runId;
        const sessionData = await store.dataset(session, baseline);
        const controller = new AbortController();
        let finished = false, revision = 0;
        // Both promises are awaited before returning. No detached work after the hosting request ends.
        const watcher = (async () => {
          while (!finished) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            if (finished) break;
            try { if (await store.cancelled(session, runId)) { controller.abort(); break; } }
            catch { controller.abort(); break; }
          }
        })();
        try {
          const run = await executeResearch({ id: runId, marketId: input.marketId, criteria: input.criteria, base: sessionData, model: context.model, retrieve: context.retrieve, signal: controller.signal,
            save: async run => { if (await store.save(session, run, revision) !== 'saved') throw new Error('Run could not be persisted'); revision++; }
          });
          return json({ runId: run.id, run, reused: false });
        } finally { finished = true; await watcher; }
      }
      if (path.startsWith('/api/requests/')) {
        if (req.method !== 'GET') return json({ error: 'Use GET to read request status.' }, 405);
        const claim = await requests.lookup(session, path.slice('/api/requests/'.length));
        if (!claim) return json({ error: 'Request not found in this session.' }, 404);
        const saved = await store.get(session, claim.runId);
        return json({ runId: claim.runId, run: saved?.run ?? null }, saved ? 200 : 202);
      }
      if (path.endsWith('/cancel') && path.startsWith('/api/runs/')) {
        if (req.method !== 'POST') return json({ error: 'Use POST to cancel research.' }, 405);
        const found = await store.cancel(session, path.slice('/api/runs/'.length, -'/cancel'.length));
        return found ? json({ cancellationRequested: true }) : json({ error: 'Run not found in this session.' }, 404);
      }
      if (req.method !== 'GET') return json({ error: 'Use GET to read runs.' }, 405);
      if (path === '/api/runs') return json({ runs: await store.list(session) });
      const result = await store.get(session, path.slice('/api/runs/'.length));
      return result ? json(result) : json({ error: 'Run not found in this session.' }, 404);
    }
    const body = req.method === 'POST' ? await readJson(req) : {};
    let data = baseline;
    if (context.redis && context.sessionSecret && ['/api/screen', '/api/brief'].includes(path)) {
      const session = verifySession(readSessionCookie(req.headers.get('cookie'), context.secure), context.sessionSecret);
      if (session) data = await new RunStore(context.redis).dataset(session, baseline);
    }
    const result = handleApi(req.method, path, body, data);
    return json(result.body, result.status);
  } catch (error) {
    if (error instanceof RangeError) return json({ error: 'Request too large' }, 413);
    if (error instanceof SyntaxError) return json({ error: 'Invalid JSON' }, 400);
    // Do not expose storage URLs, tokens, payloads, or vendor error bodies.
    return json({ error: 'Required server protection is unavailable. Check the saved run before starting a new request; work may already have begun.' }, 503);
  }
}
