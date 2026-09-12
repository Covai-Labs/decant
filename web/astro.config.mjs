import { defineConfig } from 'astro/config';

// Static sitemap lives in public/sitemap.xml — URLs are stable so the build
// stays fast and avoids sitemap index duplication. Output targets ../docs for
// GitHub Pages, matching the ai-chat-exporter website architecture.
export default defineConfig({
  site: 'https://decant.covai.org',
  outDir: '../docs',
  build: {
    format: 'file',
    inlineStylesheets: 'always',
    emptyOutDir: true,
  },
});
