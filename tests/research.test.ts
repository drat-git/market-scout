import { test } from 'node:test';
import assert from 'node:assert/strict';
import { baseline } from '../shared/baseline';
import { DEFAULT_CRITERIA, type Run } from '../shared/schema';
import { compare } from '../shared/compare';
import { mergeAdditions } from '../shared/research-artifacts';
import { executeResearch, DiscoverySchema, ExtractionSchema } from '../server/research-pipeline';
import { OpenAIResearchModel, type ResearchModel } from '../server/model';
import { publicAddress, sourceUrl, sameProvider, extractPage } from '../server/source-reader';
const url = 'https://fixture-clinic.example/services';
const passage = 'Pediatric speech and occupational therapy at our Austin clinic in Travis County.';
const fakePage = { id: 'source-1', url, title: 'Synthetic clinic fixture', text: passage, collectedAt: '2026-11-06T00:00:00Z' };
const lead = { name: 'Synthetic clinic fixture', website: 'https://fixture-clinic.example/', sourceUrls: [url] };
const provider = { ...lead, companyClaims: [], branches: [{ name: 'Austin', address: null, county: 'Travis', kind: 'clinic', claims: [{ sourceId: 'source-1', passage, claim: 'Synthetic clinic evidence', facts: ['pediatric','physical-presence','service:speech','service:occupational'], supports: true }] }], uncertainties: [] };
delete (provider as Partial<typeof lead>).sourceUrls;
function model(extraction: unknown = { providers: [provider] }): ResearchModel {
  return { name: 'synthetic-test-model', async generate(stage) { return { value: stage === 'Discovery' ? { leads: [lead] } : extraction, sources: [url], responseId: 'synthetic-response', inputTokens: 1, outputTokens: 1, webSearchCalls: stage === 'Discovery' ? 1 : 0 }; } };
}
async function run(extraction?: unknown) {
  const saved: Run[] = [];
  const result = await executeResearch({ id: 'test-run', marketId: 'austin', criteria: DEFAULT_CRITERIA, base: baseline, model: model(extraction), retrieve: async (_u,_s,id) => ({ ...fakePage, id }), save: async state => { saved.push(state); } });
  return { result, saved };
}
test('research preserves real stage outputs and requires acceptance before comparison changes', async () => {
  const { result, saved } = await run();
  assert.equal(result.status, 'awaiting-review'); assert.equal(result.assessments[0].result, 'match');
  assert.ok(saved.some(r => r.events.some(e => e.stage === 'Discovery' && e.state === 'active')));
  assert.equal(saved[0].research?.candidates.length, 0);
  const merged = mergeAdditions(baseline, result.research!.additions);
  assert.equal(compare(merged, {}, DEFAULT_CRITERIA).uniqueCompanies, 19);
  assert.equal(compare(merged, { [result.research!.candidates[0].relationshipId]: 'accepted' }, DEFAULT_CRITERIA).uniqueCompanies, 20);
  assert.equal(compare(mergeAdditions(merged, result.research!.additions), {}, DEFAULT_CRITERIA).uniqueCompanies, 19);
});
test('fabricated quotations cannot establish a positive claim', async () => {
  const bad = structuredClone(provider); bad.branches[0].claims[0].passage = 'Not present on this page';
  const { result } = await run({ providers: [bad] });
  assert.equal(result.research!.additions.evidence.length, 0);
  assert.equal(result.assessments[0].result, 'uncertain');
});
test('wrong county stays unverified and company menus do not imply branch services', async () => {
  const bad = structuredClone(provider); bad.branches[0].county = 'Dallas';
  assert.equal((await run({ providers: [bad] })).result.assessments[0].result, 'uncertain');
  const companyOnly = { ...provider, companyClaims: provider.branches[0].claims, branches: [] };
  assert.equal((await run({ providers: [companyOnly] })).result.assessments[0].result, 'uncertain');
});
test('source failure is retained without inventing evidence or running normalization', async () => {
  const stages: string[] = [];
  const m = model(), generate = m.generate; m.generate = async (...args) => { stages.push(args[0]); return generate(...args); };
  const result = await executeResearch({ id: 'source-fail', marketId: 'austin', criteria: DEFAULT_CRITERIA, base: baseline, model: m, retrieve: async () => { throw new Error('Cannot fetch'); }, save: async () => {} });
  assert.deepEqual(stages, ['Discovery']); assert.equal(result.research!.sources[0].status, 'failed'); assert.equal(result.research!.additions.evidence.length, 0);
});
test('cancellation saves partial leads and never fabricates completed stages', async () => {
  const controller = new AbortController();
  const result = await executeResearch({ id: 'cancelled-run', marketId: 'austin', criteria: DEFAULT_CRITERIA, base: baseline, model: model(), signal: controller.signal,
    retrieve: async () => { controller.abort(); throw controller.signal.reason; }, save: async () => {} });
  assert.equal(result.status, 'partial'); assert.equal(result.research!.leads.length, 1);
  assert.ok(!result.events.some(e => e.stage === 'Screening'));
});
test('unsafe URLs and nonpublic IP encodings are rejected', () => {
  for (const ip of ['127.0.0.1','10.0.0.1','169.254.169.254','100.64.0.1','::1','::ffff:127.0.0.1','fc00::1','2001:db8::1','224.0.0.1']) assert.equal(publicAddress(ip), false, ip);
  assert.equal(publicAddress('8.8.8.8'), true);
  for (const url of ['http://2130706433','http://0177.0.0.1','file:///etc/passwd','http://user:secret@example.com','https://example.com:8443','http://localhost']) assert.throws(() => sourceUrl(url), url);
  assert.equal(sameProvider('https://example.com','https://example.com.evil.org'), false);
  assert.equal(sameProvider('https://www.example.com','https://example.com/services'), true);
  assert.equal(extractPage(`<html><head><title>Title</title></head><body><script>secret</script><p>${passage}</p></body></html>`).text, passage);
});
test('Responses adapter sends schema, no quotas or retries, and does not expose provider error bodies', async () => {
  let calls = 0;
  const transport: typeof fetch = async (_url, init) => {
    calls++; const body = JSON.parse(init!.body as string);
    assert.equal(body.store, false); assert.equal(body.max_output_tokens, undefined); assert.equal(body.max_tool_calls, undefined);
    assert.equal(body.text.format.type, 'json_schema'); assert.equal(body.tools[0].type, 'web_search');
    return Response.json({ status: 'completed', id: 'r1', output: [{ type: 'web_search_call', action: { sources: [{ url }] } }, { type: 'message', content: [{ type: 'output_text', text: JSON.stringify({ leads: [lead] }) }] }], usage: { input_tokens: 10, output_tokens: 20 } });
  };
  const reply = await new OpenAIResearchModel('synthetic-key', 'gpt-6.1-terra', transport).generate('Discovery', 'test', {}, DiscoverySchema, new AbortController().signal);
  assert.equal(reply.webSearchCalls, 1); assert.equal(calls, 1); assert.deepEqual(reply.sources, [url]);
  const fail: typeof fetch = async () => { calls++; return Response.json({ error: 'sensitive-vendor-detail' }, { status: 401 }); };
  await assert.rejects(new OpenAIResearchModel('synthetic-key', 'model', fail).generate('Normalization', 'test', {}, ExtractionSchema, new AbortController().signal), /rejected the server API key/);
  assert.equal(calls, 2);
});
test('repeat research artifacts cannot silently revise an accepted candidate', async () => {
  const first = (await run()).result;
  const second = await executeResearch({ id: 'different-run', marketId: 'austin', criteria: DEFAULT_CRITERIA, base: baseline, model: model(), retrieve: async (_u,_s,id) => ({ ...fakePage, id }), save: async () => {} });
  assert.notEqual(first.research!.candidates[0].relationshipId, second.research!.candidates[0].relationshipId);
  const a = mergeAdditions(baseline, first.research!.additions), b = mergeAdditions(baseline, second.research!.additions);
  assert.notEqual(a.version, b.version);
  const third = await executeResearch({ id: 'known-run', marketId: 'austin', criteria: DEFAULT_CRITERIA, base: a, model: model(), retrieve: async (_u,_s,id) => ({ ...fakePage, id }), save: async () => {} });
  assert.equal(third.research!.candidates.length, 0);
  assert.ok(third.research!.sources.some(s => s.detail.includes('Already researched')));
});
