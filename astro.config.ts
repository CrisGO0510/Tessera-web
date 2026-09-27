import { fileURLToPath } from 'node:url';
import sitemap from '@astrojs/sitemap';
import { defineConfig, fontProviders } from 'astro/config';
import { site } from './src/data/site';
import { placeholderData } from './src/lib/validation';

const scssIndex = fileURLToPath(new URL('./src/styles/_index.scss', import.meta.url));

export default defineConfig({
  site: site.url,
  trailingSlash: 'never',
  // Un id repetido en una colección file() rompe el build en vez de avisar (ver src/lib/validation.ts).
  prerenderConflictBehavior: 'error',
  build: { format: 'file' },
  integrations: [
    {
      // Avisa en cada build de los datos de relleno; con REQUIRE_REAL_DATA=1 (producción) falla.
      name: 'tessera:real-data',
      hooks: {
        'astro:build:start': ({ logger }): void => {
          const problems = placeholderData(site);
          if (problems.length === 0) return;
          if (process.env.REQUIRE_REAL_DATA === '1') {
            throw new Error(`Datos de relleno en src/data/site.ts:\n- ${problems.join('\n- ')}`);
          }
          for (const problem of problems) logger.warn(problem);
        },
      },
    },
    sitemap({
      filter: (page) => !page.endsWith('/404'),
    }),
  ],
  fonts: [
    {
      provider: fontProviders.fontsource(),
      name: 'Archivo',
      cssVariable: '--font-archivo',
      weights: [400, 500, 600, 700, 800],
      styles: ['normal'],
      subsets: ['latin'],
      fallbacks: ['system-ui', 'sans-serif'],
    },
    {
      provider: fontProviders.fontsource(),
      name: 'Newsreader',
      cssVariable: '--font-newsreader',
      weights: [300],
      styles: ['normal', 'italic'],
      subsets: ['latin'],
      fallbacks: ['Georgia', 'serif'],
    },
    {
      provider: fontProviders.fontsource(),
      name: 'IBM Plex Mono',
      cssVariable: '--font-mono',
      weights: [400, 500],
      styles: ['normal'],
      subsets: ['latin'],
      fallbacks: ['ui-monospace', 'monospace'],
    },
  ],
  vite: {
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: `@use "${scssIndex}" as *;\n`,
        },
      },
    },
  },
});
