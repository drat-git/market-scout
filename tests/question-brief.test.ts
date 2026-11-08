import { test } from 'node:test';
import assert from 'node:assert/strict';
import { baseline } from '../shared/baseline';
import { DEFAULT_CRITERIA } from '../shared/schema';
import { compare } from '../shared/compare';
import { createDemoBrief, initialSelection, preparedBriefs } from '../shared/demo';
import { briefQuestions } from '../shared/brief-questions';
import { briefMarkdown } from '../shared/narrative';
const at = '2026-11-06T12:00:00Z';

test('all three authored briefs use the full reference case with valid citations and tables', () => {
 for (const q of briefQuestions) {
  const b=createDemoBrief(q.id,at);
  assert.equal(b.mode,'prepared');assert.equal(b.preparedExample,true);
  assert.equal(b.title,`${q.title}: Austin & San Antonio`);
  assert.equal(b.sections[0].text,q.question);
  assert.deepEqual(b.comparison,compare(baseline,{},DEFAULT_CRITERIA));
  for (const section of b.sections) {
   if(section.kind==='finding')assert.ok(section.evidenceIds.length);
   for(const id of section.evidenceIds)assert.ok(b.sources.some(e=>e.id===id));
   if(section.table)assert.ok(section.table.rows.every(row=>row.length===section.table!.columns.length));
  }
 }
 assert.equal(new Set(Object.values(preparedBriefs).map(b=>JSON.stringify(b.sections))).size,3);
});
test('service-model shortlist contains ten branch-qualified peers and survives Markdown export',()=>{
 const b=createDemoBrief('services',at);
 const table=b.sections.find(s=>s.title==='The closest service-model comparators')!.table!;
 assert.equal(table.rows.length,10);
 assert.equal(table.rows.filter(row=>row[0]==='Austin').length,5);
 assert.equal(table.rows.filter(row=>row[0]==='San Antonio').length,5);
 assert.ok(!table.rows.some(row=>row[1]==='University Health'));
 assert.match(briefMarkdown(b),/\| Austin \| Achieve Pediatric Therapy \| Cedar Park \|/);
 assert.match(briefMarkdown(b),/Independent of demo selections/);
});
test('research priorities expose all three unresolved records and the separate address gaps',()=>{
 const b=createDemoBrief('evidence',at);
 assert.match(b.sections.find(s=>s.title.startsWith('Answer:'))!.text,/3 researched records/);
 const s=b.sections.find(s=>s.title.startsWith('Priority 1:'))!;
 assert.equal(s.table!.rows.length,3);
 assert.match(s.text,/University Health/);
 assert.ok(s.table!.rows.some(row=>row[0]==='TeamCare Rehab'));
 assert.ok(s.table!.rows.every(row=>row[2].length>30));
 assert.match(b.sections.find(s=>s.title.startsWith('Priority 2:'))!.text,/3 documented clinics/);
});
test('visitor selection changes do not alter prepared brief findings',()=>{
 const before=briefQuestions.map(q=>createDemoBrief(q.id,at));
 const removed=Object.fromEntries(baseline.relationships.map(r=>[r.id,'excluded' as const]));
 assert.equal(compare(baseline,removed,DEFAULT_CRITERIA).uniqueCompanies,0);
 assert.notDeepEqual(compare(baseline,initialSelection,DEFAULT_CRITERIA),before[0].comparison);
 for(const [i,q] of briefQuestions.entries()) {
  const after=createDemoBrief(q.id,'2026-11-07T12:00:00Z');
  assert.deepEqual(after.sections,before[i].sections);
  assert.deepEqual(after.comparison,before[i].comparison);
  assert.deepEqual(after.sources,before[i].sources);
 }
});
