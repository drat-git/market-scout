import type { Criteria, MarketId, Run } from './schema';

export const LIVE_RESEARCH_LIMITATION = 'Live discovery is unavailable in this context. Configure OPENAI_API_KEY for the CLI; the dashboard also needs its server session and Redis settings. No paid request was made. You can continue inspecting the baseline, screening stored evidence, and exporting comparisons.';

// Shared no-credentials fallback. Real server/CLI execution lives in server/research-pipeline.ts.
export function research(marketId: MarketId, criteria: Criteria, id: string): Run {
  const at = new Date().toISOString();
  return { id, kind: 'research', status: 'failed', startedAt: at, finishedAt: at, criteria: structuredClone(criteria), assessments: [],
    message: LIVE_RESEARCH_LIMITATION,
    events: [{ stage: 'Discovery', state: 'failed', at, detail: `Preflight blocked discovery in ${marketId}: paid execution is not enabled. No provider search ran.` }]
  };
}
