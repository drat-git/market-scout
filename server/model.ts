import { z } from 'zod';
export type ModelReply = { value: unknown; sources: string[]; responseId: string; inputTokens: number; outputTokens: number; webSearchCalls: number };
export interface ResearchModel { name: string; generate(stage: 'Discovery' | 'Normalization', instructions: string, input: unknown, schema: z.ZodType, signal: AbortSignal): Promise<ModelReply> }
export class ResearchError extends Error { constructor(public code: string, message: string) { super(message); } }
export class OpenAIResearchModel implements ResearchModel {
  constructor(private key: string, public name = 'gpt-6.1-terra', private transport: typeof fetch = fetch) {}
  async generate(stage: 'Discovery' | 'Normalization', instructions: string, input: unknown, schema: z.ZodType, signal: AbortSignal): Promise<ModelReply> {
    const response = await this.transport('https://api.openai.com/v1/responses', {
      method: 'POST', headers: { Authorization: `Bearer ${this.key}`, 'Content-Type': 'application/json' }, signal,
      body: JSON.stringify({ model: this.name, store: false, reasoning: { effort: 'low' }, instructions, input: JSON.stringify(input),
        ...(stage === 'Discovery' ? { tools: [{ type: 'web_search' }], tool_choice: 'required', include: ['web_search_call.action.sources'] } : {}),
        text: { format: { type: 'json_schema', name: stage.toLowerCase(), strict: true, schema: z.toJSONSchema(schema) } }
      })
    });
    if (!response.ok) {
      const code = response.status === 401 ? 'authentication' : response.status === 429 ? 'provider-limit' : 'provider-error';
      throw new ResearchError(code, response.status === 401 ? 'OpenAI rejected the server API key.' : response.status === 429 ? 'OpenAI could not accept the request. Check the account’s availability and retry manually.' : `OpenAI returned HTTP ${response.status}. Check model access and server configuration. No automatic retry was made.`);
    }
    const body = await response.json() as { id: string; status: string; output?: { type: string; content?: { type: string; text?: string; annotations?: { type: string; url?: string }[] }[]; action?: { sources?: { url: string }[] } }[]; usage?: { input_tokens: number; output_tokens: number } };
    if (body.status !== 'completed') throw new ResearchError('incomplete', 'The model did not complete a valid response. No automatic retry was made.');
    const content = (body.output ?? []).flatMap(item => item.content ?? []);
    if (content.some(c => c.type === 'refusal')) throw new ResearchError('refusal', 'The model declined this research request.');
    const text = content.filter(c => c.type === 'output_text').map(c => c.text ?? '').join('');
    let value: unknown;
    try { value = schema.parse(JSON.parse(text)); } catch { throw new ResearchError('invalid-output', 'The model returned an invalid research artifact. It was not imported.'); }
    return { value, responseId: body.id, inputTokens: body.usage?.input_tokens ?? 0, outputTokens: body.usage?.output_tokens ?? 0,
      webSearchCalls: (body.output ?? []).filter(item => item.type === 'web_search_call').length,
      sources: [...new Set([...(body.output ?? []).flatMap(item => item.action?.sources?.map(s => s.url) ?? []), ...content.flatMap(c => c.annotations?.flatMap(a => a.type === 'url_citation' && a.url ? [a.url] : []) ?? [])])] };
  }
}
