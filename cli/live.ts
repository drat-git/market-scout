#!/usr/bin/env node
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { baseline } from '../shared/baseline';
import { CriteriaSchema, DEFAULT_CRITERIA, MarketIdSchema, SelectionSchema, validateDataset } from '../shared/schema';
import { screen } from '../shared/screen';
import { compare } from '../shared/compare';
import { createBrief } from '../shared/brief';
import { research } from '../shared/research';
import { loadEnv } from 'vite';
import { OpenAIResearchModel } from '../server/model';
import { executeResearch } from '../server/research-pipeline';
import { mergeAdditions } from '../shared/research-artifacts';
const env = { ...loadEnv('development', process.cwd(), ''), ...process.env };
import { demographicLabels, formatDemographic } from '../shared/demographics';
import { exportCsv } from '../shared/export';

const readJson = async (file: string) => JSON.parse(await readFile(path.resolve(file), 'utf8'));
async function main() {
  const { positionals, values } = parseArgs({ allowPositionals: true, options: { data: { type: 'string' }, criteria: { type: 'string' }, selection: { type: 'string' }, comparison: { type: 'string' }, market: { type: 'string' }, notes: { type: 'string' }, out: { type: 'string' }, json: { type: 'boolean' }, help: { type: 'boolean' } } });
  const command = positionals[0];
  if (values.help || !command) {
    console.log('Market Scout 0.1 — local research foundation\n\nCommands: research | screen | compare | brief\n\n--data path       Versioned dataset (default: bundled baseline)\n--criteria path   JSON criteria (default: any core therapy, physical clinic)\n--selection path  JSON map of relationship IDs to accepted/excluded/unreviewed\n--comparison path Saved comparison artifact (brief only)\n--market metro    austin or san-antonio (required for research)\n--notes path      UTF-8 analyst notes (brief only)\n--out directory   Artifact directory (default: .market-scout/<command>-<timestamp>)\n--json            Print machine-readable JSON\n\nScreen, compare, and brief are deterministic and need no API key.\nResearch uses OPENAI_API_KEY from the environment or .env.local. New candidates require review.');
    return;
  }
  if (!['research', 'screen', 'compare', 'brief'].includes(command) || positionals.length !== 1) throw new Error('Expected one command: research, screen, compare, or brief.');
  if (values.comparison && command !== 'brief') throw new Error('--comparison is only accepted by brief.');
  const data = values.data ? validateDataset(await readJson(values.data)) : baseline;
  const sourceComparison = values.comparison ? await readJson(values.comparison) : null;
  if (sourceComparison && (sourceComparison.kind !== 'compare' || sourceComparison.datasetVersion !== data.version)) throw new Error('Comparison artifact kind or dataset version does not match.');
  const criteria = CriteriaSchema.parse(values.criteria ? await readJson(values.criteria) : sourceComparison?.snapshot?.criteria ?? DEFAULT_CRITERIA);
  const selection = SelectionSchema.parse(values.selection ? await readJson(values.selection) : sourceComparison?.snapshot?.selection ?? {});
  for (const id of Object.keys(selection)) if (!data.relationships.some(r => r.id === id)) throw new Error(`Selection contains unknown relationship: ${id}`);
  const notes = values.notes ? await readFile(path.resolve(values.notes), 'utf8') : '';
  if (notes.length > 8000) throw new Error('Analyst notes must be 8,000 characters or fewer.');
  const at = new Date().toISOString(), id = `${command}-${at.replace(/[:.]/g, '-')}`;
  const dir = path.resolve(values.out ?? `.market-scout/${id}`);
  let result: unknown;
  let status = 'success';
  if (command === 'research') {
    const metro = MarketIdSchema.parse(values.market);
    if (!env.OPENAI_API_KEY) {
      result = research(metro, criteria, id); status = 'missing-configuration'; process.exitCode = 3;
    } else {
      await mkdir(dir, { recursive: true });
      await writeFile(path.join(dir, 'execution.json'), JSON.stringify({ id, createdAt: at }), { flag: 'wx' });
      const controller = new AbortController();
      const stop = () => controller.abort();
      process.once('SIGINT', stop);
      try {
        result = await executeResearch({ id, marketId: metro, criteria, base: data, model: new OpenAIResearchModel(env.OPENAI_API_KEY, env.AI_MODEL || 'gpt-6.1-terra'), signal: controller.signal,
          save: async run => {
            await writeFile(path.join(dir, 'run.latest.json'), JSON.stringify(run, null, 2) + '\n');
            if (!values.json) console.error(`${run.events.at(-1)?.stage}: ${run.message}`);
          }
        });
      } finally { process.removeListener('SIGINT', stop); }
      const run = result as Awaited<ReturnType<typeof executeResearch>>;
      status = run.status;
      if (['failed', 'partial', 'cancelled'].includes(status)) process.exitCode = 4;
      const candidateData = mergeAdditions(data, run.research!.additions);
      await writeFile(path.join(dir, 'dataset.json'), JSON.stringify(candidateData, null, 2) + '\n', { flag: 'wx' });
      await writeFile(path.join(dir, 'selection.json'), JSON.stringify({ ...selection, ...Object.fromEntries(run.research!.candidates.map(c => [c.relationshipId, 'unreviewed'])) }, null, 2) + '\n', { flag: 'wx' });
    }
  } else if (command === 'screen') {
    const selected = data.relationships.filter(r => selection[r.id] !== 'excluded' && (!values.market || r.marketId === MarketIdSchema.parse(values.market)));
    result = screen(data, selected.map(r => r.id), criteria, at);
  } else if (command === 'compare') result = compare(data, selection, criteria);
  else result = createBrief(data, selection, criteria, notes, [], at);
  const artifact = { schemaVersion: '1', kind: command, id, status, datasetVersion: data.version, createdAt: at, mode: command === 'research' && env.OPENAI_API_KEY ? 'live-research' : 'deterministic', snapshot: { criteria, selection }, result };
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, `${command}.json`), JSON.stringify(artifact, null, 2) + '\n', { flag: 'wx' });
  if (command === 'compare') await writeFile(path.join(dir, 'research.csv'), exportCsv(data, selection), { flag: 'wx' });
  if (command === 'brief') {
    const b = result as ReturnType<typeof createBrief>;
    const text = [`# ${b.title}`, `Draft · ${b.createdAt} · ${b.datasetVersion} · Independent analyst review pending.`, ...b.sections.map(s => `## ${s.title}\n\n${s.text}\n\n${s.evidenceIds.length ? 'Evidence: ' + s.evidenceIds.join(', ') : ''}`), '## Demographic context', ...b.marketContext.map(m => `### ${m.metroName}\n\n2024 ACS one-year estimates; numeric margins use 90% confidence. Controlled population estimates do not have an applicable sampling margin.\n\n${(Object.keys(demographicLabels) as (keyof typeof demographicLabels)[]).map(k => `- [${demographicLabels[k]}](${m.demographics[k].sourceUrl}): ${formatDemographic(m.demographics[k])}`).join('\n')}`), '## Sources', ...b.sources.map(e => `- ${e.id}: [${e.title}](${e.url}). Scope: ${e.scope}. Retrieved ${e.collectedAt}.`)].join('\n\n');
    await writeFile(path.join(dir, 'brief.md'), text + '\n', { flag: 'wx' });
  }
  console.log(values.json ? JSON.stringify(artifact, null, 2) : `${command}: ${status}\nArtifacts: ${dir}\n${command === 'research' ? env.OPENAI_API_KEY ? 'Research artifacts saved. Review candidates before marking selections accepted.' : 'No paid work ran. Set OPENAI_API_KEY in .env.local.' : 'Completed with shared deterministic logic. Human review decisions are unchanged.'}`);
}
main().catch(error => { console.error(JSON.stringify({ status: 'invalid-input', error: error instanceof Error ? error.message : String(error) })); process.exitCode = 2; });
