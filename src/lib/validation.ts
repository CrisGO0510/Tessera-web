// Reglas de integridad del contenido sobre datos planos (sin astro:content) para poder
// probarlas en Vitest. src/lib/content.ts las aplica en el build y lanza si hay problemas.

export interface Reference {
  /** Dónde está declarada, para el mensaje: «chairs/duna → categories[0]». */
  readonly source: string;
  readonly collection: string;
  readonly id: string;
}

export type IdsByCollection = ReadonlyMap<string, ReadonlySet<string>>;

export function brokenReferences(existing: IdsByCollection, references: readonly Reference[]): string[] {
  return references
    .filter((ref) => existing.get(ref.collection)?.has(ref.id) !== true)
    .map((ref) => `${ref.source}: «${ref.id}» no existe en la colección «${ref.collection}».`);
}

export function emptyCategories(
  categories: readonly string[],
  chairs: readonly { readonly id: string; readonly categories: readonly string[] }[],
): string[] {
  return categories
    .filter((category) => !chairs.some((chair) => chair.categories.includes(category)))
    .map((category) => `categories/${category}: ninguna silla la usa; generaría una página indexable vacía.`);
}

export function missingTheme(
  usages: readonly { readonly source: string; readonly chair: string }[],
  themed: ReadonlySet<string>,
): string[] {
  return usages
    .filter((usage) => !themed.has(usage.chair))
    .map((usage) => `${usage.source}: la silla «${usage.chair}» necesita \`theme.gradient\`.`);
}

export function duplicates(source: string, values: readonly string[]): string[] {
  const seen = new Set<string>();
  const repeated = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) repeated.add(value);
    seen.add(value);
  }
  return [...repeated].map((value) => `${source}: «${value}» está repetido.`);
}

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function idOf(entry: unknown): unknown {
  return typeof entry === 'object' && entry !== null && 'id' in entry ? entry.id : undefined;
}

/**
 * Un archivo de una colección `file()` tal como está en disco. El loader de Astro 7 solo
 * registra en el log un JSON inválido, una entrada sin `id` o un `id` repetido, y el build
 * termina en verde: esta regla hace que fallen.
 */
export function jsonFileProblems(name: string, text: string): { problems: string[]; ids: string[] } {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return { problems: [`${name}: JSON inválido (${detail}).`], ids: [] };
  }
  if (!Array.isArray(data)) {
    return { problems: [`${name}: debe ser un array de entradas.`], ids: [] };
  }
  const entries: readonly unknown[] = data;
  const problems: string[] = [];
  const ids: string[] = [];
  entries.forEach((entry, i) => {
    const id = idOf(entry);
    if (typeof id === 'string' && SLUG.test(id)) {
      ids.push(id);
    } else {
      problems.push(`${name}[${String(i)}]: falta \`id\` o no es un slug (minúsculas, números y guiones).`);
    }
  });
  return { problems: [...problems, ...duplicates(`${name} → id`, ids)], ids };
}

/** Lo que hay en el archivo frente a lo que Astro cargó (detecta también una caché vieja). */
export function outOfSyncEntries(name: string, fileIds: readonly string[], collectionIds: readonly string[]): string[] {
  const inCollection = new Set(collectionIds);
  const inFile = new Set(fileIds);
  return [
    ...fileIds
      .filter((id) => !inCollection.has(id))
      .map((id) => `${name}: «${id}» está en el archivo pero Astro no lo cargó (revisa el log del build).`),
    ...collectionIds
      .filter((id) => !inFile.has(id))
      .map((id) => `${name}: «${id}» se cargó pero ya no está en el archivo (caché desactualizada: borra node_modules/.astro).`),
  ];
}

export function minimumEntries(name: string, count: number, minimum: number): string[] {
  return count >= minimum ? [] : [`${name}: hace falta al menos ${String(minimum)} (hay ${String(count)}).`];
}

export interface SiteContactData {
  readonly url: string;
  readonly contact: { readonly whatsapp: string; readonly email: string };
}

/**
 * Datos de relleno que no pueden llegar a producción (operacion.md, «Puesta en marcha»):
 * dominios reservados para ejemplos y un WhatsApp que termina en una ristra de ceros.
 */
export function placeholderData(data: SiteContactData): string[] {
  const reservedDomain = /\.(example|test|invalid|localhost)$/i;
  const problems: string[] = [];
  if (reservedDomain.test(new URL(data.url).hostname)) problems.push(`site.url es de ejemplo: ${data.url}`);
  if (reservedDomain.test(data.contact.email.split('@')[1] ?? '')) problems.push(`El correo es de ejemplo: ${data.contact.email}`);
  if (/0{6,}$/.test(data.contact.whatsapp)) problems.push(`El WhatsApp parece de prueba: ${data.contact.whatsapp}`);
  return problems;
}

export class ContentError extends Error {
  readonly problems: readonly string[];

  constructor(problems: readonly string[]) {
    super(`El contenido tiene ${String(problems.length)} problema(s):\n- ${problems.join('\n- ')}`);
    this.name = 'ContentError';
    this.problems = problems;
  }
}
