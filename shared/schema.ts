import { z } from 'zod';
import type { ResearchDetails } from './research-artifacts';

export const SERVICES = ['speech', 'occupational', 'physical', 'feeding', 'sensory'] as const;
export const CORE = ['speech', 'occupational', 'physical'] as const;
export const serviceLabels: Record<Service, string> = { speech: 'Speech', occupational: 'Occupational', physical: 'Physical', feeding: 'Feeding / swallowing', sensory: 'Sensory integration' };
export type Service = typeof SERVICES[number];
export const MarketIdSchema = z.enum(['austin', 'san-antonio']);
export type MarketId = z.infer<typeof MarketIdSchema>;
export const CriteriaSchema = z.object({ version: z.literal('1'), requiredServices: z.array(z.enum(SERVICES)).max(5), geography: z.enum(['physical', 'coverage']) }).strict();
export type Criteria = z.infer<typeof CriteriaSchema>;
export const DEFAULT_CRITERIA: Criteria = { version: '1', requiredServices: [], geography: 'physical' };
export const EvidenceSchema = z.object({
  id: z.string(), companyId: z.string(), scope: z.enum(['company', 'location', 'service-area']), scopeId: z.string(),
  facts: z.array(z.string()), supports: z.boolean(), claim: z.string(), url: z.string().url(), title: z.string(), passage: z.string().min(1),
  collectedAt: z.string().datetime(), sourceType: z.enum(['provider', 'government', 'directory']),
  verification: z.enum(['source-checked', 'unverified', 'conflicting']), provenance: z.enum(['baseline', 'new', 'cached']), uncertainty: z.string().nullable()
}).strict();
export type Evidence = z.infer<typeof EvidenceSchema>;
export const CompanySchema = z.object({ id: z.string(), name: z.string(), website: z.string().url(), domain: z.string(), origin: z.enum(['baseline', 'new']), identityNote: z.string().nullable() }).strict();
export type Company = z.infer<typeof CompanySchema>;
export const LocationSchema = z.object({ id: z.string(), companyId: z.string(), marketId: MarketIdSchema, name: z.string(), address: z.string().nullable(), evidenceIds: z.array(z.string()), note: z.string().nullable() }).strict();
export type Location = z.infer<typeof LocationSchema>;
const MetricSchema = z.object({
  estimate: z.number().int().nonnegative().nullable(), marginOfError: z.number().int().nonnegative().nullable(),
  variable: z.string(), moeVariable: z.string(), sourceUrl: z.string().url(),
  moeStatus: z.enum(['published', 'controlled', 'unavailable']), rawMarginOfError: z.number().int().nullable()
}).strict().superRefine((m, ctx) => {
  if (m.moeStatus === 'published' && (m.marginOfError === null || m.rawMarginOfError !== m.marginOfError)) ctx.addIssue({ code: 'custom', message: 'Published MOE must preserve the nonnegative source value' });
  if (m.moeStatus === 'controlled' && (m.marginOfError !== null || m.rawMarginOfError !== -555555555 || m.estimate === null)) ctx.addIssue({ code: 'custom', message: 'Controlled estimate must preserve the Census annotation, not a numeric MOE' });
  if (m.moeStatus === 'unavailable' && m.marginOfError !== null) ctx.addIssue({ code: 'custom', message: 'Unavailable MOE must be null' });
});
const DemographicsSchema = z.object({
  year: z.literal(2024), sourceUrl: z.string().url(), status: z.enum(['available', 'pending']),
  collectedAt: z.string().datetime(), geoId: z.string(), confidenceLevel: z.literal(90), annotationUrl: z.string().url(),
  population: MetricSchema, under18: MetricSchema, housing: MetricSchema
}).strict().superRefine((d, ctx) => {
  const metrics = [d.population, d.under18, d.housing];
  if (d.status === 'available' && metrics.some(m => m.estimate === null || m.moeStatus === 'unavailable')) ctx.addIssue({ code: 'custom', message: 'Available context requires validated estimates and MOE statuses' });
});
export const DatasetSchema = z.object({
  schemaVersion: z.literal('1'), version: z.string(), collectedAt: z.string().datetime(), humanReview: z.literal('pending'),
  markets: z.array(z.object({ id: MarketIdSchema, name: z.string(), metroName: z.string(), cbsa: z.string().regex(/^\d{5}$/), counties: z.array(z.string()), countyFips: z.array(z.string().regex(/^\d{5}$/)), definitionUrl: z.string().url(), definitionVintage: z.string(), definitionVerifiedAt: z.string().datetime(), demographics: DemographicsSchema })),
  companies: z.array(CompanySchema), locations: z.array(LocationSchema),
  serviceAreas: z.array(z.object({ id: z.string(), companyId: z.string(), marketId: MarketIdSchema, evidenceIds: z.array(z.string()) })),
  relationships: z.array(z.object({ id: z.string(), companyId: z.string(), marketId: MarketIdSchema, evidenceIds: z.array(z.string()) })),
  evidence: z.array(EvidenceSchema), limitations: z.array(z.string()),
  researchLog: z.array(z.object({ name: z.string(), url: z.string(), outcome: z.enum(['unresolved', 'excluded']), reason: z.string() }))
}).strict();
export type Dataset = z.infer<typeof DatasetSchema>;
export type Decision = 'accepted' | 'excluded' | 'unreviewed';
export const SelectionSchema = z.record(z.string(), z.enum(['accepted', 'excluded', 'unreviewed']));
export type Selection = z.infer<typeof SelectionSchema>;
export type Assessment = { id: string; relationshipId: string; result: 'match' | 'exclude' | 'uncertain'; reasons: string[]; evidenceIds: string[]; criteria: Criteria; assessedAt: string; datasetVersion: string; engineVersion: string };
export type RunEvent = { stage: 'Discovery' | 'Normalization' | 'Screening' | 'Review'; state: 'completed' | 'active' | 'pending' | 'failed' | 'awaiting-review' | 'partial' | 'cancelled'; at: string; detail: string };
export type Run = { id: string; kind: 'screen' | 'research'; status: 'completed' | 'failed' | 'awaiting-review' | 'active' | 'partial' | 'cancelled'; research?: ResearchDetails; startedAt: string; finishedAt: string; events: RunEvent[]; assessments: Assessment[]; criteria: Criteria; message: string };
export function validateDataset(input: unknown): Dataset {
  const d = DatasetSchema.parse(input);
  for (const m of d.markets) {
    if (m.demographics.geoId !== `310M700US${m.cbsa}` || m.counties.length !== m.countyFips.length) throw new Error('Inconsistent metro geography');
  }
  for (const list of [d.markets, d.companies, d.locations, d.serviceAreas, d.relationships, d.evidence]) {
    if (new Set(list.map(x => x.id)).size !== list.length) throw new Error('Duplicate artifact identifier');
  }
  const pairs = d.relationships.map(r => `${r.companyId}@${r.marketId}`);
  if (new Set(pairs).size !== pairs.length) throw new Error('Duplicate company–market relationship');
  const marketIds = new Set(d.markets.map(m => m.id));
  const companyIds = new Set(d.companies.map(x => x.id));
  const evidenceIds = new Set(d.evidence.map(x => x.id));
  for (const x of [...d.locations, ...d.serviceAreas, ...d.relationships, ...d.evidence]) {
    if (!companyIds.has(x.companyId)) throw new Error(`Unknown company: ${x.companyId}`);
  }
  for (const x of [...d.locations, ...d.serviceAreas, ...d.relationships]) {
    if (!marketIds.has(x.marketId)) throw new Error(`Unknown market: ${x.marketId}`);
    for (const id of x.evidenceIds) {
      if (!evidenceIds.has(id)) throw new Error(`Unresolved evidence: ${id}`);
      if (d.evidence.find(e => e.id === id)!.companyId !== x.companyId) throw new Error(`Evidence belongs to another company: ${id}`);
    }
  }
  for (const e of d.evidence) {
    const scope = e.scope === 'company' ? d.companies : e.scope === 'location' ? d.locations : d.serviceAreas;
    const target = scope.find(x => x.id === e.scopeId);
    if (!target || ('companyId' in target ? target.companyId : target.id) !== e.companyId) throw new Error(`Invalid scope: ${e.id}`);
  }
  if (d.markets.length !== 2) throw new Error('Full datasets must retain Austin and San Antonio metro context. Use research --empty --input to start a new provider sample.');
  return d;
}
