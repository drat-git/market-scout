import { selectedRelationships } from './compare';
import { evidenceFor, resolveFact } from './screen';
import { type Dataset, type Selection, type Service } from './schema';

export const serviceBundles = [
  { id: 'speech-ot', label: 'Speech + occupational therapy', services: ['speech', 'occupational'] },
  { id: 'all-three', label: 'Speech + occupational + physical', services: ['speech', 'occupational', 'physical'] },
] as const;

// A bundle must be established at one physical clinic, never assembled across branches.
export function compareLandscape(data: Dataset, selection: Selection, services: readonly Service[] = []) {
  const selected = selectedRelationships(data, selection);
  const records = selected.map(r => {
    const evidence = evidenceFor(data, r.id);
    const clinics = data.locations.filter(l => l.companyId === r.companyId && l.marketId === r.marketId)
      .filter(l => resolveFact(evidence.filter(e => e.scope === 'location' && e.scopeId === l.id), 'physical-presence') === 'yes');
    return { ...r, name: data.companies.find(c => c.id === r.companyId)!.name, evidence, clinics };
  });
  const providersFor = (marketId: string, required: readonly Service[]) => records.filter(r => r.marketId === marketId).flatMap(r => {
    if (!required.length) return [];
    const clinics = r.clinics.filter(l => required.every(s => resolveFact(r.evidence.filter(e => e.scope === 'location' && e.scopeId === l.id), `service:${s}`) === 'yes'));
    return clinics.length ? [{ relationshipId: r.id, companyId: r.companyId, name: r.name, clinics: clinics.map(l => l.name) }] : [];
  });
  return {
    markets: data.markets.map(m => ({ id: m.id, name: m.name,
      companies: new Set(records.filter(r => r.marketId === m.id).map(r => r.companyId)).size,
      matchingProviders: providersFor(m.id, services),
      geography: (() => {
        const clinics = records.filter(r => r.marketId === m.id).flatMap(r => r.clinics.map(l => {
          // Mailing-city labels only: no geocoding or municipal-boundary inference.
          const city = l.address?.match(/,\s*([^,]+),\s*(?:TX|Texas)\s+\d{5}(?:-\d{4})?\s*$/i)?.[1].trim() ?? null;
          return { id: l.id, relationshipId: r.id, companyName: r.name, name: l.name, address: l.address, city };
        }));
        const cities = [...new Set(clinics.flatMap(l => l.city ? [l.city.toLowerCase()] : []))].map(key => {
          const matching = clinics.filter(l => l.city?.toLowerCase() === key);
          return { city: matching[0].city!, clinics: matching };
        }).sort((a, b) => b.clinics.length - a.clinics.length || a.city.localeCompare(b.city));
        return { total: clinics.length, cities, unresolved: clinics.filter(l => !l.city) };
      })(),
      bundles: serviceBundles.map(bundle => ({ ...bundle, providers: providersFor(m.id, bundle.services) }))
    })),
    sharedCompanies: data.companies.flatMap(company => {
      const presence = records.filter(r => r.companyId === company.id && r.clinics.length > 0);
      if (new Set(presence.map(r => r.marketId)).size < 2) return [];
      return [{ id: company.id, name: company.name, markets: presence.map(r => ({ relationshipId: r.id, marketId: r.marketId, clinics: r.clinics.map(l => l.name) })) }];
    })
  };
}
