import { describe, expect, it } from 'vitest';
import {
  brokenReferences,
  ContentError,
  duplicates,
  emptyCategories,
  jsonFileProblems,
  minimumEntries,
  missingTheme,
  outOfSyncEntries,
} from '@/lib/validation';

describe('brokenReferences', () => {
  const existing = new Map([
    ['categories', new Set(['malla', 'lumbar'])],
    ['chairs', new Set(['duna'])],
  ]);

  it('no reporta referencias válidas', () => {
    expect(brokenReferences(existing, [{ source: 'chairs/duna → categories[0]', collection: 'categories', id: 'malla' }])).toEqual([]);
  });

  it('reporta cada referencia inexistente con su origen', () => {
    expect(
      brokenReferences(existing, [
        { source: 'chairs/duna → categories[1]', collection: 'categories', id: 'gamer' },
        { source: 'featured/landing → hero[0]', collection: 'chairs', id: 'zafiro' },
      ]),
    ).toEqual([
      'chairs/duna → categories[1]: «gamer» no existe en la colección «categories».',
      'featured/landing → hero[0]: «zafiro» no existe en la colección «chairs».',
    ]);
  });
});

describe('emptyCategories', () => {
  it('detecta categorías sin sillas', () => {
    expect(emptyCategories(['malla', 'compacta'], [{ id: 'duna', categories: ['malla'] }])).toEqual([
      'categories/compacta: ninguna silla la usa; generaría una página indexable vacía.',
    ]);
  });
});

describe('missingTheme', () => {
  it('exige gradiente a las sillas de la portada', () => {
    expect(missingTheme([{ source: 'featured/landing → hero[1]', chair: 'vega' }], new Set(['duna']))).toEqual([
      'featured/landing → hero[1]: la silla «vega» necesita `theme.gradient`.',
    ]);
  });
});

describe('duplicates', () => {
  it('detecta slugs repetidos', () => {
    expect(duplicates('categories.slug', ['malla', 'altos', 'malla'])).toEqual(['categories.slug: «malla» está repetido.']);
  });
});

describe('ContentError', () => {
  it('lista todos los problemas', () => {
    const error = new ContentError(['uno', 'dos']);
    expect(error.message).toBe('El contenido tiene 2 problema(s):\n- uno\n- dos');
    expect(error.problems).toEqual(['uno', 'dos']);
  });
});

describe('jsonFileProblems', () => {
  it('acepta un array de entradas con id slug únicos', () => {
    expect(jsonFileProblems('faqs.json', '[{"id":"garantia"},{"id":"llega-armada"}]')).toEqual({
      problems: [],
      ids: ['garantia', 'llega-armada'],
    });
  });

  it('JSON inválido (p. ej. coma final)', () => {
    const { problems } = jsonFileProblems('faqs.json', '[{"id":"a"},]');
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatch(/^faqs\.json: JSON inválido/);
  });

  it('no es un array', () => {
    expect(jsonFileProblems('steps.json', '{"id":"a"}').problems).toEqual(['steps.json: debe ser un array de entradas.']);
  });

  it('entradas sin id, con id que no es slug o repetido', () => {
    expect(jsonFileProblems('needs.json', '[{"title":"x"},{"id":"uso intensivo"},{"id":"a"},{"id":"a"}]').problems).toEqual([
      'needs.json[0]: falta `id` o no es un slug (minúsculas, números y guiones).',
      'needs.json[1]: falta `id` o no es un slug (minúsculas, números y guiones).',
      'needs.json → id: «a» está repetido.',
    ]);
  });
});

describe('outOfSyncEntries', () => {
  it('sin diferencias no reporta nada', () => {
    expect(outOfSyncEntries('faqs.json', ['a', 'b'], ['b', 'a'])).toEqual([]);
  });

  it('reporta lo que Astro no cargó y lo que sobra (caché vieja)', () => {
    expect(outOfSyncEntries('faqs.json', ['a', 'b'], ['a', 'c'])).toEqual([
      'faqs.json: «b» está en el archivo pero Astro no lo cargó (revisa el log del build).',
      'faqs.json: «c» se cargó pero ya no está en el archivo (caché desactualizada: borra node_modules/.astro).',
    ]);
  });
});

describe('minimumEntries', () => {
  it('exige un mínimo por colección', () => {
    expect(minimumEntries('testimonios destacados', 0, 1)).toEqual(['testimonios destacados: hace falta al menos 1 (hay 0).']);
    expect(minimumEntries('faqs', 5, 1)).toEqual([]);
  });
});
