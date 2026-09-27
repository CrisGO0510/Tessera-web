// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { defineElement, query, queryAll, readData } from '@/lib/dom';
import { mount } from './helpers/mount';

describe('query', () => {
  it('devuelve el elemento con su tipo', () => {
    mount('<button id="b">x</button>');
    expect(query(document, '#b', HTMLButtonElement).textContent).toBe('x');
  });

  it('falla si no existe', () => {
    mount('<p></p>');
    expect(() => query(document, '#b', HTMLButtonElement)).toThrow('No se encontró "#b".');
  });

  it('falla si el tipo no coincide', () => {
    mount('<div id="b"></div>');
    expect(() => query(document, '#b', HTMLButtonElement)).toThrow(/tipo esperado/);
  });
});

describe('queryAll', () => {
  it('devuelve todos con su tipo', () => {
    mount('<button>a</button><button>b</button>');
    expect(queryAll(document, 'button', HTMLButtonElement)).toHaveLength(2);
  });
});

describe('readData', () => {
  it('lee data-* y falla si falta', () => {
    mount('<div id="d" data-total-chairs="12"></div>');
    const div = query(document, '#d', HTMLDivElement);
    expect(readData(div, 'totalChairs')).toBe('12');
    expect(() => readData(div, 'other')).toThrow('Falta data-other.');
  });
});

describe('defineElement', () => {
  it('no falla si se registra dos veces', () => {
    class TestElement extends HTMLElement {}
    defineElement('ts-test', TestElement);
    expect(() => {
      defineElement('ts-test', TestElement);
    }).not.toThrow();
  });
});
