/**
 * Monta HTML ya completo en el documento. Se pasa por un <template> para que los
 * custom elements se conecten con sus hijos ya presentes, como ocurre en el sitio
 * (los scripts de Astro son módulos diferidos y se ejecutan después del parseo).
 */
export function mount(html: string): void {
  const template = document.createElement('template');
  template.innerHTML = html;
  document.body.replaceChildren(template.content.cloneNode(true));
}
