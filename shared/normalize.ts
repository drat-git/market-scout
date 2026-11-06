// Domain behavior adapted from Nicolas Goldberg's MIT-licensed merge.py.
// See docs/ATTRIBUTION.md and docs/THIRD_PARTY_NOTICES.md.
import type { Company, Evidence } from './schema';

export function normalizeDomain(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  try {
    const u = new URL(/^https?:\/\//i.test(value.trim()) ? value.trim() : `https://${value.trim()}`);
    if (!['https:', 'http:'].includes(u.protocol) || !u.hostname.includes('.')) return null;
    return u.hostname.toLowerCase().replace(/^www\./, '');
  } catch { return null; }
}
export const normalizeName = (s: string) => s.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

// A shared domain is a review signal, never sufficient for an automatic merge.
export function normalizeCompanies(companies: Company[], evidence: Evidence[]) {
  const normalized: Company[] = [];
  const aliases: Record<string, string> = {};
  const possibleDuplicates: [string, string][] = [];
  for (const input of companies) {
    const c = { ...input, domain: normalizeDomain(input.website) ?? input.domain };
    const exact = normalized.find(x => x.domain === c.domain && normalizeName(x.name) === normalizeName(c.name));
    if (exact) { aliases[c.id] = exact.id; continue; }
    for (const x of normalized) if (x.domain === c.domain || normalizeName(x.name) === normalizeName(c.name)) possibleDuplicates.push([x.id, c.id]);
    normalized.push(c);
  }
  return { companies: normalized, aliases, possibleDuplicates, evidence: evidence.map(e => ({ ...e, companyId: aliases[e.companyId] ?? e.companyId, scopeId: e.scope === 'company' ? aliases[e.scopeId] ?? e.scopeId : e.scopeId })) };
}
