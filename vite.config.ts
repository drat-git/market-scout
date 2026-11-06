import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The public demo is static. Experimental API middleware lives in vite.live.config.ts.
export default defineConfig({ plugins: [react()], server: { host: '127.0.0.1', port: 5173 } });
