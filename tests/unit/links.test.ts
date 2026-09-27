import { describe, expect, it } from 'vitest';
import { brokenLinks, parseHtml, pathFromFile } from '@/lib/links';

describe('pathFromFile', () => {
  it('quita la extensión y añade la barra inicial', () => {
    expect(pathFromFile('catalogo/malla.html')).toBe('/catalogo/malla');
    expect(pathFromFile('sillas-ergonomicas.html')).toBe('/sillas-ergonomicas');
  });
});

describe('parseHtml', () => {
  it('recoge ids y hrefs', () => {
    const page = parseHtml('/x', '<section id="faq"><a href="/catalogo">a</a><a href="#faq">b</a></section>');
    expect([...page.ids]).toEqual(['faq']);
    expect(page.links).toEqual(['/catalogo', '#faq']);
  });
});

describe('brokenLinks', () => {
  const landing = parseHtml(
    '/sillas-ergonomicas',
    '<section id="anatomia"></section><a href="/catalogo#duna">a</a><a href="mailto:hola@x.co">b</a><a href="https://wa.me/57300">c</a>',
  );
  const catalog = parseHtml('/catalogo', '<article id="duna"></article><a href="/sillas-ergonomicas#anatomia">a</a><a href="/catalogo/malla?y=lumbar">b</a>');

  it('acepta rutas, anclas y queries existentes e ignora mailto y externos', () => {
    expect(brokenLinks([landing, catalog, parseHtml('/catalogo/malla', '')], new Set())).toEqual([]);
  });

  it('reporta anclas inexistentes', () => {
    expect(brokenLinks([landing, catalog, parseHtml('/catalogo/malla', '<a href="#arriba">a</a>')], new Set())).toEqual([
      '/catalogo/malla: «#arriba» apunta a un ancla que no existe en /catalogo/malla.',
    ]);
  });

  it('reporta rutas inexistentes salvo archivos conocidos, una sola vez', () => {
    const page = parseHtml('/a', '<a href="/fichas/duna">x</a><a href="/fichas/duna">x</a><a href="/favicon.svg">y</a>');
    expect(brokenLinks([page], new Set(['/favicon.svg']))).toEqual(['/a: «/fichas/duna» apunta a una ruta que no existe.']);
  });

  it('prohíbe enlazar a la raíz', () => {
    expect(brokenLinks([parseHtml('/a', '<a href="/">x</a>')], new Set())).toEqual([
      '/a: enlaza a «/», que es una redirección; usa /sillas-ergonomicas.',
    ]);
  });
});
