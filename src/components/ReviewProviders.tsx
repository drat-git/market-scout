import { useState } from 'react';
import { ArrowRight, Search, SlidersHorizontal, Plus, Minus, Check, ChevronRight, Sparkles, LoaderCircle, Upload } from 'lucide-react';
import { CORE, serviceLabels, type Criteria, type Dataset, type Selection, type Decision, type Assessment } from '../../shared/schema';
import { evidenceFor, resolveFact } from '../../shared/screen';
import { selectedRelationships } from '../../shared/compare';
import { candidateIds } from '../../shared/demo';
import { Result } from './Shared';
export type InclusionView = 'all' | 'included' | 'pending' | 'removed';
export type ProviderFilter = { market: string; service: string };
export function ReviewProviders({ data, selection, criteria, assessments, removedFlags, filter, setFilter, view, setView, onInspect, onDecision, loaded, discoveryStage, openedCandidates, onLoad, onNext }: {
  data: Dataset; selection: Selection; criteria: Criteria; assessments: Assessment[]; removedFlags: string[]; filter: ProviderFilter; setFilter: (f: ProviderFilter) => void;
  onInspect: (id: string) => void; onDecision: (id: string, value: Decision) => void;
  view: InclusionView; setView: (view: InclusionView) => void;
  loaded: boolean; discoveryStage: number | null; openedCandidates: string[]; onLoad: () => void; onNext: () => void;
}) {
  const [search, setSearch] = useState('');
  const included = new Set(selectedRelationships(data, selection).map(r => r.id));
  const visible = data.relationships.filter(r => {
    const c = data.companies.find(c => c.id === r.companyId)!;
    const services = evidenceFor(data,r.id);
    return c.name.toLowerCase().includes(search.toLowerCase()) && (filter.market === 'all' || r.marketId === filter.market)
      && (filter.service === 'all' || data.locations.some(l => l.companyId === r.companyId && l.marketId === r.marketId && resolveFact(services.filter(e=>e.scopeId===l.id),'physical-presence')==='yes' && resolveFact(services.filter(e=>e.scopeId===l.id), `service:${filter.service}`) === 'yes'))
      && (view === 'all' || view === 'included' && included.has(r.id) || view === 'pending' && selection[r.id] === 'unreviewed' || view === 'removed' && selection[r.id] === 'excluded');
  }).sort((a,b) => Number(candidateIds.includes(b.id)) - Number(candidateIds.includes(a.id)) || data.companies.find(c=>c.id===a.companyId)!.name.localeCompare(data.companies.find(c=>c.id===b.companyId)!.name));
  const pending = Object.values(selection).filter(v=>v==='unreviewed').length;
  const clear = () => { setSearch(''); setView('all'); setFilter({ market:'all',service:'all' }); };
  return <>
    <div className="intro-row"><div><h1 id="page-title" tabIndex={-1}>Review the providers</h1></div><button data-tour="compare" className="button primary" onClick={onNext}>Compare markets<ArrowRight size={17}/></button></div>
    <div className="rules-summary" data-tour="criteria"><div><strong>Screening criteria</strong><span>Pediatric therapy · {criteria.geography === 'physical' ? 'Physical clinic in the metro' : 'Documented service coverage'} · {criteria.requiredServices.length ? criteria.requiredServices.map(s=>serviceLabels[s]).join(' + ') : 'Any speech, occupational, or physical therapy'}</span></div><button className="future-control" disabled title="Planned: customize the screening criteria"><SlidersHorizontal size={16}/>Edit screening criteria<span className="planned-label">Planned</span></button></div>
    <section className="provider-panel" aria-label="Provider review">
      <div className="panel-heading"><div><h2>Researched providers</h2><p>{included.size} included across both markets{pending ? ` · ${pending} ${pending===1?'provider':'providers'} under review` : ''}</p></div><div className="provider-header-actions"><button className="future-control upload-providers" disabled title="Planned: upload a compatible provider CSV or Market Scout JSON dataset"><Upload size={14}/>Upload providers<span className="planned-label">Planned</span></button><div className="discovery-action" data-tour="discover"><button className="button secondary" disabled={loaded || discoveryStage !== null} aria-describedby="discovery-help" onClick={onLoad}><Sparkles size={16}/>{loaded ? 'Providers added' : 'Find more providers'}</button><span id="discovery-help">Prepared demo · 3 Austin candidates</span></div></div></div>
      {discoveryStage !== null && <div className="discovery-progress" role="status" aria-live="polite" aria-atomic="true"><div><LoaderCircle size={18} className="discovery-spinner"/><strong>{['Researching','Gathering evidence','Cataloging'][discoveryStage]}</strong><span>Simulated discovery</span></div><ol aria-hidden="true">{['Researching','Gathering evidence','Cataloging'].map((label,i)=><li key={label} className={i===discoveryStage?'active':i<discoveryStage?'complete':''}><span>{i<discoveryStage?<Check size={12}/>:i+1}</span>{label}</li>)}</ol></div>}

      <div className="table-tools"><label className="search-box"><Search size={17}/><input aria-label="Search providers" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search providers…"/></label><label className="sr-only" htmlFor="market-filter">Filter by market</label><select id="market-filter" value={filter.market} onChange={e=>setFilter({...filter,market:e.target.value})}><option value="all">Both markets</option>{data.markets.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select>{filter.service !== 'all' && <button className="filter-chip" onClick={()=>setFilter({...filter,service:'all'})}>{serviceLabels[filter.service as keyof typeof serviceLabels]} at a clinic ×</button>}</div>
      <div className="inclusion-tabs" role="group" aria-label="Filter by inclusion">{([
        ['all','All providers'],['included','Included'],['pending','Under review'],['removed','Not included']
      ] as const).map(([value,label])=><button key={value} aria-pressed={view===value} onClick={()=>setView(value)}>{label}</button>)}</div>
      <div className="table-scroll" tabIndex={0} role="region" aria-label="Provider comparison selection"><table className="provider-table"><thead><tr><th>Provider</th><th>Market</th><th>Documented therapies</th><th>Verification</th><th className="comparison-selection-cell"><span className="sr-only">Comparison selection</span></th></tr></thead><tbody>{visible.map(r=>{
        const company=data.companies.find(c=>c.id===r.companyId)!;
        const ev=evidenceFor(data,r.id);
        const a=assessments.find(a=>a.relationshipId===r.id)!;
        return <tr key={r.id} className={selection[r.id]==='excluded'?'removed':''}><td><button data-tour={r.id} className="provider-link" onClick={()=>onInspect(r.id)} aria-describedby={removedFlags.includes(r.id)?'provider-flags-note':undefined}><span>{company.name}{removedFlags.includes(r.id)&&<span className="removed-flag-marker" aria-hidden="true">*</span>}</span>{candidateIds.includes(r.id)&&!openedCandidates.includes(r.id)&&<span className="new-provider-badge">New</span>}<ChevronRight size={14}/></button><span className="cell-detail">{company.origin==='new' ? 'AI discovery · ' : ''}{company.domain}</span></td><td>{r.marketId==='austin'?'Austin':'San Antonio'}</td><td><div className="therapy-list">{CORE.filter(s=>resolveFact(ev,`service:${s}`)==='yes').map(s=><span key={s} className="therapy" title="Documented; view evidence for clinic scope">{serviceLabels[s]}</span>)}{!CORE.some(s=>resolveFact(ev,`service:${s}`)==='yes')&&<span className="cell-detail">Not established</span>}</div></td><td>{!(a.result==='uncertain'&&removedFlags.includes(r.id))&&<Result result={a.result}/>} {!removedFlags.includes(r.id)&&a.result !== 'match' && <span className="verification-summary">{a.reasons[0]}</span>}<button className="text-button verification-link" onClick={()=>onInspect(r.id)} aria-label={`View verification checks for ${company.name} in ${r.marketId==='austin'?'Austin':'San Antonio'}`}>View checks<ChevronRight size={12}/></button></td><td className="comparison-selection-cell"><div className="selection-controls">
          {!included.has(r.id)&&<button className="selection-button" title="Add to comparison" aria-label={`Add ${company.name} ${r.marketId==='austin'?'Austin':'San Antonio'} to comparison`} onClick={()=>onDecision(r.id,'accepted')}><Plus size={16} aria-hidden="true"/></button>}
          {(included.has(r.id)||selection[r.id]==='unreviewed')&&<button className="selection-button" title="Move to Not included" aria-label={`Move ${company.name} ${r.marketId==='austin'?'Austin':'San Antonio'} to Not included`} onClick={()=>onDecision(r.id,'excluded')}><Minus size={16} aria-hidden="true"/></button>}
        </div></td></tr>;
      })}</tbody></table></div>
      {!visible.length && <div className="empty"><h3>No providers match this view</h3><button className="button secondary" onClick={clear}>Clear filters</button></div>}
      {visible.some(r=>removedFlags.includes(r.id))&&<p className="provider-flags-note" id="provider-flags-note">* Flag manually removed.</p>}
      <div className="table-footer"><span>{visible.length} company–market entries</span></div>
    </section>

  </>;
}
