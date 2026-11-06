import type { Criteria, Dataset, ResearchCase, Selection } from './schema';
import { csvCell } from '../shared/export';
import { evidenceFor, resolveFact, screen } from './screen';
import { selectedRelationships } from './compare';
export function verificationReport(config: ResearchCase, data: Dataset, criteria: Criteria, selection: Selection, at: string) {
  return screen(config, data, criteria, at).map(assessment => ({ ...assessment, decision: selection[assessment.relationshipId] }));
}
const csv = (rows: unknown[][]) => '\ufeff' + rows.map(row => row.map(csvCell).join(',')).join('\r\n');
export function reviewCsv(report: ReturnType<typeof verificationReport>) {
  return csv([['relationship_id', 'company', 'market', 'decision', 'screening_result', 'reason', 'next_checks', 'evidence_ids'], ...report.map(r => [r.relationshipId, r.company, r.marketId, r.decision, r.result, r.summary, r.decisionChecks.flatMap(c => c.nextStep ? [`${r.decisionScope}: ${c.nextStep}`] : []).join('; '), r.evidenceIds.join('; ')])]);
}
export function exportCsv(config: ResearchCase, data: Dataset, criteria: Criteria, selection: Selection) {
  const rows: unknown[][] = [['company_id', 'company_name', 'market_id', 'relationship_id', 'scope', 'scope_id', 'scope_name', 'address', 'locality', 'presence_verified', 'supported_attributes', 'evidence_ids', 'sources', 'collected_at', 'decision', 'case_id', 'dataset_version']];
  for (const r of selectedRelationships(data, selection)) {
    const c = data.companies.find(c => c.id === r.companyId)!, evidence = evidenceFor(data, r.id);
    // A company row keeps company-wide claims visible; local rows never inherit them.
    const scopes = [{ type: 'company', id: c.id, name: c.name, address: null, locality: null }, ...data.locations.filter(l => l.companyId === c.id && l.marketId === r.marketId).map(l => ({ ...l, type: 'location' })), ...data.serviceAreas.filter(a => a.companyId === c.id && a.marketId === r.marketId).map(a => ({ ...a, type: 'service-area', address: null, locality: null }))];
    for (const scope of scopes) {
      const local = evidence.filter(e => e.scope === scope.type && e.scopeId === scope.id);
      const presence = scope.type === 'company' ? 'not-applicable' : resolveFact(local, scope.type === 'location' ? 'physical-presence' : 'coverage', criteria);
      const attributes = scope.type === 'company' || presence === 'yes' ? config.attributes.filter(a => resolveFact(local, a.id, criteria) === 'yes').map(a => a.label) : [];
      rows.push([c.id, c.name, r.marketId, r.id, scope.type, scope.id, scope.name, scope.address, scope.locality, presence, attributes.join('; '), local.map(e => e.id).join('; '), [...new Set(local.map(e => e.url ?? e.sourceRef))].join('; '), [...new Set(local.map(e => e.collectedAt))].join('; '), selection[r.id], config.id, data.version]);
    }
  }
  return csv(rows);
}
