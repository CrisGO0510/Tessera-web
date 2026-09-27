import { defineElement, query, queryAll } from '@/lib/dom';

const PER_PAGE = 3;

export interface PageWindow {
  readonly start: number;
  readonly end: number;
  /** Último cursor posible. */
  readonly max: number;
}

/** Tramo visible de `total` tarjetas con el cursor limitado a [0, total − 3]. */
export function pageWindow(total: number, cursor: number): PageWindow {
  const max = Math.max(0, total - PER_PAGE);
  const start = Math.min(Math.max(0, cursor), max);
  return { start, end: Math.min(start + PER_PAGE, total), max };
}

// Texto visible del contador (página en español).
export function positionText(start: number, end: number, total: number): string {
  return total > PER_PAGE ? `Experiencias ${String(start + 1)}–${String(end)} de ${String(total)}` : `${String(total)} experiencias`;
}

/**
 * Bloque 05. Sin JS se ven todas las experiencias con su texto completo; al conectarse
 * se muestran las destacadas de a 3, con «Leer más experiencias», anterior/siguiente
 * y «Ver más» por tarjeta.
 */
export class TsTestimonials extends HTMLElement {
  #expanded = false;
  #cursor = 0;
  #connection: AbortController | undefined;

  connectedCallback(): void {
    this.#connection?.abort();
    this.#connection = new AbortController();
    const { signal } = this.#connection;

    // «Leer más» solo existe si hay experiencias no destacadas.
    const more = this.querySelector('[data-testimonials-more]');
    const prev = query(this, '[data-testimonials-prev]', HTMLButtonElement);
    const next = query(this, '[data-testimonials-next]', HTMLButtonElement);
    prev.hidden = false;
    next.hidden = false;

    if (more instanceof HTMLButtonElement) {
      more.hidden = false;
      more.addEventListener(
        'click',
        () => {
          this.#expanded = !this.#expanded;
          this.#cursor = 0;
          this.#render();
        },
        { signal },
      );
    }
    prev.addEventListener(
      'click',
      () => {
        this.#cursor -= 1;
        this.#render();
      },
      { signal },
    );
    next.addEventListener(
      'click',
      () => {
        this.#cursor += 1;
        this.#render();
      },
      { signal },
    );

    for (const card of queryAll(this, '[data-testimonial]', HTMLElement)) {
      this.#setUpReadMore(card, signal);
    }
    this.#render();
  }

  disconnectedCallback(): void {
    this.#connection?.abort();
  }

  #setUpReadMore(card: HTMLElement, signal: AbortSignal): void {
    const extended = card.querySelector('[data-extended]');
    const readMore = card.querySelector('[data-read-more]');
    if (!(extended instanceof HTMLElement) || !(readMore instanceof HTMLButtonElement)) return;
    extended.hidden = true;
    readMore.hidden = false;
    readMore.addEventListener(
      'click',
      () => {
        const open = readMore.getAttribute('aria-expanded') !== 'true';
        extended.hidden = !open;
        readMore.setAttribute('aria-expanded', String(open));
        readMore.textContent = open ? 'Ver menos' : 'Ver más';
      },
      { signal },
    );
  }

  #render(): void {
    const cards = queryAll(this, '[data-testimonial]', HTMLElement);
    const list = cards.filter((card) => this.#expanded || card.dataset.featured === 'true');
    const { start, end, max } = pageWindow(list.length, this.#cursor);
    this.#cursor = start;

    const visible = new Set(list.slice(start, end));
    for (const card of cards) card.hidden = !visible.has(card);

    const prev = query(this, '[data-testimonials-prev]', HTMLButtonElement);
    const next = query(this, '[data-testimonials-next]', HTMLButtonElement);
    prev.disabled = start === 0;
    next.disabled = start >= max;
    // Un botón deshabilitado pierde el foco (cae al <body>): pasa a la flecha contraria.
    if (document.activeElement === next && next.disabled && !prev.disabled) prev.focus();
    if (document.activeElement === prev && prev.disabled && !next.disabled) next.focus();
    query(this, '[data-testimonials-position]', HTMLElement).textContent = positionText(start, end, list.length);

    const more = this.querySelector('[data-testimonials-more]');
    if (more instanceof HTMLButtonElement) {
      more.setAttribute('aria-expanded', String(this.#expanded));
      query(more, '[data-testimonials-more-text]', HTMLElement).textContent = this.#expanded ? 'Ver menos experiencias' : 'Leer más experiencias';
    }
  }
}

export function registerTestimonials(): void {
  defineElement('ts-testimonials', TsTestimonials);
}
