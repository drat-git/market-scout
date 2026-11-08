import { compare, type Comparison } from './compare';
import { serviceLabels, type Criteria, type Dataset, type Selection, type Evidence } from './schema';
import { evidenceFor } from './screen';
export type BriefTable = { columns: string[]; rows: string[][] };
export type Brief = { schemaVersion: '1'; id: string; title: string; createdAt: string; datasetVersion: string; evidenceVersion: string; mode: 'deterministic' | 'prepared'; humanReview: 'pending'; preparedExample?: boolean; comparison: Comparison; marketContext: Dataset['markets']; snapshot: { selection: Selection; criteria: Criteria; notes: string; shortlists: string[] }; sections: { title: string; kind: 'finding' | 'interpretation' | 'limitation' | 'next-step' | 'analyst-note'; text: string; evidenceIds: string[]; table?: BriefTable }[]; sources: Evidence[] };
export function createBrief(d: Dataset, selection: Selection, criteria: Criteria, notes = '', shortlists: string[] = [], at = new Date().toISOString()): Brief {
  const c = compare(d, selection, criteria), [a, b] = c.markets;
  const factual = c.markets.map(m => ({ title: `${m.name}: the researched sample`, kind: 'finding' as const,
    text: `Among the ${m.companies} selected companies researched in ${m.name}, ${m.locations} physical locations are documented. ${m.matches} records match the current screen and ${m.uncertain} remain uncertain. Branch-level evidence documents speech at ${m.services.speech} companies, occupational therapy at ${m.services.occupational}, and physical therapy at ${m.services.physical}. These service groups overlap.`,
    evidenceIds: [...new Set(d.relationships.filter(r => r.marketId === m.id && c.relationshipIds.includes(r.id)).flatMap(r => evidenceFor(d, r.id).map(e => e.id)))] }));
  return { schemaVersion: '1', id: `brief-${at.replace(/[:.]/g, '-')}`, title: 'Pediatric therapy market comparison', createdAt: at, datasetVersion: d.version, evidenceVersion: d.version, mode: 'deterministic', humanReview: 'pending', comparison: c, marketContext: structuredClone(d.markets),
    snapshot: structuredClone({ selection, criteria, notes, shortlists }),
    sections: [
      { title: 'Question & scope', kind: 'finding', text: `How do researched pediatric therapy providers in Austin and San Antonio differ in services and geographic footprints, and what should an analyst investigate next? This snapshot includes ${c.uniqueCompanies} unique companies across ${c.relationshipIds.length} company–market records. Geography: ${criteria.geography === 'physical' ? 'physical clinic presence' : 'explicit service coverage'}. Required services: ${criteria.requiredServices.map(s => serviceLabels[s]).join(', ') || 'any core therapy'}. Dataset updated ${d.collectedAt.slice(0, 10)} (UTC).`, evidenceIds: [] },
      ...factual,
      { title: 'What the differences tell us', kind: 'interpretation', text: `${a.name} and ${b.name} have ${a.companies} and ${b.companies} selected companies, respectively. Differences in documented service mix may reflect both the sampled providers and the completeness of their websites. A clinic offering multiple services could be a useful operational comparator for the illustrative multiservice model.`, evidenceIds: c.evidenceIds },
      { title: 'Limits of this comparison', kind: 'limitation', text: c.limitations.join(' '), evidenceIds: [] },
      { title: '1. Resolve clinic-level evidence', kind: 'next-step', text: 'Confirm which therapies operate at each branch, current addresses, and any conflicting age or service descriptions. Obtain a dated clinic service roster before treating uncertain records as matches.', evidenceIds: [] },
      { title: '2. Test access and referral assumptions', kind: 'next-step', text: 'Investigate waitlists, referral sources, pediatric population needs, and payer participation using dated interviews and published participation lists.', evidenceIds: [] },
      { title: '3. Build the operating case', kind: 'next-step', text: 'Research therapist availability, compensation, occupancy costs, reimbursement, and site economics. Compare these independently of the provider counts before considering an expansion decision.', evidenceIds: [] },
      ...(notes.trim() ? [{ title: 'Analyst notes', kind: 'analyst-note' as const, text: notes, evidenceIds: [] }] : [])
    ], sources: structuredClone(d.evidence.filter(e => c.evidenceIds.includes(e.id))) };
}
