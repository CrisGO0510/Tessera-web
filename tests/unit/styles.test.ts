import { compileString } from 'sass';
import { describe, expect, it } from 'vitest';

const options = { loadPaths: ['src/styles'] };

describe('funciones SCSS', () => {
  it('color() devuelve la custom property', () => {
    const { css } = compileString('@use "index" as *; a { color: color("cobalt"); }', options);
    expect(css).toContain('color: var(--color-cobalt)');
  });

  it('color() falla con un token desconocido', () => {
    expect(() => compileString('@use "index" as *; a { color: color("red"); }', options)).toThrow(/Color desconocido/);
  });

  it('ink() produce la alfa del handoff', () => {
    const { css } = compileString('@use "index" as *; a { border-color: ink(8%); }', options);
    expect(css).toMatch(/rgba\(17, 22, 35, 0\.08\)|rgb\(17 22 35 \/ 8%\)/);
  });

  it('body-text() y mono-label() conservan la barra de font (no dividen)', () => {
    const { css } = compileString('@use "index" as *; p { @include body-text(13.5px); } span { @include mono-label(9.5px); }', options);
    expect(css).toContain('font: 400 13.5px / 1.65 var(--font-archivo)');
    expect(css).toContain('font: 500 9.5px / 1 var(--font-mono)');
  });

  it('los parciales inyectados no emiten CSS', () => {
    expect(compileString('@use "index" as *;', options).css.trim()).toBe('');
  });
});
