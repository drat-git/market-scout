import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, ArrowRight, X } from 'lucide-react';
import { tourChapters, tourSteps, type TourState } from './workflow';
import type { AboutTab } from '../components/About';
import './tour.css';

type Props = { state:TourState; canContinue:boolean; briefBusy:boolean; paused:boolean; routeKey:string; onBack:()=>void; onNext:()=>void; onExit:()=>void; onReturn:()=>void; onLeave:()=>void; onAbout:(tab:AboutTab)=>void };
type Position = {x:number;y:number;width:number;height:number;left:number;top:number;panelWidth:number};
export function GuidedTour({state,canContinue,briefBusy,paused,routeKey,onBack,onNext,onExit,onReturn,onLeave,onAbout}:Props) {
  const step=state.index===null?null:tourSteps[state.index];
  const panel=useRef<HTMLElement>(null);
  const [host,setHost]=useState<HTMLElement|null>(null);
  const [position,setPosition]=useState<Position|null>(null);
  const [missing,setMissing]=useState(false);
  const focusKey=useRef('');
  useEffect(()=>{
    if(!step) return;
    let frame=0;
    let scrolled:Element|null=null;
    let disposed=false;
    const measure=()=>{
      if(disposed) return;
      const dialog=document.querySelector<HTMLDialogElement>('dialog[open]');
      const nextHost=dialog?.querySelector<HTMLElement>('[data-tour-host]')??document.body;
      setHost(nextHost);
      const target=(dialog??document).querySelector<HTMLElement>(`[data-tour="${step.target}"]`);
      setMissing(!target);
      let width=Math.min(360,window.innerWidth-32);
      const height=panel.current?.offsetHeight??300;
      if(!target||paused) {setPosition(null);return;}
      if(scrolled!==target) {target.scrollIntoView({block:window.innerWidth<760||target.offsetHeight>window.innerHeight*.65?'start':'center',inline:'nearest',behavior:'instant'});scrolled=target;}
      const r=target.getBoundingClientRect();
      const x=Math.max(8,r.left-6), y=Math.max(8,r.top-6);
      const w=Math.max(0,Math.min(window.innerWidth-8,r.right+6)-x);
      const h=Math.max(0,Math.min(window.innerHeight-8,r.bottom+6)-y);
      const obstacle=dialog?.getBoundingClientRect()??r;
      if(window.innerWidth>=760 && obstacle.left<width+32 && window.innerWidth-obstacle.right<width+32) {
        const sideSpace=Math.max(obstacle.left,window.innerWidth-obstacle.right)-32;
        if(sideSpace>=260) width=Math.min(width,sideSpace);
      }
      let left=window.innerWidth-width-16,top=window.innerHeight-height-16;
      if(window.innerWidth>=760) {
        if(obstacle.left>=width+32){left=obstacle.left-width-20;top=Math.max(16,Math.min(r.top,window.innerHeight-height-16));}
        else if(window.innerWidth-obstacle.right>=width+32){left=obstacle.right+20;top=Math.max(16,Math.min(r.top,window.innerHeight-height-16));}
        else if(r.bottom+height+28<window.innerHeight){top=r.bottom+20;}
        else if(r.top>height+28){top=r.top-height-20;}
        else {top=16;}
      }
      const next={x,y,width:w,height:h,left:Math.max(16,left),top:Math.max(16,top),panelWidth:width};
      setPosition(old=>old&&Object.keys(next).every(k=>old[k as keyof Position]===next[k as keyof Position])?old:next);
      const key=`${step.id}-${dialog?.getAttribute('aria-labelledby')??'page'}`;
      if(focusKey.current!==key&&panel.current){panel.current.focus({preventScroll:true});focusKey.current=key;}
    };
    const schedule=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(measure);};
    const observer=new MutationObserver(schedule);
    observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['open']});
    const resize=new ResizeObserver(schedule);
    if(panel.current) resize.observe(panel.current);
    window.addEventListener('scroll',schedule,true);
    window.addEventListener('resize',schedule);
    schedule();
    return ()=>{disposed=true;cancelAnimationFrame(frame);observer.disconnect();resize.disconnect();window.removeEventListener('scroll',schedule,true);window.removeEventListener('resize',schedule);};
  },[step,paused,routeKey,host]);
  useEffect(()=>{
    if(!step) return;
    const escape=(event:KeyboardEvent)=>{
      if(event.key==='Escape'&&!document.querySelector('dialog[open]')){event.preventDefault();onExit();}
    };
    document.addEventListener('keydown',escape);
    return ()=>document.removeEventListener('keydown',escape);
  },[step,onExit]);
  if(!step||!host) return null;
  const recover=paused||missing;
  const complete=step.event&&canContinue;
  return createPortal(<div className="tour-layer" data-surface={step.surface}>
    {position&&!recover&&<div className="tour-spotlight" aria-hidden="true" style={{left:position.x,top:position.y,width:position.width,height:position.height}}/>}
    <section ref={panel} className="tour-callout" tabIndex={-1} aria-labelledby="tour-instruction-title" aria-describedby="tour-instruction-text" style={position&&!recover?{left:position.left,top:position.top,width:position.panelWidth}:undefined}>
      <div className="tour-controls"><span role="status" aria-live="polite">{state.index!+1} of {tourSteps.length} · {tourChapters[step.chapter-1]}</span><button className="text-button" onClick={onExit}>Exit tour<X size={14}/></button></div>
      <h2 id="tour-instruction-title">{recover?'Tour paused':step.id==='open'&&briefBusy?'Preparing your brief':step.title}</h2>
      <p id="tour-instruction-text">{recover?'Return to your current step, or exit to explore.':step.id==='open'&&briefBusy?'The demo is preparing your selected memo. Once it is ready, open it to review the recommendation and sources.':step.text}{!recover&&step.action&&<strong className="tour-action-prompt">{step.action}</strong>}</p>
      {!recover&&step.skill&&<div className="tour-skill"><span>Skill in the full workflow</span><code>{step.skill}</code><p>{step.skillText}</p></div>}
      <div className="tour-actions">
        {recover?<button className="button primary" onClick={onReturn}>Return to this step</button>:<>
          {state.index!>0&&<button className="button secondary" onClick={onBack} aria-label="Previous tour instruction"><ArrowLeft size={15}/>Back</button>}
          {step.id==='finish'?<><button className="button primary" onClick={onExit}>Finish tour</button><button className="text-button" onClick={()=>onAbout('downloads')}>Explore the skills</button></>:<>
            {step.id==='decision'&&!complete&&<button className="button primary" onClick={onLeave}>Keep under review</button>}
            {canContinue&&<button className="button primary" onClick={onNext}>Continue<ArrowRight size={15}/></button>}
          </>}
        </>}
      </div>
    </section>
  </div>,host);
}
