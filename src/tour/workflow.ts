export const TOUR_PROVIDER = 'new-05d58e791ee0309a@austin';
export type TourSurface = 'review' | 'provider' | 'compare' | 'generator' | 'library' | 'document';
export type TourEvent = 'discovered' | 'inspected' | 'decided' | 'therapies' | 'peers' | 'generator' | 'generated' | 'opened';
type TourStep = { id: string; chapter: number; title: string; text: string; action?: string; target: string; surface: TourSurface; event?: TourEvent; skill?: string; skillText?: string };
export const tourChapters = ['Discover', 'Review', 'Compare', 'Brief'];
export const tourSteps: TourStep[] = [
  {
    id:'case',chapter:1,title:'Start with a business question',
    text:'Compare pediatric therapy providers in Austin and San Antonio for an expansion study.',
    target:'case',surface:'review',
  },
  {
    id:'discover',chapter:1,title:'Expand the research',
    text:'Discovery adds candidates and source passages to the review queue.',
    action:'Find more providers.',target:'discover',surface:'review',event:'discovered',
    skill:'research-market',skillText:'Finds relevant businesses and saves sources for review.',
  },
  {
    id:'candidate',chapter:2,title:'Look behind a provider’s status',
    text:'From the Heart has an unresolved screening check.',
    action:'Open From the Heart Therapy Services.',target:TOUR_PROVIDER,surface:'review',event:'inspected',
  },
  {
    id:'decision',chapter:2,title:'Make an evidence-based decision',
    text:'Pediatric care is supported; the treatment address and clinic services need confirmation.',
    target:'checks',surface:'provider',event:'decided',
    skill:'screen-providers',skillText:'Checks service and location evidence against the case’s criteria.',
  },
  {
    id:'therapies',chapter:3,title:'Compare the right kind of clinic',
    text:'Find clinics offering speech, occupational, and physical therapy at one location.',
    action:'Select Speech, Occupational, and Physical.',target:'therapies',surface:'compare',event:'therapies',
    skill:'compare-markets',skillText:'Calculates market differences from included providers and documented evidence.',
  },
  {
    id:'peers',chapter:3,title:'Turn counts into a shortlist',
    text:'The matching clinics form a shortlist for follow-up research.',
    action:'Inspect matching providers and clinics.',target:'peers',surface:'compare',event:'peers',
  },
  {
    id:'generate',chapter:4,title:'Turn the research into a memo',
    text:'Build a cited memo from the research.',
    action:'Generate brief.',target:'generate',surface:'compare',event:'generator',
    skill:'write-market-brief',skillText:'Writes a cited memo from comparison results and saved evidence.',
  },
  {
    id:'question',chapter:4,title:'Ask a question the evidence can answer',
    text:'Competitor benchmarks identifies peers offering all three therapies.',
    action:'Generate Competitor benchmarks.',target:'questions',surface:'generator',event:'generated',
  },
  {
    id:'open',chapter:4,title:'Open your research brief',
    text:'The completed memo appears in your brief library.',
    action:'Open brief.',target:'tour-brief',surface:'library',event:'opened',
  },
  {
    id:'findings',chapter:4,title:'A recommendation with a next step',
    text:'The brief recommends an initial peer group and checks for ages served, access, and operating model.',
    target:'brief-answer',surface:'document',
  },
  {
    id:'finish',chapter:4,title:'Trace the evidence, then share',
    text:'Each finding links to its sources. Export the memo or use the skills for another research case.',
    target:'brief-analysis',surface:'document',
  },
];
export type TourState = { index: number | null; completed: TourEvent[] };
export const inactiveTour: TourState = { index:null, completed:[] };
export type TourAction = {type:'start'|'exit'|'next'|'back'} | {type:'event';event:TourEvent};
export function tourReducer(state:TourState,action:TourAction):TourState {
  if(action.type==='start') return {index:0,completed:[]};
  if(action.type==='exit') return inactiveTour;
  if(state.index===null) return state;
  const step=tourSteps[state.index];
  if(action.type==='back') return {...state,index:Math.max(0,state.index-1)};
  if(action.type==='next') {
    if(step.event&&!state.completed.includes(step.event)) return state;
    return {...state,index:Math.min(tourSteps.length-1,state.index+1)};
  }
  if(action.type==='event'&&step.event===action.event) return {index:action.event==='therapies'||action.event==='peers'?state.index:Math.min(tourSteps.length-1,state.index+1),completed:[...new Set([...state.completed,action.event])]};
  return state;
}

export type TourFacts = { loaded:boolean; inspected:boolean; decided:boolean; therapies:boolean; peers:boolean; generator:boolean; generated:boolean; opened:boolean };
export function canContinueTour(state:TourState,facts:TourFacts):boolean {
  if(state.index===null) return false;
  const event=tourSteps[state.index].event;
  if(!event||state.completed.includes(event)) return true;
  if(event==='discovered') return facts.loaded;
  return facts[event];
}
