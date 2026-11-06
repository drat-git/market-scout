import { baseline } from '../shared/baseline';
import { compare } from '../shared/compare';
import { DEFAULT_CRITERIA } from '../shared/schema';
import { createBrief } from '../shared/brief';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import context from '../data/market-context.json';
import { canonicalJson } from '../server/fingerprint';

for (const source of context.files) {
  const bytes = await readFile(`data/sources/census/${source.file}`);
  if (createHash('sha256').update(bytes).digest('hex') !== source.sha256) throw new Error(`Census source changed: ${source.file}`);
}
for (const market of baseline.markets) {
  const saved = context.markets[market.cbsa as keyof typeof context.markets];
  if (!saved || canonicalJson(market.demographics) !== canonicalJson(saved.demographics)) throw new Error(`Context snapshot drift: ${market.id}`);
}

const b = createBrief(baseline, {}, DEFAULT_CRITERIA, '', [], baseline.collectedAt);
for (const section of b.sections) for (const id of section.evidenceIds) if (!b.sources.some(e => e.id === id)) throw new Error(`Missing citation ${id}`);
const quoted = new Map<string, number>();
for (const e of baseline.evidence) quoted.set(e.url, (quoted.get(e.url) ?? 0) + e.passage.replace(/…|\.\.\./g, '').trim().split(/\s+/).length);
for (const [url, count] of quoted) if (count > 25) throw new Error(`Excerpt exceeds 25-word source budget (${count}): ${url}`);
const c = compare(baseline, {}, DEFAULT_CRITERIA);
await mkdir('data/examples', { recursive: true });
await writeFile('data/examples/comparison.json', JSON.stringify({ schemaVersion: '1', kind: 'compare', datasetVersion: baseline.version, snapshot: { criteria: DEFAULT_CRITERIA, selection: {} }, result: c }, null, 2) + '\n');
await writeFile('data/examples/brief.json', JSON.stringify(b, null, 2) + '\n');
console.log(JSON.stringify({ valid: true, companies: c.uniqueCompanies, relationships: c.relationshipIds.length, markets: c.markets, evidence: baseline.evidence.length, humanReview: baseline.humanReview }, null, 2));
