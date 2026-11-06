import { useState } from 'react';
import { ArrowRight, ArrowDownUp, Check, Plus, Clock3, Layers3 } from 'lucide-react';
import type { Dataset, MarketId } from '../shared/schema';
import { workspace } from './workspace';

export function WorkspaceSettings({ markets, marketOrder, onApply, onPlanned }: {
  markets: Dataset['markets']; marketOrder: MarketId[];
  onApply: (order: MarketId[]) => void; onPlanned: (title: string) => void;
}) {
  const [order, setOrder] = useState(marketOrder);
  const changed = order.join() !== marketOrder.join();
  function choose(index: number, id: MarketId) {
    // Selecting the opposite slot swaps it; a market cannot compare to itself.
    setOrder(current => current.map((value, i) => i === index ? id : value === id ? current[index] : value));
  }
  return <div className="settings-layout">
    <div className="settings-main">
      <section className="settings-section"><div className="settings-heading"><h2>Research scope</h2><p>The dataset defines the available industries and business types.</p></div><div className="settings-fields"><label>Industry<select value="healthcare" disabled><option value="healthcare">{workspace.industry}</option></select></label><label>Business type<select value="pediatric-therapy" disabled><option value="pediatric-therapy">{workspace.businessType}</option></select></label></div><p className="field-help">Pediatric therapy is available in this beta. Additional business types require a sourced dataset and screening rules.</p></section>
      <section className="settings-section"><div className="settings-heading"><h2>Comparison markets</h2><p>Choose the display order for the two available markets.</p></div><div className="market-config">{order.map((id, i) => <label key={i}>{i === 0 ? 'Primary market' : 'Comparison market'}<select value={id} onChange={e => choose(i, e.target.value as MarketId)}>{markets.map(m => <option key={m.id} value={m.id}>{m.name}, TX</option>)}</select><small>CBSA {markets.find(m => m.id === id)!.cbsa}</small></label>)}<button className="button secondary" onClick={() => setOrder(current => [...current].reverse())}><ArrowDownUp size={15} />Swap markets</button></div><div className="settings-save"><span>{changed ? 'Unsaved changes' : 'Configuration is up to date'}</span><button className="button primary" disabled={!changed} onClick={() => onApply(order)}><Check size={15} />Save configuration</button></div></section>
      <section className="settings-section"><div className="settings-heading"><h2>Available datasets</h2><p>Provider counts describe the baseline research sample.</p></div><table className="dataset-table"><thead><tr><th>Market</th><th>Boundary</th><th>Status</th></tr></thead><tbody>{markets.map(m => <tr key={m.id}><td><strong>{m.name}</strong><small>{m.metroName}</small></td><td>CBSA {m.cbsa}</td><td><span className="status neutral">Source-checked draft</span></td></tr>)}</tbody></table><button className="text-button settings-add" onClick={() => onPlanned('Add a market — Planned')}><Plus size={15} />Additional markets <span className="planned-label">Planned</span></button></section>
    </div>
    <aside className="settings-aside"><h2>Workspace capabilities</h2><dl><div><dt>Stored-evidence screening</dt><dd className="available-label">Available</dd></div><div><dt>Comparison briefs & exports</dt><dd className="available-label">Available</dd></div><div><dt>Live provider discovery</dt><dd>Not configured</dd></div><div><dt>Persistent workspaces</dt><dd>Planned</dd></div></dl><p>Notes, selections, and configurations last for this browser session. Export your workspace before refreshing.</p><h3>Planned capabilities</h3><button onClick={() => onPlanned('Business types — Planned')}><Layers3 size={16} /><span>Industries & business types</span><ArrowRight size={14} /></button><button onClick={() => onPlanned('Scheduled monitoring — Planned')}><Clock3 size={16} /><span>Scheduled monitoring</span><ArrowRight size={14} /></button></aside>
  </div>;
}
