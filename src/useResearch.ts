import { useCallback, useEffect, useRef, useState } from 'react';
import type { Criteria, MarketId, Run } from '../shared/schema';
export type Readiness = { researchReady: boolean; missing: string[] };
async function read<T>(url: string, body?: unknown): Promise<T> {
  const response = await fetch(url, body === undefined ? undefined : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const value = await response.json();
  if (!response.ok) throw new Error(value.error || 'The server request failed.');
  return value as T;
}
export function useResearch(onRun: (run: Run) => void, onNotice: (text: string) => void) {
  const [readiness, setReadiness] = useState<Readiness | null>(null);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const mounted = useRef(true);
  const refresh = useCallback(async () => {
    try { const status = await read<Readiness>('/api/status'); if (mounted.current) setReadiness(status); }
    catch { if (mounted.current) setReadiness({ researchReady: false, missing: ['Research server connection'] }); }
  }, []);
  useEffect(() => {
    mounted.current = true;
    let stopped = false;
    void refresh();
    void (async () => {
      const status = await read<Readiness>('/api/status');
      if (!status.researchReady || stopped) return;
      const session = await read<{ active: boolean }>('/api/session');
      if (!session.active || stopped) return;
      let active = true;
      while (active && !stopped) {
        const result = await read<{ runs: { id: string }[] }>('/api/runs');
        const stored = await Promise.all(result.runs.map(summary => read<{ run: Run }>(`/api/runs/${encodeURIComponent(summary.id)}`)));
        if (stopped) return;
        for (const value of stored) onRun(value.run);
        active = stored.some(value => value.run.status === 'active');
        if (active) await new Promise(resolve => setTimeout(resolve,1200));
      }
    })().catch(() => { /* An absent or expired session has no runs to restore. */ });
    return () => { stopped = true; mounted.current = false; };
  }, [refresh, onRun]);
  const start = async (marketId: MarketId, criteria: Criteria) => {
    if (lock.current) return;
    lock.current = true; setBusy(true);
    const requestId = crypto.randomUUID();
    let finished = false;
    let polling: Promise<void> | undefined;
    try {
      await read('/api/session', {});
      polling = (async () => {
        while (!finished && mounted.current) {
          await new Promise(resolve => setTimeout(resolve, 1200));
          if (finished || !mounted.current) break;
          try { const value = await read<{ run: Run | null }>(`/api/requests/${requestId}`); if (value.run && mounted.current) onRun(value.run); } catch { /* A claim may not exist yet; POST provides the final error. */ }
        }
      })();
      onNotice('Research started. New candidates will wait for your review.');
      const result = await read<{ run: Run | null }>('/api/research', { requestId, marketId, criteria });
      if (result.run && mounted.current) { onRun(result.run); onNotice(result.run.message); }
    } catch (error) {
      if (mounted.current) onNotice(`${error instanceof Error ? error.message : 'Research could not finish.'} Saved runs can be restored by refreshing. No automatic retry was made.`);
    } finally { finished = true; await polling; lock.current = false; if (mounted.current) setBusy(false); }
  };
  const cancel = async (id: string) => {
    try { await read(`/api/runs/${encodeURIComponent(id)}/cancel`, {}); onNotice('Cancellation requested. Completed evidence will be preserved.'); }
    catch (error) { onNotice(error instanceof Error ? error.message : 'Could not request cancellation.'); }
  };
  return { readiness, busy, start, cancel, refresh };
}
