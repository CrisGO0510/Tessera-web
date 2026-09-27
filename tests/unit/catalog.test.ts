import { describe, expect, it } from 'vitest';
import {
  catalogIntroText,
  categoryPath,
  chipLabel,
  commonValue,
  comparisonBannerText,
  countMatches,
  filterChairs,
  matchesFilters,
  readExtraFilters,
  writeExtraFilters,
} from '@/lib/catalog';

const chairs = [
  { id: 'duna', categories: ['malla', 'lumbar'] },
  { id: 'mora', categories: ['malla', 'intensivo', 'alta'] },
  { id: 'llano', categories: ['tapizada', 'lumbar'] },
];

describe('matchesFilters', () => {
  it('sin filtros cumple todo', () => {
    expect(matchesFilters(['malla'], [])).toBe(true);
  });

  it('es AND entre filtros', () => {
    expect(matchesFilters(['malla', 'lumbar'], ['malla', 'lumbar'])).toBe(true);
    expect(matchesFilters(['malla'], ['malla', 'lumbar'])).toBe(false);
  });
});

describe('filterChairs', () => {
  it('devuelve las que cumplen', () => {
    expect(filterChairs(chairs, ['lumbar']).map((c) => c.id)).toEqual(['duna', 'llano']);
    expect(filterChairs(chairs, ['malla', 'lumbar']).map((c) => c.id)).toEqual(['duna']);
  });
});

describe('countMatches', () => {
  it('cuenta como si se añadiera la categoría', () => {
    expect(countMatches(chairs, 'lumbar', ['malla'])).toBe(1);
    expect(countMatches(chairs, 'malla', [])).toBe(2);
  });

  it('no duplica una categoría ya activa', () => {
    expect(countMatches(chairs, 'malla', ['malla'])).toBe(2);
  });
});

describe('categoryPath', () => {
  it('usa el slug', () => {
    expect(categoryPath('uso-intensivo')).toBe('/catalogo/uso-intensivo');
  });
});

describe('readExtraFilters / writeExtraFilters', () => {
  const valid = new Set(['lumbar', 'altos', 'uso-intensivo']);

  it('lee solo slugs válidos y sin duplicados', () => {
    expect(readExtraFilters('?y=lumbar,xx,altos,lumbar', valid)).toEqual(['lumbar', 'altos']);
  });

  it('sin parámetro devuelve vacío', () => {
    expect(readExtraFilters('', valid)).toEqual([]);
  });

  it('escribe la query o nada', () => {
    expect(writeExtraFilters(['lumbar', 'altos'])).toBe('?y=lumbar,altos');
    expect(writeExtraFilters([])).toBe('');
  });
});

describe('commonValue', () => {
  it('devuelve el valor si todos lo comparten', () => {
    expect(commonValue([5, 5, 5])).toBe(5);
  });

  it('undefined si difieren o no hay valores', () => {
    expect(commonValue([5, 3])).toBeUndefined();
    expect(commonValue<number>([])).toBeUndefined();
  });
});

describe('catalogIntroText', () => {
  it('con garantía común', () => {
    expect(catalogIntroText(12, 5)).toBe(
      'Doce modelos, todos con respaldo ajustable y garantía de cinco años. Cada ficha indica para qué estatura y qué tipo de jornada está pensada.',
    );
  });

  it('sin garantía común omite la frase y concuerda en singular', () => {
    expect(catalogIntroText(21, undefined)).toBe(
      'Veintiún modelos, todos con respaldo ajustable. Cada ficha indica para qué estatura y qué tipo de jornada está pensada.',
    );
    expect(catalogIntroText(1, 1)).toBe(
      'Un modelo, con respaldo ajustable y garantía de un año. Cada ficha indica para qué estatura y qué tipo de jornada está pensada.',
    );
  });
});

describe('comparisonBannerText', () => {
  const categories = [
    { id: 'malla', group: 'backrest', label: 'Malla' },
    { id: 'lumbar', group: 'solves', label: 'Soporte lumbar' },
  ] as const;

  it('nombra el respaldo que comparten las comparadas', () => {
    const compared = [{ categories: ['malla', 'lumbar'] }, { categories: ['malla'] }, { categories: ['malla', 'alta'] }];
    expect(comparisonBannerText(compared, categories)).toBe('Compara las tres de malla lado a lado.');
  });

  it('sin respaldo común solo da el número', () => {
    const compared = [{ categories: ['malla'] }, { categories: ['tapizada'] }, { categories: ['malla'] }];
    expect(comparisonBannerText(compared, categories)).toBe('Compara las tres lado a lado.');
  });
});

describe('chipLabel', () => {
  it('en minúsculas con la cruz', () => {
    expect(chipLabel('Soporte lumbar')).toBe('soporte lumbar ×');
  });
});
