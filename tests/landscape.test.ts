import { test } from 'node:test';
import assert from 'node:assert/strict';
import { baseline } from '../shared/baseline';
import { initialSelection } from '../shared/demo';
import { compareLandscape } from '../shared/landscape';

const tripleAustin = (data = baseline) => compareLandscape(data, initialSelection).markets[0].bundles[1].providers;
test('therapy bundles do not combine services across clinics or inherit company claims', () => {
  const d = structuredClone(baseline);
  const clinic = d.locations.find(l => l.companyId === 'achieve' && l.marketId === 'austin')!;
  const e = d.evidence.find(e => e.scopeId === clinic.id)!;
  assert.ok(tripleAustin(d).some(p => p.companyId === 'achieve'));
  e.facts = e.facts.filter(f => f !== 'service:physical');
  d.locations.push({ ...clinic, id: 'synthetic-second-clinic', evidenceIds: ['synthetic-physical'] });
  d.evidence.push({ ...e, id: 'synthetic-physical', scopeId: 'synthetic-second-clinic', facts: ['physical-presence', 'pediatric', 'service:physical'] });
  d.evidence.push({ ...e, id: 'synthetic-company', scope: 'company', scopeId: 'achieve', facts: ['service:physical'] });
  assert.ok(!tripleAustin(d).some(p => p.companyId === 'achieve'));
});
test('multiple qualifying branches count once per company and retain inspectable clinics', () => {
  const d = structuredClone(baseline);
  const clinic = d.locations.find(l => l.companyId === 'achieve' && l.marketId === 'austin')!;
  const e = d.evidence.find(e => e.scopeId === clinic.id)!;
  d.locations.push({ ...clinic, id: 'synthetic-copy', name: 'Synthetic second clinic', evidenceIds: ['synthetic-copy-evidence'] });
  d.evidence.push({ ...e, id: 'synthetic-copy-evidence', scopeId: 'synthetic-copy' });
  const providers = tripleAustin(d).filter(p => p.companyId === 'achieve');
  assert.equal(providers.length, 1);
  assert.equal(providers[0].clinics.length, 2);
});
test('shared operators require included physical presence in both metros', () => {
  assert.deepEqual(compareLandscape(baseline, initialSelection).sharedCompanies.map(c => c.id), ['achieve']);
  const excluded = { ...initialSelection, 'achieve@austin': 'excluded' as const };
  assert.deepEqual(compareLandscape(baseline, excluded).sharedCompanies, []);
  const d = structuredClone(baseline);
  const clinic = d.locations.find(l => l.companyId === 'achieve' && l.marketId === 'austin')!;
  d.evidence.filter(e => e.scopeId === clinic.id).forEach(e => { e.verification = 'unverified'; });
  assert.deepEqual(compareLandscape(d, initialSelection).sharedCompanies, []);
});
test('custom combinations require every selected service and an empty selection yields no matches', () => {
  assert.ok(compareLandscape(baseline, initialSelection, ['physical']).markets[0].matchingProviders.some(p => p.companyId === 'achieve'));
  const d = structuredClone(baseline);
  const clinic = d.locations.find(l => l.companyId === 'achieve' && l.marketId === 'austin')!;
  d.evidence.find(e => e.scopeId === clinic.id)!.facts.push('service:feeding');
  assert.ok(compareLandscape(d, initialSelection, ['physical', 'feeding']).markets[0].matchingProviders.some(p => p.companyId === 'achieve'));
  d.evidence.filter(e => e.scopeId === clinic.id).forEach(e => { e.verification = 'unverified'; });
  assert.ok(!compareLandscape(d, initialSelection, ['physical', 'feeding']).markets[0].matchingProviders.some(p => p.companyId === 'achieve'));
  assert.ok(compareLandscape(baseline, initialSelection, []).markets.every(m => !m.matchingProviders.length));
});
test('geographic groups preserve mailing cities, count clinics, and expose missing addresses', () => {
  const markets = compareLandscape(baseline, initialSelection).markets;
  const austin = markets.find(m => m.id === 'austin')!.geography;
  assert.deepEqual(austin.cities.map(g => [g.city, g.clinics.length]), [['Austin', 5], ['Cedar Park', 1], ['Round Rock', 1]]);
  assert.equal(austin.unresolved.length, 2);
  for (const market of markets) assert.equal(market.geography.total, market.geography.cities.reduce((sum, g) => sum + g.clinics.length, 0) + market.geography.unresolved.length);
});
test('geographic groups exclude unverified and excluded clinics without guessing missing cities', () => {
  const d = structuredClone(baseline);
  const clinic = d.locations.find(l => l.companyId === 'achieve' && l.marketId === 'austin')!;
  clinic.address = '1320 Arrow Point Dr';
  let austin = compareLandscape(d, initialSelection).markets[0].geography;
  assert.ok(!austin.cities.some(g => g.city === 'Cedar Park'));
  assert.ok(austin.unresolved.some(l => l.id === clinic.id));
  d.evidence.filter(e => e.scopeId === clinic.id).forEach(e => { e.verification = 'unverified'; });
  austin = compareLandscape(d, initialSelection).markets[0].geography;
  assert.equal(austin.total, 8);
  const excluded = { ...initialSelection, 'mighty-kids@austin': 'excluded' as const };
  assert.ok(!compareLandscape(d, excluded).markets[0].geography.cities.some(g => g.city === 'Round Rock'));
});
