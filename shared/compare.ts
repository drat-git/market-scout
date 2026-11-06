import { SERVICES, type Criteria, type Dataset, type Selection } from './schema';
import { evidenceFor, resolveFact, screen } from './screen';

export function selectedRelationships(d: Dataset, selection: Selection) {
  return d.relationships.filter(r => selection[r.id] === 'accepted' || (selection[r.id] === undefined && d.companies.find(c => c.id === r.companyId)?.origin === 'baseline'));
}
export function compare(d: Dataset, selection: Selection, criteria: Criteria) {
  const selected = selectedRelationships(d, selection);
  const assessments = screen(d, selected.map(r => r.id), criteria);
  return {
    schemaVersion: '1' as const, datasetVersion: d.version, criteria: structuredClone(criteria),
    relationshipIds: selected.map(r => r.id), uniqueCompanies: new Set(selected.map(r => r.companyId)).size,
    markets: d.markets.map(m => {
      const rs = selected.filter(r => r.marketId === m.id), ids = new Set(rs.map(r => r.companyId));
      const locations = d.locations.filter(l => l.marketId === m.id && ids.has(l.companyId) && resolveFact(d.evidence.filter(e => e.scope === 'location' && e.scopeId === l.id), 'physical-presence') === 'yes');
      const coverage = d.serviceAreas.filter(a => a.marketId === m.id && ids.has(a.companyId) && resolveFact(d.evidence.filter(e => e.scope === 'service-area' && e.scopeId === a.id), 'coverage') === 'yes');
      return { id: m.id, name: m.name, companies: ids.size, locations: locations.length,
        coverageCompanies: new Set(coverage.map(a => a.companyId)).size,
        baseline: rs.filter(r => d.companies.find(c => c.id === r.companyId)?.origin === 'baseline').length,
        additions: rs.filter(r => d.companies.find(c => c.id === r.companyId)?.origin === 'new').length,
        uncertain: assessments.filter(a => rs.some(r => r.id === a.relationshipId) && a.result === 'uncertain').length,
        matches: assessments.filter(a => rs.some(r => r.id === a.relationshipId) && a.result === 'match').length,
        services: Object.fromEntries(SERVICES.map(s => [s, rs.filter(r => {
          const evidence = evidenceFor(d, r.id);
          return locations.some(l => l.companyId === r.companyId && resolveFact(evidence.filter(e => e.scope === 'location' && e.scopeId === l.id), `service:${s}`) === 'yes');
        }).length])) as Record<typeof SERVICES[number], number>
      };
    }),
    evidenceIds: [...new Set(selected.flatMap(r => evidenceFor(d, r.id).map(e => e.id)))],
    limitations: [...d.limitations, 'Counts describe the selected research sample, not total competition, market share, demand, or investment attractiveness.']
  };
}
export type Comparison = ReturnType<typeof compare>;
