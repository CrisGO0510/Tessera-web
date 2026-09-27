import { categoryPath, countMatches, matchesFilters, readExtraFilters, writeExtraFilters } from '@/lib/catalog';
import { defineElement, query, queryAll, readData } from '@/lib/dom';

interface FilterOption {
  readonly id: string;
  readonly slug: string;
  readonly link: HTMLAnchorElement;
  readonly count: HTMLElement;
}

interface ChairCard {
  readonly element: HTMLElement;
  readonly categories: readonly string[];
}

/** Destino al quitar la categoría base: la faceta del primer extra (conservando el resto) o el catálogo. */
export function hrefWithoutBase(extraSlugs: readonly string[]): string {
  const [first, ...rest] = extraSlugs;
  return first === undefined ? '/catalogo' : `${categoryPath(first)}${writeExtraFilters(rest)}`;
}

/**
 * Filtro progresivo del catálogo (spec §6). Sin JS todas las opciones son enlaces a su
 * faceta. En una página de faceta (`data-base`), las demás opciones estrechan en cliente
 * y el estado se refleja en `?y=`; la canonical estática no cambia.
 */
export class TsFilters extends HTMLElement {
  #options: FilterOption[] = [];
  #cards: ChairCard[] = [];
  #base: FilterOption | undefined;
  #extras: string[] = [];
  #connection: AbortController | undefined;

  connectedCallback(): void {
    // Un AbortController por conexión: si el elemento se vuelve a conectar, no se duplican los listeners.
    this.#connection?.abort();
    this.#connection = new AbortController();
    const { signal } = this.#connection;

    this.#options = queryAll(this, '[data-option]', HTMLAnchorElement).map((link) => ({
      id: readData(link, 'option'),
      slug: readData(link, 'slug'),
      link,
      count: query(link, '[data-count]', HTMLElement),
    }));
    this.#cards = queryAll(this, '[data-chair]', HTMLElement).map((element) => ({
      element,
      categories: readData(element, 'categories').split(' ').filter((id) => id !== ''),
    }));
    const baseId = this.dataset.base;
    this.#base = this.#options.find((option) => option.id === baseId);
    if (this.#base === undefined) return;

    const base = this.#base;
    const others = this.#options.filter((option) => option !== base);
    const validSlugs = new Set(others.map((option) => option.slug));
    this.#extras = readExtraFilters(window.location.search, validSlugs).map((slug) => this.#bySlug(slug).id);

    for (const option of others) {
      option.link.addEventListener(
        'click',
        (event) => {
          // Ctrl/Cmd/Mayús+clic o botón central: que el navegador abra la faceta en otra pestaña.
          if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
          event.preventDefault();
          this.#toggle(option.id);
        },
        { signal },
      );
    }
    for (const chip of queryAll(this, '[data-chip]', HTMLButtonElement)) {
      const id = readData(chip, 'chip');
      chip.addEventListener(
        'click',
        () => {
          this.#toggle(id);
          // El chip se oculta: el foco pasa a su opción del aside en vez de caer al <body>.
          // En móvil el aside llega plegado y su opción no puede recibir foco: va al resumen.
          const panel = this.querySelector('[data-filters-panel]');
          const summary = panel instanceof HTMLDetailsElement && !panel.open ? panel.querySelector('summary') : null;
          (summary ?? this.#byId(id).link).focus();
        },
        { signal },
      );
    }
    this.#render();
  }

  disconnectedCallback(): void {
    this.#connection?.abort();
  }

  #bySlug(slug: string): FilterOption {
    const option = this.#options.find((o) => o.slug === slug);
    if (option === undefined) throw new Error(`Filtro desconocido: «${slug}»`);
    return option;
  }

  #toggle(id: string): void {
    this.#extras = this.#extras.includes(id) ? this.#extras.filter((extra) => extra !== id) : [...this.#extras, id];
    this.#render();
    const slugs = this.#extras.map((extra) => this.#byId(extra).slug);
    window.history.replaceState(window.history.state, '', `${window.location.pathname}${writeExtraFilters(slugs)}`);
  }

  #byId(id: string): FilterOption {
    const option = this.#options.find((o) => o.id === id);
    if (option === undefined) throw new Error(`Filtro desconocido: «${id}»`);
    return option;
  }

  #render(): void {
    if (this.#base === undefined) return;
    const active = [this.#base.id, ...this.#extras];
    const chairs = this.#cards.map((card) => ({ categories: card.categories }));

    let visible = 0;
    for (const card of this.#cards) {
      const matches = matchesFilters(card.categories, active);
      card.element.hidden = !matches;
      if (matches) visible += 1;
    }

    for (const option of this.#options) {
      option.count.textContent = String(countMatches(chairs, option.id, active));
      if (option === this.#base) continue;
      if (this.#extras.includes(option.id)) {
        option.link.setAttribute('aria-current', 'true');
      } else {
        option.link.removeAttribute('aria-current');
      }
    }

    for (const chip of queryAll(this, '[data-chip]', HTMLButtonElement)) {
      chip.hidden = !this.#extras.includes(readData(chip, 'chip'));
    }

    const withoutBase = hrefWithoutBase(this.#extras.map((extra) => this.#byId(extra).slug));
    this.#base.link.href = withoutBase;
    this.#base.link.setAttribute('aria-current', 'true');
    const baseChip = this.querySelector('[data-base-chip]');
    if (baseChip instanceof HTMLAnchorElement) baseChip.href = withoutBase;

    const empty = this.querySelector('[data-empty]');
    if (empty instanceof HTMLElement) empty.hidden = visible > 0;
    for (const counter of this.ownerDocument.querySelectorAll('[data-visible-count], [data-showing-count]')) {
      counter.textContent = String(visible);
    }
  }
}

export function registerFilters(): void {
  defineElement('ts-filters', TsFilters);
}
