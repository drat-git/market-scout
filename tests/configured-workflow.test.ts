import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { execFileSync, spawnSync } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import { validateCase, validateCriteria, validateDataset, type Dataset, type ResearchCase } from '../toolkit/schema';
import { emptyDataset, importBatch, completeSelection, contextHash } from '../toolkit/state';
import { screen, resolveFact } from '../toolkit/screen';
import { compare } from '../toolkit/compare';
import { briefInput, createBrief } from '../toolkit/brief';
import { exportCsv } from '../toolkit/export';
import { readCaseRun } from '../cli/case-workflow';
import hvacRaw from '../cases/commercial-hvac.json';
import hvacBatch from '../examples/commercial-hvac/research.json';
import hvacDecisions from '../examples/commercial-hvac/decisions.json';
import pediatricRaw from '../cases/pediatric-therapy.json';
import pediatricBatch from '../examples/pediatric-therapy/research.json';
import pediatricDecisions from '../examples/pediatric-therapy/decisions.json';
const at = '2026-11-06T00:00:00Z';
const hvac = validateCase(hvacRaw);
const dataFor = (config = hvac, batch: unknown = hvacBatch) => importBatch(config, emptyDataset(config, at), batch, at);
const accepted = (data: Dataset) => completeSelection(data, Object.fromEntries(data.relationships.map(r => [r.id, 'accepted' as const])));
const cli = (...args: string[]) => JSON.parse(execFileSync(process.execPath, ['--import', 'tsx', 'cli/index.ts', ...args, '--json'], { encoding: 'utf8', timeout: 15000 }));
const json = async (file: string) => JSON.parse(await readFile(file, 'utf8'));
const save = (file: string, value: unknown) => writeFile(file, JSON.stringify(value));
async function temporary(t: { after: (fn: () => Promise<void>) => void }) { const dir = await mkdtemp(path.join(os.tmpdir(), 'scout-config-')); t.after(() => rm(dir, { recursive: true, force: true })); return dir; }
function failure(...args: string[]) { const result = spawnSync(process.execPath, ['--import', 'tsx', 'cli/index.ts', ...args], { encoding: 'utf8', timeout: 15000 }); assert.equal(result.status, 2, result.stderr); return JSON.parse(result.stderr).error; }

test('new industry uses coverage and configured capabilities without pediatric or clinic assumptions', () => {
  const data = dataFor(), assessed = screen(hvac, data, hvac.criteria, at);
  assert.deepEqual(assessed.map(a => a.result), ['match', 'uncertain', 'uncertain', 'exclude', 'match']);
  assert.deepEqual(assessed[2].decisionChecks.map(c => c.id), ['service-model']);
  const c = compare(hvac, data, hvac.criteria, completeSelection(data, hvacDecisions as any));
  assert.equal(c.uniqueCompanies, 3); assert.deepEqual(c.markets.map(m => m.companies), [2, 2]);
  assert.deepEqual(c.markets.map(m => m.locations), [0, 0]); assert.deepEqual(c.markets.map(m => m.coverageCompanies), [2, 2]);
  assert.deepEqual(c.markets.map(m => m.profiles[0].providers.length), [1, 1]);
  assert.equal(c.sharedOperators.length, 1); assert.ok(c.sharedOperators[0].markets.every(m => m.physicalLocationIds.length === 0));
  assert.ok(c.markets.every(m => m.context.length === 0));
});

test('pediatric configuration reproduces the unchanged demo sample and documented counts', () => {
  const config = validateCase(pediatricRaw), data = dataFor(config, pediatricBatch);
  const c = compare(config, data, config.criteria, completeSelection(data, pediatricDecisions as any));
  assert.deepEqual(c.markets.map(m => m.companies), [9, 8]); assert.equal(c.uniqueCompanies, 16);
  assert.deepEqual(c.markets.map(m => m.locations), [9, 8]);
  assert.deepEqual(c.markets.map(m => m.attributes.find(a => a.id === 'service:speech')!.atPhysicalLocation), [9, 7]);
  assert.ok(c.markets.every(m => m.context.every(c => c.period === '2024 ACS one-year')));
});

test('arbitrary international markets and industry facts work without code changes, including one or three markets', () => {
  const config = validateCase({ ...hvacRaw, id: 'wholesale-bakery', industry: 'Wholesale bakeries', question: 'Which production sites support wholesale bread?',
    markets: ['leeds', 'bristol', 'cardiff'].map(id => ({ id, name: id, boundary: `User-defined ${id} area`, definitionUrl: null, context: [] })),
    attributes: [{ id: 'bread', label: 'Bread', description: 'Bread production' }, { id: 'wholesale', label: 'Wholesale', description: 'Wholesale supply' }],
    criteria: { version: '1', geography: 'physical', acceptedSourceTypes: ['business'], rules: [{ id: 'production', label: 'Bread and wholesale at one site', scope: 'local', match: 'all', facts: ['bread', 'wholesale'], nextStep: 'Verify both at this site.' }] },
    comparisons: [{ id: 'wholesale-bread', label: 'Wholesale bread site', scope: 'location', match: 'all', facts: ['bread', 'wholesale'] }] });
  const batch = { companies: [{ id: 'bakery', name: 'Fictional bakery', website: null, domain: null, origin: 'new', identityNote: null }],
    relationships: [{ id: 'bakery@leeds', companyId: 'bakery', marketId: 'leeds', evidenceIds: [] }], serviceAreas: [],
    locations: [{ id: 'site-a', companyId: 'bakery', marketId: 'leeds', name: 'Site A', address: null, locality: 'Leeds', evidenceIds: ['a'], note: null }, { id: 'site-b', companyId: 'bakery', marketId: 'leeds', name: 'Site B', address: null, locality: null, evidenceIds: ['b'], note: null }],
    evidence: ['a', 'b'].map((id, i) => ({ id, companyId: 'bakery', scope: 'location', scopeId: `site-${id}`, facts: ['physical-presence', i ? 'wholesale' : 'bread'], supports: true, claim: 'Fictional supplied site evidence', url: null, sourceRef: '/supplied/bakery.txt', title: 'Supplied fixture', passage: 'Synthetic source for branch scope testing.', collectedAt: at, sourceType: 'business', verification: 'source-checked', provenance: 'cached', uncertainty: null })) };
  const data = dataFor(config, batch), selection = accepted(data);
  assert.equal(screen(config, data, config.criteria, at)[0].result, 'uncertain');
  let c = compare(config, data, config.criteria, selection);
  assert.equal(c.markets.length, 3); assert.equal(c.markets[0].profiles[0].providers.length, 0);
  assert.equal(c.markets[0].geography.localities[0].locality, 'Leeds'); assert.equal(c.markets[0].geography.unresolved.length, 1);
  data.evidence[0].facts.push('wholesale');
  assert.equal(screen(config, data, config.criteria, at)[0].result, 'match');
  const single = validateCase({ ...config, markets: [config.markets[0]] });
  c = compare(single, data, single.criteria, selection);
  assert.equal(c.markets.length, 1); assert.equal(c.markets[0].profiles[0].providers.length, 1);
  assert.doesNotThrow(() => createBrief(single, data, single.criteria, selection, at));
});

test('source policy, conflicts, and explicit negative rules use three-valued evidence', () => {
  const data = dataFor(), e = data.evidence.find(e => e.facts.includes('commercial'))!;
  assert.equal(resolveFact([e], 'commercial', hvac.criteria), 'yes');
  assert.equal(resolveFact([{ ...e, sourceType: 'directory' }], 'commercial', hvac.criteria), 'unknown');
  assert.equal(resolveFact([e, { ...e, supports: false }], 'commercial', hvac.criteria), 'unknown');
  assert.equal(resolveFact([{ ...e, verification: 'unverified' }], 'commercial', hvac.criteria), 'unknown');
  const criteria = validateCriteria({ ...hvac.criteria, geography: 'none', rules: [{ id: 'not-commercial', label: 'Explicitly non-commercial', scope: 'company', match: 'all', facts: ['commercial'], expected: false, nextStep: 'Confirm client focus.' }] }, hvac);
  const outcomes = screen(hvac, data, criteria, at);
  assert.equal(outcomes.find(a => a.relationshipId === 'home-fixture@tucson')!.result, 'match');
  assert.equal(outcomes.find(a => a.relationshipId === 'atlas-fixture@phoenix')!.result, 'exclude');
});

test('physical, coverage, and either modes never conflate a service area with a physical site', () => {
  const data = dataFor();
  assert.equal(screen(hvac, data, { ...hvac.criteria, geography: 'physical' }, at)[0].result, 'uncertain');
  assert.equal(screen(hvac, data, { ...hvac.criteria, geography: 'either' }, at)[0].result, 'match');
  assert.equal(compare(hvac, data, { ...hvac.criteria, geography: 'either' }, accepted(data)).markets[0].locations, 0);
});

test('invalid cases and data fail explicitly instead of falling back to demo facts or geography', () => {
  assert.throws(() => validateCase({ ...hvacRaw, markets: [hvacRaw.markets[0], hvacRaw.markets[0]] }), /Duplicate market/);
  assert.throws(() => validateCase({ ...hvacRaw, criteria: { ...hvacRaw.criteria, rules: [{ ...hvacRaw.criteria.rules[0], facts: ['pediatric'] }] } }), /Unknown rule fact/);
  const data = dataFor(); data.relationships[0].marketId = 'austin';
  assert.throws(() => validateDataset(data, hvac), /Unknown market/);
  const wrong = dataFor(); wrong.evidence[0].facts.push('unconfigured-fact');
  assert.throws(() => validateDataset(wrong, hvac), /Unknown evidence fact/);
  const companyPresence = dataFor(); companyPresence.evidence[0].facts.push('physical-presence');
  assert.throws(() => validateDataset(companyPresence, hvac), /wrong scope/);
  assert.throws(() => validateCriteria({ ...hvac.criteria, geography: 'none' }, hvac), /company rules/);
});

test('configured CLI preserves case, evidence, uncertainty and decisions through authored briefing', async t => {
  const dir = await temporary(t), p = (name: string) => path.join(dir, name);
  const r = cli('research', '--case', 'cases/commercial-hvac.json', '--input', 'examples/commercial-hvac/research.json', '--out', p('research'));
  assert.equal(r.schemaVersion, '2'); assert.ok(Object.values(r.snapshot.selection).every(d => d === 'unreviewed'));
  cli('screen', '--from', p('research'), '--out', p('screen'));
  const c = cli('compare', '--from', p('screen'), '--selection', 'examples/commercial-hvac/decisions.json', '--out', p('compare'));
  const pack = await json(path.join(p('compare'), 'brief-input.json'));
  assert.ok(pack.providers.some((p: any) => p.decision === 'accepted' && p.result === 'uncertain'));
  assert.ok(!pack.sources.some((s: any) => s.companyId === 'home-fixture'));
  const n = await json(path.join(p('compare'), 'narrative.template.json'));
  n.title = 'Fictional commercial HVAC research'; n.sections = [{ title: 'Documented source', kind: 'finding', text: pack.sources[0].claim, evidenceIds: [pack.sources[0].id] }];
  await save(p('narrative.json'), n);
  const b = cli('brief', '--from', p('compare'), '--narrative', p('narrative.json'), '--out', p('brief'));
  assert.deepEqual(b.result.comparison, c.result); assert.deepEqual(b.snapshot.selection, c.snapshot.selection);
  assert.match(await readFile(path.join(p('brief'), 'brief.md'), 'utf8'), /Fictional commercial HVAC/);
  const saved = await readCaseRun(p('brief')); assert.ok(saved.data.evidence.every(e => e.collectedAt === at));
  assert.equal(saved.config.industry, 'Commercial HVAC services');
  const revisedCase = structuredClone(hvacRaw); revisedCase.question = 'A different research question';
  await save(p('case-v2.json'), revisedCase);
  assert.match(failure('brief', '--from', p('compare'), '--case', p('case-v2.json'), '--out', p('stale')), /Saved comparison differs/);
  n.sections[0].evidenceIds = ['home-fixture-customers']; await save(p('bad-narrative.json'), n);
  assert.match(failure('brief', '--from', p('compare'), '--narrative', p('bad-narrative.json'), '--out', p('bad-citation')), /Unknown or unselected/);
});

test('case changes and evidence drift are fingerprinted, and new records inherit no implicit acceptance', async t => {
  const dir = await temporary(t);
  cli('research', '--case', 'cases/commercial-hvac.json', '--out', path.join(dir, 'empty'));
  const run = await readCaseRun(path.join(dir, 'empty')); assert.equal(run.data.companies.length, 0); assert.equal(run.config.markets[0].context.length, 0);
  const changed = structuredClone(run.config); changed.markets[0].boundary = 'Different boundary';
  assert.notEqual(contextHash(changed, run.data, run.criteria, run.selection), run.manifest.contextHash);
  await save(path.join(dir, 'empty', 'case.json'), changed);
  await assert.rejects(readCaseRun(path.join(dir, 'empty')), /Saved run inputs changed/);
  const data = dataFor(); data.companies.forEach(c => c.origin = 'baseline');
  assert.ok(Object.values(completeSelection(data, {})).every(s => s === 'unreviewed'));
});

test('context citations are explicit, source-bound, and not inherited into unrelated cases', () => {
  const config = validateCase(pediatricRaw), data = dataFor(config, pediatricBatch), selection = completeSelection(data, pediatricDecisions as any);
  const pack = briefInput(config, data, config.criteria, selection, at);
  const context = pack.sources.find(s => s.kind === 'market-context')!;
  assert.ok(context.id.startsWith('context:')); assert.equal(context.passage, null);
  const narrative = { caseId: config.id, datasetVersion: data.version, contextHash: pack.contextHash, comparison: pack.comparison, title: 'Context source test', sections: [{ title: 'Context', kind: 'finding', text: context.claim, evidenceIds: [context.id] }] };
  assert.doesNotThrow(() => createBrief(config, data, config.criteria, selection, at, narrative));
  assert.equal(briefInput(hvac, dataFor(), hvac.criteria, accepted(dataFor()), at).sources.filter(s => s.kind === 'market-context').length, 0);
});

test('CSV preserves company and local scope and guards spreadsheet formulas', () => {
  const data = dataFor(); data.companies[0].name = '=1+1';
  const csv = exportCsv(hvac, data, hvac.criteria, completeSelection(data, hvacDecisions as any));
  assert.match(csv, /"'=1\+1"/);
  const local = csv.split('\r\n').find(row => row.includes('"desert-fixture-phoenix"'))!;
  assert.ok(local.includes('"Maintenance"')); assert.ok(!local.includes('Maintenance; Installation'));
});
