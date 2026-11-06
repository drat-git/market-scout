import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { BatchSchema, validateDataset, type Dataset, type ResearchCase, type Selection, type Criteria } from './schema';
import { normalizeDomain, normalizeName } from '../shared/normalize';
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(',')}}`;
  return JSON.stringify(value);
}
export const digest = (value: unknown) => createHash('sha256').update(canonical(value)).digest('hex');
export const contextHash = (config: ResearchCase, data: Dataset, criteria: Criteria, selection: Selection) => digest({ config, data, criteria, selection });
export function emptyDataset(config: ResearchCase, at: string): Dataset {
  return { schemaVersion: '2', caseId: config.id, version: 'empty-1', collectedAt: at, humanReview: 'pending', companies: [], locations: [], serviceAreas: [], relationships: [], evidence: [], researchLog: [], limitations: [] };
}
export function importBatch(config: ResearchCase, base: Dataset, input: unknown, at: string): Dataset {
  const batch = BatchSchema.parse(input), merged = structuredClone(base);
  for (const key of ['companies', 'locations', 'serviceAreas', 'relationships', 'evidence'] as const) {
    const ids = new Set<string>();
    for (const item of batch[key]) {
      if (ids.has(item.id)) throw new Error(`Duplicate ${key} ID in batch: ${item.id}`);
      ids.add(item.id);
      const previous = base[key].find(p => p.id === item.id);
      if (previous && !isDeepStrictEqual(previous, item)) throw new Error(`Batch would overwrite ${key}/${item.id}. Use --data with a revised full dataset for corrections.`);
      if (!previous) (merged[key] as { id: string }[]).push(structuredClone(item));
    }
  }
  merged.companies = merged.companies.map(c => ({ ...c, domain: normalizeDomain(c.website) ?? c.domain }));
  merged.researchLog.push(...batch.researchLog);
  merged.limitations = [...new Set([...merged.limitations, ...batch.limitations])];
  merged.collectedAt = at;
  merged.version = `research-${digest(merged).slice(0, 16)}`;
  return validateDataset(merged, config);
}
export function completeSelection(data: Dataset, overrides: Selection, previous: Selection = {}): Selection {
  for (const id of Object.keys(overrides)) if (!data.relationships.some(r => r.id === id)) throw new Error(`Unknown selection identifier: ${id}`);
  return Object.fromEntries(data.relationships.map(r => [r.id, overrides[r.id] ?? previous[r.id] ?? 'unreviewed']));
}
export function duplicateWarnings(data: Dataset) {
  return data.companies.flatMap((c, i) => data.companies.slice(i + 1).flatMap(other => {
    const domain = normalizeDomain(c.website), shared = domain !== null && domain === normalizeDomain(other.website);
    return shared || normalizeName(c.name) === normalizeName(other.name) ? [{ companyIds: [c.id, other.id], reason: 'Shared name or domain: review identity; do not merge brands or branches automatically.' }] : [];
  }));
}
