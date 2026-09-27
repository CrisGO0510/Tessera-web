// @vitest-environment happy-dom
import { beforeAll, describe, expect, it } from 'vitest';
import { query, queryAll } from '@/lib/dom';
import { registerComparison } from '@/scripts/comparison';
import { mount } from './helpers/mount';

const HTML = `
  <ts-comparison>
    <button type="button" role="switch" aria-checked="false" data-comparison-switch hidden>Solo lo que cambia</button>
    <table>
      <tbody>
        <tr data-row="Respaldo"><th scope="row">Respaldo</th><td>Malla media</td></tr>
        <tr data-row="Garantía" data-same-row><th scope="row">Garantía</th><td>5 años</td></tr>
        <tr data-row="Entrega armada" data-same-row><th scope="row">Entrega armada</th><td>Sí, 48 h</td></tr>
      </tbody>
    </table>
  </ts-comparison>`;

function toggle(): HTMLButtonElement {
  return query(document, '[data-comparison-switch]', HTMLButtonElement);
}

function hiddenRows(): string[] {
  return queryAll(document, '[data-row]', HTMLTableRowElement)
    .filter((row) => row.hidden)
    .map((row) => row.dataset.row ?? '');
}

describe('ts-comparison', () => {
  beforeAll(() => {
    registerComparison();
  });

  it('al conectarse muestra el switch apagado y todas las filas', () => {
    mount(HTML);
    expect(toggle().hidden).toBe(false);
    expect(toggle().getAttribute('aria-checked')).toBe('false');
    expect(hiddenRows()).toEqual([]);
  });

  it('al activarlo oculta solo las filas iguales', () => {
    mount(HTML);
    toggle().click();
    expect(toggle().getAttribute('aria-checked')).toBe('true');
    expect(hiddenRows()).toEqual(['Garantía', 'Entrega armada']);
  });

  it('al desactivarlo vuelve a mostrar todas', () => {
    mount(HTML);
    toggle().click();
    toggle().click();
    expect(toggle().getAttribute('aria-checked')).toBe('false');
    expect(hiddenRows()).toEqual([]);
  });
});
