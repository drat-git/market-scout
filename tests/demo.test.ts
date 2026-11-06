import {test} from 'node:test';
import assert from 'node:assert/strict';
import {baseline} from '../shared/baseline';
import {DEFAULT_CRITERIA} from '../shared/schema';
import {compare} from '../shared/compare';
import {screen} from '../shared/screen';
import {initialSelection,demoDataset,loadExampleCandidates,candidateIds,preparedBrief,matchesPreparedSnapshot,createDemoBrief} from '../shared/demo';
import {createAuthoredBrief} from '../shared/narrative';
import narrative from '../data/examples/narrative.json';

test('initial selection prioritizes supported records without deleting uncertain evidence',()=>{
 const c=compare(baseline,initialSelection,DEFAULT_CRITERIA);
 assert.deepEqual(c.markets.map(m=>m.companies),[9,8]);assert.equal(c.uniqueCompanies,16);
 assert.ok(screen(baseline,c.relationshipIds,DEFAULT_CRITERIA).every(a=>a.result==='match'));
 assert.equal(baseline.relationships.length,20);
});
test('loading saved candidates is idempotent and does not change the prepared comparison',()=>{
 const selection=loadExampleCandidates(initialSelection);
 assert.deepEqual(loadExampleCandidates(selection),selection);
 assert.ok(candidateIds.every(id=>selection[id]==='unreviewed'));
 assert.equal(matchesPreparedSnapshot(demoDataset,selection,DEFAULT_CRITERIA),true);
 assert.deepEqual(compare(demoDataset,selection,DEFAULT_CRITERIA).markets,compare(baseline,initialSelection,DEFAULT_CRITERIA).markets);
});
test('including an uncertain candidate changes comparison without repairing evidence',()=>{
 const selection={...loadExampleCandidates(initialSelection),[candidateIds[0]]:'accepted' as const};
 assert.equal(screen(demoDataset,[candidateIds[0]],DEFAULT_CRITERIA)[0].result,'uncertain');
 assert.equal(compare(demoDataset,selection,DEFAULT_CRITERIA).markets[0].companies,10);
 assert.equal(matchesPreparedSnapshot(demoDataset,selection,DEFAULT_CRITERIA),false);
 assert.equal(preparedBrief.comparison.markets[0].companies,10);
});
test('applied criteria share results with comparison and keep inclusion unchanged',()=>{
 const criteria={...DEFAULT_CRITERIA,requiredServices:['physical' as const]};
 const before=structuredClone(initialSelection),c=compare(baseline,initialSelection,criteria);
 const outcomes=screen(baseline,c.relationshipIds,criteria);
 for(const m of c.markets){const ids=baseline.relationships.filter(r=>r.marketId===m.id).map(r=>r.id);assert.equal(m.matches,outcomes.filter(a=>ids.includes(a.relationshipId)&&a.result==='match').length);}
 assert.deepEqual(initialSelection,before);assert.equal(matchesPreparedSnapshot(baseline,initialSelection,criteria),false);
});
test('authored narratives reject drifted calculations and unknown references',()=>{
 const changed=structuredClone(narrative);changed.comparison.uniqueCompanies=99;
 assert.throws(()=>createAuthoredBrief(baseline,{},DEFAULT_CRITERIA,changed));
 const broken=structuredClone(narrative);broken.sections[1].evidenceIds=['invented-source'];
 assert.throws(()=>createAuthoredBrief(baseline,{},DEFAULT_CRITERIA,broken));
});
test('empty selections yield zero counts and a changed snapshot, not fabricated results',()=>{
 const selection=Object.fromEntries(baseline.relationships.map(r=>[r.id,'excluded' as const]));
 const c=compare(baseline,selection,DEFAULT_CRITERIA);assert.ok(c.markets.every(m=>m.companies===0&&m.locations===0));
 assert.equal(matchesPreparedSnapshot(baseline,selection,DEFAULT_CRITERIA),false);
});

test('prepared briefs use the complete reference case and return independent copies',()=>{
 const brief=createDemoBrief('expansion','2026-11-06T12:00:00Z');
 assert.equal(brief.mode,'prepared');assert.equal(brief.preparedExample,true);
 assert.equal(brief.createdAt,'2026-11-06T12:00:00Z');
 assert.equal(brief.comparison.uniqueCompanies,19);
 assert.equal(brief.comparison.relationshipIds.length,20);
 assert.ok(brief.comparison.relationshipIds.includes('tesoros@austin'));
 assert.equal(brief.comparison.markets[0].uncertain,1);
 assert.deepEqual(brief.snapshot.selection,{});
 assert.deepEqual(brief.sections,preparedBrief.sections);
 brief.sections[0].text='local edit';assert.notEqual(preparedBrief.sections[0].text,'local edit');
});
