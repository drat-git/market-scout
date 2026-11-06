#!/usr/bin/env node
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { isDeepStrictEqual, parseArgs } from 'node:util';
import { baseline } from '../shared/baseline';
import { initialSelection, demoDataset, exampleCandidates, loadExampleCandidates } from '../shared/demo';
import { CriteriaSchema, DEFAULT_CRITERIA, SelectionSchema, validateDataset } from '../shared/schema';
import { screen } from '../shared/screen';
import { compare } from '../shared/compare';
import { createBrief } from '../shared/brief';
import { createAuthoredBrief, briefMarkdown } from '../shared/narrative';
import { exportCsv } from '../shared/export';
import { readJson, readRun, contextHash, importResearch, emptyResearch, completeSelection, legacySelection, duplicateWarnings, verificationReport, reviewCsv, briefInput } from './workflow';

export async function runLegacy() {
  const { positionals, values } = parseArgs({ allowPositionals: true, options: {
    from: { type: 'string' }, input: { type: 'string' }, empty: { type: 'boolean' }, data: { type: 'string' }, criteria: { type: 'string' }, selection: { type: 'string' }, comparison: { type: 'string' }, narrative: { type: 'string' }, notes: { type: 'string' }, out: { type: 'string' }, example: { type: 'boolean' }, json: { type: 'boolean' }, help: { type: 'boolean' },
  } });
  const command = positionals[0];
  if (values.help || !command) {
    console.log(`Market Scout — four-stage research toolkit
Commands: research | screen | compare | brief
All commands run offline. The assistant performs source research and narrative authoring.

--from directory         Inherit a prior run's dataset, criteria, and decisions
--out directory          New run directory; existing runs are never overwritten
--data file              Revised full dataset (default: bundled pediatric case)
--criteria file          Required services and physical/coverage geography
--selection file         Decision overrides; unmentioned decisions inherit from --from
--json                   Print the stage artifact instead of a short summary

research --example       Load the saved Austin candidates; no live search
research --input file    Import a source-evidence batch; new records start unreviewed
research --empty         With --input: use only new research, retaining metro definitions
research --data file     Validate a complete assistant-collected dataset
screen --from directory  Explain all records against stored evidence; never browse
compare --from directory Calculate included records; save CSV, landscape, and brief input
brief --from directory   From a compare run; --narrative file validates authored analysis
brief --comparison file  Legacy compare.json; supply matching --data for custom research
--notes file             Optional notes for a deterministic brief, not --narrative

Every run saves dataset.json, criteria.json, selection.json, run.json, and its stage artifact.
Screen adds verification.json and review.csv. Compare adds research.csv, brief-input.json,
and narrative.template.json. Brief adds brief.md. Exit 0 = structural success, not source approval.
Exit 2 = invalid input, stale context, or an existing output directory.
Supported case: pediatric therapy in Austin and San Antonio. See docs/SOP.md.`);
    return;
  }
  if (positionals.length !== 1 || !['research', 'screen', 'compare', 'brief'].includes(command)) throw new Error('Expected research, screen, compare, or brief.');
  if (values.comparison && command !== 'brief') throw new Error('--comparison is only valid for brief.');
  if (values.narrative && command !== 'brief') throw new Error('--narrative is only valid for brief.');
  if ((values.example || values.input || values.empty) && command !== 'research') throw new Error('--example, --input, and --empty are only valid for research.');
  if (values.notes && command !== 'brief') throw new Error('--notes is only valid for brief.');
  if (values.example && (values.data || values.input || values.empty || values.from)) throw new Error('Use --example without --from, --input, --data, or --empty.');
  if (values.empty && (!values.input || values.data || values.from)) throw new Error('--empty requires --input and cannot inherit --from or --data.');
  if (values.input && values.data) throw new Error('Choose --input for additions or --data for a revised dataset.');
  if (command === 'research' && !values.example && !values.input && !values.data) throw new Error('Supply --example, --input, or --data. No live search was performed.');
  if (values.narrative && values.notes) throw new Error('Keep notes separate from an authored narrative, or use --notes with the deterministic summary.');
  const at = new Date().toISOString();
  const previous = values.from ? await readRun(path.resolve(values.from)) : null;
  let data = values.example ? demoDataset : values.data ? validateDataset(await readJson(values.data)) : previous?.data ?? baseline;
  if (values.empty) data = emptyResearch(baseline);
  if (values.input) data = importResearch(data, await readJson(values.input), at);
  const saved = values.comparison ? await readJson(values.comparison) : command === 'brief' && previous?.manifest.kind === 'compare' ? previous.artifact : null;
  if (command === 'brief' && previous && !saved) throw new Error('For brief --from, choose a compare run. Run compare on the current context first.');
  if (saved && (saved.kind !== 'compare' || saved.datasetVersion !== data.version)) throw new Error('Comparison does not match this dataset.');
  const criteria = CriteriaSchema.parse(values.criteria ? await readJson(values.criteria) : previous?.criteria ?? saved?.snapshot?.criteria ?? DEFAULT_CRITERIA);
  const inherited = previous?.selection ?? (saved ? legacySelection(data, SelectionSchema.parse(saved.snapshot.selection))
    : values.example ? legacySelection(data, loadExampleCandidates(initialSelection))
    : values.data || values.empty ? {} : legacySelection(baseline, initialSelection));
  const choices = values.selection ? SelectionSchema.parse(await readJson(values.selection)) : {};
  const selection = completeSelection(data, choices, inherited);
  const current = compare(data, selection, criteria);
  const hash = contextHash(data, criteria, selection);
  if (saved && (!isDeepStrictEqual(saved.result, current) || (saved.contextHash && saved.contextHash !== hash))) throw new Error('Saved comparison differs from the supplied evidence, criteria, or selections. Run compare again.');
  const notes = values.notes ? await readFile(path.resolve(values.notes), 'utf8') : '';
  if (notes.length > 8000) throw new Error('Notes must be 8,000 characters or fewer.');
  const id = `${command}-${at.replace(/[:.]/g, '-')}`;
  const warnings = duplicateWarnings(data);
  let result: unknown;
  if (command === 'research') result = { mode: values.example ? 'prepared-example' : 'supplied-research', description: values.example ? exampleCandidates.description : 'Assistant-supplied research validated structurally. Sources still require review.', records: data.relationships.length, pending: Object.values(selection).filter(v => v === 'unreviewed').length, possibleDuplicates: warnings };
  else if (command === 'screen') result = screen(data, data.relationships.map(r => r.id), criteria, at);
  else if (command === 'compare') result = current;
  else result = values.narrative ? createAuthoredBrief(data, selection, criteria, await readJson(values.narrative), at) : createBrief(data, selection, criteria, notes, [], at);
  const artifact = { schemaVersion: '1', kind: command, id, status: 'success', datasetVersion: data.version, contextHash: hash, createdAt: at, mode: command === 'research' ? values.example ? 'prepared-example' : 'supplied-research' : values.narrative ? 'authored-narrative' : 'deterministic', snapshot: { criteria, selection }, warnings, result };
  const dir = path.resolve(values.out ?? `.market-scout/${id}`);
  await mkdir(path.dirname(dir), { recursive: true });
  await mkdir(dir); // Exclusive creation prevents replacement of completed or interrupted runs.
  const write = (name: string, value: unknown) => writeFile(path.join(dir, name), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
  await write(`${command}.json`, artifact);
  await write('dataset.json', data);
  await write('criteria.json', criteria);
  await write('selection.json', selection);
  if (command === 'screen') {
    const report = verificationReport(data, criteria, selection, at);
    await write('verification.json', report);
    await writeFile(path.join(dir, 'review.csv'), reviewCsv(report), { flag: 'wx' });
  }
  if (command === 'compare') {
    await writeFile(path.join(dir, 'research.csv'), exportCsv(data, selection), { flag: 'wx' });
    await write('brief-input.json', briefInput(data, criteria, selection, at));
    await write('narrative.template.json', { datasetVersion: data.version, title: 'Research brief', comparison: current, sections: [] });
  }
  if (command === 'brief') await writeFile(path.join(dir, 'brief.md'), briefMarkdown(result as ReturnType<typeof createBrief>), { flag: 'wx' });
  // Write last: incomplete output directories cannot masquerade as resumable runs.
  await write('run.json', { schemaVersion: '1', kind: command, id, createdAt: at, datasetVersion: data.version, contextHash: hash, parentRun: values.from ? path.resolve(values.from) : null });
  console.log(values.json ? JSON.stringify(artifact, null, 2) : `${command}: complete\nArtifacts: ${dir}\n${warnings.length ? `Identity review signals: ${warnings.length}\n` : ''}No application AI calls were made.${values.narrative ? ' Narrative references and calculations checked; prose still needs source review.' : ''}`);
}
