import { defineConfig } from 'astro/config';

// Static output. The dashboard renders pages at build time using the Supabase
// service-role key (server-only env). For sub-minute freshness, switch to
// `output: 'server'` and deploy with the Vercel/Netlify adapter.
export default defineConfig({
  output: 'static',
  srcDir: './src',
  publicDir: './public',
  outDir: './dist',
});
