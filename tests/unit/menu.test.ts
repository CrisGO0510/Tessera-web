// @vitest-environment happy-dom
import { beforeAll, describe, expect, it } from 'vitest';
import { query } from '@/lib/dom';
import { registerMenu } from '@/scripts/menu';
import { mount } from './helpers/mount';

const HTML = `
  <ts-menu>
    <div data-menu-panel id="main-menu"><a href="/catalogo">Sillas</a></div>
    <button type="button" data-menu-button aria-controls="main-menu" aria-expanded="false">Menú</button>
  </ts-menu>`;

function parts(): { button: HTMLButtonElement; panel: HTMLElement } {
  return {
    button: query(document, '[data-menu-button]', HTMLButtonElement),
    panel: query(document, '[data-menu-panel]', HTMLElement),
  };
}

describe('ts-menu', () => {
  beforeAll(() => {
    registerMenu();
  });

  it('al conectarse deja el panel cerrado', () => {
    mount(HTML);
    const { button, panel } = parts();
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(panel.hasAttribute('data-open')).toBe(false);
  });

  it('el botón abre y cierra el panel', () => {
    mount(HTML);
    const { button, panel } = parts();
    button.click();
    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(panel.hasAttribute('data-open')).toBe(true);
    button.click();
    expect(panel.hasAttribute('data-open')).toBe(false);
  });

  it('elegir un enlace del panel lo cierra (si no, taparía el ancla de destino)', () => {
    mount(HTML);
    const { button, panel } = parts();
    button.click();
    query(document, '[data-menu-panel] a', HTMLAnchorElement).dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(panel.hasAttribute('data-open')).toBe(false);
  });

  it('Escape cierra y devuelve el foco al botón', () => {
    mount(HTML);
    const { button, panel } = parts();
    button.click();
    panel.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(button);
  });

  it('un clic fuera del menú lo cierra', () => {
    mount(`${HTML}<p id="fuera">Contenido</p>`);
    const { button, panel } = parts();
    button.click();
    document.getElementById('fuera')?.click();
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(panel.hasAttribute('data-open')).toBe(false);
  });
});
