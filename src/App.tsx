import { useEffect, useLayoutEffect, useMemo, useReducer, useState } from 'react';
import { Compass, RotateCcw, ArrowRight, ArrowUpRight, Check, Minus, Download, X, Plus, ChevronDown, Sparkles, Moon, Sun } from 'lucide-react';
import { baseline } from '../shared/baseline';
import { compare, selectedRelationships } from '../shared/compare';
import { screen, evidenceFor } from '../shared/screen';
import { DEFAULT_CRITERIA, type Selection, type Decision, type MarketId, type Service } from '../shared/schema';
import { demoDataset, loadExampleCandidates, matchesPreparedSnapshot, createDemoBrief, initialSelection, candidateIds } from '../shared/demo';
import { About, type AboutTab } from './components/About';
import { Verification, VerificationActions } from './components/Verification';
import { ReviewProviders, type ProviderFilter, type InclusionView } from './components/ReviewProviders';
import { CompareMarkets } from './components/CompareMarkets';
import { Briefs, BriefGenerator, type BriefEntry, type QuestionId } from './components/Briefs';
import { Dialog, Source, date } from './components/Shared';

import { GuidedTour } from './tour/GuidedTour';
import { canContinueTour, inactiveTour, tourReducer, tourSteps, TOUR_PROVIDER, type TourEvent } from './tour/workflow';

type Page = 'review' | 'compare' | 'brief';
const steps: { id:Page; label:string }[] = [{id:'review',label:'Review providers'},{id:'compare',label:'Compare markets'},{id:'brief',label:'Briefs'}];
export default function App() {
  const [theme,setTheme]=useState<'light'|'dark'>(()=>{
    try { return localStorage.getItem('market-scout-theme')==='dark'?'dark':'light'; }
    catch { return 'light'; }
  });
  useLayoutEffect(()=>{
    document.documentElement.dataset.theme=theme;
    try { localStorage.setItem('market-scout-theme',theme); } catch { /* Theme still works without storage. */ }
  },[theme]);
  const [tour,dispatchTour]=useReducer(tourReducer,inactiveTour);
  const [welcome,setWelcome]=useState<'initial'|'reset'|null>('initial');
  const [tourBriefId,setTourBriefId]=useState<string|null>(null);
  const [analysisServices,setAnalysisServices]=useState<Service[]>(['speech','occupational']);
  const [peersOpen,setPeersOpen]=useState(false);
  const tourStep=tour.index===null?null:tourSteps[tour.index];
  const tourEvent=(event:TourEvent)=>dispatchTour({type:'event',event});
  const [page,setPage]=useState<Page>('review');
  const [selection,setSelection]=useState<Selection>(()=>({...initialSelection}));
  const criteria=DEFAULT_CRITERIA;
  const [loaded,setLoaded]=useState(false);
  const [discoveryStage,setDiscoveryStage]=useState<number|null>(null);
  const [openedCandidates,setOpenedCandidates]=useState<string[]>([]);
  const [notes,setNotes]=useState('');
  const [briefEntries,setBriefEntries]=useState<BriefEntry[]>([]);
  const [activeBriefId,setActiveBriefId]=useState<string|null>(null);
  const [showGenerator,setShowGenerator]=useState(false);
  const writingBrief=briefEntries.find(entry=>entry.stage!==null);
  const [inclusionView,setInclusionView]=useState<InclusionView>('all');
  const [filter,setFilter]=useState<ProviderFilter>({market:'all',service:'all'});
  const [evidenceId,setEvidenceId]=useState<string|null>(null);
  const [modal,setModal]=useState<string|null>(null);
  const [aboutTab,setAboutTab]=useState<AboutTab>('overview');
  const [notice,setNotice]=useState('');
  const [removedFlags,setRemovedFlags]=useState<string[]>([]);
  const [selectionToast,setSelectionToast]=useState<{message:string}|null>(null);
  useEffect(()=>{
    if (!selectionToast) return;
    const timer=window.setTimeout(()=>setSelectionToast(null),5000);
    return ()=>window.clearTimeout(timer);
  },[selectionToast]);
  const [generation,setGeneration]=useState(0);
  const data=loaded?demoDataset:baseline;
  const assessments=useMemo(()=>screen(data,data.relationships.map(r=>r.id),criteria),[data,criteria]);
  const comparison=useMemo(()=>compare(data,selection,criteria),[data,selection,criteria]);
  const selected=new Set(selectedRelationships(data,selection).map(r=>r.id));
  const snapshotChanged=!matchesPreparedSnapshot(data,selection,criteria);
  const dirty=removedFlags.length>0||briefEntries.length>0||loaded||discoveryStage!==null||snapshotChanged||!!notes.trim()||JSON.stringify(selection)!==JSON.stringify(initialSelection);
  const evidenceRelationship=data.relationships.find(r=>r.id===evidenceId);
  const company=data.companies.find(c=>c.id===evidenceRelationship?.companyId);
  const assessment=assessments.find(a=>a.relationshipId===evidenceId);
  useEffect(()=>{window.scrollTo({top:0,behavior:'instant'});document.getElementById('page-title')?.focus({preventScroll:true});},[page,activeBriefId]);
  useEffect(() => {
    if (discoveryStage === null) return;
    const timer = window.setTimeout(() => {
      if (discoveryStage < 2) setDiscoveryStage(discoveryStage + 1);
      else {
        setDiscoveryStage(null);
        setLoaded(true);
        setInclusionView('all');
        setSelection(loadExampleCandidates);
        setFilter({market:'all',service:'all'});
        setNotice('Three Austin demo candidates added.');
      }
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [discoveryStage]);
  useEffect(() => {
    if (!writingBrief) return;
    const timer = window.setTimeout(() => {
      setBriefEntries(entries=>entries.map(entry=>entry.id===writingBrief.id ? {...entry, stage:entry.stage===2?null:entry.stage!+1} : entry));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [writingBrief]);
  function generateBrief(questionId:QuestionId) {
    if (writingBrief) return;
    if(tourStep?.id==='question'&&tourBriefId){setShowGenerator(false);navigate('brief');tourEvent('generated');return;}
    const createdAt=new Date().toISOString();
    const brief=createDemoBrief(questionId,createdAt);
    const id=crypto.randomUUID();
    setBriefEntries(entries=>[{id,questionId,createdAt,stage:0,brief},...entries]);
    if(tourStep?.id==='question'){setTourBriefId(id);tourEvent('generated');}
    setShowGenerator(false);
    setActiveBriefId(null);
    navigate('brief');
  }
  function openGenerator() {
    if (writingBrief) navigate('brief');
    else {setShowGenerator(true);tourEvent('generator');}
  }
  function inspect(id:string) {
    setEvidenceId(id);
    if(id===TOUR_PROVIDER) tourEvent('inspected');
    if (candidateIds.includes(id)) setOpenedCandidates(ids=>ids.includes(id)?ids:[...ids,id]);
  }
  function navigate(next:Page){setPage(next);setActiveBriefId(null);setNotice('');}
  function openAbout(tab:AboutTab){setAboutTab(tab);setModal('About');}
  function review(market?:MarketId,service?:Service){setFilter({market:market??'all',service:service??'all'});navigate('review');}
  function decide(id:string,value:Decision){
    setSelection(s=>({...s,[id]:value}));
    if(id===TOUR_PROVIDER) tourEvent('decided');
    setNotice('');
    setSelectionToast({message:value==='accepted'?'Provider added to comparison':'Provider moved to "Not included"'});
  }
  function reset(startTour=false){setWelcome(null);setTourBriefId(null);setAnalysisServices(['speech','occupational']);setPeersOpen(false);dispatchTour({type:startTour?'start':'exit'});setRemovedFlags([]);setSelectionToast(null);setPage('review');setInclusionView('all');setSelection({...initialSelection});setLoaded(false);setDiscoveryStage(null);setOpenedCandidates([]);setBriefEntries([]);setActiveBriefId(null);setShowGenerator(false);setNotes('');setFilter({market:'all',service:'all'});setEvidenceId(null);setModal(null);setGeneration(g=>g+1);setNotice('');window.scrollTo(0,0);}
  function restoreTourStep() {
    if(!tourStep) return;
    setModal(null);setEvidenceId(null);setShowGenerator(false);
    const surface=tourStep.surface;
    if(surface==='review'||surface==='provider') {
      setPage('review');setFilter({market:'all',service:'all'});setInclusionView('all');setGeneration(g=>g+1);
      if(surface==='provider') setEvidenceId(TOUR_PROVIDER);
    } else if(surface==='compare'||surface==='generator') {
      setPage('compare');
      if(surface==='generator') setShowGenerator(true);
    } else {setPage('brief');setActiveBriefId(surface==='document'?tourBriefId:null);}
  }
  // Changing a tour instruction restores its surface, never repeats a business action.
  useEffect(()=>{restoreTourStep();},[tour.index]);

  const tourBrief=briefEntries.find(entry=>entry.id===tourBriefId);

  const tourPaused=!!tourStep&&(!!modal || (
    tourStep.surface==='provider' ? page!=='review'||evidenceId!==TOUR_PROVIDER||showGenerator :
    tourStep.surface==='generator' ? !showGenerator||!!evidenceId :
    tourStep.surface==='document' ? page!=='brief'||activeBriefId!==tourBriefId||!!evidenceId||showGenerator :
    tourStep.surface==='library' ? page!=='brief'||activeBriefId!==null||!!evidenceId||showGenerator :
    page!==tourStep.surface||!!evidenceId||showGenerator));
  useEffect(()=>{if(loaded&&!welcome&&!tourPaused)tourEvent('discovered');},[loaded,welcome,tourPaused]);
  const canContinue=canContinueTour(tour,{
    loaded,inspected:openedCandidates.includes(TOUR_PROVIDER),decided:['accepted','excluded'].includes(selection[TOUR_PROVIDER]),
    therapies:analysisServices.length===3&&['speech','occupational','physical'].every(s=>analysisServices.includes(s as Service)),
    peers:peersOpen,
    generator:showGenerator,generated:!!tourBrief,opened:!!tourBriefId&&activeBriefId===tourBriefId,
  });
  function continueTour(){if(tourStep?.event&&canContinue&&!tour.completed.includes(tourStep.event))tourEvent(tourStep.event);else dispatchTour({type:'next'});}
  function requestTour(){setModal(null);setWelcome('reset');}
  return <div className="app-shell">
    <a href="#main" className="skip-link">Skip to content</a>
    <header className="site-header"><div className="header-inner"><a className="brand" href="#" onClick={e=>{e.preventDefault();navigate('review');}}><Compass size={25}/>Market Scout</a><div className="header-actions"><button className="button secondary about-button" onClick={()=>openAbout('overview')}>About</button><button data-tour="skills" className="text-button" onClick={()=>openAbout('downloads')}><Download size={15} aria-hidden="true"/>Get the skills</button><button className="button primary reset-button" onClick={requestTour}><RotateCcw size={14}/>Reset demo</button><button className="theme-toggle" aria-label={theme==='dark'?'Switch to light mode':'Switch to dark mode'} title={theme==='dark'?'Switch to light mode':'Switch to dark mode'} onClick={()=>setTheme(t=>t==='dark'?'light':'dark')}>{theme==='dark'?<Sun size={18} aria-hidden="true"/>:<Moon size={18} aria-hidden="true"/>}</button></div></div></header>
    <div className="case-banner" data-tour="case">
      <div className="case-context">
        <div className="context-group" role="group" aria-label="Research markets">
          <strong className="market-title">Austin &amp; San Antonio</strong>
          <div className="context-actions">
            <button className="future-control" disabled title="Planned: choose the markets to compare">Change markets<ChevronDown size={13}/></button>
            <button className="future-control" disabled title="Planned: add another market"><Plus size={13}/>Add market</button>
            <span className="planned-label">Planned</span>
          </div>
        </div>
        <div className="context-group" role="group" aria-label="Research industry">
          <strong>Pediatric therapy</strong>
          <div className="context-actions">
            <button className="future-control" disabled title="Planned: switch the research industry">Change industry<ChevronDown size={13}/></button>
            <button className="future-control" disabled title="Planned: add another industry"><Plus size={13}/>Add industry</button>
            <span className="planned-label">Planned</span>
          </div>
        </div>
      </div>
      <span className="demo-label">Prepared example · No live AI or search</span>
    </div>
    <nav className="step-nav" aria-label="Research workflow">{steps.map((step,i)=><button key={step.id} className={page===step.id?'current':''} aria-current={page===step.id?'step':undefined} onClick={()=>navigate(step.id)}><span className="step-number">{i+1}</span><span>{step.label}</span>{i<2&&<ArrowRight size={15} className="step-arrow"/>}</button>)}</nav>
    <main id="main"><div className="notice-slot" aria-live="polite">{notice&&<div className="notice"><Check size={16}/><span>{notice}</span><button className="icon-button" onClick={()=>setNotice('')} aria-label="Dismiss notification"><X size={15}/></button></div>}</div>
      {page==='review'&&<ReviewProviders key={`${generation}-${loaded}`} data={data} selection={selection} criteria={criteria} assessments={assessments} removedFlags={removedFlags} filter={filter} setFilter={setFilter} view={inclusionView} setView={setInclusionView} onInspect={inspect} onDecision={decide} loaded={loaded} discoveryStage={discoveryStage} openedCandidates={openedCandidates} onLoad={()=>{if(!loaded&&discoveryStage===null){setDiscoveryStage(0);setNotice('');}}} onNext={()=>navigate('compare')}/>}
      {page==='compare'&&<CompareMarkets comparison={comparison} data={data} selection={selection} onReview={review} onBrief={openGenerator} onPlanned={setModal} onInspect={inspect} selectedServices={analysisServices} onServicesChange={services=>{setAnalysisServices(services);if(services.length===3&&['speech','occupational','physical'].every(s=>services.includes(s as Service)))tourEvent('therapies');}} peersOpen={peersOpen} onPeersChange={open=>{setPeersOpen(open);if(open)tourEvent('peers');}}/>}
      {page==='brief'&&<Briefs entries={briefEntries} activeId={activeBriefId} notes={notes} setNotes={setNotes} onGenerate={openGenerator} tourBriefId={tourBriefId} onOpen={id=>{setActiveBriefId(id);if(id===tourBriefId)tourEvent('opened');}} onBack={()=>setActiveBriefId(null)} onCompare={()=>navigate('compare')}/>}
    </main>
    <div className="selection-toast-region" role="status" aria-live="polite" aria-atomic="true">{selectionToast&&<div className="selection-toast"><Check size={18} aria-hidden="true"/><span>{selectionToast.message}</span><button className="icon-button" onClick={()=>setSelectionToast(null)} aria-label="Dismiss selection notification"><X size={16}/></button></div>}</div>
    <footer className="site-footer"><span>Market Scout · Independent proof of concept</span><span>Changes reset when you refresh.</span><button className="text-button" onClick={()=>setModal('Sources & methodology')}>Sources & methodology</button></footer>
    {evidenceRelationship&&company&&assessment&&<Dialog drawer title={company.name} onClose={()=>setEvidenceId(null)}>{candidateIds.includes(evidenceRelationship.id)&&<div className="ai-discovery-label"><span><Sparkles size={15}/>Found by AI</span><p>Saved AI research run</p></div>}<p className="drawer-market">{evidenceRelationship.marketId==='austin'?'Austin':'San Antonio'} · <a href={company.website} target="_blank" rel="noreferrer">Provider website<ArrowUpRight size={13}/></a></p><VerificationActions canRemoveFlag={assessment.result==='uncertain'} flagRemoved={removedFlags.includes(evidenceRelationship.id)} onToggleFlag={()=>setRemovedFlags(ids=>ids.includes(evidenceRelationship.id)?ids.filter(id=>id!==evidenceRelationship.id):[...ids,evidenceRelationship.id])}/><Verification data={data} relationshipId={evidenceRelationship.id} criteria={criteria}/><section className="drawer-section"><h3>Documented clinics</h3>{data.locations.filter(l=>l.companyId===company.id&&l.marketId===evidenceRelationship.marketId).map(l=><div className="location" key={l.id}><strong>{l.name}</strong><p>{l.address??'Address unconfirmed.'}</p>{l.note&&<small>{l.note}</small>}</div>)}{!data.locations.some(l=>l.companyId===company.id&&l.marketId===evidenceRelationship.marketId)&&<p>No confirmed clinic.</p>}</section><section className="drawer-section" ><h3>Supporting evidence</h3>{evidenceFor(data,evidenceRelationship.id).map((e,i)=><Source key={e.id} evidence={e} tourAnchor={i===0?'provider-source':undefined}/>)}</section><details><summary>Research details</summary><p>Dataset {data.version}. Collected {date(data.collectedAt)}. {company.origin==='new'?'Prepared candidate from a previous research run.':'Provider from the original research sample.'} Independent review is pending.</p></details><div className="drawer-actions" data-tour="decision"><span>{selected.has(evidenceRelationship.id)?'Included in your comparison':selection[evidenceRelationship.id]==='unreviewed'?'Under review · not included in your comparison':'Not included in your comparison'}</span><button className="button primary" onClick={()=>decide(evidenceRelationship.id,selected.has(evidenceRelationship.id)?'excluded':'accepted')}>{selected.has(evidenceRelationship.id)?<Minus size={16}/>:<Check size={16}/>} {selected.has(evidenceRelationship.id)?'Remove from comparison':'Add to comparison'}</button></div></Dialog>}
    {showGenerator&&<BriefGenerator initialQuestion={tour.index!==null?'services':undefined} tourExample={tour.index!==null} onClose={()=>setShowGenerator(false)} onGenerate={generateBrief}/>}
    {modal&&<Dialog title={modal} className={modal==='About'?'about-dialog':undefined} onClose={()=>setModal(null)}>
      {modal==='About'?<About initialTab={aboutTab} onStartTour={requestTour}/>
      :modal==='Sources & methodology'?<><p>Provider websites · Census metro boundaries · Purposive sample</p><ul>{baseline.limitations.map(l=><li key={l}>{l}</li>)}</ul><p><a href="/methodology.md" target="_blank" rel="noreferrer">Full research methodology</a> · <a href="/attribution.md" target="_blank" rel="noreferrer">Upstream attribution</a> · <a href="/THIRD_PARTY_NOTICES.md" target="_blank" rel="noreferrer">License notices</a></p></>
      :modal==='Add a market'?<><p>Planned: research another metro using the same skills and publish a reviewed example. This demo contains Austin and San Antonio only.</p><p>No new market is created by this control.</p></>
      :<><p>Planned: revisit saved provider sources and highlight meaningful changes for an analyst to review.</p><p>No schedule, background monitoring, or AI request is active.</p></>}
    </Dialog>}
    {welcome&&<Dialog title="Take a guided tour of Market Scout?" onClose={()=>setWelcome(null)}>
      <p className="tour-welcome-intro">Follow an investment analyst’s workflow: discover providers, check their evidence, compare the markets, and create a sourced research brief. See how the four reusable skills support each stage.</p>
      <p className="tour-welcome-meta">About 2–3 minutes · Prepared case</p>
      {welcome==='reset'&&<p className="tour-reset-note">{dirty?'Either option will clear your provider selections, discoveries, briefs, and notes.':'Either option starts a fresh demo.'} Your color theme stays the same.</p>}
      <div className="actions"><button className="button primary" onClick={()=>reset(true)}>Start guided demo<ArrowRight size={16}/></button><button className="button secondary" onClick={()=>reset(false)}>Explore on my own</button>{welcome==='reset'&&<button className="text-button" onClick={()=>setWelcome(null)}>Cancel</button>}</div>
    </Dialog>}
    {!welcome&&<GuidedTour state={tour} canContinue={canContinue} briefBusy={!!tourBrief&&tourBrief.stage!==null} paused={tourPaused} routeKey={`${page}-${evidenceId}-${showGenerator}-${modal}-${activeBriefId}-${loaded}`} onBack={()=>dispatchTour({type:'back'})} onNext={continueTour} onExit={()=>dispatchTour({type:'exit'})} onReturn={restoreTourStep} onLeave={()=>{setSelection(s=>({...s,[TOUR_PROVIDER]:'unreviewed'}));tourEvent('decided');}} onAbout={tab=>{dispatchTour({type:'exit'});openAbout(tab);}}/>}
  </div>;
}
