import { baseline } from './baseline';
import candidates from '../data/examples/candidates.json';
import narrative from '../data/examples/narrative.json';
import serviceNarrative from '../data/examples/narrative-services.json';
import evidenceNarrative from '../data/examples/narrative-evidence.json';
import { mergeAdditions } from './research-artifacts';
import { DEFAULT_CRITERIA, type Criteria, type Selection } from './schema';
import { compare } from './compare';
import { createAuthoredBrief } from './narrative';
import type { QuestionId } from './brief-questions';

export const exampleCandidates = candidates;
// Keep unresolved baseline records inspectable, but do not count them by default.
export const initialSelection: Selection = { 'tesoros@austin': 'unreviewed', 'pts@san-antonio': 'unreviewed', 'teamcare@san-antonio': 'unreviewed' };
export const demoDataset = mergeAdditions(baseline, candidates.additions as Parameters<typeof mergeAdditions>[1]);
export const candidateIds = candidates.additions.relationships.map(r => r.id);
// Briefs use the full researched reference case, independent of visitor selections.
export const preparedBrief = createAuthoredBrief(baseline, {}, DEFAULT_CRITERIA, narrative);
export const preparedBriefs = {
  expansion: preparedBrief,
  services: createAuthoredBrief(baseline, {}, DEFAULT_CRITERIA, serviceNarrative),
  evidence: createAuthoredBrief(baseline, {}, DEFAULT_CRITERIA, evidenceNarrative),
};

export function loadExampleCandidates(selection: Selection): Selection {
  return { ...Object.fromEntries(candidateIds.map(id => [id, 'unreviewed' as const])), ...selection };
}
export function matchesPreparedSnapshot(data: typeof baseline, selection: Selection, criteria: Criteria): boolean {
  const current = compare(data, selection, criteria), original = compare(baseline, initialSelection, DEFAULT_CRITERIA);
  return criteria.geography === DEFAULT_CRITERIA.geography && criteria.requiredServices.length === 0
    && JSON.stringify(current.relationshipIds) === JSON.stringify(original.relationshipIds)
    && JSON.stringify(current.markets) === JSON.stringify(original.markets);
}

// No selection argument: the public demo always opens the same authored reference case.
export function createDemoBrief(questionId: QuestionId, at: string) {
  return { ...structuredClone(preparedBriefs[questionId]), preparedExample: true, id: `brief-${questionId}-${at.replace(/[:.]/g, '-')}`, createdAt: at };
}
