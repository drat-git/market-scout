import type { Criteria, Dataset, ResearchCase, Selection } from './schema';
import { combine, evidenceFor, resolveFact, screenOne } from './screen';
import { digest } from './state';
export const selectedRelationships = (data: Dataset, selection: Selection) => data.relationships.filter(r => selection[r.id] === 'accepted');
export function compare(config: ResearchCase, data: Dataset, criteria: Criteria, selection: Selection) {
  const selected = selectedRelationships(data, selection);
  const records = selected.map(r => {
    const evidence = evidenceFor(data, r.id);
    const locations = data.locations.filter(l => l.companyId === r.companyId && l.marketId === r.marketId && resolveFact(evidence.filter(e => e.scope === 'location' && e.scopeId === l.id), 'physical-presence', criteria) === 'yes');
    const areas = data.serviceAreas.filter(a => a.companyId === r.companyId && a.marketId === r.marketId && resolveFact(evidence.filter(e => e.scope === 'service-area' && e.scopeId === a.id), 'coverage', criteria) === 'yes');
    return { ...r, name: data.companies.find(c => c.id === r.companyId)!.name, evidence, locations, areas };
  });
  return {
    schemaVersion: '2' as const, caseId: config.id, caseVersion: config.version, caseFingerprint: digest(config), datasetVersion: data.version, industry: config.industry, question: config.question, criteria: structuredClone(criteria),
    relationshipIds: selected.map(r => r.id), uniqueCompanies: new Set(selected.map(r => r.companyId)).size,
    markets: config.markets.map(m => {
      const rs = records.filter(r => r.marketId === m.id);
      const assessments = rs.map(r => screenOne(config, data, r.id, criteria, data.collectedAt));
      const locations = rs.flatMap(r => r.locations.map(l => ({ ...l, companyName: r.name, relationshipId: r.id })));
      const localityNames = [...new Set(locations.flatMap(l => l.locality?.trim() ? [l.locality.trim().toLowerCase()] : []))];
      return { id: m.id, name: m.name, boundary: m.boundary, companies: rs.length, locations: locations.length, coverageCompanies: rs.filter(r => r.areas.length).length,
        matches: assessments.filter(a => a.result === 'match').length, uncertain: assessments.filter(a => a.result === 'uncertain').length, screenedExclusions: assessments.filter(a => a.result === 'exclude').length,
        attributes: config.attributes.map(a => ({ id: a.id, label: a.label,
          companyClaims: rs.filter(r => resolveFact(r.evidence.filter(e => e.scope === 'company'), a.id, criteria) === 'yes').length,
          atPhysicalLocation: rs.filter(r => r.locations.some(l => resolveFact(r.evidence.filter(e => e.scope === 'location' && e.scopeId === l.id), a.id, criteria) === 'yes')).length,
          inServiceArea: rs.filter(r => r.areas.some(s => resolveFact(r.evidence.filter(e => e.scope === 'service-area' && e.scopeId === s.id), a.id, criteria) === 'yes')).length })),
        profiles: config.comparisons.map(profile => ({ ...profile, providers: rs.flatMap(r => {
          const scopes = profile.scope === 'company' ? [{ id: r.companyId, name: r.name }] : profile.scope === 'location' ? r.locations : r.areas;
          const qualifying = scopes.filter(s => combine(profile.facts.map(f => resolveFact(r.evidence.filter(e => e.scope === profile.scope && e.scopeId === s.id), f, criteria)), profile.match) === 'yes');
          return qualifying.length ? [{ relationshipId: r.id, companyId: r.companyId, name: r.name, scopes: qualifying.map(s => ({ id: s.id, name: s.name })), evidenceIds: r.evidence.filter(e => e.scope === profile.scope && qualifying.some(s => s.id === e.scopeId) && e.facts.some(f => profile.facts.includes(f) || f === 'physical-presence' || f === 'coverage')).map(e => e.id) }] : [];
        }) })),
        geography: { localities: localityNames.map(name => ({ locality: locations.find(l => l.locality?.trim().toLowerCase() === name)!.locality!, locations: locations.filter(l => l.locality?.trim().toLowerCase() === name) })), unresolved: locations.filter(l => !l.locality?.trim()) },
        context: structuredClone(m.context)
      };
    }),
    sharedOperators: data.companies.flatMap(c => {
      const presence = records.filter(r => r.companyId === c.id && (r.locations.length || r.areas.length));
      return presence.length > 1 ? [{ companyId: c.id, name: c.name, markets: presence.map(r => ({ marketId: r.marketId, physicalLocationIds: r.locations.map(l => l.id), serviceAreaIds: r.areas.map(a => a.id) })) }] : [];
    }),
    evidenceIds: [...new Set(records.flatMap(r => r.evidence.map(e => e.id)))],
    limitations: [...new Set([...config.limitations, ...data.limitations, 'Counts describe the selected research sample, not total competition, demand, market share, or investment attractiveness. Company claims, physical locations, and service coverage are separate evidence scopes.'])]
  };
}
export type Comparison = ReturnType<typeof compare>;
