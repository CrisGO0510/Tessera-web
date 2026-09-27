import type { CollectionEntry } from 'astro:content';
import { capitalize, numberToWords } from './format';

export type Group = CollectionEntry<'categories'>['data']['group'];

export const GROUPS: readonly Group[] = ['backrest', 'solves', 'height'];

// Títulos de los grupos del aside de filtros (texto de la página).
export const GROUP_LABELS: Readonly<Record<Group, string>> = {
  backrest: 'Tipo de respaldo',
  solves: 'Qué resuelve',
  height: 'Estatura y espacio',
};

/** Filtro AND: la silla debe tener todas las categorías activas. */
export function matchesFilters(chairCategories: readonly string[], active: readonly string[]): boolean {
  return active.every((id) => chairCategories.includes(id));
}

export function filterChairs<T extends { readonly categories: readonly string[] }>(chairs: readonly T[], active: readonly string[]): T[] {
  return chairs.filter((chair) => matchesFilters(chair.categories, active));
}

/** Cuántas sillas quedarían si se añade `category` a las activas (recuento del aside). */
export function countMatches(
  chairs: readonly { readonly categories: readonly string[] }[],
  category: string,
  active: readonly string[],
): number {
  const combined = active.includes(category) ? active : [...active, category];
  return filterChairs(chairs, combined).length;
}

export function categoryPath(slug: string): string {
  return `/catalogo/${slug}`;
}

/** Slugs extra de `?y=a,b`: solo los válidos, sin duplicados, en el orden en que aparecen. */
export function readExtraFilters(search: string, valid: ReadonlySet<string>): string[] {
  const value = new URLSearchParams(search).get('y');
  if (value === null) return [];
  const seen = new Set<string>();
  for (const slug of value.split(',')) {
    const clean = slug.trim();
    if (valid.has(clean)) seen.add(clean);
  }
  return [...seen];
}

export function writeExtraFilters(slugs: readonly string[]): string {
  return slugs.length === 0 ? '' : `?y=${slugs.join(',')}`;
}

/** El valor si todos los elementos lo comparten; si difieren (o no hay ninguno), undefined. */
export function commonValue<T>(values: readonly T[]): T | undefined {
  const [first, ...rest] = values;
  return first !== undefined && rest.every((value) => value === first) ? first : undefined;
}

/** Intro de /catalogo (diseño, C1) con el total y la garantía sacados de los datos. */
export function catalogIntroText(total: number, sharedWarranty: number | undefined): string {
  const models = `${capitalize(numberToWords(total, 'apocopated'))} ${total === 1 ? 'modelo, con' : 'modelos, todos con'}`;
  const warranty =
    sharedWarranty === undefined ? '' : ` y garantía de ${numberToWords(sharedWarranty, 'apocopated')} ${sharedWarranty === 1 ? 'año' : 'años'}`;
  return `${models} respaldo ajustable${warranty}. Cada ficha indica para qué estatura y qué tipo de jornada está pensada.`;
}

export interface FlatCategory {
  readonly id: string;
  readonly group: Group;
  readonly label: string;
}

/** «Compara las tres de malla lado a lado.»: el número y el respaldo común salen de los datos. */
export function comparisonBannerText(
  compared: readonly { readonly categories: readonly string[] }[],
  categories: readonly FlatCategory[],
): string {
  const backrest = categories.find((c) => c.group === 'backrest' && compared.every((chair) => chair.categories.includes(c.id)));
  const ofBackrest = backrest === undefined ? '' : ` de ${backrest.label.toLocaleLowerCase('es')}`;
  return `Compara las ${numberToWords(compared.length, 'feminine')}${ofBackrest} lado a lado.`;
}

/** Texto visible de un chip de filtro activo: «malla ×». */
export function chipLabel(label: string): string {
  return `${label.toLocaleLowerCase('es')} ×`;
}
