import { z } from 'zod';
import { isDeepStrictEqual } from 'node:util';
import type { Criteria, Dataset, ResearchCase, Selection } from './schema';
import { compare } from './compare';
import { contextHash } from './state';
import { verificationReport } from './export';
const SectionSchema = z.object({ title: z.string().min(1), kind: z.enum(['finding', 'interpretation', 'limitation', 'next-step']), text: z.string().min(1), evidenceIds: z.array(z.string()), table: z.object({ columns: z.array(z.string()).min(1), rows: z.array(z.array(z.string())) }).strict().refine(t => t.rows.every(row => row.length === t.columns.length), 'Table rows must match columns').optional() }).strict();
const NarrativeSchema = z.object({ caseId: z.string(), datasetVersion: z.string(), contextHash: z.string(), title: z.string().min(1), comparison: z.unknown(), sections: z.array(SectionSchema).min(1) }).strict();
type Section = z.infer<typeof SectionSchema>;
export function briefInput(config: ResearchCase, data: Dataset, criteria: Criteria, selection: Selection, at: string) {
  const comparison = compare(config, data, criteria, selection);
  const sources = [
    ...data.evidence.filter(e => comparison.evidenceIds.includes(e.id)).map(e => ({ ...e, kind: 'business-evidence' as const })),
    ...config.markets.flatMap(m => m.context.filter(c => c.value !== null).map(c => ({ id: `context:${m.id}:${c.id}`, kind: 'market-context' as const, title: `${m.name}: ${c.label}`, url: c.sourceUrl, sourceRef: null, claim: `${c.label}: ${c.value} ${c.unit}; ${c.period}; ${c.geography}.`, passage: null, collectedAt: c.collectedAt, uncertainty: c.uncertainty })))
  ];
  return { case: config, comparison, contextHash: contextHash(config, data, criteria, selection), providers: verificationReport(config, data, criteria, selection, at).filter(r => comparison.relationshipIds.includes(r.relationshipId)), sources,
    scope: 'Accepted company–market records and configured market context only. Context is not a demand estimate. Physical location and service coverage measures are distinct.' };
}
export function createBrief(config: ResearchCase, data: Dataset, criteria: Criteria, selection: Selection, at: string, narrative?: unknown, notes = '') {
  const pack = briefInput(config, data, criteria, selection, at);
  let title = `${config.industry}: research summary`, mode = 'deterministic';
  let sections: Section[] = [
    { title: 'Question and scope', kind: 'limitation', text: `${config.question} This case includes ${pack.comparison.uniqueCompanies} unique companies across ${pack.comparison.relationshipIds.length} accepted company–market records. These are recorded sources, not independently approved findings.`, evidenceIds: [] },
    ...pack.comparison.markets.map(m => ({ title: m.name, kind: 'finding' as const, text: `Among ${m.companies} included companies, ${m.locations} physical locations and service coverage by ${m.coverageCompanies} companies are documented. ${m.matches} meet the configured screen; ${m.uncertain} remain uncertain; ${m.screenedExclusions} are included despite a screen exclusion.`, evidenceIds: pack.providers.filter(p => p.marketId === m.id).flatMap(p => p.evidenceIds) })),
    { title: 'Research limitations', kind: 'limitation', text: pack.comparison.limitations.join(' '), evidenceIds: [] },
    { title: 'Next investigation', kind: 'next-step', text: 'Resolve decision-relevant verification gaps, examine the named comparison groups, and obtain operating or demand evidence before making an expansion recommendation. This calculated summary is a starting point for assistant-authored analysis.', evidenceIds: [] },
    ...(notes.trim() ? [{ title: 'Unverified analyst notes', kind: 'limitation' as const, text: notes, evidenceIds: [] }] : [])
  ];
  if (narrative !== undefined) {
    if (!pack.comparison.relationshipIds.length) throw new Error('No accepted records: review candidates before creating an authored market brief.');
    const authored = NarrativeSchema.parse(narrative);
    if (authored.caseId !== config.id || authored.datasetVersion !== data.version || authored.contextHash !== pack.contextHash || !isDeepStrictEqual(authored.comparison, pack.comparison)) throw new Error('Narrative does not match this case, evidence, criteria, and selection. Rebuild the comparison and review the prose.');
    const allowed = new Set(pack.sources.map(e => e.id));
    for (const section of authored.sections) {
      if (section.kind === 'finding' && !section.evidenceIds.length) throw new Error('Each finding requires supporting evidence or market-context references.');
      for (const id of section.evidenceIds) if (!allowed.has(id)) throw new Error(`Unknown or unselected evidence: ${id}`);
    }
    title = authored.title; mode = 'authored'; sections = authored.sections;
  }
  return { schemaVersion: '2', caseId: config.id, title, mode, createdAt: at, datasetVersion: data.version, contextHash: pack.contextHash, humanReview: 'pending', question: config.question, comparison: pack.comparison, snapshot: { case: config, criteria, selection, notes }, sections, sources: pack.sources };
}
export function briefMarkdown(brief: ReturnType<typeof createBrief>) {
  const escape = (s: string) => s.replaceAll('|', '\\|').replaceAll('\n', ' ');
  const label = (id: string) => { const s = brief.sources.find(s => s.id === id)!; return s.url ? `[${s.title}](${s.url})` : `${s.title} (${s.sourceRef})`; };
  return [`# ${brief.title}`, `${brief.mode === 'authored' ? 'Authored research draft' : 'Calculated research summary'} · ${brief.datasetVersion}\n\nIndependent review pending.`,
    ...brief.sections.map(s => `## ${s.title}\n\n${s.text}${s.table ? '\n\n' + [s.table.columns, s.table.columns.map(() => '---'), ...s.table.rows].map(row => '| ' + row.map(escape).join(' | ') + ' |').join('\n') : ''}${s.evidenceIds.length ? '\n\nSources: ' + [...new Set(s.evidenceIds)].map(label).join('; ') : ''}`),
    '## Source register', ...brief.sources.map(s => `- **${s.id} — ${s.title}**: ${s.url ?? s.sourceRef}\n  ${s.claim} Collected ${s.collectedAt}.`)].join('\n\n') + '\n';
}
