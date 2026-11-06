import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { baseline } from '../shared/baseline';
import { DEFAULT_CRITERIA, validateDataset } from '../shared/schema';
import { emptyResearch, importResearch, completeSelection, readRun, briefInput, verificationReport, reviewCsv } from '../cli/workflow';
import { compare } from '../shared/compare';
import { exportCsv } from '../shared/export';
import { screen } from '../shared/screen';

const at = '2026-11-06T00:00:00Z';
function batch() {
  return {
    companies: [{ id: 'fixture', name: 'Synthetic clinic', website: 'https://clinic.example', domain: 'clinic.example', origin: 'new', identityNote: 'Fictional test data.' }],
    locations: [{ id: 'fixture-austin', companyId: 'fixture', marketId: 'austin', name: 'Fictional Austin clinic', address: null, evidenceIds: ['fixture-e1'], note: null }],
    serviceAreas: [],
    relationships: [{ id: 'fixture@austin', companyId: 'fixture', marketId: 'austin', evidenceIds: ['fixture-e1'] }],
    evidence: [{ id: 'fixture-e1', companyId: 'fixture', scope: 'location', scopeId: 'fixture-austin', facts: ['pediatric', 'physical-presence', 'service:speech'], supports: true, claim: 'Fictional pediatric speech clinic.', url: 'https://clinic.example/austin', title: 'Synthetic source', passage: 'Our Austin clinic offers pediatric speech therapy.', collectedAt: '2026-11-05T00:00:00Z', sourceType: 'provider', verification: 'source-checked', provenance: 'new', uncertainty: null }],
  };
}
async function temp(t: { after: (fn: () => Promise<void>) => void }) {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'scout-workflow-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  return dir;
}
const json = async (file: string) => JSON.parse(await readFile(file, 'utf8'));
const save = (file: string, value: unknown) => writeFile(file, JSON.stringify(value));
const cli = (...args: string[]) => JSON.parse(execFileSync(process.execPath, ['--import', 'tsx', 'cli/index.ts', ...args, '--json'], { encoding: 'utf8', timeout: 15000 }));
function fail(...args: string[]) {
  const result = spawnSync(process.execPath, ['--import', 'tsx', 'cli/index.ts', ...args], { encoding: 'utf8', timeout: 15000 });
  assert.equal(result.status, 2, result.stderr);
  return JSON.parse(result.stderr).error as string;
}

test('four-stage prepared workflow carries the same decisions and sources into an authored brief', async t => {
  const root = await temp(t);
  const dir = (name: string) => path.join(root, name);
  cli('research', '--example', '--out', dir('research'));
  const screened = cli('screen', '--from', dir('research'), '--out', dir('screen'));
  assert.equal(screened.snapshot.criteria.geography, 'physical');
  const verification = await json(path.join(dir('screen'), 'verification.json'));
  assert.ok(verification.some((r: any) => r.decision === 'unreviewed' && r.assessment.result === 'uncertain'));
  assert.match(await readFile(path.join(dir('screen'), 'review.csv'), 'utf8'), /next_checks/);
  const compared = cli('compare', '--from', dir('screen'), '--out', dir('compare'));
  assert.deepEqual(compared.result.markets.map((m: any) => m.companies), [9, 8]);
  assert.equal(compared.result.uniqueCompanies, 16);
  const pack = await json(path.join(dir('compare'), 'brief-input.json'));
  assert.equal(pack.providers.length, 17);
  assert.ok(pack.landscape.markets.every((m: any) => Array.isArray(m.geography.cities)));
  assert.ok(pack.evidence.every((e: any) => compared.result.evidenceIds.includes(e.id)));
  const narrative = await json(path.join(dir('compare'), 'narrative.template.json'));
  const source = pack.evidence[0];
  narrative.title = 'Source-bound workflow check';
  narrative.sections = [{ title: 'Documented source', kind: 'finding', text: source.claim, evidenceIds: [source.id] }];
  await save(dir('narrative.json'), narrative);
  const brief = cli('brief', '--from', dir('compare'), '--narrative', dir('narrative.json'), '--out', dir('brief'));
  assert.deepEqual(brief.snapshot.selection, compared.snapshot.selection);
  assert.equal(brief.result.datasetVersion, compared.datasetVersion);
  assert.ok(brief.result.sources.some((e: any) => e.id === source.id && e.passage === source.passage));
  assert.match(await readFile(path.join(dir('brief'), 'brief.md'), 'utf8'), /Source-bound workflow check/);
  await readRun(dir('brief'));
});

test('supplied research defaults pending; explicit acceptance preserves uncertain screening and verified facts', async t => {
  const root = await temp(t), input = path.join(root, 'input.json');
  await save(input, batch());
  cli('research', '--empty', '--input', input, '--out', path.join(root, 'research'));
  const run = await readRun(path.join(root, 'research'));
  assert.deepEqual(run.selection, { 'fixture@austin': 'unreviewed' });
  assert.equal(run.data.evidence[0].collectedAt, '2026-11-05T00:00:00Z');
  assert.equal(compare(run.data, run.selection, run.criteria).uniqueCompanies, 0);
  await save(path.join(root, 'criteria.json'), { ...DEFAULT_CRITERIA, requiredServices: ['speech', 'occupational'] });
  const s = cli('screen', '--from', path.join(root, 'research'), '--criteria', path.join(root, 'criteria.json'), '--out', path.join(root, 'screen'));
  assert.equal(s.result[0].result, 'uncertain');
  await save(path.join(root, 'decisions.json'), { 'fixture@austin': 'accepted' });
  const c = cli('compare', '--from', path.join(root, 'screen'), '--selection', path.join(root, 'decisions.json'), '--out', path.join(root, 'compare'));
  assert.equal(c.result.markets[0].uncertain, 1);
  assert.equal(c.result.markets[0].services.speech, 1);
  assert.equal(c.result.markets[0].services.occupational, 0);
  assert.equal(c.result.uniqueCompanies, 1);
  const b = cli('brief', '--from', path.join(root, 'compare'), '--out', path.join(root, 'brief'));
  assert.equal(b.snapshot.selection['fixture@austin'], 'accepted');
  assert.deepEqual(b.snapshot.criteria.requiredServices, ['speech', 'occupational']);
});

test('unknown decisions, changed evidence, and existing outputs fail instead of silently changing a run', async t => {
  const root = await temp(t), comparison = path.join(root, 'compare');
  cli('compare', '--out', comparison);
  assert.match(fail('compare', '--out', comparison), /exist/i);
  await save(path.join(root, 'wrong.json'), { 'nonexistent@austin': 'accepted' });
  assert.match(fail('compare', '--from', comparison, '--selection', path.join(root, 'wrong.json'), '--out', path.join(root, 'bad')), /Unknown selection/);
  const revised = await json(path.join(comparison, 'dataset.json'));
  revised.evidence[0].passage = 'Changed source wording without changing calculated counts.';
  await save(path.join(root, 'revised.json'), revised);
  assert.match(fail('brief', '--from', comparison, '--data', path.join(root, 'revised.json'), '--out', path.join(root, 'stale')), /Saved comparison differs/);
  await save(path.join(comparison, 'dataset.json'), revised);
  await assert.rejects(readRun(comparison), /Saved run inputs changed/);
});

test('incremental import preserves existing decisions and rejects conflicting replacements', () => {
  const data = importResearch(emptyResearch(baseline), batch(), at);
  const additions = { companies: [], locations: [], serviceAreas: [], relationships: [{ id: 'fixture@san-antonio', companyId: 'fixture', marketId: 'san-antonio', evidenceIds: [] }], evidence: [] };
  const merged = importResearch(data, additions, at);
  assert.deepEqual(completeSelection(merged, {}, { 'fixture@austin': 'excluded' }), { 'fixture@austin': 'excluded', 'fixture@san-antonio': 'unreviewed' });
  const changed = batch(); changed.evidence[0].passage = 'Changed';
  assert.throws(() => importResearch(data, changed, at), /overwrite/);
  const duplicate = batch(); duplicate.relationships.push({ ...duplicate.relationships[0], id: 'second-id-for-same-pair' });
  assert.throws(() => importResearch(emptyResearch(baseline), duplicate, at), /Duplicate company/);
});

test('import validates evidence ownership and market references', () => {
  const data = structuredClone(baseline);
  const wrong = data.evidence.find(e => e.companyId !== data.relationships[0].companyId)!;
  data.relationships[0].evidenceIds.push(wrong.id);
  assert.throws(() => validateDataset(data), /another company/);
  const missingMarket = structuredClone(baseline); missingMarket.markets = missingMarket.markets.filter(m => m.id !== 'austin');
  assert.throws(() => validateDataset(missingMarket), /Unknown market/);
});

test('CSV and comparisons require supported physical branch evidence, including scope collisions', () => {
  const data = importResearch(emptyResearch(baseline), batch(), at);
  const selection = { 'fixture@austin': 'accepted' as const };
  data.evidence.push({ ...data.evidence[0], id: 'contradiction', facts: ['service:speech'], supports: false });
  assert.equal(compare(data, selection, DEFAULT_CRITERIA).markets[0].services.speech, 0);
  assert.doesNotMatch(exportCsv(data, selection).split('\r\n')[1].split(',')[6], /speech/);
  data.evidence = [{ ...data.evidence[0], scope: 'company', scopeId: 'fixture' }];
  data.locations[0].id = 'fixture'; // Legal ID shared across entity types; scope must still constrain evidence.
  assert.equal(screen(data, ['fixture@austin'], DEFAULT_CRITERIA)[0].result, 'uncertain');
  assert.equal(compare(data, selection, DEFAULT_CRITERIA).markets[0].locations, 0);
  assert.doesNotMatch(exportCsv(data, selection).split('\r\n')[1].split(',')[6], /speech/);
});

test('brief pack names the requested service combination and review queue exposes the decisive missing check', () => {
  const data = importResearch(emptyResearch(baseline), batch(), at);
  const selection = { 'fixture@austin': 'accepted' as const };
  const criteria = { ...DEFAULT_CRITERIA, requiredServices: ['speech', 'occupational'] as ('speech' | 'occupational')[] };
  const report = verificationReport(data, criteria, selection, at);
  assert.deepEqual(report[0].details.decisionChecks.map(c => c.id), ['required:occupational']);
  assert.match(reviewCsv(report), /confirm occupational/);
  data.evidence[0].facts.push('service:occupational');
  const pack = briefInput(data, criteria, selection, at);
  assert.deepEqual(pack.landscapeServices, ['speech', 'occupational']);
  assert.equal(pack.landscape.markets[0].matchingProviders.length, 1);
  assert.equal(pack.landscape.markets[0].bundles.find(b => b.id === 'all-three')!.providers.length, 0);
  assert.equal(verificationReport(data, criteria, selection, at)[0].details.decisionChecks.length, 0);
});
