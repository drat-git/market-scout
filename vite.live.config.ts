import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { configuredStorage, configuredModel, serveApi } from './server/http';

export default defineConfig({ plugins: [react(), {
  name: 'local-market-scout-api',
  configureServer(server) {
    server.middlewares.use('/api', async (req, res) => {
      const path = '/api' + (req.url?.split('?')[0] ?? '');
      const origin = 'http://127.0.0.1:5173';
      const headers = new Headers();
      for (const [key, value] of Object.entries(req.headers)) if (value) headers.set(key, Array.isArray(value) ? value.join(', ') : value);
      let body = Buffer.alloc(0);
      for await (const chunk of req) {
        body = Buffer.concat([body, Buffer.from(chunk)]);
        if (body.byteLength > 100_000) { res.statusCode = 413; res.end(JSON.stringify({ error: 'Request too large' })); return; }
      }
      try {
        const request = new Request(origin + path, { method: req.method, headers, ...(req.method === 'POST' ? { body } : {}) });
        const env = { ...loadEnv('development', process.cwd(), ''), ...process.env };
        const response = await serveApi(request, { origin, secure: false, sessionSecret: env.SESSION_SECRET, redis: configuredStorage(env), model: configuredModel(env) });
        res.statusCode = response.status;
        response.headers.forEach((value, key) => res.setHeader(key, value));
        res.end(await response.text());
      } catch { res.statusCode = 503; res.end(JSON.stringify({ error: 'Server protection is not configured.' })); }
    });
  }
}], server: { port: 5173, strictPort: true } });
