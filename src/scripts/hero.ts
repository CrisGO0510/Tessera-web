import { defineElement, prefersReducedMotion, query, queryAll, readData } from '@/lib/dom';

export const HERO_INTERVAL = 5000;

export function nextIndex(current: number, total: number): number {
  return total <= 1 ? 0 : (current + 1) % total;
}

/**
 * Carrusel de la portada. Rota cada 5 s (si `data-autoplay="true"` y sin movimiento
 * reducido); el primer clic en un indicador elige la silla y cancela la rotación para
 * siempre. Sincroniza fondo, imagen, chip, enlace e indicadores.
 *
 * La rotación se pausa mientras el puntero está sobre la foto o el chip, mientras hay
 * foco dentro (el enlace «Ver la silla» no cambia de destino bajo el teclado, WCAG 2.2.2)
 * y con la pestaña oculta.
 */
export class TsHero extends HTMLElement {
  #index = 0;
  #timer: ReturnType<typeof setInterval> | undefined;
  #dots: HTMLButtonElement[] = [];
  /** El usuario eligió una silla: la rotación no vuelve aunque el elemento se reconecte. */
  #cancelled = false;
  #connection: AbortController | undefined;
  #pointerInside = false;
  #focusInside = false;

  connectedCallback(): void {
    this.#connection?.abort();
    this.#connection = new AbortController();
    const { signal } = this.#connection;
    this.#dots = queryAll(this, '[data-hero-dot]', HTMLButtonElement);
    this.#dots.forEach((dot, i) => {
      dot.addEventListener(
        'click',
        () => {
          this.#cancelled = true;
          this.#stop();
          this.#show(i);
        },
        { signal },
      );
    });

    for (const zone of queryAll(this, '[data-hero-pause]', HTMLElement)) {
      zone.addEventListener('pointerenter', () => (this.#pointerInside = true), { signal });
      zone.addEventListener('pointerleave', () => (this.#pointerInside = false), { signal });
    }
    this.addEventListener('focusin', () => (this.#focusInside = true), { signal });
    this.addEventListener(
      'focusout',
      (event) => {
        this.#focusInside = event.relatedTarget instanceof Node && this.contains(event.relatedTarget);
      },
      { signal },
    );

    const autoplay = this.dataset.autoplay === 'true' && !this.#cancelled;
    if (autoplay && this.#dots.length > 1 && !prefersReducedMotion()) {
      this.#timer = setInterval(() => {
        if (this.#pointerInside || this.#focusInside || document.hidden) return;
        this.#show(nextIndex(this.#index, this.#dots.length));
      }, HERO_INTERVAL);
    }
  }

  disconnectedCallback(): void {
    this.#connection?.abort();
    this.#stop();
  }

  #stop(): void {
    clearInterval(this.#timer);
    this.#timer = undefined;
  }

  #show(index: number): void {
    const dot = this.#dots[index];
    if (dot === undefined) return;
    this.#index = index;

    queryAll(this, '[data-hero-background]', HTMLElement).forEach((background, i) => {
      background.toggleAttribute('data-active', i === index);
    });
    queryAll(this, '[data-hero-image]', HTMLElement).forEach((image, i) => {
      image.toggleAttribute('data-active', i === index);
      if (i === index) image.removeAttribute('aria-hidden');
      else image.setAttribute('aria-hidden', 'true');
    });
    this.#dots.forEach((button, i) => {
      button.setAttribute('aria-pressed', String(i === index));
    });

    query(this, '[data-hero-name]', HTMLElement).textContent = readData(dot, 'name');
    query(this, '[data-hero-summary]', HTMLElement).textContent = readData(dot, 'summary');
    query(this, '[data-hero-link]', HTMLAnchorElement).setAttribute('href', readData(dot, 'href'));
  }
}

export function registerHero(): void {
  defineElement('ts-hero', TsHero);
}
