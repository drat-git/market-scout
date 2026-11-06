import { CORE, serviceLabels, type Assessment, type Criteria, type Dataset, type Evidence } from './schema';
export const ENGINE_VERSION = 'rules-1.1';

export function resolveFact(evidence: Evidence[], fact: string): 'yes' | 'no' | 'unknown' {
  const relevant = evidence.filter(e => e.facts.includes(fact) && e.sourceType === 'provider' && e.verification !== 'unverified');
  if (relevant.some(e => e.verification === 'conflicting')) return 'unknown';
  const positive = relevant.some(e => e.supports), negative = relevant.some(e => !e.supports);
  return positive === negative ? 'unknown' : positive ? 'yes' : 'no';
}

export function evidenceFor(d: Dataset, relationshipId: string) {
  const r = d.relationships.find(x => x.id === relationshipId);
  if (!r) throw new Error(`Unknown relationship: ${relationshipId}`);
  const locations = new Set(d.locations.filter(x => x.companyId === r.companyId && x.marketId === r.marketId).map(x => x.id));
  const areas = new Set(d.serviceAreas.filter(x => x.companyId === r.companyId && x.marketId === r.marketId).map(x => x.id));
  return d.evidence.filter(e => e.companyId === r.companyId && (e.scope === 'company' || (e.scope === 'location' ? locations : areas).has(e.scopeId)));
}

type FactState = ReturnType<typeof resolveFact>;
export type VerificationCheck = { id: string; label: string; state: FactState; detail: string; nextStep: string | null; evidenceIds: string[] };

function check(id: string, label: string, facts: string[], evidence: Evidence[], nextStep: string, companyEvidence: Evidence[] = []): VerificationCheck {
  const states = facts.map(fact => resolveFact(evidence, fact));
  const state: FactState = states.includes('yes') ? 'yes' : states.every(s => s === 'no') ? 'no' : 'unknown';
  const relevant = evidence.filter(e => e.facts.some(f => facts.includes(f)));
  const accepted = relevant.filter(e => e.sourceType === 'provider' && e.verification !== 'unverified');
  const companyClaims = companyEvidence.filter(e => e.facts.some(f => facts.includes(f)));
  const conflict = facts.some(f => {
    const claims = accepted.filter(e => e.facts.includes(f));
    return claims.some(e => e.verification === 'conflicting') || claims.some(e => e.supports) && claims.some(e => !e.supports);
  });
  const detail = state === 'yes' ? 'Supported by saved passages from the provider’s website.'
    : state === 'no' ? 'Saved provider-source evidence explicitly contradicts this requirement.'
    : conflict ? 'The saved sources conflict. This requirement is not confirmed.'
    : relevant.some(e => e.verification === 'unverified') ? 'A claim is recorded, but the supporting source has not been verified.'
    : companyClaims.some(e => e.supports) ? 'Listed for the company, but not confirmed for this clinic or service area.'
    : 'The saved sources do not establish this requirement.';
  return { id, label, state, detail, nextStep: state === 'unknown' ? nextStep : null, evidenceIds: [...new Set([...relevant, ...(state === 'unknown' ? companyClaims : [])].map(e => e.id))] };
}

// Both the screening outcome and its UI explanation use these same checks.
export function screeningDetails(d: Dataset, relationshipId: string, criteria: Criteria) {
  const r = d.relationships.find(x => x.id === relationshipId);
  if (!r) throw new Error(`Unknown relationship: ${relationshipId}`);
  const all = evidenceFor(d, r.id);
  const companyEvidence = all.filter(e => e.scope === 'company');
  const scopeName = criteria.geography === 'physical' ? 'clinic' : 'service area';
  const marketName = d.markets.find(m => m.id === r.marketId)!.name;
  const scopes = criteria.geography === 'physical' ? d.locations : d.serviceAreas;
  const candidates = scopes.filter(x => x.companyId === r.companyId && x.marketId === r.marketId);
  const groups = (candidates.length ? candidates : [null]).map(location => {
    const local = location ? all.filter(e => e.scope === (criteria.geography === 'physical' ? 'location' : 'service-area') && e.scopeId === location.id) : [];
    const checks = [
      check('pediatric', 'Pediatric care', ['pediatric'], [...companyEvidence, ...local], 'Check the provider’s age groups or ask whether this location treats children.'),
      check('geography', criteria.geography === 'physical' ? `Physical clinic in ${marketName} metro` : `Service coverage in ${marketName}`, [criteria.geography === 'physical' ? 'physical-presence' : 'coverage'], local, criteria.geography === 'physical' ? 'Verify a treatment-clinic address in this metro; an office or service-area listing is not enough.' : 'Verify an explicit service-area statement covering this metro.'),
      check('core', 'Speech, occupational, or physical therapy', CORE.map(s => `service:${s}`), local, `Confirm speech, occupational, or physical therapy at this ${scopeName}.`, companyEvidence),
      ...[...new Set(criteria.requiredServices)].map(s => check(`required:${s}`, `${serviceLabels[s]}${['speech','occupational','physical'].includes(s) ? ' therapy' : ''}`, [`service:${s}`], local, `Check the ${scopeName}’s service page or contact the provider to confirm ${serviceLabels[s].toLowerCase()} at this location.`, companyEvidence)),
    ];
    const result: Assessment['result'] = checks.some(c => c.state === 'no') ? 'exclude' : checks.every(c => c.state === 'yes') ? 'match' : 'uncertain';
    return { id: location?.id ?? 'no-location', name: location && 'name' in location && typeof location.name === 'string' ? location.name : location ? `${marketName} service area` : `No documented ${scopeName} in ${marketName}`, checks, result };
  });
  const blockers: VerificationCheck[] = [];
  if (resolveFact(companyEvidence, 'pediatric') === 'no') blockers.push(check('company-pediatric', 'Company offers pediatric care', ['pediatric'], companyEvidence, ''));
  if (resolveFact(companyEvidence, `eligible:${r.marketId}`) === 'no') blockers.push(check('market-eligibility', `Eligible presence in ${marketName}`, [`eligible:${r.marketId}`], companyEvidence, ''));
  const result: Assessment['result'] = blockers.length ? 'exclude' : groups.some(g => g.result === 'match') ? 'match' : candidates.length && groups.every(g => g.result === 'exclude') ? 'exclude' : 'uncertain';
  const best = [...groups].sort((a,b) => Number(b.result === 'match') - Number(a.result === 'match') || Number(b.result === 'uncertain') - Number(a.result === 'uncertain') || b.checks.filter(c => c.state === 'yes').length - a.checks.filter(c => c.state === 'yes').length)[0];
  const issues = blockers.length ? blockers : best.checks.filter(c => c.state !== 'yes');
  const summary = result === 'match' ? `${best.name}: all selected requirements are supported.`
    : !candidates.length && !blockers.length ? `No ${scopeName} is documented in ${marketName}.`
    : `${blockers.length ? 'Company' : best.name}: ${issues.map(c => `${c.label} ${c.state === 'no' ? 'contradicted by sources' : 'not confirmed'}`).join('; ')}.`;
  return { result, groups, blockers, summary, scopeName, decisionScope: blockers.length ? 'Company' : best.name, decisionChecks: issues };
}

export function screen(d: Dataset, ids: string[], criteria: Criteria, at = new Date().toISOString()): Assessment[] {
  return ids.map(id => {
    const all = evidenceFor(d, id);
    const details = screeningDetails(d, id, criteria);
    const reasons = [details.summary, ...new Set(all.flatMap(e => e.uncertainty ? [e.uncertainty] : []))];
    return { id: `${id}:${at}`, relationshipId: id, result: details.result, reasons, evidenceIds: all.map(e => e.id), criteria: structuredClone(criteria), assessedAt: at, datasetVersion: d.version, engineVersion: ENGINE_VERSION };
  });
}
