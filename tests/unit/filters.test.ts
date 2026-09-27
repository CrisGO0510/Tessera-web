// @vitest-environment happy-dom
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { query, queryAll } from '@/lib/dom';
import { hrefWithoutBase, registerFilters } from '@/scripts/filters';
import { mount } from './helpers/mount';

function option(id: string, slug: string): string {
  return `<a href="/catalogo/${slug}" data-option="${id}" data-slug="${slug}"><span data-count>0</span></a>`;
}

function card(id: string, categories: string): string {
  return `<article id="${id}" data-chair data-categories="${categories}"></article>`;
}

// Página de faceta «malla»: solo trae las sillas de malla (los extras solo estrechan).
const MESH_FACET = `
  <span data-visible-count>4</span>
  <ts-filters data-total="6" data-base="malla">
    <details data-filters-panel open>
      <summary>Filtros</summary>
      ${option('malla', 'malla')}
      ${option('lumbar', 'lumbar')}
      ${option('intensivo', 'uso-intensivo')}
      ${option('alta', 'altos')}
    </details>
    <a href="/catalogo" data-base-chip>malla ×</a>
    <button type="button" data-chip="lumbar" hidden>soporte lumbar ×</button>
    <button type="button" data-chip="intensivo" hidden>uso intensivo ×</button>
    <button type="button" data-chip="alta" hidden>1.85 m o más ×</button>
    ${card('duna', 'malla lumbar')}
    ${card('mora-pro', 'malla intensivo alta')}
    ${card('ignea', 'malla alta intensivo')}
    ${card('cauce', 'malla alta')}
    <p data-empty hidden>Ninguna silla cumple todos estos filtros</p>
    <span data-showing-count>4</span>
  </ts-filters>`;

const CATALOG_INDEX = `
  <ts-filters data-total="2">
    <details data-filters-panel open><summary>Filtros</summary>${option('malla', 'malla')}</details>
    ${card('duna', 'malla lumbar')}
    ${card('llano', 'tapizada lumbar')}
  </ts-filters>`;

function visibleCards(): string[] {
  return queryAll(document, '[data-chair]', HTMLElement)
    .filter((t) => !t.hidden)
    .map((t) => t.id);
}

function optionLink(id: string): HTMLAnchorElement {
  return query(document, `[data-option="${id}"]`, HTMLAnchorElement);
}

function countOf(id: string): string | null {
  return query(optionLink(id), '[data-count]', HTMLElement).textContent;
}

function click(element: HTMLElement): MouseEvent {
  const event = new MouseEvent('click', { bubbles: true, cancelable: true });
  element.dispatchEvent(event);
  return event;
}

describe('hrefWithoutBase', () => {
  it('sin extras vuelve al catálogo', () => {
    expect(hrefWithoutBase([])).toBe('/catalogo');
  });

  it('con extras navega a la faceta del primero y conserva el resto', () => {
    expect(hrefWithoutBase(['lumbar'])).toBe('/catalogo/lumbar');
    expect(hrefWithoutBase(['lumbar', 'altos'])).toBe('/catalogo/lumbar?y=altos');
  });
});

describe('ts-filters en una página de faceta', () => {
  beforeAll(() => {
    registerFilters();
  });

  beforeEach(() => {
    window.history.replaceState(null, '', '/catalogo/malla');
  });

  it('la base queda activa y los recuentos consideran la base', () => {
    mount(MESH_FACET);
    expect(optionLink('malla').getAttribute('aria-current')).toBe('true');
    expect(countOf('malla')).toBe('4');
    expect(countOf('lumbar')).toBe('1');
    expect(countOf('alta')).toBe('3');
    expect(visibleCards()).toEqual(['duna', 'mora-pro', 'ignea', 'cauce']);
  });

  it('una opción extra estrecha en cliente sin navegar y actualiza la URL', () => {
    mount(MESH_FACET);
    const event = click(optionLink('alta'));
    expect(event.defaultPrevented).toBe(true);
    expect(visibleCards()).toEqual(['mora-pro', 'ignea', 'cauce']);
    expect(window.location.search).toBe('?y=altos');
    expect(optionLink('alta').getAttribute('aria-current')).toBe('true');
    expect(query(document, '[data-chip="alta"]', HTMLButtonElement).hidden).toBe(false);
    expect(query(document, '[data-showing-count]', HTMLElement).textContent).toBe('3');
    expect(query(document, '[data-visible-count]', HTMLElement).textContent).toBe('3');
    expect(countOf('intensivo')).toBe('2');
  });

  it('pulsar de nuevo la opción la quita', () => {
    mount(MESH_FACET);
    click(optionLink('alta'));
    click(optionLink('alta'));
    expect(visibleCards()).toHaveLength(4);
    expect(window.location.search).toBe('');
    expect(optionLink('alta').hasAttribute('aria-current')).toBe(false);
  });

  it('lee los extras de ?y= al cargar e ignora slugs desconocidos', () => {
    window.history.replaceState(null, '', '/catalogo/malla?y=altos,gamer');
    mount(MESH_FACET);
    expect(visibleCards()).toEqual(['mora-pro', 'ignea', 'cauce']);
  });

  it('el chip de un extra lo quita', () => {
    window.history.replaceState(null, '', '/catalogo/malla?y=lumbar');
    mount(MESH_FACET);
    click(query(document, '[data-chip="lumbar"]', HTMLButtonElement));
    expect(visibleCards()).toHaveLength(4);
    expect(query(document, '[data-chip="lumbar"]', HTMLButtonElement).hidden).toBe(true);
  });

  it('quitar la base con extras lleva a la faceta del primer extra', () => {
    window.history.replaceState(null, '', '/catalogo/malla?y=uso-intensivo,altos');
    mount(MESH_FACET);
    expect(query(document, '[data-base-chip]', HTMLAnchorElement).getAttribute('href')).toBe('/catalogo/uso-intensivo?y=altos');
    expect(optionLink('malla').getAttribute('href')).toBe('/catalogo/uso-intensivo?y=altos');
  });

  it('Ctrl/Cmd+clic no se intercepta: abre la faceta en otra pestaña', () => {
    mount(MESH_FACET);
    const event = new MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true });
    optionLink('alta').dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
    expect(visibleCards()).toHaveLength(4);
  });

  it('al quitar un extra con su chip, el foco pasa a su opción del aside', () => {
    window.history.replaceState(null, '', '/catalogo/malla?y=lumbar');
    mount(MESH_FACET);
    const chip = query(document, '[data-chip="lumbar"]', HTMLButtonElement);
    chip.focus();
    click(chip);
    expect(document.activeElement).toBe(optionLink('lumbar'));
  });

  it('con el aside plegado (móvil), el foco pasa a su resumen', () => {
    window.history.replaceState(null, '', '/catalogo/malla?y=lumbar');
    mount(MESH_FACET.replace('<details data-filters-panel open>', '<details data-filters-panel>'));
    const chip = query(document, '[data-chip="lumbar"]', HTMLButtonElement);
    chip.focus();
    click(chip);
    expect(document.activeElement).toBe(query(document, '[data-filters-panel] summary', HTMLElement));
  });

  it('reconectar no duplica los listeners', () => {
    mount(MESH_FACET);
    const element = query(document, 'ts-filters', HTMLElement);
    const parent = element.parentElement;
    element.remove();
    parent?.append(element);
    click(optionLink('alta'));
    expect(visibleCards()).toEqual(['mora-pro', 'ignea', 'cauce']);
  });

  it('muestra el estado vacío cuando nada cumple', () => {
    mount(MESH_FACET);
    click(optionLink('lumbar'));
    click(optionLink('alta'));
    expect(visibleCards()).toEqual([]);
    expect(query(document, '[data-empty]', HTMLElement).hidden).toBe(false);
  });
});

describe('ts-filters en /catalogo', () => {
  beforeAll(() => {
    registerFilters();
  });

  it('no intercepta: las opciones navegan a su faceta', () => {
    window.history.replaceState(null, '', '/catalogo');
    mount(CATALOG_INDEX);
    expect(visibleCards()).toEqual(['duna', 'llano']);
    expect(click(optionLink('malla')).defaultPrevented).toBe(false);
  });
});
