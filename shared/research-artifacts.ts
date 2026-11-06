import { normalizeDomain, normalizeName } from './normalize';
import { validateDataset, type Dataset } from './schema';

export type Additions = Pick<Dataset, 'companies' | 'locations' | 'serviceAreas' | 'relationships' | 'evidence'>;
export type Lead = { name: string; website: string; sourceUrls: string[] };
export type SourceCheck = { id: string; url: string; title: string; collectedAt: string; status: 'retrieved' | 'failed'; detail: string };
export type Candidate = { relationshipId: string; name: string; website: string; warnings: string[]; possibleDuplicates: string[] };
export type ResearchDetails = { marketId: 'austin' | 'san-antonio'; model: string; leads: Lead[]; sources: SourceCheck[]; candidates: Candidate[]; additions: Additions; usage: { stage: string; responseId: string; inputTokens: number; outputTokens: number; webSearchCalls: number }[] };
export function emptyAdditions(): Additions { return { companies: [], locations: [], serviceAreas: [], relationships: [], evidence: [] }; }
export function mergeAdditions(base: Dataset, additions: Additions): Dataset {
  const merged = structuredClone(base);
  for (const field of ['companies', 'locations', 'serviceAreas', 'relationships', 'evidence'] as const) {
    const incoming = additions[field].filter(item => !merged[field].some(existing => existing.id === item.id));
    // Lists are individually validated by validateDataset after the merge.
    (merged[field] as { id: string }[]).push(...structuredClone(incoming));
  }
  if (merged.companies.some(c => c.origin === 'new')) {
    // Content version for immutable artifacts (not a security hash).
    let hash = 14695981039346656037n;
    const content = JSON.stringify([merged.companies, merged.locations, merged.serviceAreas, merged.relationships, merged.evidence].map(list => [...list].sort((a,b) => a.id.localeCompare(b.id))));
    for (const char of content) hash = BigInt.asUintN(64, (hash ^ BigInt(char.codePointAt(0)!)) * 1099511628211n);
    merged.version = `${base.version.split('+research')[0]}+research-${hash.toString(16)}`;
  }
  return validateDataset(merged);
}
export function exactCompany(base: Dataset, lead: Lead) {
  return base.companies.find(c => normalizeDomain(c.website) === normalizeDomain(lead.website) && normalizeName(c.name) === normalizeName(lead.name));
}
