import { z } from 'zod';

const text = z.string().min(1);
const key = z.string().regex(/^[a-z][a-z0-9]*(?:[-:.][a-z0-9]+)*$/, 'Use a lowercase identifier with hyphens, periods, or colons.');
export const SourceTypeSchema = z.enum(['business', 'government', 'directory', 'document', 'other']);
export const ScopeSchema = z.enum(['company', 'location', 'service-area']);
const RuleSchema = z.object({ id: key, label: text, scope: z.enum(['company', 'local', 'company-or-local']), match: z.enum(['all', 'any']), facts: z.array(key).min(1), expected: z.boolean().default(true), nextStep: text }).strict();
export const CriteriaSchema = z.object({ version: text, geography: z.enum(['physical', 'coverage', 'either', 'none']), acceptedSourceTypes: z.array(SourceTypeSchema).min(1), rules: z.array(RuleSchema).min(1) }).strict();
export type Criteria = z.infer<typeof CriteriaSchema>;
export const CaseSchema = z.object({
  schemaVersion: z.literal('2'), id: key, version: text, title: text, industry: text, question: text,
  markets: z.array(z.object({ id: key, name: text, boundary: text, definitionUrl: z.string().url().nullable(),
    context: z.array(z.object({ id: key, label: text, value: z.union([z.string(), z.number().finite()]).nullable(), unit: text, period: text, geography: text, sourceUrl: z.string().url(), collectedAt: z.string().datetime(), uncertainty: z.string().nullable() }).strict()).default([])
  }).strict()).min(1),
  attributes: z.array(z.object({ id: key, label: text, description: text }).strict()).min(1),
  criteria: CriteriaSchema,
  comparisons: z.array(z.object({ id: key, label: text, scope: ScopeSchema, match: z.enum(['all', 'any']), facts: z.array(key).min(1) }).strict()).default([]),
  limitations: z.array(z.string()).default([])
}).strict();
export type ResearchCase = z.infer<typeof CaseSchema>;
const CompanySchema = z.object({ id: text, name: text, website: z.string().url().nullable(), domain: z.string().nullable(), origin: z.enum(['baseline', 'new']), identityNote: z.string().nullable() }).strict();
const LocationSchema = z.object({ id: text, companyId: text, marketId: key, name: text, address: z.string().nullable(), locality: z.string().nullable(), evidenceIds: z.array(text), note: z.string().nullable() }).strict();
const AreaSchema = z.object({ id: text, companyId: text, marketId: key, name: text, evidenceIds: z.array(text) }).strict();
const RelationshipSchema = z.object({ id: text, companyId: text, marketId: key, evidenceIds: z.array(text) }).strict();
export const EvidenceSchema = z.object({
  id: text.refine(id => !id.startsWith('context:'), 'context: is reserved for market context citations'), companyId: text, scope: ScopeSchema, scopeId: text,
  facts: z.array(key).min(1), supports: z.boolean(), claim: text, url: z.string().url().nullable().default(null), sourceRef: text.nullable().default(null), title: text, passage: text,
  collectedAt: z.string().datetime(), sourceType: SourceTypeSchema, verification: z.enum(['source-checked', 'unverified', 'conflicting']), provenance: z.enum(['baseline', 'new', 'cached']), uncertainty: z.string().nullable()
}).strict().refine(e => e.url || e.sourceRef, 'Evidence needs a URL or a local/document sourceRef');
export type Evidence = z.infer<typeof EvidenceSchema>;
const fields = { companies: z.array(CompanySchema), locations: z.array(LocationSchema), serviceAreas: z.array(AreaSchema), relationships: z.array(RelationshipSchema), evidence: z.array(EvidenceSchema) };
const LogSchema = z.array(z.object({ name: text, source: z.string(), outcome: z.enum(['unresolved', 'excluded']), reason: text }).strict());
export const BatchSchema = z.object({ ...fields, researchLog: LogSchema.default([]), limitations: z.array(z.string()).default([]) }).strict();
export const DatasetSchema = z.object({ schemaVersion: z.literal('2'), caseId: key, version: text, collectedAt: z.string().datetime(), humanReview: z.literal('pending'), ...fields, researchLog: LogSchema, limitations: z.array(z.string()) }).strict();
export type Dataset = z.infer<typeof DatasetSchema>;
export const SelectionSchema = z.record(z.string(), z.enum(['accepted', 'excluded', 'unreviewed']));
export type Selection = z.infer<typeof SelectionSchema>;
export type Decision = Selection[string];
export const PRESENCE_FACTS = ['physical-presence', 'coverage'] as const;

function unique(items: { id: string }[], label: string) {
  if (new Set(items.map(x => x.id)).size !== items.length) throw new Error(`Duplicate ${label} identifier`);
}
export function validateCriteria(input: unknown, config: ResearchCase): Criteria {
  const criteria = CriteriaSchema.parse(input);
  unique(criteria.rules, 'rule');
  const facts = new Set(config.attributes.map(a => a.id));
  for (const rule of criteria.rules) {
    for (const fact of rule.facts) if (!facts.has(fact)) throw new Error(`Unknown rule fact: ${fact}`);
    if (criteria.geography === 'none' && rule.scope !== 'company') throw new Error('With geography none, use company rules; local evidence needs a presence requirement.');
  }
  return criteria;
}
export function validateCase(input: unknown): ResearchCase {
  const config = CaseSchema.parse(input);
  unique(config.markets, 'market'); unique(config.attributes, 'attribute'); unique(config.comparisons, 'comparison');
  const facts = new Set(config.attributes.map(a => a.id));
  for (const fact of PRESENCE_FACTS) if (facts.has(fact)) throw new Error(`${fact} is reserved for presence evidence, not an industry attribute.`);
  for (const profile of config.comparisons) for (const fact of profile.facts) if (!facts.has(fact)) throw new Error(`Unknown comparison fact: ${fact}`);
  for (const market of config.markets) unique(market.context, 'market context');
  validateCriteria(config.criteria, config);
  return config;
}
export function validateDataset(input: unknown, config: ResearchCase): Dataset {
  const data = DatasetSchema.parse(input);
  if (data.caseId !== config.id) throw new Error(`Dataset case ${data.caseId} does not match ${config.id}`);
  for (const [name, items] of Object.entries({ companies: data.companies, locations: data.locations, serviceAreas: data.serviceAreas, relationships: data.relationships, evidence: data.evidence })) unique(items, name);
  const companies = new Set(data.companies.map(c => c.id)), markets = new Set(config.markets.map(m => m.id));
  const pairs = data.relationships.map(r => JSON.stringify([r.companyId, r.marketId]));
  if (new Set(pairs).size !== pairs.length) throw new Error('Duplicate company–market relationship');
  const facts = new Set([...config.attributes.map(a => a.id), ...PRESENCE_FACTS]);
  for (const item of [...data.locations, ...data.serviceAreas, ...data.relationships, ...data.evidence]) if (!companies.has(item.companyId)) throw new Error(`Unknown company: ${item.companyId}`);
  for (const item of [...data.locations, ...data.serviceAreas, ...data.relationships]) {
    if (!markets.has(item.marketId)) throw new Error(`Unknown market: ${item.marketId}`);
    for (const id of item.evidenceIds) {
      const evidence = data.evidence.find(e => e.id === id);
      if (!evidence) throw new Error(`Unresolved evidence: ${id}`);
      if (evidence.companyId !== item.companyId) throw new Error(`Evidence belongs to another company: ${id}`);
      if (evidence.scope !== 'company') {
        const target = (evidence.scope === 'location' ? data.locations : data.serviceAreas).find(s => s.id === evidence.scopeId);
        if (target && target.marketId !== item.marketId) throw new Error(`Evidence belongs to another market: ${id}`);
      }
    }
  }
  for (const scope of [...data.locations, ...data.serviceAreas]) if (!data.relationships.some(r => r.companyId === scope.companyId && r.marketId === scope.marketId)) throw new Error(`No company–market relationship for ${scope.id}`);
  for (const e of data.evidence) {
    const target = (e.scope === 'company' ? data.companies : e.scope === 'location' ? data.locations : data.serviceAreas).find(s => s.id === e.scopeId);
    if (!target || ('companyId' in target ? target.companyId : target.id) !== e.companyId) throw new Error(`Invalid evidence scope: ${e.id}`);
    for (const fact of e.facts) {
      if (!facts.has(fact)) throw new Error(`Unknown evidence fact: ${fact}`);
      if (fact === 'physical-presence' && e.scope !== 'location' || fact === 'coverage' && e.scope !== 'service-area') throw new Error(`Presence fact has wrong scope: ${e.id}`);
    }
  }
  return data;
}
