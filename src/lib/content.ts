import { getCollection, type CollectionEntry } from 'astro:content';
import type { Link } from '../data/site';
import { categoryPath, comparisonBannerText, catalogIntroText, commonValue, filterChairs, GROUP_LABELS, GROUPS } from './catalog';
import {
  brokenReferences,
  ContentError,
  duplicates,
  emptyCategories,
  jsonFileProblems,
  minimumEntries,
  missingTheme,
  outOfSyncEntries,
  type Reference,
} from './validation';

// Los JSON tal como están en disco: el loader file() de Astro solo avisa en el log de un
// JSON inválido, una entrada sin `id` o un `id` repetido (ver jsonFileProblems).
const jsonFiles = import.meta.glob<string>('../content/*.json', { eager: true, query: '?raw', import: 'default' });

function fileProblems(collections: Readonly<Record<string, readonly { readonly id: string }[]>>): string[] {
  return Object.entries(collections).flatMap(([name, entries]) => {
    const text = jsonFiles[`../content/${name}`];
    if (text === undefined) return [`${name}: no se encontró el archivo.`];
    const { problems, ids } = jsonFileProblems(name, text);
    return problems.length > 0
      ? problems
      : outOfSyncEntries(
          name,
          ids,
          entries.map((entry) => entry.id),
        );
  });
}

export type Chair = CollectionEntry<'chairs'>;
export type Category = CollectionEntry<'categories'>;
export type Adjustment = CollectionEntry<'adjustments'>;
export type Testimonial = CollectionEntry<'testimonials'>;
export type Faq = CollectionEntry<'faqs'>;
export type Step = CollectionEntry<'steps'>;
export type Need = CollectionEntry<'needs'>;
export type Verdict = CollectionEntry<'verdicts'>;

export interface ResolvedTestimonial {
  readonly entry: Testimonial;
  readonly chair: Chair | undefined;
  /** Nombre de la silla o `chairLabel` («Pedido de empresa»). */
  readonly chairLabel: string;
}

export interface ResolvedNeed {
  readonly entry: Need;
  readonly category: Category;
}

export interface ResolvedVerdict {
  readonly entry: Verdict;
  readonly chair: Chair;
}

export interface SiteContent {
  readonly chairs: readonly Chair[];
  readonly categories: readonly Category[];
  readonly hero: readonly Chair[];
  readonly showcase: readonly Chair[];
  readonly comparison: readonly [Chair, Chair, Chair];
  readonly anatomy: Chair;
  readonly categoryBar: readonly Category[];
  readonly adjustments: readonly Adjustment[];
  readonly testimonials: readonly ResolvedTestimonial[];
  readonly faqs: readonly Faq[];
  readonly steps: readonly Step[];
  readonly needs: readonly ResolvedNeed[];
  readonly verdicts: readonly ResolvedVerdict[];
}

export function categoryIds(chair: Chair): string[] {
  return chair.data.categories.map((ref) => ref.id);
}

/** Fondo de la portada y de la anatomía. La validación garantiza `theme` en esas sillas. */
export function themeGradient(chair: Chair): string {
  const colors = chair.data.theme?.gradient;
  if (colors === undefined) {
    throw new ContentError([`chairs/${chair.id}: necesita \`theme.gradient\`.`]);
  }
  return `linear-gradient(165deg, ${colors[0]} 0%, ${colors[1]} 45%, ${colors[2]} 100%)`;
}

export function categoryLinks(categories: readonly Category[]): Link[] {
  return categories.map((category) => ({ text: category.data.longLabel, href: categoryPath(category.data.slug) }));
}

export function catalogIntro(content: SiteContent): string {
  return catalogIntroText(content.chairs.length, commonValue(content.chairs.map((chair) => chair.data.specs.warrantyYears)));
}

export function comparisonBanner(content: SiteContent): string {
  return comparisonBannerText(
    content.comparison.map((chair) => ({ categories: categoryIds(chair) })),
    content.categories.map((category) => ({ id: category.id, group: category.data.group, label: category.data.label })),
  );
}

export interface FilterState {
  /** Sillas que se ven al cargar: las de la base, o todas en /catalogo. */
  readonly visible: readonly Chair[];
  readonly active: readonly string[];
  readonly groups: readonly { readonly title: string; readonly options: readonly Category[] }[];
  /** Categorías que pueden ser filtro extra (todas menos la base). */
  readonly others: readonly Category[];
  /** Para `countMatches()`: las categorías de cada silla. */
  readonly data: readonly { readonly categories: readonly string[] }[];
}

export function filterState(content: SiteContent, base: Category | undefined): FilterState {
  const data = content.chairs.map((chair) => ({ chair, categories: categoryIds(chair) }));
  const active = base === undefined ? [] : [base.id];
  return {
    visible: filterChairs(data, active).map((item) => item.chair),
    active,
    groups: GROUPS.map((group) => ({
      title: GROUP_LABELS[group],
      options: content.categories.filter((category) => category.data.group === group),
    })).filter((group) => group.options.length > 0),
    others: content.categories.filter((category) => category.id !== base?.id),
    data,
  };
}

function byOrder<T extends { readonly data: { readonly order: number } }>(entries: readonly T[]): T[] {
  return [...entries].sort((a, b) => a.data.order - b.data.order);
}

function indexById<T extends { readonly id: string }>(entries: readonly T[]): ReadonlyMap<string, T> {
  return new Map(entries.map((entry) => [entry.id, entry]));
}

function resolveEntry<T>(index: ReadonlyMap<string, T>, id: string, source: string): T {
  const entry = index.get(id);
  if (entry === undefined) {
    throw new ContentError([`${source}: «${id}» no existe.`]);
  }
  return entry;
}

/**
 * Carga todas las colecciones, valida la integridad (referencias, categorías vacías,
 * temas obligatorios, slugs únicos) y devuelve el contenido resuelto y ordenado.
 * Lanza ContentError con TODOS los problemas: así el build falla con un solo mensaje.
 */
export async function getSiteContent(): Promise<SiteContent> {
  const [chairs, categories, allFeatured, adjustments, testimonials, faqs, steps, needs, verdicts] = await Promise.all([
    getCollection('chairs'),
    getCollection('categories'),
    getCollection('featured'),
    getCollection('adjustments'),
    getCollection('testimonials'),
    getCollection('faqs'),
    getCollection('steps'),
    getCollection('needs'),
    getCollection('verdicts'),
  ]);

  const problemsInFiles = fileProblems({
    'categories.json': categories,
    'featured.json': allFeatured,
    'adjustments.json': adjustments,
    'faqs.json': faqs,
    'steps.json': steps,
    'needs.json': needs,
    'verdicts.json': verdicts,
  });
  if (problemsInFiles.length > 0) {
    throw new ContentError(problemsInFiles);
  }

  const featured = allFeatured.find((entry) => entry.id === 'landing');
  if (featured === undefined) {
    throw new ContentError(['featured.json: falta la entrada con id «landing».']);
  }
  const f = featured.data;

  const references: Reference[] = [
    ...chairs.flatMap((chair) =>
      chair.data.categories.map((ref, i) => ({ source: `chairs/${chair.id} → categories[${String(i)}]`, collection: 'categories', id: ref.id })),
    ),
    ...testimonials.flatMap((t) =>
      t.data.chair === undefined ? [] : [{ source: `testimonials/${t.id} → chair`, collection: 'chairs', id: t.data.chair.id }],
    ),
    ...needs.map((n) => ({ source: `needs/${n.id} → category`, collection: 'categories', id: n.data.category.id })),
    ...verdicts.map((v) => ({ source: `verdicts/${v.id} → chair`, collection: 'chairs', id: v.data.chair.id })),
    ...(['hero', 'showcase', 'comparison'] as const).flatMap((field) =>
      f[field].map((ref, i) => ({ source: `featured/landing → ${field}[${String(i)}]`, collection: 'chairs', id: ref.id })),
    ),
    { source: 'featured/landing → anatomy', collection: 'chairs', id: f.anatomy.id },
    ...f.categoryBar.map((ref, i) => ({ source: `featured/landing → categoryBar[${String(i)}]`, collection: 'categories', id: ref.id })),
  ];

  const existing = new Map([
    ['chairs', new Set(chairs.map((c) => c.id))],
    ['categories', new Set(categories.map((c) => c.id))],
  ]);
  const themed = new Set(chairs.filter((c) => c.data.theme !== undefined).map((c) => c.id));

  const problems = [
    ...brokenReferences(existing, references),
    ...emptyCategories(
      categories.map((c) => c.id),
      chairs.map((c) => ({ id: c.id, categories: categoryIds(c) })),
    ),
    ...missingTheme(
      [
        ...f.hero.map((ref, i) => ({ source: `featured/landing → hero[${String(i)}]`, chair: ref.id })),
        { source: 'featured/landing → anatomy', chair: f.anatomy.id },
      ],
      themed,
    ),
    ...duplicates(
      'categories → slug',
      categories.map((c) => c.data.slug),
    ),
    ...minimumEntries('faqs.json', faqs.length, 1),
    ...minimumEntries('steps.json', steps.length, 1),
    ...minimumEntries('needs.json', needs.length, 1),
    ...minimumEntries('verdicts.json', verdicts.length, 1),
    ...minimumEntries('adjustments.json', adjustments.length, 1),
    ...minimumEntries('testimonios con `featured: true`', testimonials.filter((t) => t.data.featured).length, 1),
  ];
  if (problems.length > 0) {
    throw new ContentError(problems);
  }

  const chairsById = indexById(chairs);
  const categoriesById = indexById(categories);
  const chair = (id: string, source: string): Chair => resolveEntry(chairsById, id, source);
  const category = (id: string, source: string): Category => resolveEntry(categoriesById, id, source);
  const [c1, c2, c3] = f.comparison;

  return {
    chairs: byOrder(chairs),
    categories: [...categories].sort(
      (a, b) => GROUPS.indexOf(a.data.group) - GROUPS.indexOf(b.data.group) || a.data.order - b.data.order,
    ),
    hero: f.hero.map((ref) => chair(ref.id, 'featured → hero')),
    showcase: f.showcase.map((ref) => chair(ref.id, 'featured → showcase')),
    comparison: [chair(c1.id, 'featured → comparison'), chair(c2.id, 'featured → comparison'), chair(c3.id, 'featured → comparison')],
    anatomy: chair(f.anatomy.id, 'featured → anatomy'),
    categoryBar: f.categoryBar.map((ref) => category(ref.id, 'featured → categoryBar')),
    adjustments: byOrder(adjustments),
    testimonials: byOrder(testimonials).map((t) => {
      const ownChair = t.data.chair === undefined ? undefined : chair(t.data.chair.id, `testimonials/${t.id}`);
      return { entry: t, chair: ownChair, chairLabel: ownChair?.data.name ?? t.data.chairLabel ?? '' };
    }),
    faqs: byOrder(faqs),
    steps: byOrder(steps),
    needs: byOrder(needs).map((n) => ({ entry: n, category: category(n.data.category.id, `needs/${n.id}`) })),
    verdicts: byOrder(verdicts).map((v) => ({ entry: v, chair: chair(v.data.chair.id, `verdicts/${v.id}`) })),
  };
}
