import type { Criteria, Dataset, Evidence, ResearchCase } from './schema';
export type FactState = 'yes' | 'no' | 'unknown';
export type Check = { id: string; label: string; state: FactState; evidenceIds: string[]; detail: string; nextStep: string | null };
export function resolveFact(evidence: Evidence[], fact: string, criteria: Criteria): FactState {
  const relevant = evidence.filter(e => e.facts.includes(fact) && criteria.acceptedSourceTypes.includes(e.sourceType) && e.verification !== 'unverified');
  if (relevant.some(e => e.verification === 'conflicting')) return 'unknown';
  const yes = relevant.some(e => e.supports), no = relevant.some(e => !e.supports);
  return yes === no ? 'unknown' : yes ? 'yes' : 'no';
}
export function evidenceFor(data: Dataset, relationshipId: string): Evidence[] {
  const r = data.relationships.find(r => r.id === relationshipId);
  if (!r) throw new Error(`Unknown relationship: ${relationshipId}`);
  const locations = new Set(data.locations.filter(s => s.companyId === r.companyId && s.marketId === r.marketId).map(s => s.id));
  const areas = new Set(data.serviceAreas.filter(s => s.companyId === r.companyId && s.marketId === r.marketId).map(s => s.id));
  return data.evidence.filter(e => e.companyId === r.companyId && (e.scope === 'company' || (e.scope === 'location' ? locations : areas).has(e.scopeId)));
}
export function combine(states: FactState[], mode: 'all' | 'any'): FactState {
  return mode === 'all' ? states.includes('no') ? 'no' : states.every(s => s === 'yes') ? 'yes' : 'unknown'
    : states.includes('yes') ? 'yes' : states.every(s => s === 'no') ? 'no' : 'unknown';
}
function check(id: string, label: string, facts: string[], match: 'all' | 'any', evidence: Evidence[], criteria: Criteria, nextStep: string, expected = true): Check {
  const selected = evidence.filter(e => e.facts.some(f => facts.includes(f)));
  const states = facts.map(f => {
    const state = resolveFact(evidence, f, criteria);
    return expected || state === 'unknown' ? state : state === 'yes' ? 'no' : 'yes';
  });
  const state = combine(states, match);
  const conflicting = facts.some(f => {
    const items = selected.filter(e => e.facts.includes(f) && criteria.acceptedSourceTypes.includes(e.sourceType) && e.verification !== 'unverified');
    return items.some(e => e.verification === 'conflicting') || items.some(e => e.supports) && items.some(e => !e.supports);
  });
  return { id, label, state, evidenceIds: selected.map(e => e.id), nextStep: state === 'unknown' ? nextStep : null,
    detail: state === 'yes' ? 'Supported at the required scope by the configured source policy.' : state === 'no' ? 'Checked evidence contradicts this requirement.' : conflicting ? 'Relevant checked evidence conflicts; the requirement remains unresolved.' : 'The saved evidence does not establish this requirement at the required scope.' };
}
export function screenOne(config: ResearchCase, data: Dataset, id: string, criteria: Criteria, at: string) {
  const r = data.relationships.find(r => r.id === id)!;
  if (!r) throw new Error(`Unknown relationship: ${id}`);
  const all = evidenceFor(data, id), company = all.filter(e => e.scope === 'company');
  const locations = data.locations.filter(s => s.companyId === r.companyId && s.marketId === r.marketId).map(s => ({ ...s, type: 'location' as const }));
  const areas = data.serviceAreas.filter(s => s.companyId === r.companyId && s.marketId === r.marketId).map(s => ({ ...s, type: 'service-area' as const }));
  const scopes = criteria.geography === 'physical' ? locations : criteria.geography === 'coverage' ? areas : criteria.geography === 'either' ? [...locations, ...areas] : [];
  const groups = (scopes.length ? scopes : [null]).map(scope => {
    const local = scope ? all.filter(e => e.scope === scope.type && e.scopeId === scope.id) : [];
    const checks: Check[] = [];
    if (criteria.geography !== 'none') checks.push(check('presence', scope?.type === 'service-area' ? 'Documented service coverage in this market' : 'Documented presence in this market', [scope?.type === 'service-area' ? 'coverage' : 'physical-presence'], 'all', local, criteria, `Verify ${criteria.geography === 'physical' ? 'a physical location' : criteria.geography === 'coverage' ? 'explicit service coverage' : 'a physical location or explicit service coverage'} within ${config.markets.find(m => m.id === r.marketId)!.name}'s configured boundary.`));
    for (const rule of criteria.rules) checks.push(check(rule.id, rule.label, rule.facts, rule.match, rule.scope === 'company' ? company : rule.scope === 'local' ? local : [...company, ...local], criteria, rule.nextStep, rule.expected));
    const state = combine(checks.map(c => c.state), 'all');
    return { scopeId: scope?.id ?? null, scopeType: scope?.type ?? 'company', name: scope?.name ?? (criteria.geography === 'none' ? 'Company' : 'No documented local presence'), result: state === 'yes' ? 'match' : state === 'no' ? 'exclude' : 'uncertain', checks };
  });
  const best = [...groups].sort((a, b) => ({ match: 2, uncertain: 1, exclude: 0 }[b.result]! - { match: 2, uncertain: 1, exclude: 0 }[a.result]! || b.checks.filter(c => c.state === 'yes').length - a.checks.filter(c => c.state === 'yes').length))[0];
  const result = groups.some(g => g.result === 'match') ? 'match' : groups.every(g => g.result === 'exclude') ? 'exclude' : 'uncertain';
  const decisionChecks = best.checks.filter(c => c.state !== 'yes');
  return { relationshipId: id, company: data.companies.find(c => c.id === r.companyId)!.name, marketId: r.marketId, result, assessedAt: at, datasetVersion: data.version, criteria: structuredClone(criteria),
    summary: `${best.name}: ${result === 'match' ? 'all configured requirements are supported.' : decisionChecks.map(c => `${c.label}: ${c.state === 'no' ? 'contradicted' : 'not confirmed'}`).join('; ')}`,
    decisionScope: best.name, decisionChecks, groups, evidenceIds: all.map(e => e.id) };
}
export const screen = (config: ResearchCase, data: Dataset, criteria: Criteria, at: string) => data.relationships.map(r => screenOne(config, data, r.id, criteria, at));
