interface ElementConstructor<T extends Element> {
  readonly prototype: T;
  new (): T;
}

/** Primer elemento que cumple el selector y es del tipo pedido; si no, error descriptivo. */
export function query<T extends Element>(root: ParentNode, selector: string, type: ElementConstructor<T>): T {
  const element = root.querySelector(selector);
  if (element === null) {
    throw new Error(`No se encontró "${selector}".`);
  }
  if (!(element instanceof type)) {
    throw new Error(`"${selector}" no es del tipo esperado (${type.name}).`);
  }
  return element;
}

export function queryAll<T extends Element>(root: ParentNode, selector: string, type: ElementConstructor<T>): T[] {
  return Array.from(root.querySelectorAll(selector), (element) => {
    if (!(element instanceof type)) {
      throw new Error(`Un elemento de "${selector}" no es del tipo esperado (${type.name}).`);
    }
    return element;
  });
}

/** Valor de un atributo data-*; error si falta. */
export function readData(element: HTMLElement, name: string): string {
  const value = element.dataset[name];
  if (value === undefined) {
    throw new Error(`Falta data-${name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}.`);
  }
  return value;
}

/** Registra un custom element una sola vez (los scripts pueden cargarse en varias páginas). */
export function defineElement(name: string, constructor: CustomElementConstructor): void {
  if (customElements.get(name) === undefined) {
    customElements.define(name, constructor);
  }
}

export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
