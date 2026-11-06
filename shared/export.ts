import { selectedRelationships } from './compare';
import { evidenceFor, resolveFact } from './screen';
import { SERVICES, type Dataset, type Selection } from './schema';
export function csvCell(value: unknown): string {
  let s = String(value ?? '');
  if (/^[\s\u0000-\u001f]*[=+@-]/.test(s) || /^[\t\r\n]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}
export function exportCsv(d: Dataset, selection: Selection): string {
  const rows: unknown[][] = [['company_id', 'company_name', 'market', 'location_id', 'location_name', 'address', 'documented_services_at_branch', 'evidence_ids', 'source_urls', 'collected_at_utc', 'origin', 'human_decision', 'dataset_version']];
  for (const r of selectedRelationships(d, selection)) {
    const c = d.companies.find(x => x.id === r.companyId)!;
    const locations = d.locations.filter(l => l.companyId === c.id && l.marketId === r.marketId);
    for (const l of locations.length ? locations : [null]) {
      const ev = evidenceFor(d, r.id).filter(e => e.scope === 'company' || e.scopeId === l?.id || (!l && e.scope === 'service-area'));
      const local = ev.filter(e => e.scope === 'location' && e.scopeId === l?.id);
      rows.push([c.id, c.name, r.marketId, l?.id, l?.name, l?.address, SERVICES.filter(s => resolveFact(local, 'physical-presence') === 'yes' && resolveFact(local, `service:${s}`) === 'yes').join('; '), ev.map(e => e.id).join('; '), [...new Set(ev.map(e => e.url))].join('; '), [...new Set(ev.map(e => e.collectedAt))].join('; '), c.origin, selection[r.id] ?? 'baseline draft', d.version]);
    }
  }
  return '\ufeff' + rows.map(row => row.map(csvCell).join(',')).join('\r\n');
}
