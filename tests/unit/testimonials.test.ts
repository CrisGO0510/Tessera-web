// @vitest-environment happy-dom
import { beforeAll, describe, expect, it } from 'vitest';
import { query, queryAll } from '@/lib/dom';
import { registerTestimonials, positionText, pageWindow } from '@/scripts/testimonials';
import { mount } from './helpers/mount';

describe('pageWindow', () => {
  it('muestra de a 3 y limita el cursor', () => {
    expect(pageWindow(6, 0)).toEqual({ start: 0, end: 3, max: 3 });
    expect(pageWindow(6, 3)).toEqual({ start: 3, end: 6, max: 3 });
    expect(pageWindow(6, 9)).toEqual({ start: 3, end: 6, max: 3 });
    expect(pageWindow(6, -1)).toEqual({ start: 0, end: 3, max: 3 });
  });

  it('con 3 o menos no hay paginación', () => {
    expect(pageWindow(3, 0)).toEqual({ start: 0, end: 3, max: 0 });
    expect(pageWindow(2, 0)).toEqual({ start: 0, end: 2, max: 0 });
  });
});

describe('positionText', () => {
  it('rango cuando hay más de 3', () => {
    expect(positionText(0, 3, 6)).toBe('Experiencias 1–3 de 6');
  });

  it('total cuando caben todas', () => {
    expect(positionText(0, 3, 3)).toBe('3 experiencias');
  });
});

function card(n: number, featured: boolean): string {
  return `<article data-testimonial data-featured="${String(featured)}">
    <p>Cita ${String(n)} <span data-extended>ampliación ${String(n)}</span></p>
    <button type="button" data-read-more aria-expanded="false" hidden>Ver más</button>
  </article>`;
}

const HTML = `
  <ts-testimonials>
    <button type="button" data-testimonials-more aria-expanded="false" hidden><span data-testimonials-more-text>Leer más experiencias</span></button>
    <button type="button" data-testimonials-prev hidden>←</button>
    ${[1, 2, 3].map((n) => card(n, true)).join('')}
    ${[4, 5, 6].map((n) => card(n, false)).join('')}
    <button type="button" data-testimonials-next hidden>→</button>
    <span data-testimonials-position>6 experiencias</span>
  </ts-testimonials>`;

function visibleCards(): number[] {
  return queryAll(document, '[data-testimonial]', HTMLElement)
    .map((t, i) => (t.hidden ? -1 : i + 1))
    .filter((n) => n > 0);
}

function button(selector: string): HTMLButtonElement {
  return query(document, selector, HTMLButtonElement);
}

function position(): string {
  return query(document, '[data-testimonials-position]', HTMLElement).textContent;
}

describe('ts-testimonials', () => {
  beforeAll(() => {
    registerTestimonials();
  });

  it('al conectarse muestra las 3 destacadas, los controles y oculta las ampliaciones', () => {
    mount(HTML);
    expect(visibleCards()).toEqual([1, 2, 3]);
    expect(position()).toBe('3 experiencias');
    expect(button('[data-testimonials-more]').hidden).toBe(false);
    expect(button('[data-testimonials-prev]').disabled).toBe(true);
    expect(button('[data-testimonials-next]').disabled).toBe(true);
    expect(queryAll(document, '[data-extended]', HTMLElement).every((a) => a.hidden)).toBe(true);
  });

  it('«Leer más experiencias» añade las no destacadas y habilita la paginación', () => {
    mount(HTML);
    button('[data-testimonials-more]').click();
    expect(button('[data-testimonials-more]').getAttribute('aria-expanded')).toBe('true');
    expect(query(document, '[data-testimonials-more-text]', HTMLElement).textContent).toBe('Ver menos experiencias');
    expect(position()).toBe('Experiencias 1–3 de 6');
    button('[data-testimonials-next]').click();
    expect(visibleCards()).toEqual([2, 3, 4]);
    expect(position()).toBe('Experiencias 2–4 de 6');
    button('[data-testimonials-next]').click();
    button('[data-testimonials-next]').click();
    expect(visibleCards()).toEqual([4, 5, 6]);
    expect(button('[data-testimonials-next]').disabled).toBe(true);
  });

  it('«Ver menos experiencias» vuelve a las destacadas desde el principio', () => {
    mount(HTML);
    button('[data-testimonials-more]').click();
    button('[data-testimonials-next]').click();
    button('[data-testimonials-more]').click();
    expect(visibleCards()).toEqual([1, 2, 3]);
    expect(position()).toBe('3 experiencias');
  });

  it('si «siguiente» se deshabilita con el foco encima, el foco pasa a «anterior»', () => {
    mount(HTML);
    button('[data-testimonials-more]').click();
    const next = button('[data-testimonials-next]');
    next.focus();
    next.click();
    next.click();
    next.click();
    expect(next.disabled).toBe(true);
    expect(document.activeElement).toBe(button('[data-testimonials-prev]'));
  });

  it('sin experiencias extra no hay botón «Leer más» y funciona igual', () => {
    mount(HTML.replace(/<button type="button" data-testimonials-more[\s\S]*?<\/button>/, ''));
    expect(visibleCards()).toEqual([1, 2, 3]);
    expect(position()).toBe('3 experiencias');
  });

  it('«Ver más» muestra la ampliación de su tarjeta', () => {
    mount(HTML);
    const readMore = queryAll(document, '[data-read-more]', HTMLButtonElement)[0];
    readMore?.click();
    expect(readMore?.getAttribute('aria-expanded')).toBe('true');
    expect(readMore?.textContent).toBe('Ver menos');
    expect(queryAll(document, '[data-extended]', HTMLElement).map((a) => a.hidden)).toEqual([false, true, true, true, true, true]);
  });
});
