> Experimental earlier implementation. The default app and CLI are static/offline. Use vite.live.config.ts / cli/live.ts only for explicit live-backend work.

# Live research server

API spending caps and usage quotas are deferred by the user. No spending ledger, per-IP rate limit, or application token/tool quota is enforced. Authentication, input validation, source safety, idempotency, and operational timeouts remain in place.

## Local setup

Copy `.env.example` to ignored `.env.local` and set `OPENAI_API_KEY`, `AI_MODEL` (default `gpt-6.1-terra`), `SESSION_SECRET` (random, at least 32 bytes), and `LOCAL_REDIS_URL=redis://127.0.0.1:6380`. Never use a `VITE_` prefix for secrets. Vite and the CLI read `.env.local`; existing process environment values take precedence.

Run `npm run dev:redis` and `npm run dev` in separate terminals. The launcher uses `REDIS_SERVER_BIN`, the ignored `.market-scout/bin/redis-server`, or `redis-server` on PATH, in that order. It binds to loopback, enables protected mode, and stores AOF data under ignored `.market-scout/redis`. LocalRedis accepts loopback addresses only and is disabled in production. The development adapter is not a production deployment.

For hosted storage, the available REST adapter uses `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`. It has finite network timeouts and no automatic command retries. A hosted instance and production routing still need configuration and verification.

## Execution and evidence

`server/model.ts` calls the Responses API with strict structured outputs. Discovery requires web search and retains actual search-source URLs. Normalization receives retrieved primary-page text, without tools. No automatic paid retry is performed.

`server/source-reader.ts` permits public HTTP(S) sources on standard ports, resolves and pins public IPs, revalidates redirects, rejects private/metadata destinations, and strips non-content HTML. Per-page time and response-size bounds protect retrieval. Discovered source URLs must be cited by the search response and match the provider's domain.

`server/research-pipeline.ts` validates exact excerpts against normalized retrieved text, preserves company/clinic/service-area scope, flags unknown counties, and retains uncertain candidates. A run has a 120-second operational timeout. Cancellation and failures preserve completed stages and validated artifacts. Accepting a candidate changes selection, never its evidence or screening result.

## Sessions, storage, and endpoints

Sessions are random, HMAC-signed, and fixed at 24 hours. Production-format cookies use `__Host-`, Secure, HttpOnly, SameSite=Strict, and Path=/. Local development uses a separate non-Secure cookie. Redis artifacts expire at the session deadline; revision checks reject stale writes. Notes and local review decisions are not stored with server runs.

| Endpoint | Behavior |
| --- | --- |
| GET /api/status | Safe configuration/storage readiness; no secrets |
| GET /api/session | Check the existing session without creating one |
| POST /api/session | Establish a signed anonymous session |
| POST /api/research | Atomically claim a request and await the executor |
| GET /api/requests/:requestId | Resolve private run progress without starting work |
| GET /api/runs and /api/runs/:id | Read this session's saved runs |
| POST /api/runs/:id/cancel | Signal cancellation of an owned run |
| POST /api/screen and /api/brief | Load baseline plus authorized session evidence |

Concurrent identical request IDs return the same run; changing the payload returns conflict. A lost response does not authorize a second execution. Old active runs appear interrupted/partial on read without rewriting the stored artifact. Cross-origin mutations, malformed JSON, and oversized bodies are rejected. The browser polls saved progress while the research POST is awaited; it never launches paid work in a React effect.

## Verification

`npm test` runs unit/HTTP checks. `npm run test:redis` starts a dedicated temporary Unix-socket Redis, never the user's running instance. It requires `redis-server` and `redis-cli` on PATH or explicit `REDIS_SERVER_BIN` / `REDIS_CLI_BIN` paths. Eight integration checks cover concurrent claims, expiry, revision conflicts, signed cookies, read-only progress, private evidence, research persistence, cancellation, and interrupted runs.

Two paid smoke tests exercised CLI and browser research. Production hosting, hosted Redis, shared result caching, and independent model-quality evaluation remain outstanding.

References: [Responses web search](https://developers.openai.com/api/docs/guides/tools-web-search), [structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs), [Redis Node client](https://redis.io/docs/latest/develop/clients/nodejs/connect/), [Upstash REST API](https://upstash.com/docs/redis/features/restapi).
