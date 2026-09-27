import { defineCollection, reference } from 'astro:content';
import { file, glob } from 'astro/loaders';
import { z } from 'astro/zod';

// Todos los esquemas son estrictos: una clave desconocida (p. ej. un `price`) rompe el build.
// `reference()` solo valida la forma del id; que la entrada exista lo comprueba src/lib/content.ts.

const range = z
  .strictObject({ min: z.number().positive(), max: z.number().positive() })
  .refine((r) => r.min <= r.max, { message: '`min` no puede ser mayor que `max`' });

const percentage = z.number().min(0).max(100);

/**
 * Encuadre de una foto de cualquier proporción. Cada bloque la pinta en un marco fijo:
 * `fit` decide si se ve entera (`contain`, con el fondo del bloque alrededor) o llena el
 * marco (`cover`, recortando lo que sobre); `focus` es el punto que el recorte nunca deja
 * fuera. Se usan dentro del objeto `image` de cada colección.
 */
const focus = z.strictObject({ x: percentage, y: percentage }).default({ x: 50, y: 50 });
const fit = z.enum(['contain', 'cover']);

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Color en formato #RRGGBB');
const slug = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Slug en minúsculas separadas por guiones');

const categories = defineCollection({
  loader: file('src/content/categories.json'),
  schema: z.strictObject({
    id: slug,
    slug,
    group: z.enum(['backrest', 'solves', 'height']),
    order: z.number().int(),
    /** Opción del aside de filtros: «Malla». */
    label: z.string(),
    /** Chips de la barra de categorías y footer: «Sillas de malla». */
    longLabel: z.string(),
    /** `<h1>` de la página de la categoría; `emphasis` va en Newsreader itálica. */
    title: z.strictObject({ text: z.string(), emphasis: z.string().optional() }),
    intro: z.string(),
    seo: z.strictObject({ title: z.string(), description: z.string().max(160) }),
    guide: z.strictObject({
      title: z.string(),
      paragraphs: z.array(z.string()).min(1),
      sections: z.array(z.strictObject({ title: z.string(), text: z.string() })),
    }),
  }),
});

const chairs = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/chairs' }),
  schema: ({ image }) =>
    z.strictObject({
      name: z.string(),
      order: z.number().int(),
      /** Línea corta de la portada, la marquesina y el comparador: «Malla · lumbar ajustable». */
      summary: z.string(),
      /** Tarjeta del catálogo. */
      description: z.string(),
      /** Tarjeta de la muestra de la landing; si falta se usa `description`. */
      pitch: z.string().optional(),
      /** Por defecto entera: una foto de producto no debe perder respaldo ni ruedas. */
      image: z.strictObject({ src: image(), alt: z.string().min(1), fit: fit.default('contain'), focus }),
      categories: z.array(reference('categories')).min(1),
      /** Estatura de la persona para la que está pensada, en metros. */
      userHeight: range,
      specs: z.strictObject({
        backrest: z.string(),
        /** Centímetros. */
        seatHeight: range,
        armrests: z.string(),
        /** Grados. */
        maxRecline: z.number().int().min(90).max(180),
        lumbar: z.string(),
        warrantyYears: z.number().int().positive(),
        deliveredAssembled: z.boolean(),
      }),
      /** Obligatorio para las sillas de la portada y la de anatomía. */
      theme: z.strictObject({ gradient: z.tuple([hexColor, hexColor, hexColor]) }).optional(),
    }),
});

const featured = defineCollection({
  loader: file('src/content/featured.json'),
  schema: z.strictObject({
    id: z.literal('landing'),
    hero: z.array(reference('chairs')).min(1),
    showcase: z.array(reference('chairs')).min(1),
    comparison: z.tuple([reference('chairs'), reference('chairs'), reference('chairs')]),
    anatomy: reference('chairs'),
    categoryBar: z.array(reference('categories')).min(1),
  }),
});

const adjustments = defineCollection({
  loader: file('src/content/adjustments.json'),
  schema: z
    .strictObject({
      id: slug,
      order: z.number().int(),
      title: z.string(),
      /** Texto del rango («6 vueltas»)… */
      range: z.string().optional(),
      /** …o la spec de la silla de anatomía de la que se deriva (una sola fuente, spec §5.3). */
      spec: z.enum(['seatHeight', 'armrests', 'lumbar', 'maxRecline']).optional(),
      percent: z.number().int().min(0).max(100),
      description: z.string(),
      /**
       * Posición del punto sobre la foto de anatomía, en % de la foto entera (la anatomía la
       * muestra siempre sin recortar). Recalibrar con la foto real.
       */
      point: z.strictObject({ x: percentage, y: percentage }),
    })
    .refine((a) => (a.range === undefined) !== (a.spec === undefined), {
      message: 'Indica `range` o `spec` (uno de los dos)',
    }),
});

const testimonials = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/testimonials' }),
  schema: ({ image }) =>
    z
      .strictObject({
        order: z.number().int(),
        /** Visibles de entrada (el resto aparece con «Leer más experiencias»). */
        featured: z.boolean(),
        quote: z.string(),
        extendedQuote: z.string().optional(),
        name: z.string(),
        meta: z.string(),
        chair: reference('chairs').optional(),
        /** Para testimonios sin silla concreta: «Pedido de empresa». */
        chairLabel: z.string().optional(),
        /** Cuánto lleva con la silla: «2 años con ella». */
        tenure: z.string(),
        /** Objeción del bloque 02 que responde (spec: horas / estatura / clima). */
        objection: z.enum(['hours', 'height', 'climate', 'other']),
        /** Por defecto llena el marco: son fotos de ambiente. */
        image: z.strictObject({ src: image(), alt: z.string().min(1), fit: fit.default('cover'), focus }),
      })
      .refine((t) => (t.chair === undefined) !== (t.chairLabel === undefined), {
        message: 'Indica `chair` o `chairLabel` (uno de los dos)',
      }),
});

const faqs = defineCollection({
  loader: file('src/content/faqs.json'),
  schema: z.strictObject({ id: slug, order: z.number().int(), question: z.string(), answer: z.string() }),
});

const steps = defineCollection({
  loader: file('src/content/steps.json'),
  schema: z.strictObject({ id: slug, order: z.number().int(), title: z.string(), description: z.string() }),
});

const needs = defineCollection({
  loader: file('src/content/needs.json'),
  schema: z.strictObject({
    id: slug,
    order: z.number().int(),
    label: z.string(),
    title: z.string(),
    description: z.string(),
    cta: z.string(),
    category: reference('categories'),
  }),
});

const verdicts = defineCollection({
  loader: file('src/content/verdicts.json'),
  schema: z.strictObject({
    id: slug,
    order: z.number().int(),
    profile: z.string(),
    chair: reference('chairs'),
    reason: z.string(),
  }),
});

export const collections = {
  categories,
  chairs,
  featured,
  adjustments,
  testimonials,
  faqs,
  steps,
  needs,
  verdicts,
};
