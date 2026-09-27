import { defineElement, query } from '@/lib/dom';

/**
 * Menú del header por debajo de 900 px. El estado inicial (panel cerrado, botón visible)
 * lo pone el CSS con <html data-js> antes del primer pintado; aquí solo se alterna.
 * Sin JS el panel se ve como lista y el botón no aparece.
 */
export class TsMenu extends HTMLElement {
  #button: HTMLButtonElement | null = null;
  #panel: HTMLElement | null = null;

  connectedCallback(): void {
    const button = query(this, '[data-menu-button]', HTMLButtonElement);
    const panel = query(this, '[data-menu-panel]', HTMLElement);
    this.#button = button;
    this.#panel = panel;
    this.#close();

    button.addEventListener('click', this.#toggle);
    panel.addEventListener('click', this.#onLinkClick);
    this.addEventListener('keydown', this.#onKeyDown);
    document.addEventListener('click', this.#onOutsideClick);
  }

  disconnectedCallback(): void {
    this.#button?.removeEventListener('click', this.#toggle);
    this.#panel?.removeEventListener('click', this.#onLinkClick);
    this.removeEventListener('keydown', this.#onKeyDown);
    document.removeEventListener('click', this.#onOutsideClick);
  }

  /** Un toque fuera del header cierra el panel, como en cualquier menú desplegable. */
  #onOutsideClick = (event: MouseEvent): void => {
    if (event.target instanceof Node && !this.contains(event.target)) this.#close();
  };

  /** Un ancla de la misma página no recarga: sin cerrar, el panel taparía el destino. */
  #onLinkClick = (event: MouseEvent): void => {
    if (event.target instanceof Element && event.target.closest('a') !== null) this.#close();
  };

  #toggle = (): void => {
    if (this.#button?.getAttribute('aria-expanded') === 'true') {
      this.#close();
    } else {
      this.#open();
    }
  };

  #onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape' && this.#button?.getAttribute('aria-expanded') === 'true') {
      this.#close();
      this.#button.focus();
    }
  };

  #open(): void {
    this.#button?.setAttribute('aria-expanded', 'true');
    if (this.#panel !== null) this.#panel.dataset.open = '';
  }

  #close(): void {
    this.#button?.setAttribute('aria-expanded', 'false');
    if (this.#panel !== null) delete this.#panel.dataset.open;
  }
}

export function registerMenu(): void {
  defineElement('ts-menu', TsMenu);
}
