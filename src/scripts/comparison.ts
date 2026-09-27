import { defineElement, query, queryAll } from '@/lib/dom';

/**
 * Switch «Solo lo que cambia» del comparador. Sin JS el switch no sirve, así que el HTML
 * lo trae oculto y este elemento lo muestra al conectarse.
 */
export class TsComparison extends HTMLElement {
  #switch: HTMLButtonElement | null = null;

  connectedCallback(): void {
    const toggle = query(this, '[data-comparison-switch]', HTMLButtonElement);
    this.#switch = toggle;
    toggle.hidden = false;
    this.#apply(toggle.getAttribute('aria-checked') === 'true');
    toggle.addEventListener('click', this.#toggle);
  }

  disconnectedCallback(): void {
    this.#switch?.removeEventListener('click', this.#toggle);
  }

  #toggle = (): void => {
    this.#apply(this.#switch?.getAttribute('aria-checked') !== 'true');
  };

  #apply(onlyDifferences: boolean): void {
    this.#switch?.setAttribute('aria-checked', String(onlyDifferences));
    for (const row of queryAll(this, '[data-same-row]', HTMLTableRowElement)) {
      row.hidden = onlyDifferences;
    }
  }
}

export function registerComparison(): void {
  defineElement('ts-comparison', TsComparison);
}
