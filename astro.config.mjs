import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

export default defineConfig({
  integrations: [react()],
  // /api is served by the Worker, not by Astro; `api` is the Compose service running it.
  vite: { server: { proxy: { '/api': 'http://api:8787' } } },
});
