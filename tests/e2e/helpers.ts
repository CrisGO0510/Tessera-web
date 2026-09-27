import { readdirSync, readFileSync } from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

// Recuentos y rutas salen del contenido: los tests siguen valiendo con el catálogo real.
function readList(file: string): unknown[] {
  const data: unknown = JSON.parse(readFileSync(`src/content/${file}`, 'utf-8'));
  return Array.isArray(data) ? data : [];
}

function countMarkdown(folder: string): number {
  return readdirSync(`src/content/${folder}`).filter((file) => file.endsWith('.md')).length;
}

const categorySlugs = readList('categories.json').flatMap((category) =>
  typeof category === 'object' && category !== null && 'slug' in category && typeof category.slug === 'string' ? [category.slug] : [],
);

export const CONTENT = {
  chairs: countMarkdown('chairs'),
  testimonials: countMarkdown('testimonials'),
  faqs: readList('faqs.json').length,
  adjustments: readList('adjustments.json').length,
} as const;

export const ROUTES: readonly string[] = [
  '/sillas-ergonomicas',
  '/catalogo',
  ...categorySlugs.map((slug) => `/catalogo/${slug}`),
  '/comparar',
];

/** Nodos JSON-LD de la página, ya parseados (falla si alguno no es JSON válido). */
export async function jsonLd(page: Page): Promise<unknown[]> {
  const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
  return blocks.flatMap((text): unknown[] => {
    const value: unknown = JSON.parse(text);
    return Array.isArray(value) ? value : [value];
  });
}

export function types(nodes: readonly unknown[]): string[] {
  return nodes.flatMap((node) =>
    typeof node === 'object' && node !== null && '@type' in node && typeof node['@type'] === 'string' ? [node['@type']] : [],
  );
}

export async function expectNoAxeViolations(page: Page): Promise<void> {
  const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  const summary = result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
  expect(summary).toEqual([]);
}

/**
 * El área táctil real llega a `radius` px del centro en cada eje (21 → 44 px): esos puntos
 * siguen perteneciendo al control. `boundingBox()` no sirve porque no incluye el ::after.
 */
export async function hasMinimumTouchTarget(
  page: Page,
  selector: string,
  radius: { readonly horizontal: number; readonly vertical: number } = { horizontal: 21, vertical: 21 },
): Promise<boolean[]> {
  return page.locator(selector).evaluateAll((controls, { horizontal, vertical }) =>
    controls.map((control) => {
      // Centrado en pantalla: fuera del viewport elementFromPoint devuelve null.
      control.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' });
      const box = control.getBoundingClientRect();
      const cx = box.left + box.width / 2;
      const cy = box.top + box.height / 2;
      return [
        [cx - horizontal, cy],
        [cx + horizontal, cy],
        [cx, cy - vertical],
        [cx, cy + vertical],
      ].every(([x = 0, y = 0]) => {
        const element = document.elementFromPoint(x, y);
        return element !== null && (element === control || control.contains(element));
      });
    }),
    radius,
  );
}
