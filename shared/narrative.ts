import { z } from 'zod';
import { compare } from './compare';
import { createBrief, type Brief } from './brief';
import type { Dataset, Criteria, Selection } from './schema';

export const NarrativeSchema = z.object({
  datasetVersion: z.string(), title: z.string().min(1),
  comparison: z.unknown(),
  sections: z.array(z.object({
    title: z.string().min(1), kind: z.enum(['finding', 'interpretation', 'limitation', 'next-step']),
    text: z.string().min(1), evidenceIds: z.array(z.string()),
    table: z.object({ columns: z.array(z.string()).min(1), rows: z.array(z.array(z.string())) }).strict()
      .refine(t => t.rows.every(row => row.length === t.columns.length), 'Table rows must match column count').optional()
  }).strict()).min(1)
}).strict();

// Validates the source register and exact calculated snapshot, not semantic truth in prose.
export function createAuthoredBrief(data: Dataset, selection: Selection, criteria: Criteria, input: unknown, at = data.collectedAt): Brief {
  const narrative = NarrativeSchema.parse(input);
  const expected = compare(data, selection, criteria);
  if (narrative.datasetVersion !== data.version || JSON.stringify(narrative.comparison) !== JSON.stringify(expected)) {
    throw new Error('Narrative does not match this dataset, selection, and calculated comparison. Rebuild its comparison before writing.');
  }
  for (const section of narrative.sections) {
    if (section.kind === 'finding' && !section.evidenceIds.length) throw new Error('Each finding needs supporting evidence references.');
    for (const id of section.evidenceIds) if (!expected.evidenceIds.includes(id)) throw new Error(`Unknown or unselected evidence: ${id}`);
  }
  return { ...createBrief(data, selection, criteria, '', [], at), title: narrative.title, mode: 'prepared', sections: structuredClone(narrative.sections) };
}

export function briefMarkdown(b: Brief): string {
  const cell = (value: string) => value.replaceAll('|', '\\|').replaceAll('\n', ' ');
  const table = (s: Brief['sections'][number]) => s.table ? '\n\n' + [s.table.columns, s.table.columns.map(() => '---'), ...s.table.rows].map(row => '| ' + row.map(cell).join(' | ') + ' |').join('\n') : '';
  return [`# ${b.title}`, `${b.mode === 'prepared' ? 'Authored research draft' : 'Calculated research summary'} · dataset ${b.datasetVersion} · Independent review pending`,
    ...(b.preparedExample ? ['Fixed reference case · Includes unresolved records · Independent of demo selections'] : []),
    ...b.sections.map(s => `## ${s.title}\n\n${s.text}${table(s)}${s.evidenceIds.length ? '\n\nSources: ' + s.evidenceIds.map(id => { const e = b.sources.find(x => x.id === id)!; return `[${e.title}](${e.url})`; }).join('; ') : ''}`),
    '## Sources', ...b.sources.map(e => `### ${e.title}\n\n${e.url}\n\n${e.claim}\n\n> ${e.passage.replaceAll('\n', '\n> ')}\n\nScope: ${e.scope}. Collected ${e.collectedAt.slice(0,10)} (UTC). Verification: ${e.verification}.${e.uncertainty ? `\n\nUncertainty: ${e.uncertainty}` : ''}`)].join('\n\n') + '\n';
}
