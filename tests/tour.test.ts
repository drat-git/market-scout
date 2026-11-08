import {test} from 'node:test';
import assert from 'node:assert/strict';
import {canContinueTour,inactiveTour,tourReducer,tourSteps,TOUR_PROVIDER,type TourFacts,type TourState} from '../src/tour/workflow';
import {demoDataset,candidateIds,createDemoBrief} from '../shared/demo';
const at=(id:string):TourState=>({index:tourSteps.findIndex(s=>s.id===id),completed:[]});
const facts:TourFacts={loaded:false,inspected:false,decided:false,therapies:false,peers:false,generator:false,generated:false,opened:false};
test('tour start, exit and replay have no retained completion state',()=>{
 let state=tourReducer(inactiveTour,{type:'start'});
 assert.equal(state.index,0);
 state=tourReducer({...at('discover'),completed:['inspected']},{type:'exit'});
 assert.deepEqual(state,inactiveTour);
 assert.deepEqual(tourReducer(state,{type:'start'}),{index:0,completed:[]});
 assert.equal(tourReducer(state,{type:'event',event:'opened'}),state);
});
test('unfinished actions cannot be skipped or completed by unrelated events',()=>{
 for(const step of tourSteps.filter(s=>s.event)){
  const state=at(step.id);
  assert.deepEqual(tourReducer(state,{type:'next'}),state);
  const wrong=step.event==='discovered'?'opened':'discovered';
  assert.deepEqual(tourReducer(state,{type:'event',event:wrong}),state);
 }
});
test('late and repeated completion events cannot skip subsequent instructions',()=>{
 const state=tourReducer(at('discover'),{type:'event',event:'discovered'});
 assert.equal(tourSteps[state.index!].id,'candidate');
 assert.equal(tourReducer(state,{type:'event',event:'discovered'}),state);
 assert.equal(tourReducer(at('question'),{type:'event',event:'opened'}).index,at('question').index);
});
test('Back preserves completion so actions need not be repeated',()=>{
 const done=tourReducer(at('discover'),{type:'event',event:'discovered'});
 const back=tourReducer(done,{type:'back'});
 assert.equal(tourSteps[back.index!].id,'discover');
 assert.equal(canContinueTour(back,facts),true);
 assert.equal(tourSteps[tourReducer(back,{type:'next'}).index!].id,'candidate');
});
test('already completed app work can be recognized on re-entry',()=>{
 assert.equal(canContinueTour(at('discover'),facts),false);
 assert.equal(canContinueTour(at('discover'),{...facts,loaded:true}),true);
 assert.equal(canContinueTour(at('question'),{...facts,generated:true}),true);
 assert.equal(canContinueTour(at('candidate'),{...facts,inspected:true}),true);
});
test('comparison and matching clinics stay visible for inspection until Continue',()=>{
 for(const id of ['therapies','peers'] as const){
  const state=at(id),done=tourReducer(state,{type:'event',event:id});
  assert.equal(done.index,state.index);
  assert.equal(canContinueTour(done,facts),true);
  assert.equal(tourReducer(done,{type:'next'}).index,state.index!+1);
 }
});
test('full guided route reaches completion and cannot advance beyond it',()=>{
 let state=tourReducer(inactiveTour,{type:'start'});
 for(let count=0;count<40&&tourSteps[state.index!].id!=='finish';count++){
  const step=tourSteps[state.index!];
  state=tourReducer(state,step.event&&!state.completed.includes(step.event)?{type:'event',event:step.event}:{type:'next'});
 }
 assert.equal(tourSteps[state.index!].id,'finish');
 assert.equal(tourReducer(state,{type:'next'}).index,state.index);
});
test('tour fixtures resolve to an actual candidate and a sourced benchmark brief',()=>{
 assert.ok(candidateIds.includes(TOUR_PROVIDER));
 const record=demoDataset.relationships.find(r=>r.id===TOUR_PROVIDER)!;
 assert.equal(demoDataset.companies.find(c=>c.id===record.companyId)!.name,'From the Heart Therapy Services');
 const brief=createDemoBrief('services','2026-11-06T00:00:00Z');
 const table=brief.sections.find(s=>s.table&&s.evidenceIds.length);
 assert.ok(table?.table?.rows.length);
 assert.ok(table!.evidenceIds.every(id=>brief.sources.some(e=>e.id===id)));
});
