import { useEffect, useState } from 'react';
import { Activity, ArrowRight, ArrowUpRight, Check, X } from 'lucide-react';
import type { Run, Selection, Decision } from '../shared/schema';
const labels: Record<Run['status'], string> = { active: 'In progress', completed: 'Completed', failed: 'Failed', partial: 'Partial results', cancelled: 'Cancelled', 'awaiting-review': 'Awaiting review' };
export function ResearchRuns({ runs, selection, busy, onCancel, onInspect, onDecision, onScreen }: { runs: Run[]; selection: Selection; busy: boolean; onCancel: (id: string) => void; onInspect: (id: string) => void; onDecision: (id: string, decision: Decision) => void; onScreen: () => void }) {
  const [now, setNow] = useState(Date.now());
  const active = runs.some(r => r.status === 'active');
  useEffect(() => { if (!active) return; const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, [active]);
  return <section className="runs-section">
    <div className="runs-intro"><span><Activity size={20} />Research activity</span><p>Discovery retrieves provider sources. Review each candidate before adding it to your comparison. Server runs are retained for 24 hours.</p></div>
    {!runs.length && <div className="empty-state large"><Activity size={34}/><h2>{busy ? 'Starting research' : 'No research runs yet'}</h2><p>{busy ? 'Waiting for the server to save the first stage.' : 'Find additional providers or screen the evidence already in your workspace.'}</p><button className="button primary" onClick={onScreen}>Go to providers <ArrowRight size={15}/></button></div>}
    {runs.map(run => <article key={run.id} className="run-card">
      <div className="run-title"><div><h2>{run.kind === 'screen' ? 'Stored-evidence screening' : `Provider discovery · ${run.research?.marketId === 'san-antonio' ? 'San Antonio' : 'Austin'}`}</h2><p>{new Date(run.startedAt).toLocaleString('en-US')} · {Math.max(0, Math.round(((run.finishedAt ? new Date(run.finishedAt).getTime() : now) - new Date(run.startedAt).getTime()) / 1000))} seconds</p></div><span className={`status ${run.status === 'failed' ? 'exclude' : run.status === 'active' || run.status === 'partial' ? 'uncertain' : 'neutral'}`}>{labels[run.status]}</span></div>
      <div className="stage-track">{(['Discovery','Normalization','Screening','Review'] as const).map(stage => { const event = run.events.find(e => e.stage === stage); return <div key={stage} className={event?.state ?? 'not-run'}><span>{event?.state === 'completed' ? <Check size={13}/> : event?.state === 'failed' ? <X size={13}/> : <span className="stage-dot"/>}</span>{stage}<small>{event?.state ?? 'Not run'}</small></div>; })}</div>
      <p role={run.status === 'active' ? 'status' : undefined}>{run.message}</p>
      {run.status === 'active' && <button className="button secondary" onClick={() => onCancel(run.id)}>Cancel research</button>}
      {!!run.research?.candidates.length && <div className="candidate-list"><h3>Candidate review</h3>{run.research.candidates.map(candidate => {
        const assessment = run.assessments.find(a => a.relationshipId === candidate.relationshipId);
        const decision = selection[candidate.relationshipId] ?? 'unreviewed';
        return <section key={candidate.relationshipId} className="candidate-row"><div className="section-heading"><div><h4>{candidate.name}</h4><a href={candidate.website} target="_blank" rel="noreferrer">Provider website <ArrowUpRight size={12}/></a></div><span className="status neutral">{decision === 'unreviewed' ? 'Needs review' : decision === 'accepted' ? 'Accepted' : 'Excluded'}</span></div>
          <p>Screening: <strong>{assessment?.result ?? 'Not completed'}</strong>. {assessment?.reasons[0] ?? 'Review the available evidence.'}</p>
          {!!candidate.warnings.length && <ul>{candidate.warnings.map((warning,i) => <li key={i}>{warning}</li>)}</ul>}
          {!!candidate.possibleDuplicates.length && <p>Possible existing records: {candidate.possibleDuplicates.join(', ')}. Identity has not been merged automatically.</p>}
          <div className="candidate-actions"><button className="button secondary" onClick={() => onInspect(candidate.relationshipId)}>Inspect evidence</button>{decision !== 'accepted' && <button className="button primary" onClick={() => onDecision(candidate.relationshipId, 'accepted')}>{decision === 'excluded' ? 'Restore to comparison' : 'Accept into comparison'}</button>}{decision !== 'excluded' && <button className="text-button" onClick={() => onDecision(candidate.relationshipId, 'excluded')}>Exclude</button>}</div>
        </section>;
      })}</div>}
      {!!run.research?.sources.length && <details><summary>Source checks · {run.research.sources.length}</summary>{run.research.sources.map(source => <p key={source.id}><a href={source.url} target="_blank" rel="noreferrer">{source.title || source.url}</a> · {source.status}<br/>{source.detail}</p>)}</details>}
      {!!run.research?.leads.length && !run.research.candidates.length && <details><summary>Saved discovery leads · {run.research.leads.length}</summary>{run.research.leads.map(lead => <p key={lead.website}><a href={lead.website} target="_blank" rel="noreferrer">{lead.name}</a> · Not normalized into a candidate.</p>)}</details>}
      {!!run.assessments.length && <details><summary>Screening assessments · {run.assessments.length}</summary><p>{run.criteria.geography === 'physical' ? 'Physical clinic' : 'Service coverage'} · {run.criteria.requiredServices.join(', ') || 'Any core therapy'}</p>{run.assessments.map(a => <div key={a.id} className="run-assessment"><button className="text-button" onClick={() => onInspect(a.relationshipId)}>{a.relationshipId}</button><strong>{a.result}</strong><span>{a.reasons[0]}</span></div>)}</details>}
      {!!run.research?.usage.length && <details><summary>Execution details</summary><p>Model: {run.research.model}. No application spending or usage caps.</p>{run.research.usage.map(u => <p key={u.stage}>{u.stage}: {u.inputTokens.toLocaleString()} input tokens · {u.outputTokens.toLocaleString()} output tokens · {u.webSearchCalls} web searches</p>)}</details>}
    </article>)}
  </section>;
}
