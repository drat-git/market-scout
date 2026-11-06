import { test } from 'node:test';
import assert from 'node:assert/strict';
import { baseline } from '../shared/baseline';
import { DEFAULT_CRITERIA, validateDataset, type Criteria, type Dataset, type Evidence } from '../shared/schema';
import { compare } from '../shared/compare';
import { createBrief } from '../shared/brief';
import { screen } from '../shared/screen';
import { normalizeCompanies, normalizeDomain } from '../shared/normalize';
import { csvCell, exportCsv } from '../shared/export';
import { handleApi } from '../shared/api';
import { research } from '../shared/research';

function fixture(services: string[] = ['speech']): Dataset {
  const d = structuredClone(baseline);
  d.companies = [{ id: 'fixture', name: 'Synthetic evaluation clinic', website: 'https://example.org', domain: 'example.org', origin: 'baseline', identityNote: null }];
  d.locations = [{ id: 'loc1', companyId: 'fixture', marketId: 'austin', name: 'Synthetic branch 1', address: null, evidenceIds: ['e1'], note: null }];
  d.relationships = [{ id: 'r1', companyId: 'fixture', marketId: 'austin', evidenceIds: ['e1'] }];
  d.serviceAreas = [];
  d.evidence = [{ id: 'e1', companyId: 'fixture', scope: 'location', scopeId: 'loc1', facts: ['physical-presence', 'pediatric', ...services.map(s => `service:${s}`)], supports: true, claim: 'Synthetic evaluation fixture', url: 'https://example.org', title: 'Synthetic evaluation fixture', passage: 'Synthetic provider evidence, not real-world research.', collectedAt: baseline.collectedAt, sourceType: 'provider', verification: 'source-checked', provenance: 'baseline', uncertainty: null }];
  return d;
}
const result = (d: Dataset, criteria = DEFAULT_CRITERIA) => screen(d, ['r1'], criteria)[0].result;
const needBoth: Criteria = { ...DEFAULT_CRITERIA, requiredServices: ['speech', 'physical'] };

test('sample counts preserve company, metro, and location distinctions', () => {
  const c = compare(baseline, {}, DEFAULT_CRITERIA);
  assert.equal(c.uniqueCompanies, 19);
  assert.deepEqual(c.markets.map(m => m.companies), [10, 10]);
  assert.deepEqual(c.markets.map(m => m.locations), [11, 10]);
});
test('any eligible core service matches when no additional services are required', () => assert.equal(result(fixture()), 'match'));
test('every selected service is required', () => assert.equal(result(fixture(), needBoth), 'uncertain'));
test('missing evidence stays uncertain rather than excluded', () => assert.equal(result(fixture([])), 'uncertain'));
test('services at different branches cannot satisfy one physical clinic requirement', () => {
  const d = fixture();
  d.locations.push({ ...d.locations[0], id: 'loc2', evidenceIds: ['e2'] });
  d.evidence.push({ ...d.evidence[0], id: 'e2', scopeId: 'loc2', facts: ['physical-presence', 'pediatric', 'service:physical'] });
  assert.equal(result(d, needBoth), 'uncertain');
});
test('one complete branch can satisfy multiple service requirements', () => assert.equal(result(fixture(['speech', 'physical']), needBoth), 'match'));
test('company-level service claims are never silently applied to a branch', () => {
  const d = fixture([]); d.evidence.push({ ...d.evidence[0], id: 'company-services', scope: 'company', scopeId: 'fixture', facts: ['service:speech'] });
  assert.equal(result(d), 'uncertain');
});
test('adult-only provider is excluded on explicit evidence', () => {
  const d = fixture(); d.evidence[0].facts = ['physical-presence', 'service:speech'];
  d.evidence.push({ ...d.evidence[0], id: 'adult', facts: ['pediatric'], supports: false });
  assert.equal(result(d), 'exclude');
});
test('ABA-only evidence excludes only when lack of all core therapies is explicit', () => {
  const d = fixture([]); d.evidence.push({ ...d.evidence[0], id: 'aba-only', facts: ['service:speech', 'service:occupational', 'service:physical'], supports: false });
  assert.equal(result(d), 'exclude'); assert.equal(result(fixture(['speech', 'aba'])), 'match');
});
test('wrong geography requires affirmative disqualifying evidence', () => {
  const d = fixture(); d.locations[0].marketId = 'san-antonio';
  assert.equal(result(d), 'uncertain');
  d.evidence.push({ ...d.evidence[0], id: 'wrong-geo', scope: 'company', scopeId: 'fixture', facts: ['eligible:austin'], supports: false });
  assert.equal(result(d), 'exclude');
});
test('conflicting evidence and inaccessible verification stay uncertain', () => {
  const d = fixture(); d.evidence.push({ ...d.evidence[0], id: 'contradiction', facts: ['service:speech'], supports: false });
  assert.equal(result(d), 'uncertain');
  d.evidence = [d.evidence[0]]; d.evidence[0].verification = 'unverified'; assert.equal(result(d), 'uncertain');
});
test('service coverage is distinct from physical clinic presence', () => {
  const d = fixture(); d.locations = []; d.serviceAreas = [{ id: 'coverage', companyId: 'fixture', marketId: 'austin', evidenceIds: ['e1'] }];
  d.evidence[0] = { ...d.evidence[0], scope: 'service-area', scopeId: 'coverage', facts: ['coverage', 'pediatric', 'service:speech'] };
  assert.equal(result(d), 'uncertain'); assert.equal(result(d, { ...DEFAULT_CRITERIA, geography: 'coverage' }), 'match');
});
test('directory evidence alone cannot establish a match', () => { const d = fixture(); d.evidence[0].sourceType = 'directory'; assert.equal(result(d), 'uncertain'); });
test('human acceptance does not cure missing evidence; excluded records leave comparison', () => {
  const d = fixture([]), selection = { r1: 'accepted' as const };
  assert.equal(compare(d, selection, DEFAULT_CRITERIA).markets[0].uncertain, 1);
  screen(d, ['r1'], DEFAULT_CRITERIA);
  assert.deepEqual(selection, { r1: 'accepted' });
  assert.equal(compare(d, { r1: 'excluded' }, DEFAULT_CRITERIA).uniqueCompanies, 0);
});
test('brief snapshots and source citations are immutable copies', () => {
  const d = fixture(), selection = { r1: 'accepted' as const }, criteria = structuredClone(DEFAULT_CRITERIA);
  const b = createBrief(d, selection, criteria, 'Original note');
  criteria.requiredServices.push('physical'); d.evidence[0].passage = 'Changed';
  assert.deepEqual(b.snapshot.criteria.requiredServices, []); assert.equal(b.snapshot.notes, 'Original note');
  assert.notEqual(b.sources[0].passage, 'Changed');
  for (const s of b.sections) for (const id of s.evidenceIds) assert.ok(b.sources.some(e => e.id === id));
});
test('market brief citations do not cross-link a shared company’s other metro branch', () => {
  const b = createBrief(baseline, {}, DEFAULT_CRITERIA);
  const a = b.sections.find(s => s.title.startsWith('Austin:'))!;
  const sa = b.sections.find(s => s.title.startsWith('San Antonio:'))!;
  assert.ok(a.evidenceIds.includes('e-achieve-achieve-austin-1'));
  assert.ok(!a.evidenceIds.includes('e-achieve-achieve-san-antonio-2'));
  assert.ok(sa.evidenceIds.includes('e-achieve-achieve-san-antonio-2'));
  assert.ok(!sa.evidenceIds.includes('e-achieve-achieve-austin-1'));
});
test('company identity normalization preserves distinct brands and evidence on exact duplicates', () => {
  assert.equal(normalizeDomain(' HTTPS://www.Example.COM/path?q=1 '), 'example.com');
  const d = fixture();
  const n = normalizeCompanies([d.companies[0], { ...d.companies[0], id: 'duplicate' }, { ...d.companies[0], id: 'other-brand', name: 'Different brand' }], [{ ...d.evidence[0], companyId: 'duplicate' }]);
  assert.equal(n.companies.length, 2); assert.equal(n.evidence[0].companyId, 'fixture'); assert.deepEqual(n.possibleDuplicates, [['fixture', 'other-brand']]);
});
test('CSV protects formulas and preserves one row per clinic', () => {
  for (const s of ['=1+1', '+cmd', '-cmd', '@SUM(A1)', '  =1', '\t=1']) assert.ok(csvCell(s).startsWith('"\''));
  assert.equal(csvCell('a,"b"'), '"a,""b"""');
  const csv = exportCsv(baseline, {});
  assert.equal(csv.split('\r\n').length, baseline.locations.length + 2); // header + coverage-only company
});
test('schemas reject dangling references and wrong scope ownership', () => {
  const d = fixture(); d.locations[0].evidenceIds.push('missing'); assert.throws(() => validateDataset(d));
  const e = fixture(); e.evidence[0].scopeId = 'missing'; assert.throws(() => validateDataset(e));
});
test('API and CLI-facing modules agree and reject client-provided evidence', () => {
  const r = handleApi('POST', '/api/screen', { ids: ['achieve@austin'], criteria: DEFAULT_CRITERIA });
  assert.equal(r.status, 200);
  assert.equal((r.body as { assessments: { result: string }[] }).assessments[0].result, screen(baseline, ['achieve@austin'], DEFAULT_CRITERIA)[0].result);
  assert.equal(handleApi('POST', '/api/screen', { ids: ['achieve@austin'], criteria: DEFAULT_CRITERIA, evidence: [] }).status, 400);
  assert.equal(handleApi('POST', '/api/screen', { ids: ['invented'], criteria: DEFAULT_CRITERIA }).status, 400);
});
test('research fails closed without pretending that paid discovery ran', () => {
  const r = research('austin', DEFAULT_CRITERIA, 'test'); assert.equal(r.status, 'failed'); assert.equal(r.events.length, 1); assert.equal(r.events[0].stage, 'Discovery'); assert.deepEqual(r.assessments, []);
  assert.equal(handleApi('POST', '/api/research', { marketId: 'austin', criteria: DEFAULT_CRITERIA, requestId: 'test' }).status, 503);
});

test('demographic annotations remain distinct from numeric margins and snapshots preserve context', () => {
  const d = structuredClone(baseline);
  assert.equal(d.markets[0].demographics.population.moeStatus, 'controlled');
  assert.equal(d.markets[0].demographics.population.marginOfError, null);
  assert.equal(d.markets[0].demographics.under18.marginOfError, 478);
  const b = createBrief(d, {}, DEFAULT_CRITERIA);
  d.markets[0].demographics.population.estimate = 1;
  assert.equal(b.marketContext[0].demographics.population.estimate, 2550637);
  d.markets[0].demographics.population.marginOfError = 0;
  assert.throws(() => validateDataset(d));
  d.markets[0].demographics.population.marginOfError = -555555555;
  assert.throws(() => validateDataset(d));
});
test('context cannot be marked available with missing figures or a different metro identifier', () => {
  const d = structuredClone(baseline);
  d.markets[0].demographics.housing.estimate = null;
  assert.throws(() => validateDataset(d));
  const e = structuredClone(baseline);
  e.markets[0].demographics.geoId = '310M700US41700';
  assert.throws(() => validateDataset(e));
});
