import { describe, expect, it } from 'vitest';
import { breadcrumbsForJsonLd } from '@/lib/breadcrumbs';

describe('breadcrumbsForJsonLd', () => {
  it('convierte los href en URLs absolutas', () => {
    expect(
      breadcrumbsForJsonLd(
        [
          { name: 'Inicio', href: '/sillas-ergonomicas' },
          { name: 'Sillas', href: '/catalogo' },
          { name: 'Sillas de malla' },
        ],
        'https://tessera.co',
        '/catalogo/malla',
      ),
    ).toEqual([
      { name: 'Inicio', url: 'https://tessera.co/sillas-ergonomicas' },
      { name: 'Sillas', url: 'https://tessera.co/catalogo' },
      { name: 'Sillas de malla', url: 'https://tessera.co/catalogo/malla' },
    ]);
  });

  it('el tramo sin href apunta a la página actual', () => {
    expect(breadcrumbsForJsonLd([{ name: 'Ergonómicas home office' }], 'https://tessera.co', '/catalogo')).toEqual([
      { name: 'Ergonómicas home office', url: 'https://tessera.co/catalogo' },
    ]);
  });

  it('une tramos seguidos con la misma URL (en /catalogo, «Sillas» y el último)', () => {
    expect(
      breadcrumbsForJsonLd(
        [{ name: 'Inicio', href: '/sillas-ergonomicas' }, { name: 'Sillas' }, { name: 'Ergonómicas home office' }],
        'https://tessera.co',
        '/catalogo',
      ),
    ).toEqual([
      { name: 'Inicio', url: 'https://tessera.co/sillas-ergonomicas' },
      { name: 'Sillas', url: 'https://tessera.co/catalogo' },
    ]);
  });
});
