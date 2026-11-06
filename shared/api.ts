import { z } from 'zod';
import { baseline } from './baseline';
import { CriteriaSchema, MarketIdSchema, SelectionSchema, type Dataset } from './schema';
import { screen } from './screen';
import { createBrief } from './brief';
import { research } from './research';

const ScreenInput = z.object({ ids: z.array(z.string()).min(1).max(100), criteria: CriteriaSchema }).strict();
const BriefInput = z.object({ selection: SelectionSchema, criteria: CriteriaSchema, notes: z.string().max(8000).default(''), shortlists: z.array(MarketIdSchema).max(2).default([]) }).strict();
const ResearchInput = z.object({ marketId: MarketIdSchema, criteria: CriteriaSchema, requestId: z.string().min(1).max(100) }).strict();
export function handleApi(method: string, path: string, input: unknown, data: Dataset = baseline) {
  if (method !== 'POST') return { status: 405, body: { error: 'Use POST for this endpoint.' } };
  try {
    if (path === '/api/screen') {
      const v = ScreenInput.parse(input);
      return { status: 200, body: { mode: 'deterministic', assessments: screen(data, v.ids, v.criteria) } };
    }
    if (path === '/api/brief') {
      const v = BriefInput.parse(input);
      if (Object.keys(v.selection).some(id => !data.relationships.some(r => r.id === id))) throw new Error('Unknown selection identifier');
      return { status: 200, body: createBrief(data, v.selection, v.criteria, v.notes, v.shortlists) };
    }
    if (path === '/api/research') {
      const v = ResearchInput.parse(input);
      return { status: 503, body: research(v.marketId, v.criteria, v.requestId) };
    }
    return { status: 404, body: { error: 'Endpoint not found.' } };
  } catch (error) {
    return { status: 400, body: { error: error instanceof z.ZodError ? 'Invalid request shape or unsupported criteria.' : error instanceof Error ? error.message : 'Invalid input.' } };
  }
}
