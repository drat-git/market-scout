import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { z } from 'zod';
import { DatasetSchema, validateDataset, CriteriaSchema, SelectionSchema, CORE, type Dataset, type Criteria, type Selection } from '../shared/schema';
import { normalizeDomain, normalizeName } from '../shared/normalize';
import { compareLandscape } from '../shared/landscape';
import { compare } from '../shared/compare';
import { screen, screeningDetails } from '../shared/screen';
import { csvCell } from '../shared/export';

export const readJson = async (file: string) => JSON.parse(await readFile(path.resolve(file), 'utf8'));
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(',')}}`;
  return JSON.stringify(value);
}
export const digest = (value: unknown) => createHash('sha256').update(canonical(value)).digest('hex');
export const contextHash = (data: Dataset, criteria: Criteria, selection: Selection) => digest({ data, criteria, selection });

export async function readRun(directory: string) {
  const manifest = z.object({ schemaVersion: z.literal('1'), kind: z.enum(['research', 'screen', 'compare', 'brief']), contextHash: z.string() }).passthrough().parse(await readJson(path.join(directory, 'run.json')));
  const data = validateDataset(await readJson(path.join(directory, 'dataset.json')));
  const criteria = CriteriaSchema.parse(await readJson(path.join(directory, 'criteria.json')));
  const selection = SelectionSchema.parse(await readJson(path.join(directory, 'selection.json')));
  if (contextHash(data, criteria, selection) !== manifest.contextHash) throw new Error('Saved run inputs changed. Keep runs immutable; pass a revised copy with --data, --criteria, or --selection from the original run.');
  const artifact = await readJson(path.join(directory, `${manifest.kind}.json`));
  if (artifact.contextHash !== manifest.contextHash) throw new Error('Run manifest and stage artifact do not match.');
  return { data, criteria, selection, artifact, manifest };
}

const batchFields = ['companies', 'locations', 'serviceAreas', 'relationships', 'evidence'] as const;
const BatchSchema = DatasetSchema.pick({ companies: true, locations: true, serviceAreas: true, relationships: true, evidence: true })
  .extend({ researchLog: DatasetSchema.shape.researchLog.optional(), limitations: z.array(z.string()).optional() }).strict();

export function importResearch(base: Dataset, input: unknown, at: string): Dataset {
  const batch = BatchSchema.parse(input);
  const merged = structuredClone(base);
  for (const key of batchFields) {
    const existing = new Map<string, unknown>(base[key].map(item => [item.id, item]));
    const incomingIds = new Set<string>();
    for (const item of batch[key]) {
      if (incomingIds.has(item.id)) throw new Error(`Duplicate ${key} ID in research input: ${item.id}`);
      incomingIds.add(item.id);
      const previous = existing.get(item.id);
      if (previous) {
        if (!isDeepStrictEqual(previous, item)) throw new Error(`Research input would overwrite ${key}/${item.id}. Use a revised full dataset with --data for evidence corrections.`);
      } else (merged[key] as { id: string }[]).push(structuredClone(item));
    }
  }
  merged.researchLog.push(...(batch.researchLog ?? []));
  merged.limitations = [...new Set([...merged.limitations, ...(batch.limitations ?? [])])];
  merged.collectedAt = at; // Dataset assembly time; individual evidence dates are untouched.
  merged.version = `research-${digest(merged).slice(0, 16)}`;
  return validateDataset(merged);
}

export function emptyResearch(base: Dataset): Dataset {
  return { ...structuredClone(base), version: 'new-case', companies: [], locations: [], serviceAreas: [], relationships: [], evidence: [], researchLog: [],
    limitations: ['Assistant-collected research sample; coverage and source accuracy need review. Metro definitions and demographic context were inherited from the bundled case, not freshly researched.'] };
}

export function completeSelection(data: Dataset, choices: Selection, inherited: Selection = {}): Selection {
  for (const id of Object.keys(choices)) if (!data.relationships.some(r => r.id === id)) throw new Error(`Unknown selection identifier: ${id}`);
  return Object.fromEntries(data.relationships.map(r => [r.id, choices[r.id] ?? inherited[r.id] ?? 'unreviewed']));
}

// Convert legacy/default implicit selections once; subsequent runs carry every decision explicitly.
export function legacySelection(data: Dataset, selection: Selection): Selection {
  return Object.fromEntries(data.relationships.map(r => [r.id, selection[r.id] ?? (data.companies.find(c => c.id === r.companyId)!.origin === 'baseline' ? 'accepted' : 'unreviewed')]));
}

export function duplicateWarnings(data: Dataset) {
  return data.companies.flatMap((company, i) => data.companies.slice(i + 1).flatMap(other => {
    const domain = normalizeDomain(company.website);
    const sameDomain = domain !== null && domain === normalizeDomain(other.website);
    const sameName = normalizeName(company.name) === normalizeName(other.name);
    return sameDomain || sameName ? [{ companyIds: [company.id, other.id], reason: sameDomain && sameName ? 'Same normalized name and domain; resolve identity before comparison.' : 'Shared name or domain; review identity without assuming these brands are the same company.' }] : [];
  }));
}

export function verificationReport(data: Dataset, criteria: Criteria, selection: Selection, at: string) {
  return screen(data, data.relationships.map(r => r.id), criteria, at).map(assessment => {
    const r = data.relationships.find(r => r.id === assessment.relationshipId)!;
    return { relationshipId: r.id, company: data.companies.find(c => c.id === r.companyId)!.name, market: r.marketId, decision: selection[r.id], assessment, details: screeningDetails(data, r.id, criteria) };
  });
}
export function reviewCsv(report: ReturnType<typeof verificationReport>): string {
  const rows: unknown[][] = [['relationship_id', 'company', 'market', 'human_decision', 'screening_result', 'reason', 'next_checks', 'evidence_ids']];
  for (const row of report) rows.push([row.relationshipId, row.company, row.market, row.decision, row.assessment.result, row.details.summary,
    [...new Set(row.details.decisionChecks.flatMap(c => c.nextStep ? [`${row.details.decisionScope}: ${c.nextStep}`] : []))].join('; '), row.assessment.evidenceIds.join('; ')]);
  return '\ufeff' + rows.map(row => row.map(csvCell).join(',')).join('\r\n');
}

export function briefInput(data: Dataset, criteria: Criteria, selection: Selection, at: string) {
  const c = compare(data, selection, criteria);
  const landscapeServices = criteria.requiredServices.length ? [...new Set(criteria.requiredServices)] : [...CORE];
  return { comparison: c, landscapeServices, landscape: compareLandscape(data, selection, landscapeServices),
    providers: verificationReport(data, criteria, selection, at).filter(r => c.relationshipIds.includes(r.relationshipId)),
    evidence: data.evidence.filter(e => c.evidenceIds.includes(e.id)),
    scope: 'Included providers only. Physical-clinic and service-coverage results are distinct. The landscape always describes documented physical clinics.' };
}
