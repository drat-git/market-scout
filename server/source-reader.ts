import { lookup } from 'node:dns/promises';
import { request as httpsRequest } from 'node:https';
import { request as httpRequest } from 'node:http';
import { isIP } from 'node:net';
import ipaddr from 'ipaddr.js';
import { load } from 'cheerio';

export type RetrievedPage = { id: string; url: string; title: string; text: string; collectedAt: string };
export function publicAddress(address: string): boolean {
  try { return ipaddr.process(address).range() === 'unicast'; } catch { return false; }
}
export function sourceUrl(value: string): URL {
  const url = new URL(value);
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.port || host.endsWith('.') || (!isIP(host) && !host.includes('.')) || (isIP(host) && !publicAddress(host))) throw new Error('Source URL is not a public HTTP website');
  url.hash = '';
  return url;
}
export function sameProvider(a: string, b: string) {
  try { return sourceUrl(a).hostname.replace(/^www\./, '') === sourceUrl(b).hostname.replace(/^www\./, ''); } catch { return false; }
}
export function extractPage(html: string) {
  const $ = load(html);
  const title = $('title').text().replace(/\s+/g, ' ').trim();
  $('script,style,noscript,template,svg,iframe,form,[hidden],[aria-hidden="true"]').remove();
  $('br,p,div,section,article,li,h1,h2,h3,h4,td,th').each((_i, el) => { $(el).append(' '); });
  const text = $('body').text().normalize('NFKC').replace(/\s+/g, ' ').trim();
  if (text.length < 40) throw new Error('No readable source text');
  return { title, text };
}
/** Every redirect is checked; the TCP connection uses the validated DNS address, preventing rebinding. */
export async function retrievePage(value: string, signal: AbortSignal, id: string): Promise<RetrievedPage> {
  let url = sourceUrl(value);
  const pageSignal = AbortSignal.any([signal, AbortSignal.timeout(15000)]);
  for (let redirects = 0; redirects <= 5; redirects++) {
    pageSignal.throwIfAborted();
    const host = url.hostname.replace(/^\[|\]$/g, '');
    const addresses = isIP(host) ? [{ address: host, family: isIP(host) }] : await lookup(host, { all: true, verbatim: true });
    pageSignal.throwIfAborted();
    if (!addresses.length || addresses.some(a => !publicAddress(a.address))) throw new Error('Source resolves to a restricted network');
    const pinned = addresses[0];
    const result = await new Promise<{ redirect?: string; html?: string }>((resolve, reject) => {
      const request = (url.protocol === 'https:' ? httpsRequest : httpRequest)(url, {
        method: 'GET', agent: false, signal: pageSignal,
        headers: { 'User-Agent': 'MarketScout/0.1 (public provider research)', Accept: 'text/html,text/plain', 'Accept-Encoding': 'identity' },
        lookup: (_host, options, callback) => {
          if (options.all) callback(null, [pinned]); else callback(null, pinned.address, pinned.family);
        }
      }, response => {
        if ([301, 302, 303, 307, 308].includes(response.statusCode ?? 0) && response.headers.location) { response.destroy(); resolve({ redirect: response.headers.location }); return; }
        if (response.statusCode !== 200) { response.destroy(); reject(new Error(`Source returned HTTP ${response.statusCode}`)); return; }
        if (!/^text\/(html|plain)(;|$)/i.test(response.headers['content-type'] ?? '')) { response.destroy(); reject(new Error('Source is not supported HTML or text')); return; }
        const chunks: Buffer[] = []; let bytes = 0;
        response.on('data', (chunk: Buffer) => { bytes += chunk.length; if (bytes > 2_000_000) { response.destroy(new Error('Source document is too large to retrieve safely')); return; } chunks.push(chunk); });
        response.on('end', () => resolve({ html: Buffer.concat(chunks).toString('utf8') }));
        response.on('error', reject);
      });
      request.on('error', reject); request.end();
    });
    if (result.redirect) { url = sourceUrl(new URL(result.redirect, url).href); continue; }
    return { id, url: url.href, ...extractPage(result.html!), collectedAt: new Date().toISOString() };
  }
  throw new Error('Source redirected too many times');
}
