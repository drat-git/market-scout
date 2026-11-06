import { Printer, Download, ArrowLeft } from 'lucide-react';
import type { Brief } from '../../shared/brief';
import { briefMarkdown } from '../../shared/narrative';
import { Source, date, download } from './Shared';
import { BriefDisclaimer } from './BriefDisclaimer';
export function ReadBrief({ brief: b, notes, setNotes, onCompare }: { brief:Brief; notes:string; setNotes:(s:string)=>void; onCompare:()=>void }) {
  const used=b.sources.filter(e=>b.sections.some(s=>s.evidenceIds.includes(e.id)));
  return <>
    <div className="intro-row"><div><h1 id="page-title" tabIndex={-1}>Research brief</h1><p>A prepared research memo with supported findings, evidence gaps, and next steps.</p></div><button className="button secondary" onClick={()=>window.print()}><Printer size={17}/>Print / Save PDF</button></div>
    <BriefDisclaimer/>
    <article className="brief-document">
      <header className="brief-heading"><div className="document-meta">Market Scout · Prepared example · Opened {date(b.createdAt)}</div><h2>{b.title}</h2><p>Speech, occupational, and physical therapy · Independent illustrative research</p><div className="brief-scope">{b.comparison.uniqueCompanies} unique companies · {b.comparison.relationshipIds.length} company–market entries · Fixed reference case</div><p className="brief-print-disclaimer">Prepared demo brief. Findings do not change with provider selections. A future version would use only evidence from included providers. No live AI is used.</p></header>
      <div className="brief-content">{b.sections.map((s, index)=><section key={s.title} className={`brief-section ${s.kind}`} aria-labelledby={`brief-section-${index}`}>
        <h3 id={`brief-section-${index}`}>{s.title}</h3>
        {s.text.split('\n\n').map((paragraph, i)=><p key={i}>{i===0 && (s.title==='The research question'||s.title==='Question & scope') && paragraph.includes('?') ? <><strong>{paragraph.slice(0,paragraph.indexOf('?')+1)}</strong>{paragraph.slice(paragraph.indexOf('?')+1)}</> : paragraph}</p>)}
        {s.table && <div className="brief-table-scroll" role="region" aria-label={s.title} tabIndex={0}><table className="brief-data-table"><caption className="sr-only">{s.title}</caption><thead><tr>{s.table.columns.map(column=><th key={column} scope="col">{column}</th>)}</tr></thead><tbody>{s.table.rows.map((row,i)=><tr key={i}>{row.map((cell,j)=>j===0?<th scope="row" key={j}>{cell}</th>:<td key={j}>{cell}</td>)}</tr>)}</tbody></table></div>}
        {!!s.evidenceIds.length && <details className="inline-citations"><summary>Supporting sources ({s.evidenceIds.length})</summary><ul>{s.evidenceIds.map(id=>{const e=b.sources.find(e=>e.id===id)!;return <li key={id}><a href={`#source-${id}`}>{e.title}</a></li>;})}</ul></details>}
      </section>)}
      <section className="brief-section"><h3>Research sources</h3><p>These passages were saved during the original research. Independent analyst review is pending. Open the original pages to check for subsequent changes.</p>{used.map(e=><Source key={e.id} evidence={e}/>)}</section></div>
    </article>
    <div className="page-actions"><button className="button secondary" onClick={onCompare}><ArrowLeft size={16}/>Compare markets</button><button className="button secondary" onClick={()=>download('market-scout-brief.md',briefMarkdown(b),'text/markdown;charset=utf-8')}><Download size={16}/>Download Markdown</button></div>
    <details className="notes-panel"><summary>Your notes</summary><p>Personal observations, separate from this saved brief and its sources. Download them before refreshing.</p><label className="sr-only" htmlFor="analyst-notes">Your notes</label><textarea id="analyst-notes" maxLength={8000} rows={5} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="What would you investigate next?"/><button className="button secondary" disabled={!notes.trim()} onClick={()=>download('market-scout-my-notes.txt',notes)}>Download notes</button></details>
  </>;
}
