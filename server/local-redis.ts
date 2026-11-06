import { createClient } from 'redis';
import type { Redis } from './redis';
/** Development-only loopback connection. Hosted environments use authenticated Upstash HTTPS. */
class LocalRedis implements Redis {
  private client: ReturnType<typeof createClient>;
  private connecting?: Promise<unknown>;
  constructor(url: string) {
    const target = new URL(url);
    if (target.protocol !== 'redis:' || !['127.0.0.1', 'localhost', '[::1]'].includes(target.hostname)) throw new Error('Local Redis must use loopback');
    this.client = createClient({ url, disableOfflineQueue: true, socket: { connectTimeout: 3000, reconnectStrategy: false } });
    this.client.on('error', () => { /* Errors are surfaced as sanitized API responses. */ });
  }
  async command<T>(...args: (string | number)[]): Promise<T> {
    if (!this.client.isReady) {
      this.connecting ??= this.client.connect().finally(() => { this.connecting = undefined; });
      await this.connecting;
    }
    return await this.client.sendCommand(args.map(String), { abortSignal: AbortSignal.timeout(5000) }) as T;
  }
}
let local: { url: string; redis: Redis } | undefined;
export function localStorage(url: string): Redis {
  if (!local || local.url !== url) local = { url, redis: new LocalRedis(url) };
  return local.redis;
}
