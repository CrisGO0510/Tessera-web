import { describe, expect, it } from 'vitest';
import { currentSection, easeOutCubic, isNewImpulse, wheelTarget, type Section, type Viewport, type WheelSample } from '@/scripts/snap-sections';

// Tres bloques de una pantalla (800 px con 64 de header) y uno alto de 1200.
const SECTIONS: Section[] = [
  { top: 0, bottom: 800 },
  { top: 800, bottom: 1536 },
  { top: 1536, bottom: 2736 },
  { top: 2736, bottom: 3472 },
];
// El fondo de la página: el último bloque acaba en 3472 y la pantalla mide 800.
const viewportAt = (scrollY: number): Viewport => ({ scrollY, height: 800, headerHeight: 64, maxScroll: 2672 });

describe('currentSection', () => {
  it('es el bloque que asoma justo bajo el header', () => {
    expect(currentSection(SECTIONS, viewportAt(0))).toBe(0);
    expect(currentSection(SECTIONS, viewportAt(736))).toBe(1);
    expect(currentSection(SECTIONS, viewportAt(1700))).toBe(2);
  });
});

describe('wheelTarget', () => {
  it('salta al bloque siguiente o al anterior entero', () => {
    expect(wheelTarget(SECTIONS, viewportAt(736), 1)).toBe(2);
    expect(wheelTarget(SECTIONS, viewportAt(736), -1)).toBe(0);
  });

  it('dentro de un bloque más alto que la pantalla deja el scroll normal hasta su final', () => {
    // Bloque 2 (1536–2736) alineado arriba: aún quedan 400 px por ver.
    expect(wheelTarget(SECTIONS, viewportAt(1472), 1)).toBeNull();
    // Ya se ve su final: salta al siguiente.
    expect(wheelTarget(SECTIONS, viewportAt(1936), 1)).toBe(3);
    // A mitad del bloque, hacia arriba: primero se recorre lo que queda por encima.
    expect(wheelTarget(SECTIONS, viewportAt(1700), -1)).toBeNull();
  });

  it('desde el fondo de la página (footer anclado abajo) sube al bloque anterior entero', () => {
    // Página que acaba en un footer corto: el último bloque visible arriba es el anterior.
    const withFooter: Section[] = [...SECTIONS, { top: 3472, bottom: 3800 }];
    const atBottom = { scrollY: 3000, height: 800, headerHeight: 64, maxScroll: 3000 };
    expect(currentSection(withFooter, atBottom)).toBe(4);
    expect(wheelTarget(withFooter, atBottom, -1)).toBe(3);
  });

  it('en los extremos no hay salto', () => {
    expect(wheelTarget(SECTIONS, viewportAt(0), -1)).toBeNull();
    expect(wheelTarget(SECTIONS, viewportAt(2672), 1)).toBeNull();
  });
});

describe('isNewImpulse', () => {
  const sample = (time: number, delta: number): WheelSample => ({ time, delta });

  it('el primer evento tras una pausa abre un gesto nuevo', () => {
    expect(isNewImpulse(sample(1000, 3), [sample(700, 2)])).toBe(true);
    expect(isNewImpulse(sample(0, 3), [])).toBe(true);
  });

  it('la inercia de un trackpad (deltas que decaen) no es un gesto nuevo', () => {
    const history = [sample(0, 60), sample(16, 56), sample(32, 52), sample(48, 48)];
    expect(isNewImpulse(sample(64, 45), history)).toBe(false);
  });

  it('un deslizamiento nuevo en mitad de la inercia (el delta vuelve a crecer) sí lo es', () => {
    const history = [sample(0, 9), sample(16, 8), sample(32, 7), sample(48, 6)];
    expect(isNewImpulse(sample(64, 30), history)).toBe(true);
  });

  it('cada muesca de una rueda que sigue girando es intención', () => {
    expect(isNewImpulse(sample(60, 100), [sample(0, 100), sample(30, 100)])).toBe(true);
  });

  it('funciona igual hacia arriba (deltas negativos)', () => {
    const history = [sample(0, -60), sample(16, -56), sample(32, -52), sample(48, -48)];
    expect(isNewImpulse(sample(64, -45), history)).toBe(false);
    expect(isNewImpulse(sample(60, -100), [sample(0, -100), sample(30, -100)])).toBe(true);
  });
});

describe('easeOutCubic', () => {
  it('va de 0 a 1 y arranca rápido (la respuesta se nota desde el primer frame)', () => {
    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(1)).toBe(1);
    expect(easeOutCubic(0.2)).toBeGreaterThan(0.45);
  });
});
