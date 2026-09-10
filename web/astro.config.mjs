import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://decant.covai.org',
  outDir: './dist',
  build: {
    format: 'file',
    inlineStylesheets: 'always',
    emptyOutDir: true,
  },
});
