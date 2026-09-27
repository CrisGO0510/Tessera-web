// Verificación de enlaces internos del build. Autocontenido (sin imports de src/lib) porque
// scripts/check-links.ts lo ejecuta Node directamente, sin el bundler.
import { parse } from 'node-html-parser';

export interface ParsedPage {
  /** Ruta pública sin extensión: `/catalogo/malla`. */
  readonly path: string;
  readonly ids: ReadonlySet<string>;
  readonly links: readonly string[];
}

/** `catalogo/malla.html` → `/catalogo/malla` (build.format: 'file', trailingSlash: 'never'). */
export function pathFromFile(relativeFile: string): string {
  return `/${relativeFile.replace(/\\/g, '/').replace(/\.html$/, '')}`;
}

export function parseHtml(path: string, html: string): ParsedPage {
  const root = parse(html);
  const ids = new Set(root.querySelectorAll('[id]').map((el) => el.getAttribute('id') ?? ''));
  const links = root
    .querySelectorAll('a[href]')
    .map((a) => a.getAttribute('href') ?? '')
    .filter((href) => href !== '');
  return { path, ids, links };
}

function isInternal(href: string): boolean {
  return href.startsWith('/') || href.startsWith('#');
}

/**
 * Enlaces internos rotos: ruta inexistente, enlace a `/` (es una redirección 301, nunca se
 * enlaza) o ancla sin `id` en la página destino. `files` son rutas de recursos que no son
 * páginas (`/favicon.svg`, `/robots.txt`…).
 */
export function brokenLinks(pages: readonly ParsedPage[], files: ReadonlySet<string>): string[] {
  const byPath = new Map(pages.map((page) => [page.path, page]));
  const problems = new Set<string>();
  for (const page of pages) {
    for (const href of page.links.filter(isInternal)) {
      const [pathPart = '', anchor] = href.split('#', 2);
      const targetPath = pathPart === '' ? page.path : (pathPart.split('?')[0] ?? pathPart);
      if (targetPath === '/') {
        problems.add(`${page.path}: enlaza a «/», que es una redirección; usa /sillas-ergonomicas.`);
        continue;
      }
      const target = byPath.get(targetPath);
      if (target === undefined) {
        if (!files.has(targetPath)) problems.add(`${page.path}: «${href}» apunta a una ruta que no existe.`);
        continue;
      }
      if (anchor !== undefined && anchor !== '' && !target.ids.has(anchor)) {
        problems.add(`${page.path}: «${href}» apunta a un ancla que no existe en ${target.path}.`);
      }
    }
  }
  return [...problems];
}
