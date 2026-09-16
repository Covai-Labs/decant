import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Developer documentation site for decant-core (repo Covai-Labs/decant).
// Hosted on GitHub Pages by building into ../docs.
// Stage 1: served from the project Pages URL. Once decant.js.org is claimed,
// switch site to 'https://decant.js.org' and base to '/'.
export default defineConfig({
  site: 'https://covai-labs.github.io/decant',
  base: '/decant',
  integrations: [sitemap()],
  outDir: '../docs',
  build: {
    format: 'file',
    inlineStylesheets: 'always',
    emptyOutDir: true,
  },
});
