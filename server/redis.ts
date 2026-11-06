export interface Redis {
  command<T>(...args: (string | number)[]): Promise<T>;
}

/** No retries: a network timeout can mean that a mutation already succeeded. */
export class RestRedis implements Redis {
  constructor(private url: string, private token: string) {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.pathname !== '/') throw new Error('Invalid Redis configuration');
    if (!token) throw new Error('Redis credentials missing');
  }
  async command<T>(...args: (string | number)[]): Promise<T> {
    const response = await fetch(this.url, {
      method: 'POST', headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(args), signal: AbortSignal.timeout(5000), redirect: 'error'
    });
    if (!response.ok) throw new Error('Storage unavailable');
    const body = await response.json() as { result?: T; error?: string };
    if (body.error || !('result' in body)) throw new Error('Storage command failed');
    return body.result as T;
  }
}
export const PREFIX = 'market-scout:{market-scout}:';
