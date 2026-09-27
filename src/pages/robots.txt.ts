import type { APIRoute } from 'astro';

export const GET: APIRoute = ({ site }) => {
  if (site === undefined) {
    throw new Error('Falta `site` en astro.config.ts: robots.txt necesita la URL del sitemap.');
  }
  const body = ['User-agent: *', 'Allow: /', '', `Sitemap: ${new URL('sitemap-index.xml', site).href}`, ''].join('\n');
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
