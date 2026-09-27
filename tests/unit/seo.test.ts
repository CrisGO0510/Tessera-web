import { describe, expect, it } from 'vitest';
import { canonicalUrl, openGraphLocale, pageTitle } from '@/lib/seo';

describe('canonicalUrl', () => {
  it('une origen y ruta sin barra final', () => {
    expect(canonicalUrl('https://tessera.co/', '/catalogo/malla/')).toBe('https://tessera.co/catalogo/malla');
  });

  it('conserva la raíz', () => {
    expect(canonicalUrl('https://tessera.co', '/')).toBe('https://tessera.co/');
  });

  it('rechaza rutas relativas, queries y anclas', () => {
    expect(() => canonicalUrl('https://tessera.co', 'catalogo')).toThrow();
    expect(() => canonicalUrl('https://tessera.co', '/catalogo?y=lumbar')).toThrow();
    expect(() => canonicalUrl('https://tessera.co', '/catalogo#cat-guia')).toThrow();
  });
});

describe('pageTitle', () => {
  it('añade la marca', () => {
    expect(pageTitle('Compara las sillas', 'Tessera')).toBe('Compara las sillas · Tessera');
  });

  it('no la duplica', () => {
    expect(pageTitle('Tessera — sillas', 'Tessera')).toBe('Tessera — sillas');
  });
});

describe('openGraphLocale', () => {
  it('convierte el guion', () => {
    expect(openGraphLocale('es-CO')).toBe('es_CO');
  });
});
