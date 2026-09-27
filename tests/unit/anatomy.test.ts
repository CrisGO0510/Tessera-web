// @vitest-environment happy-dom
import { beforeAll, describe, expect, it } from 'vitest';
import { queryAll } from '@/lib/dom';
import { registerAnatomy } from '@/scripts/anatomy';
import { mount } from './helpers/mount';

const ADJUSTMENTS = ['Tensión del respaldo', 'Apoyo lumbar', 'Reposabrazos 4D'];

const HTML = `
  <ts-anatomy>
    ${ADJUSTMENTS.map((t, i) => `<button type="button" data-adjustment-point="${String(i)}" aria-label="${t}" aria-pressed="${String(i === 0)}">${String(i + 1)}</button>`).join('')}
    <p aria-live="polite" data-adjustment-announcer></p>
    ${ADJUSTMENTS.map((t, i) => `<div data-adjustment-panel="${String(i)}" data-announcement="${t}: rango ${String(i)}"><h3>${t}</h3></div>`).join('')}
    ${ADJUSTMENTS.map((t, i) => `<button type="button" data-adjustment-row="${String(i)}" aria-pressed="${String(i === 0)}">${t}</button>`).join('')}
  </ts-anatomy>`;

function state(): { points: boolean[]; rows: boolean[]; panels: boolean[] } {
  const pressed = (b: HTMLButtonElement): boolean => b.getAttribute('aria-pressed') === 'true';
  return {
    points: queryAll(document, '[data-adjustment-point]', HTMLButtonElement).map(pressed),
    rows: queryAll(document, '[data-adjustment-row]', HTMLButtonElement).map(pressed),
    panels: queryAll(document, '[data-adjustment-panel]', HTMLElement).map((p) => !p.hidden),
  };
}

describe('ts-anatomy', () => {
  beforeAll(() => {
    registerAnatomy();
  });

  it('al conectarse deja visible solo el panel del primer ajuste', () => {
    mount(HTML);
    expect(state()).toEqual({ points: [true, false, false], rows: [true, false, false], panels: [true, false, false] });
  });

  it('un punto selecciona el ajuste y sincroniza fila y panel', () => {
    mount(HTML);
    queryAll(document, '[data-adjustment-point]', HTMLButtonElement)[2]?.click();
    expect(state()).toEqual({ points: [false, false, true], rows: [false, false, true], panels: [false, false, true] });
  });

  it('una fila escribe el mismo estado que el punto', () => {
    mount(HTML);
    queryAll(document, '[data-adjustment-row]', HTMLButtonElement)[1]?.click();
    expect(state()).toEqual({ points: [false, true, false], rows: [false, true, false], panels: [false, true, false] });
  });

  it('anuncia el ajuste elegido, pero no al cargar', () => {
    mount(HTML);
    const announcement = (): string => document.querySelector('[data-adjustment-announcer]')?.textContent ?? '';
    expect(announcement()).toBe('');
    queryAll(document, '[data-adjustment-point]', HTMLButtonElement)[1]?.click();
    expect(announcement()).toBe('Apoyo lumbar: rango 1');
  });
});
