import type { BreadcrumbItem } from './schema';
import { canonicalUrl } from './seo';

/** Tramo visible de la miga de pan; el último (la página actual) va sin `href`. */
export interface VisibleBreadcrumb {
  readonly name: string;
  readonly href?: string;
}

/**
 * Migas para `BreadcrumbList`: URLs absolutas; el tramo sin `href` apunta a la página actual.
 * Tramos seguidos con la misma URL se unen (se queda el primero): Google no admite dos
 * posiciones con la misma URL.
 */
export function breadcrumbsForJsonLd(breadcrumbs: readonly VisibleBreadcrumb[], origin: string, currentPath: string): BreadcrumbItem[] {
  const withUrl = breadcrumbs.map((item) => ({ name: item.name, url: canonicalUrl(origin, item.href ?? currentPath) }));
  return withUrl.filter((item, i) => i === 0 || withUrl[i - 1]?.url !== item.url);
}
