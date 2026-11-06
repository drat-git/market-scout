#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { runCase } from './case-workflow';

async function main() {
  const { positionals, values } = parseArgs({ allowPositionals: true, options: {
    case: { type: 'string' }, from: { type: 'string' }, input: { type: 'string' }, data: { type: 'string' }, criteria: { type: 'string' }, selection: { type: 'string' }, comparison: { type: 'string' }, narrative: { type: 'string' }, notes: { type: 'string' }, out: { type: 'string' }, example: { type: 'boolean' }, empty: { type: 'boolean' }, json: { type: 'boolean' }, help: { type: 'boolean' }
  } });
  if (values.help || !positionals.length) {
    console.log(`Market Scout — configurable research skills
Commands: research | screen | compare | brief

Start a case:
  research --case cases/commercial-hvac.json --input examples/commercial-hvac/research.json --out .market-scout/hvac/research-01
  research --case my-case.json --out .market-scout/my-case/research-01
Continue:
  screen --from <research-run> --out <new-directory>
  compare --from <screen-run> --selection <decisions.json> --out <new-directory>
  brief --from <compare-run> --narrative <narrative.json> --out <new-directory>

--case file       Industry, question, markets, facts, screening rules, comparisons
--input file      Research batch (research only); new records remain unreviewed
--data file       Revised full dataset, never a silent source overwrite
--from directory  Inherit the complete case, evidence, rules, and decisions
--criteria file   Explicit rule override against the case's fact vocabulary
--selection file  Decision overrides; unmentioned decisions inherit
--out directory   New directory; completed/partial outputs are never overwritten
--json            Print the stage artifact; use npm --silent for clean JSON
--notes file      Optional unverified notes for a calculated brief summary

All default commands are offline. The assistant collects sources and authors prose.
Configured runs save case.json, dataset.json, criteria.json, selection.json, and run.json.
Screen adds a review queue; compare adds an evidence pack and narrative template.
Austin/San Antonio pediatric therapy is an example in cases/pediatric-therapy.json.
Older v1 demo commands/runs remain compatible (--example, --empty, --comparison).
New research should always start with --case. See docs/SOP.md and docs/CASE-CONFIG.md.`);
    return;
  }
  if (positionals.length !== 1) throw new Error('Expected one command: research, screen, compare, or brief.');
  let configured = Boolean(values.case);
  if (values.from) {
    const manifest = JSON.parse(await readFile(path.resolve(values.from, 'run.json'), 'utf8'));
    if (manifest.schemaVersion === '2') configured = true;
    else if (configured) throw new Error('A v1 demo run cannot be reinterpreted as a configured case. Import the example dataset with --case into a new chain.');
  }
  if (values.data && !configured) {
    const data = JSON.parse(await readFile(path.resolve(values.data), 'utf8'));
    if (data.schemaVersion === '2') throw new Error('A v2 dataset needs --case or --from a configured run.');
  }
  if (configured) await runCase(positionals[0], values);
  else { const { runLegacy } = await import('./legacy'); await runLegacy(); }
}
main().catch(error => { console.error(JSON.stringify({ status: 'invalid-input', error: error instanceof Error ? error.message : String(error) })); process.exitCode = 2; });
