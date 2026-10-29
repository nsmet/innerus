import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://innerus.app',
  output: 'static',
  trailingSlash: 'always',
  build: { format: 'directory' },
});
