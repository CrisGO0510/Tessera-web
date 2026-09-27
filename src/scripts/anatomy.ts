import { defineElement, queryAll } from '@/lib/dom';

/**
 * Bloque 04. Los puntos sobre la foto y las filas de la lista escriben el mismo estado.
 * Sin JS se ven los cuatro paneles (todo el texto está en el HTML); al conectarse solo
 * queda visible el del ajuste activo.
 */
export class TsAnatomy extends HTMLElement {
  #connection: AbortController | undefined;

  connectedCallback(): void {
    this.#connection?.abort();
    this.#connection = new AbortController();
    const { signal } = this.#connection;
    for (const selector of ['[data-adjustment-point]', '[data-adjustment-row]']) {
      queryAll(this, selector, HTMLButtonElement).forEach((button, i) => {
        button.addEventListener(
          'click',
          () => {
            this.#select(i);
            this.#announce(i);
          },
          { signal },
        );
      });
    }
    this.#select(0);
  }

  disconnectedCallback(): void {
    this.#connection?.abort();
  }

  /** Solo tras una elección del usuario: al cargar no se anuncia nada. */
  #announce(index: number): void {
    const announcer = this.querySelector('[data-adjustment-announcer]');
    const panel = queryAll(this, '[data-adjustment-panel]', HTMLElement)[index];
    if (announcer !== null && panel !== undefined) announcer.textContent = panel.dataset.announcement ?? '';
  }

  #select(index: number): void {
    for (const selector of ['[data-adjustment-point]', '[data-adjustment-row]']) {
      queryAll(this, selector, HTMLButtonElement).forEach((button, i) => {
        button.setAttribute('aria-pressed', String(i === index));
      });
    }
    queryAll(this, '[data-adjustment-panel]', HTMLElement).forEach((panel, i) => {
      panel.hidden = i !== index;
    });
  }
}

export function registerAnatomy(): void {
  defineElement('ts-anatomy', TsAnatomy);
}
