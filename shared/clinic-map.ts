import coordinates from '../data/clinic-coordinates.json';
import { selectedRelationships } from './compare';
import { evidenceFor, resolveFact } from './screen';
import type { Dataset, Selection } from './schema';

export function clinicMapData(data: Dataset, selection: Selection) {
  return selectedRelationships(data, selection).flatMap(relationship => {
    const company = data.companies.find(c => c.id === relationship.companyId)!;
    const evidence = evidenceFor(data, relationship.id);
    const locations = data.locations.filter(l => l.companyId === company.id && l.marketId === relationship.marketId);
    return locations.map(location => {
      const verified = resolveFact(evidence.filter(e => e.scope === 'location' && e.scopeId === location.id), 'physical-presence') === 'yes';
      const coordinate = coordinates.locations.find(p => p.locationId === location.id && p.inputAddress === location.address);
      const reason = !verified ? 'Clinic location needs verification' : !location.address ? 'Street address not recorded' : !coordinate ? 'Address could not be confidently placed' : null;
      return { id: location.id, relationshipId: relationship.id, marketId: relationship.marketId, companyName: company.name, name: location.name, address: location.address, coordinate: reason ? null : coordinate!, reason };
    });
  });
}
