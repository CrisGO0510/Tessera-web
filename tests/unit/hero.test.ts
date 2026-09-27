// @vitest-environment happy-dom
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { query, queryAll } from '@/lib/dom';
import { HERO_INTERVAL, registerHero, nextIndex } from '@/scripts/hero';
import { mount } from './helpers/mount';

function html(autoplay: boolean): string {
  const chairs = [
    { name: 'Tessera Duna', summary: 'Malla · lumbar ajustable', href: '/catalogo#duna' },
    { name: 'Tessera Mora Pro', summary: 'Cabecera · reclina 135°', href: '/catalogo#mora-pro' },
    { name: 'Tessera Ígnea', summary: 'Gamer · respaldo alto', href: '/catalogo#ignea' },
  ];
  return `
    <ts-hero data-autoplay="${String(autoplay)}">
      ${chairs.map((_, i) => `<div data-hero-background ${i === 0 ? 'data-active' : ''}></div>`).join('')}
      ${chairs.map((s, i) => `<div data-hero-image ${i === 0 ? 'data-active' : 'aria-hidden="true"'}><img alt="${s.name}"></div>`).join('')}
      <span data-hero-name>${chairs[0]?.name ?? ''}</span>
      <span data-hero-summary>${chairs[0]?.summary ?? ''}</span>
      <div data-hero-pause><a data-hero-link href="${chairs[0]?.href ?? ''}">Ver la silla</a></div>
      ${chairs
        .map(
          (s, i) =>
            `<button type="button" data-hero-dot aria-label="${s.name}" aria-pressed="${String(i === 0)}"
               data-name="${s.name}" data-summary="${s.summary}" data-href="${s.href}"></button>`,
        )
        .join('')}
    </ts-hero>`;
}

function activeIndex(): number {
  return queryAll(document, '[data-hero-dot]', HTMLButtonElement).findIndex(
    (button) => button.getAttribute('aria-pressed') === 'true',
  );
}

describe('nextIndex', () => {
  it('avanza y vuelve al principio', () => {
    expect(nextIndex(0, 3)).toBe(1);
    expect(nextIndex(2, 3)).toBe(0);
  });

  it('con una sola silla se queda en 0', () => {
    expect(nextIndex(0, 1)).toBe(0);
  });
});

describe('ts-hero', () => {
  beforeAll(() => {
    registerHero();
  });

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.replaceChildren();
  });

  it('avanza sola cada 5 s cuando hay autoplay', () => {
    mount(html(true));
    expect(activeIndex()).toBe(0);
    vi.advanceTimersByTime(HERO_INTERVAL);
    expect(activeIndex()).toBe(1);
    vi.advanceTimersByTime(HERO_INTERVAL * 2);
    expect(activeIndex()).toBe(0);
  });

  it('sincroniza fondo, imagen, chip y enlace con la silla activa', () => {
    mount(html(true));
    vi.advanceTimersByTime(HERO_INTERVAL);
    const backgrounds = queryAll(document, '[data-hero-background]', HTMLElement);
    const images = queryAll(document, '[data-hero-image]', HTMLElement);
    expect(backgrounds.map((f) => f.hasAttribute('data-active'))).toEqual([false, true, false]);
    expect(images.map((f) => f.hasAttribute('data-active'))).toEqual([false, true, false]);
    expect(images.map((f) => f.getAttribute('aria-hidden'))).toEqual(['true', null, 'true']);
    expect(query(document, '[data-hero-name]', HTMLElement).textContent).toBe('Tessera Mora Pro');
    expect(query(document, '[data-hero-summary]', HTMLElement).textContent).toBe('Cabecera · reclina 135°');
    expect(query(document, '[data-hero-link]', HTMLAnchorElement).getAttribute('href')).toBe('/catalogo#mora-pro');
  });

  it('el primer clic en un indicador elige la silla y cancela el autoplay para siempre', () => {
    mount(html(true));
    queryAll(document, '[data-hero-dot]', HTMLButtonElement)[2]?.click();
    expect(activeIndex()).toBe(2);
    vi.advanceTimersByTime(HERO_INTERVAL * 4);
    expect(activeIndex()).toBe(2);
  });

  it('reconectar no reanuda un autoplay cancelado ni duplica los clics', () => {
    mount(html(true));
    queryAll(document, '[data-hero-dot]', HTMLButtonElement)[1]?.click();
    const element = query(document, 'ts-hero', HTMLElement);
    element.remove();
    document.body.append(element);
    vi.advanceTimersByTime(HERO_INTERVAL * 2);
    expect(activeIndex()).toBe(1);
    queryAll(document, '[data-hero-dot]', HTMLButtonElement)[2]?.click();
    expect(activeIndex()).toBe(2);
  });

  it('se pausa con el puntero encima y se reanuda al salir', () => {
    mount(html(true));
    const zone = query(document, '[data-hero-pause]', HTMLElement);
    zone.dispatchEvent(new PointerEvent('pointerenter'));
    vi.advanceTimersByTime(HERO_INTERVAL * 2);
    expect(activeIndex()).toBe(0);
    zone.dispatchEvent(new PointerEvent('pointerleave'));
    vi.advanceTimersByTime(HERO_INTERVAL);
    expect(activeIndex()).toBe(1);
  });

  it('con el foco dentro no cambia el destino de «Ver la silla»', () => {
    mount(html(true));
    const link = query(document, '[data-hero-link]', HTMLAnchorElement);
    link.focus();
    vi.advanceTimersByTime(HERO_INTERVAL * 2);
    expect(link.getAttribute('href')).toBe('/catalogo#duna');
    link.blur();
    vi.advanceTimersByTime(HERO_INTERVAL);
    expect(activeIndex()).toBe(1);
  });

  it('sin autoplay no avanza', () => {
    mount(html(false));
    vi.advanceTimersByTime(HERO_INTERVAL * 3);
    expect(activeIndex()).toBe(0);
  });

  it('con movimiento reducido no avanza', () => {
    const original = window.matchMedia.bind(window);
    // Una consulta que siempre se cumple hace que «prefers-reduced-motion» devuelva true.
    vi.spyOn(window, 'matchMedia').mockImplementation((mediaQuery) =>
      original(mediaQuery.includes('reduce') ? '(min-width: 0px)' : mediaQuery),
    );
    mount(html(true));
    vi.advanceTimersByTime(HERO_INTERVAL * 3);
    expect(activeIndex()).toBe(0);
    vi.restoreAllMocks();
  });
});
