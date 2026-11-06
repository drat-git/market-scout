import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { z } from 'zod';
import { validateCase, validateCriteria, validateDataset, SelectionSchema, type ResearchCase } from '../toolkit/schema';
import { emptyDataset, importBatch, completeSelection, contextHash, duplicateWarnings } from '../toolkit/state';
import { screen } from '../toolkit/screen';
import { compare } from '../toolkit/compare';
import { verificationReport, reviewCsv, exportCsv } from '../toolkit/export';
import { briefInput, createBrief, briefMarkdown } from '../toolkit/brief';
const readJson = async (file: string) => JSON.parse(await readFile(path.resolve(file), 'utf8'));
export async function readCaseRun(directory: string) {
  const manifest = z.object({ schemaVersion: z.literal('2'), kind: z.enum(['research', 'screen', 'compare', 'brief']), contextHash: z.string() }).passthrough().parse(await readJson(path.join(directory, 'run.json')));
  const config = validateCase(await readJson(path.join(directory, 'case.json')));
  const data = validateDataset(await readJson(path.join(directory, 'dataset.json')), config);
  const criteria = validateCriteria(await readJson(path.join(directory, 'criteria.json')), config);
  const selection = SelectionSchema.parse(await readJson(path.join(directory, 'selection.json')));
  if (!isDeepStrictEqual(selection, completeSelection(data, selection))) throw new Error('Saved run must contain explicit decisions for every record.');
  if (contextHash(config, data, criteria, selection) !== manifest.contextHash) throw new Error('Saved run inputs changed. Use revised input copies; keep completed runs immutable.');
  const artifact = await readJson(path.join(directory, `${manifest.kind}.json`));
  if (artifact.contextHash !== manifest.contextHash || artifact.kind !== manifest.kind) throw new Error('Run artifact and manifest do not match.');
  return { config, data, criteria, selection, manifest, artifact };
}
export type Options = Partial<Record<'case' | 'from' | 'input' | 'data' | 'criteria' | 'selection' | 'comparison' | 'narrative' | 'notes' | 'out', string>> & { example?: boolean; empty?: boolean; json?: boolean; help?: boolean };
export async function runCase(command: string, values: Options) {
  if (!['research', 'screen', 'compare', 'brief'].includes(command)) throw new Error('Expected research, screen, compare, or brief.');
  if (values.example || values.empty || values.comparison) throw new Error('Configured cases use --case and optional --input/--data, then --from. --example, --empty, and --comparison are legacy demo flags.');
  if (command !== 'research' && values.input) throw new Error('--input is only valid for research.');
  if (command !== 'brief' && (values.notes || values.narrative)) throw new Error('--notes and --narrative are only valid for brief.');
  if (values.narrative && values.notes) throw new Error('Use --notes only for a calculated summary, not an authored narrative.');
  if (values.data && values.input) throw new Error('Use --input for additions or --data for a revised full dataset.');
  const previous = values.from ? await readCaseRun(path.resolve(values.from)) : null;
  if (!previous && !values.case) throw new Error('Start with --case <configuration.json>, or inherit a run with --from.');
  const config: ResearchCase = values.case ? validateCase(await readJson(values.case)) : previous!.config;
  if (previous && previous.config.id !== config.id) throw new Error('Cannot change the case identity in an existing run chain. Start a new case.');
  const at = new Date().toISOString();
  let data = values.data ? validateDataset(await readJson(values.data), config) : previous ? validateDataset(previous.data, config) : emptyDataset(config, at);
  if (values.input) data = importBatch(config, data, await readJson(values.input), at);
  const criteria = validateCriteria(values.criteria ? await readJson(values.criteria) : values.case ? config.criteria : previous?.criteria ?? config.criteria, config);
  const selection = completeSelection(data, values.selection ? SelectionSchema.parse(await readJson(values.selection)) : {}, previous?.selection);
  const hash = contextHash(config, data, criteria, selection), comparison = compare(config, data, criteria, selection);
  if (command === 'brief') {
    if (!previous || previous.manifest.kind !== 'compare') throw new Error('Brief requires --from a configured compare run.');
    if (previous.manifest.contextHash !== hash || !isDeepStrictEqual(previous.artifact.result, comparison)) throw new Error('Saved comparison differs from the case, evidence, criteria, or selection. Run compare again.');
  }
  const notes = values.notes ? await readFile(path.resolve(values.notes), 'utf8') : '';
  if (notes.length > 8000) throw new Error('Notes must be 8,000 characters or fewer.');
  const warnings = duplicateWarnings(data), id = `${command}-${at.replace(/[:.]/g, '-')}`;
  const result = command === 'research' ? { mode: values.input || values.data ? 'supplied-research' : 'case-initialized', records: data.relationships.length, pending: Object.values(selection).filter(v => v === 'unreviewed').length, possibleDuplicates: warnings, description: 'Sources are supplied or collected by the assistant. No CLI search or AI calls occurred.' }
    : command === 'screen' ? screen(config, data, criteria, at) : command === 'compare' ? comparison : createBrief(config, data, criteria, selection, at, values.narrative ? await readJson(values.narrative) : undefined, notes);
  const artifact = { schemaVersion: '2', kind: command, id, status: 'success', caseId: config.id, datasetVersion: data.version, contextHash: hash, createdAt: at, snapshot: { criteria, selection }, warnings, result };
  const directory = path.resolve(values.out ?? `.market-scout/${config.id}/${id}`);
  await mkdir(path.dirname(directory), { recursive: true }); await mkdir(directory);
  const write = (name: string, value: unknown) => writeFile(path.join(directory, name), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
  await write(`${command}.json`, artifact); await write('case.json', config); await write('dataset.json', data); await write('criteria.json', criteria); await write('selection.json', selection);
  if (command === 'screen') { const report = verificationReport(config, data, criteria, selection, at); await write('verification.json', report); await writeFile(path.join(directory, 'review.csv'), reviewCsv(report), { flag: 'wx' }); }
  if (command === 'compare') {
    await writeFile(path.join(directory, 'research.csv'), exportCsv(config, data, criteria, selection), { flag: 'wx' });
    await write('brief-input.json', briefInput(config, data, criteria, selection, at));
    await write('narrative.template.json', { caseId: config.id, datasetVersion: data.version, contextHash: hash, title: config.question, comparison, sections: [] });
  }
  if (command === 'brief') await writeFile(path.join(directory, 'brief.md'), briefMarkdown(result as ReturnType<typeof createBrief>), { flag: 'wx' });
  await write('run.json', { schemaVersion: '2', kind: command, id, caseId: config.id, datasetVersion: data.version, contextHash: hash, createdAt: at, parentRun: values.from ? path.resolve(values.from) : null });
  console.log(values.json ? JSON.stringify(artifact, null, 2) : `${command}: complete\nCase: ${config.title}\nArtifacts: ${directory}\nNo application AI calls were made. Source truth and analytical conclusions require review.`);
}
