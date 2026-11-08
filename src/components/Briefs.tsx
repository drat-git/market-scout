import { useState } from 'react';
import { ArrowLeft, ArrowUpRight, FileText, LoaderCircle, Sparkles, Plus } from 'lucide-react';
import { Dialog, date } from './Shared';
import type { Brief } from '../../shared/brief';
import { ReadBrief } from './ReadBrief';
import { BriefDisclaimer } from './BriefDisclaimer';

import { briefQuestions, type QuestionId } from '../../shared/brief-questions';
export type { QuestionId } from '../../shared/brief-questions';
export type BriefEntry = { id: string; questionId: QuestionId; createdAt: string; stage: number | null; brief: Brief };
export const writingStages = ['Reviewing research', 'Drafting findings', 'Organizing sources'];

export function BriefGenerator({ onClose, onGenerate, initialQuestion='expansion', tourExample=false }: { initialQuestion?:QuestionId; tourExample?:boolean; onClose: () => void; onGenerate: (question: QuestionId) => void }) {
  const [question, setQuestion] = useState<QuestionId>(initialQuestion);
  return <Dialog title="Generate a brief" onClose={onClose}>

    <fieldset className="brief-question-list"><legend>Research question</legend>{briefQuestions.map(q => <label className={`brief-question-option ${question === q.id ? 'selected' : ''}`} key={q.id}>
      <input type="radio" name="brief-question" value={q.id} checked={question === q.id} onChange={() => setQuestion(q.id)}/>
      <span><strong className="suggested-question-title">{q.title}<span className="suggested-tag">{tourExample&&q.id==='services'?'Tour example':'Suggested'}</span></strong><span>{q.question}</span></span>
    </label>)}<button className="custom-question" disabled title="Planned: write your own research question"><Plus size={16}/><span>Custom research question</span><small>Planned</small></button></fieldset>
    <div className="actions"><button data-tour="questions" className="button primary" onClick={() => onGenerate(question)}><Sparkles size={16}/>Generate</button><button className="button secondary" onClick={onClose}>Cancel</button></div>
    <BriefDisclaimer/>
  </Dialog>;
}

export function Briefs({ entries, activeId, notes, setNotes, onGenerate, onOpen, onBack, onCompare, tourBriefId, onSourcesOpen }: {
  tourBriefId?:string|null; onSourcesOpen?:()=>void;
  entries: BriefEntry[]; activeId: string | null; notes: string; setNotes: (value: string) => void;
  onGenerate: () => void; onOpen: (id: string) => void; onBack: () => void; onCompare: () => void;
}) {
  const active = entries.find(e => e.id === activeId && e.stage === null);
  const question = briefQuestions.find(q => q.id === active?.questionId);
  const writing = entries.some(e => e.stage !== null);
  if (active && question) return <>
    <button className="text-button brief-back-link" onClick={onBack}><ArrowLeft size={15}/>Back to briefs</button>
    <ReadBrief key={active.id} brief={active.brief} notes={notes} setNotes={setNotes} onCompare={onCompare} onSourcesOpen={onSourcesOpen}/>
  </>;
  return <>
    <div className="intro-row"><div><h1 id="page-title" tabIndex={-1}>Briefs</h1></div>{entries.length > 0 && <button className="button primary" disabled={writing} onClick={onGenerate}><Sparkles size={16}/>Generate brief</button>}</div>
    <BriefDisclaimer/>
    {!entries.length ? <section className="brief-empty"><FileText size={30}/><h2>No briefs yet</h2><button className="button primary" onClick={onGenerate}><Sparkles size={16}/>Generate brief</button></section> : <div className="brief-library">{entries.map(entry => {
      const q = briefQuestions.find(q => q.id === entry.questionId)!;
      const busy = entry.stage !== null;
      return <article data-tour={entry.id===tourBriefId?'tour-brief':undefined} className={`brief-card ${busy ? 'writing' : ''}`} key={entry.id} aria-label={q.title}>
        <div className="brief-card-meta"><span>{busy ? 'Preparing brief' : 'Ready to read'}</span><span>{date(entry.createdAt)}</span></div>
        <h2>{q.title}</h2><p>{q.question}</p><div className="brief-card-scope">Austin &amp; San Antonio · Pediatric therapy</div>
        {busy ? <div className="brief-writing" role="status" aria-live="polite" aria-atomic="true"><LoaderCircle size={17} className="discovery-spinner"/><strong>{writingStages[entry.stage!]}</strong><span>Simulated AI generation</span></div> : <div className="brief-card-footer"><span>Example brief</span><button className="button secondary" onClick={() => onOpen(entry.id)}>Open brief<ArrowUpRight size={15}/></button></div>}
      </article>;
    })}</div>}
  </>;
}
