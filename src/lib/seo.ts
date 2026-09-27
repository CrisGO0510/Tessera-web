/** URL absoluta sin barra final (trailingSlash: 'never'). La raíz se queda como `/`. */
export function canonicalUrl(origin: string, path: string): string {
  if (!path.startsWith('/')) {
    throw new Error(`La ruta canónica debe empezar por "/": "${path}"`);
  }
  if (path.includes('?') || path.includes('#')) {
    throw new Error(`La ruta canónica no lleva query ni ancla: "${path}"`);
  }
  const clean = path.length > 1 ? path.replace(/\/+$/, '') : path;
  return `${origin.replace(/\/+$/, '')}${clean}`;
}

export function pageTitle(title: string, brand: string): string {
  return title.includes(brand) ? title : `${title} · ${brand}`;
}

/** `es-MX` → `es_MX`, el formato de og:locale. */
export function openGraphLocale(locale: string): string {
  return locale.replace('-', '_');
}
