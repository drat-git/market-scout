import { useEffect, useId, useRef, type ReactNode } from 'react';
import { X, ArrowUpRight, Check, CircleHelp, Minus } from 'lucide-react';
import type { Assessment, Evidence } from '../../shared/schema';

export const resultLabels = { match: 'Meets rules', uncertain: 'Needs verification', exclude: 'Does not meet rules' };
export const date = (value: string) => new Date(value).toLocaleDateString('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric', year: 'numeric' });
export function Result({ result }: { result: Assessment['result'] }) {
  const Icon = result === 'match' ? Check : result === 'uncertain' ? CircleHelp : Minus;
  return <span className={`result ${result}`}><Icon size={14} />{resultLabels[result]}</span>;
}
export function Dialog({ title, children, onClose, drawer = false, className = '' }: { title: string; children: ReactNode; onClose: () => void; drawer?: boolean; className?: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const dialog = ref.current!;
    dialog.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { dialog.close(); document.body.style.overflow = overflow; previous?.focus(); };
  }, []);
  return <dialog ref={ref} aria-labelledby={id} className={`${drawer ? 'dialog drawer' : 'dialog'} ${className}`} onCancel={e => { e.preventDefault(); onClose(); }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
    <div className="dialog-surface"><header className="dialog-header"><h2 id={id}>{title}</h2><button className="icon-button" onClick={onClose} aria-label="Close"><X size={20} /></button></header><div className="dialog-body">{children}</div></div><div data-tour-host/>
  </dialog>;
}
export function Source({ evidence: e, tourAnchor }: { evidence: Evidence; tourAnchor?:string }) {
  return <article data-tour={tourAnchor} className="source-item" id={`source-${e.id}`}>
    <div className="source-meta"><span>{e.scope === 'company' ? 'Company-wide claim' : e.scope === 'location' ? 'Clinic-specific claim' : 'Service coverage'}</span><span>{date(e.collectedAt)}</span></div>
    <h4>{e.claim}</h4><blockquote>{e.passage}</blockquote>
    <a href={e.url} target="_blank" rel="noreferrer">{e.title}<ArrowUpRight size={13} /></a>
    {e.uncertainty && <p className="source-uncertainty">{e.uncertainty}</p>}
    <span className="print-url">{e.url}</span>
  </article>;
}
export function download(name: string, content: string, type = 'text/plain;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a'); a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
