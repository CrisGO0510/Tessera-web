# Tessera — Fase 3: landing `/sillas-ergonomicas`

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** La landing completa del diseño aprobado (bloques 01–07) con sus tres custom elements: portada con autoplay, anatomía sincronizada y experiencias paginadas.

**Architecture:** Un componente por bloque en `src/components/landing/`, alimentado por `obtenerContenido()` desde la página. La interactividad vive en `src/scripts/{portada,anatomia,experiencias}.ts` con su lógica probada en Vitest (happy-dom). Todo el texto está en el HTML: sin JS se ven todas las experiencias, sus ampliaciones y los cuatro paneles de anatomía.

**Tech Stack:** Astro 7 · TypeScript 6 · SCSS · Vitest 5 + happy-dom.

**Prerrequisito:** fases 1 y 2 completas. Las fases 3, 4 y 5 son independientes entre sí.

**Fuente visual:** pantalla 1 de `Tessera Landing SEO.dc.html` (≈ líneas 58–340). Estilos y textos al pie de la letra; se ignora el andamiaje de revisión.

**Decisiones de implementación (el diseño no las define):**
- El gradiente de fondo de la portada no se puede interpolar con `transition`: cada silla tiene su capa (`[data-portada-fondo]`) y se funde la opacidad (0,7 s, como el diseño).
- La marquesina, «Ver la silla» y «Ver la ficha de…» llevan a `/catalogo#<id>` (spec §6.1).
- Indicadores de la portada: el diseño los separa 33 px entre centros (26 px + 7 px). El área táctil llega a 44 px en vertical y cubre su tramo de 33 px en horizontal; los 44 px en horizontal exigirían separarlos (cambio de diseño).
- Contador de experiencias: `hielo(48%)` en lugar del 45 % del diseño, que no llega a 4,5:1 (WCAG AA).

---

### Tarea 1: `<ts-portada>`

**Files:**
- Create: `src/scripts/portada.ts`
- Test: `tests/unit/portada.test.ts`

Rota cada 5 s si `data-autoplay="true"` y el usuario no pide movimiento reducido; el primer clic en un indicador elige la silla y cancela la rotación para siempre (handoff, «Interactions»), también si el elemento se reconecta. Los listeners de todos los custom elements se registran con un `AbortController` por conexión, para no duplicarse. Sincroniza capa de fondo, imagen (con `aria-hidden` en las inactivas), nombre y resumen del chip, enlace «Ver la silla» e indicadores (`aria-pressed`).

- [ ] **Paso 1: Test que falla**

```ts
// @vitest-environment happy-dom
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { consulta, consultaTodos } from '@/lib/dom';
import { INTERVALO_PORTADA, registrarPortada, siguienteIndice } from '@/scripts/portada';
import { montar } from './ayudas/montar';

function html(autoplay: boolean): string {
  const sillas = [
    { nombre: 'Tessera Duna', resumen: 'Malla · lumbar ajustable', href: '/catalogo#duna' },
    { nombre: 'Tessera Mora Pro', resumen: 'Cabecera · reclina 135°', href: '/catalogo#mora-pro' },
    { nombre: 'Tessera Ígnea', resumen: 'Gamer · respaldo alto', href: '/catalogo#ignea' },
  ];
  return `
    <ts-portada data-autoplay="${String(autoplay)}">
      ${sillas.map((_, i) => `<div data-portada-fondo ${i === 0 ? 'data-activo' : ''}></div>`).join('')}
      ${sillas.map((s, i) => `<div data-portada-imagen ${i === 0 ? 'data-activo' : 'aria-hidden="true"'}><img alt="${s.nombre}"></div>`).join('')}
      <span data-portada-nombre>${sillas[0]?.nombre ?? ''}</span>
      <span data-portada-resumen>${sillas[0]?.resumen ?? ''}</span>
      <a data-portada-enlace href="${sillas[0]?.href ?? ''}">Ver la silla</a>
      ${sillas
        .map(
          (s, i) =>
            `<button type="button" data-portada-indicador aria-label="${s.nombre}" aria-pressed="${String(i === 0)}"
               data-nombre="${s.nombre}" data-resumen="${s.resumen}" data-href="${s.href}"></button>`,
        )
        .join('')}
    </ts-portada>`;
}

function activo(): number {
  return consultaTodos(document, '[data-portada-indicador]', HTMLButtonElement).findIndex(
    (boton) => boton.getAttribute('aria-pressed') === 'true',
  );
}

describe('siguienteIndice', () => {
  it('avanza y vuelve al principio', () => {
    expect(siguienteIndice(0, 3)).toBe(1);
    expect(siguienteIndice(2, 3)).toBe(0);
  });

  it('con una sola silla se queda en 0', () => {
    expect(siguienteIndice(0, 1)).toBe(0);
  });
});

describe('ts-portada', () => {
  beforeAll(() => {
    registrarPortada();
  });

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.replaceChildren();
  });

  it('avanza sola cada 5 s cuando hay autoplay', () => {
    montar(html(true));
    expect(activo()).toBe(0);
    vi.advanceTimersByTime(INTERVALO_PORTADA);
    expect(activo()).toBe(1);
    vi.advanceTimersByTime(INTERVALO_PORTADA * 2);
    expect(activo()).toBe(0);
  });

  it('sincroniza fondo, imagen, chip y enlace con la silla activa', () => {
    montar(html(true));
    vi.advanceTimersByTime(INTERVALO_PORTADA);
    const fondos = consultaTodos(document, '[data-portada-fondo]', HTMLElement);
    const imagenes = consultaTodos(document, '[data-portada-imagen]', HTMLElement);
    expect(fondos.map((f) => f.hasAttribute('data-activo'))).toEqual([false, true, false]);
    expect(imagenes.map((f) => f.hasAttribute('data-activo'))).toEqual([false, true, false]);
    expect(imagenes.map((f) => f.getAttribute('aria-hidden'))).toEqual(['true', null, 'true']);
    expect(consulta(document, '[data-portada-nombre]', HTMLElement).textContent).toBe('Tessera Mora Pro');
    expect(consulta(document, '[data-portada-resumen]', HTMLElement).textContent).toBe('Cabecera · reclina 135°');
    expect(consulta(document, '[data-portada-enlace]', HTMLAnchorElement).getAttribute('href')).toBe('/catalogo#mora-pro');
  });

  it('el primer clic en un indicador elige la silla y cancela el autoplay para siempre', () => {
    montar(html(true));
    consultaTodos(document, '[data-portada-indicador]', HTMLButtonElement)[2]?.click();
    expect(activo()).toBe(2);
    vi.advanceTimersByTime(INTERVALO_PORTADA * 4);
    expect(activo()).toBe(2);
  });

  it('reconectar no reanuda un autoplay cancelado ni duplica los clics', () => {
    montar(html(true));
    consultaTodos(document, '[data-portada-indicador]', HTMLButtonElement)[1]?.click();
    const elemento = consulta(document, 'ts-portada', HTMLElement);
    elemento.remove();
    document.body.append(elemento);
    vi.advanceTimersByTime(INTERVALO_PORTADA * 2);
    expect(activo()).toBe(1);
    consultaTodos(document, '[data-portada-indicador]', HTMLButtonElement)[2]?.click();
    expect(activo()).toBe(2);
  });

  it('sin autoplay no avanza', () => {
    montar(html(false));
    vi.advanceTimersByTime(INTERVALO_PORTADA * 3);
    expect(activo()).toBe(0);
  });

  it('con movimiento reducido no avanza', () => {
    const real = window.matchMedia.bind(window);
    // Una consulta que siempre se cumple hace que «prefers-reduced-motion» devuelva true.
    vi.spyOn(window, 'matchMedia').mockImplementation((consultaMedia) =>
      real(consultaMedia.includes('reduce') ? '(min-width: 0px)' : consultaMedia),
    );
    montar(html(true));
    vi.advanceTimersByTime(INTERVALO_PORTADA * 3);
    expect(activo()).toBe(0);
    vi.restoreAllMocks();
  });
});
```

- [ ] **Paso 2: Ejecutarlo**

Run: `npx vitest run tests/unit/portada.test.ts`
Expected: FAIL con `Failed to resolve import "@/scripts/portada"`.

- [ ] **Paso 3: Implementación**

```ts
import { consulta, consultaTodos, definirElemento, leerDato, prefiereMovimientoReducido } from '@/lib/dom';

export const INTERVALO_PORTADA = 5000;

export function siguienteIndice(actual: number, total: number): number {
  return total <= 1 ? 0 : (actual + 1) % total;
}

/**
 * Carrusel de la portada. Rota cada 5 s (si `data-autoplay="true"` y sin movimiento
 * reducido); el primer clic en un indicador elige la silla y cancela la rotación para
 * siempre. Sincroniza fondo, imagen, chip, enlace e indicadores.
 */
export class TsPortada extends HTMLElement {
  #indice = 0;
  #temporizador: ReturnType<typeof setInterval> | undefined;
  #indicadores: HTMLButtonElement[] = [];
  /** El usuario eligió una silla: la rotación no vuelve aunque el elemento se reconecte. */
  #cancelada = false;
  #conexion: AbortController | undefined;

  connectedCallback(): void {
    this.#conexion?.abort();
    this.#conexion = new AbortController();
    const { signal } = this.#conexion;
    this.#indicadores = consultaTodos(this, '[data-portada-indicador]', HTMLButtonElement);
    this.#indicadores.forEach((boton, i) => {
      boton.addEventListener(
        'click',
        () => {
          this.#cancelada = true;
          this.#detener();
          this.#mostrar(i);
        },
        { signal },
      );
    });

    const autoplay = this.dataset.autoplay === 'true' && !this.#cancelada;
    if (autoplay && this.#indicadores.length > 1 && !prefiereMovimientoReducido()) {
      this.#temporizador = setInterval(() => {
        this.#mostrar(siguienteIndice(this.#indice, this.#indicadores.length));
      }, INTERVALO_PORTADA);
    }
  }

  disconnectedCallback(): void {
    this.#conexion?.abort();
    this.#detener();
  }

  #detener(): void {
    clearInterval(this.#temporizador);
    this.#temporizador = undefined;
  }

  #mostrar(indice: number): void {
    const indicador = this.#indicadores[indice];
    if (indicador === undefined) return;
    this.#indice = indice;

    consultaTodos(this, '[data-portada-fondo]', HTMLElement).forEach((fondo, i) => {
      fondo.toggleAttribute('data-activo', i === indice);
    });
    consultaTodos(this, '[data-portada-imagen]', HTMLElement).forEach((imagen, i) => {
      imagen.toggleAttribute('data-activo', i === indice);
      if (i === indice) imagen.removeAttribute('aria-hidden');
      else imagen.setAttribute('aria-hidden', 'true');
    });
    this.#indicadores.forEach((boton, i) => {
      boton.setAttribute('aria-pressed', String(i === indice));
    });

    consulta(this, '[data-portada-nombre]', HTMLElement).textContent = leerDato(indicador, 'nombre');
    consulta(this, '[data-portada-resumen]', HTMLElement).textContent = leerDato(indicador, 'resumen');
    consulta(this, '[data-portada-enlace]', HTMLAnchorElement).setAttribute('href', leerDato(indicador, 'href'));
  }
}

export function registrarPortada(): void {
  definirElemento('ts-portada', TsPortada);
}
```

- [ ] **Paso 4: Verde**

Run: `npx vitest run tests/unit/portada.test.ts`
Expected: `Tests  8 passed (8)`.

- [ ] **Paso 5: Checkpoint**

```bash
git add src/scripts/portada.ts tests/unit/portada.test.ts
```
Mensaje propuesto: `feat: añade el carrusel de la portada con autoplay cancelable`

---

### Tarea 2: `<ts-anatomia>`

**Files:**
- Create: `src/scripts/anatomia.ts`
- Test: `tests/unit/anatomia.test.ts`

Los puntos sobre la foto y las filas de la lista escriben el mismo estado. Hay un panel por ajuste en el HTML (sin JS se ven los cuatro); al conectarse solo queda visible el activo.

- [ ] **Paso 1: Test que falla**

```ts
// @vitest-environment happy-dom
import { beforeAll, describe, expect, it } from 'vitest';
import { consultaTodos } from '@/lib/dom';
import { registrarAnatomia } from '@/scripts/anatomia';
import { montar } from './ayudas/montar';

const AJUSTES = ['Tensión del respaldo', 'Apoyo lumbar', 'Reposabrazos 4D'];

const HTML = `
  <ts-anatomia>
    ${AJUSTES.map((t, i) => `<button type="button" data-ajuste-punto="${String(i)}" aria-label="${t}" aria-pressed="${String(i === 0)}">${String(i + 1)}</button>`).join('')}
    ${AJUSTES.map((t, i) => `<div data-ajuste-panel="${String(i)}"><h3>${t}</h3></div>`).join('')}
    ${AJUSTES.map((t, i) => `<button type="button" data-ajuste-fila="${String(i)}" aria-pressed="${String(i === 0)}">${t}</button>`).join('')}
  </ts-anatomia>`;

function estado(): { puntos: boolean[]; filas: boolean[]; paneles: boolean[] } {
  const presionado = (b: HTMLButtonElement): boolean => b.getAttribute('aria-pressed') === 'true';
  return {
    puntos: consultaTodos(document, '[data-ajuste-punto]', HTMLButtonElement).map(presionado),
    filas: consultaTodos(document, '[data-ajuste-fila]', HTMLButtonElement).map(presionado),
    paneles: consultaTodos(document, '[data-ajuste-panel]', HTMLElement).map((p) => !p.hidden),
  };
}

describe('ts-anatomia', () => {
  beforeAll(() => {
    registrarAnatomia();
  });

  it('al conectarse deja visible solo el panel del primer ajuste', () => {
    montar(HTML);
    expect(estado()).toEqual({ puntos: [true, false, false], filas: [true, false, false], paneles: [true, false, false] });
  });

  it('un punto selecciona el ajuste y sincroniza fila y panel', () => {
    montar(HTML);
    consultaTodos(document, '[data-ajuste-punto]', HTMLButtonElement)[2]?.click();
    expect(estado()).toEqual({ puntos: [false, false, true], filas: [false, false, true], paneles: [false, false, true] });
  });

  it('una fila escribe el mismo estado que el punto', () => {
    montar(HTML);
    consultaTodos(document, '[data-ajuste-fila]', HTMLButtonElement)[1]?.click();
    expect(estado()).toEqual({ puntos: [false, true, false], filas: [false, true, false], paneles: [false, true, false] });
  });
});
```

- [ ] **Paso 2: Ejecutarlo**

Run: `npx vitest run tests/unit/anatomia.test.ts`
Expected: FAIL con `Failed to resolve import "@/scripts/anatomia"`.

- [ ] **Paso 3: Implementación**

```ts
import { consultaTodos, definirElemento } from '@/lib/dom';

/**
 * Bloque 04. Los puntos sobre la foto y las filas de la lista escriben el mismo estado.
 * Sin JS se ven los cuatro paneles (todo el texto está en el HTML); al conectarse solo
 * queda visible el del ajuste activo.
 */
export class TsAnatomia extends HTMLElement {
  #conexion: AbortController | undefined;

  connectedCallback(): void {
    this.#conexion?.abort();
    this.#conexion = new AbortController();
    const { signal } = this.#conexion;
    for (const selector of ['[data-ajuste-punto]', '[data-ajuste-fila]']) {
      consultaTodos(this, selector, HTMLButtonElement).forEach((boton, i) => {
        boton.addEventListener(
          'click',
          () => {
            this.#seleccionar(i);
          },
          { signal },
        );
      });
    }
    this.#seleccionar(0);
  }

  disconnectedCallback(): void {
    this.#conexion?.abort();
  }

  #seleccionar(indice: number): void {
    for (const selector of ['[data-ajuste-punto]', '[data-ajuste-fila]']) {
      consultaTodos(this, selector, HTMLButtonElement).forEach((boton, i) => {
        boton.setAttribute('aria-pressed', String(i === indice));
      });
    }
    consultaTodos(this, '[data-ajuste-panel]', HTMLElement).forEach((panel, i) => {
      panel.hidden = i !== indice;
    });
  }
}

export function registrarAnatomia(): void {
  definirElemento('ts-anatomia', TsAnatomia);
}
```

- [ ] **Paso 4: Verde**

Run: `npx vitest run tests/unit/anatomia.test.ts`
Expected: `Tests  3 passed (3)`.

- [ ] **Paso 5: Checkpoint**

```bash
git add src/scripts/anatomia.ts tests/unit/anatomia.test.ts
```
Mensaje propuesto: `feat: sincroniza puntos, lista y panel de la anatomía`

---

### Tarea 3: `<ts-experiencias>`

**Files:**
- Create: `src/scripts/experiencias.ts`
- Test: `tests/unit/experiencias.test.ts`

Paginación de a 3 con anterior/siguiente (el cursor avanza de uno en uno, como el prototipo), «Leer más experiencias» que añade las no destacadas y vuelve al principio, y «Ver más» por tarjeta. Los controles llegan `hidden` y el script los muestra. «Leer más» solo se renderiza si hay experiencias no destacadas. Si una flecha se deshabilita con el foco encima, el foco pasa a la contraria (si no, caería al `<body>`).

- [ ] **Paso 1: Test que falla**

```ts
// @vitest-environment happy-dom
import { beforeAll, describe, expect, it } from 'vitest';
import { consulta, consultaTodos } from '@/lib/dom';
import { registrarExperiencias, textoPosicion, ventana } from '@/scripts/experiencias';
import { montar } from './ayudas/montar';

describe('ventana', () => {
  it('muestra de a 3 y limita el cursor', () => {
    expect(ventana(6, 0)).toEqual({ inicio: 0, fin: 3, maximo: 3 });
    expect(ventana(6, 3)).toEqual({ inicio: 3, fin: 6, maximo: 3 });
    expect(ventana(6, 9)).toEqual({ inicio: 3, fin: 6, maximo: 3 });
    expect(ventana(6, -1)).toEqual({ inicio: 0, fin: 3, maximo: 3 });
  });

  it('con 3 o menos no hay paginación', () => {
    expect(ventana(3, 0)).toEqual({ inicio: 0, fin: 3, maximo: 0 });
    expect(ventana(2, 0)).toEqual({ inicio: 0, fin: 2, maximo: 0 });
  });
});

describe('textoPosicion', () => {
  it('rango cuando hay más de 3', () => {
    expect(textoPosicion(0, 3, 6)).toBe('Experiencias 1–3 de 6');
  });

  it('total cuando caben todas', () => {
    expect(textoPosicion(0, 3, 3)).toBe('3 experiencias');
  });
});

function tarjeta(n: number, destacada: boolean): string {
  return `<article data-experiencia data-destacada="${String(destacada)}">
    <p>Cita ${String(n)} <span data-ampliacion>ampliación ${String(n)}</span></p>
    <button type="button" data-ver-mas aria-expanded="false" hidden>Ver más</button>
  </article>`;
}

const HTML = `
  <ts-experiencias>
    <button type="button" data-exp-mas aria-expanded="false" hidden><span data-exp-mas-texto>Leer más experiencias</span></button>
    <button type="button" data-exp-anterior hidden>←</button>
    ${[1, 2, 3].map((n) => tarjeta(n, true)).join('')}
    ${[4, 5, 6].map((n) => tarjeta(n, false)).join('')}
    <button type="button" data-exp-siguiente hidden>→</button>
    <span data-exp-posicion>6 experiencias</span>
  </ts-experiencias>`;

function visibles(): number[] {
  return consultaTodos(document, '[data-experiencia]', HTMLElement)
    .map((t, i) => (t.hidden ? -1 : i + 1))
    .filter((n) => n > 0);
}

function boton(selector: string): HTMLButtonElement {
  return consulta(document, selector, HTMLButtonElement);
}

function posicion(): string {
  return consulta(document, '[data-exp-posicion]', HTMLElement).textContent;
}

describe('ts-experiencias', () => {
  beforeAll(() => {
    registrarExperiencias();
  });

  it('al conectarse muestra las 3 destacadas, los controles y oculta las ampliaciones', () => {
    montar(HTML);
    expect(visibles()).toEqual([1, 2, 3]);
    expect(posicion()).toBe('3 experiencias');
    expect(boton('[data-exp-mas]').hidden).toBe(false);
    expect(boton('[data-exp-anterior]').disabled).toBe(true);
    expect(boton('[data-exp-siguiente]').disabled).toBe(true);
    expect(consultaTodos(document, '[data-ampliacion]', HTMLElement).every((a) => a.hidden)).toBe(true);
  });

  it('«Leer más experiencias» añade las no destacadas y habilita la paginación', () => {
    montar(HTML);
    boton('[data-exp-mas]').click();
    expect(boton('[data-exp-mas]').getAttribute('aria-expanded')).toBe('true');
    expect(consulta(document, '[data-exp-mas-texto]', HTMLElement).textContent).toBe('Ver menos experiencias');
    expect(posicion()).toBe('Experiencias 1–3 de 6');
    boton('[data-exp-siguiente]').click();
    expect(visibles()).toEqual([2, 3, 4]);
    expect(posicion()).toBe('Experiencias 2–4 de 6');
    boton('[data-exp-siguiente]').click();
    boton('[data-exp-siguiente]').click();
    expect(visibles()).toEqual([4, 5, 6]);
    expect(boton('[data-exp-siguiente]').disabled).toBe(true);
  });

  it('«Ver menos experiencias» vuelve a las destacadas desde el principio', () => {
    montar(HTML);
    boton('[data-exp-mas]').click();
    boton('[data-exp-siguiente]').click();
    boton('[data-exp-mas]').click();
    expect(visibles()).toEqual([1, 2, 3]);
    expect(posicion()).toBe('3 experiencias');
  });

  it('si «siguiente» se deshabilita con el foco encima, el foco pasa a «anterior»', () => {
    montar(HTML);
    boton('[data-exp-mas]').click();
    const siguiente = boton('[data-exp-siguiente]');
    siguiente.focus();
    siguiente.click();
    siguiente.click();
    siguiente.click();
    expect(siguiente.disabled).toBe(true);
    expect(document.activeElement).toBe(boton('[data-exp-anterior]'));
  });

  it('sin experiencias extra no hay botón «Leer más» y funciona igual', () => {
    montar(HTML.replace(/<button type="button" data-exp-mas[\s\S]*?<\/button>/, ''));
    expect(visibles()).toEqual([1, 2, 3]);
    expect(posicion()).toBe('3 experiencias');
  });

  it('«Ver más» muestra la ampliación de su tarjeta', () => {
    montar(HTML);
    const verMas = consultaTodos(document, '[data-ver-mas]', HTMLButtonElement)[0];
    verMas?.click();
    expect(verMas?.getAttribute('aria-expanded')).toBe('true');
    expect(verMas?.textContent).toBe('Ver menos');
    expect(consultaTodos(document, '[data-ampliacion]', HTMLElement).map((a) => a.hidden)).toEqual([false, true, true, true, true, true]);
  });
});
```

- [ ] **Paso 2: Ejecutarlo**

Run: `npx vitest run tests/unit/experiencias.test.ts`
Expected: FAIL con `Failed to resolve import "@/scripts/experiencias"`.

- [ ] **Paso 3: Implementación**

```ts
import { consulta, consultaTodos, definirElemento } from '@/lib/dom';

const POR_PAGINA = 3;

export interface Ventana {
  readonly inicio: number;
  readonly fin: number;
  /** Último cursor posible. */
  readonly maximo: number;
}

/** Tramo visible de `total` tarjetas con el cursor limitado a [0, total − 3]. */
export function ventana(total: number, cursor: number): Ventana {
  const maximo = Math.max(0, total - POR_PAGINA);
  const inicio = Math.min(Math.max(0, cursor), maximo);
  return { inicio, fin: Math.min(inicio + POR_PAGINA, total), maximo };
}

export function textoPosicion(inicio: number, fin: number, total: number): string {
  return total > POR_PAGINA ? `Experiencias ${String(inicio + 1)}–${String(fin)} de ${String(total)}` : `${String(total)} experiencias`;
}

/**
 * Bloque 05. Sin JS se ven todas las experiencias con su texto completo; al conectarse
 * se muestran las destacadas de a 3, con «Leer más experiencias», anterior/siguiente
 * y «Ver más» por tarjeta.
 */
export class TsExperiencias extends HTMLElement {
  #abiertas = false;
  #cursor = 0;
  #conexion: AbortController | undefined;

  connectedCallback(): void {
    this.#conexion?.abort();
    this.#conexion = new AbortController();
    const { signal } = this.#conexion;
    // «Leer más» solo existe si hay experiencias no destacadas.
    const mas = this.querySelector('[data-exp-mas]');
    const anterior = consulta(this, '[data-exp-anterior]', HTMLButtonElement);
    const siguiente = consulta(this, '[data-exp-siguiente]', HTMLButtonElement);
    anterior.hidden = false;
    siguiente.hidden = false;

    if (mas instanceof HTMLButtonElement) {
      mas.hidden = false;
      mas.addEventListener(
        'click',
        () => {
          this.#abiertas = !this.#abiertas;
          this.#cursor = 0;
          this.#pintar();
        },
        { signal },
      );
    }
    anterior.addEventListener(
      'click',
      () => {
        this.#cursor -= 1;
        this.#pintar();
      },
      { signal },
    );
    siguiente.addEventListener(
      'click',
      () => {
        this.#cursor += 1;
        this.#pintar();
      },
      { signal },
    );

    for (const tarjeta of consultaTodos(this, '[data-experiencia]', HTMLElement)) {
      this.#prepararVerMas(tarjeta, signal);
    }
    this.#pintar();
  }

  disconnectedCallback(): void {
    this.#conexion?.abort();
  }

  #prepararVerMas(tarjeta: HTMLElement, signal: AbortSignal): void {
    const ampliacion = tarjeta.querySelector('[data-ampliacion]');
    const verMas = tarjeta.querySelector('[data-ver-mas]');
    if (!(ampliacion instanceof HTMLElement) || !(verMas instanceof HTMLButtonElement)) return;
    ampliacion.hidden = true;
    verMas.hidden = false;
    verMas.addEventListener(
      'click',
      () => {
        const abrir = verMas.getAttribute('aria-expanded') !== 'true';
        ampliacion.hidden = !abrir;
        verMas.setAttribute('aria-expanded', String(abrir));
        verMas.textContent = abrir ? 'Ver menos' : 'Ver más';
      },
      { signal },
    );
  }

  #pintar(): void {
    const tarjetas = consultaTodos(this, '[data-experiencia]', HTMLElement);
    const lista = tarjetas.filter((t) => this.#abiertas || t.dataset.destacada === 'true');
    const { inicio, fin, maximo } = ventana(lista.length, this.#cursor);
    this.#cursor = inicio;

    const visibles = new Set(lista.slice(inicio, fin));
    for (const tarjeta of tarjetas) tarjeta.hidden = !visibles.has(tarjeta);

    const anterior = consulta(this, '[data-exp-anterior]', HTMLButtonElement);
    const siguiente = consulta(this, '[data-exp-siguiente]', HTMLButtonElement);
    anterior.disabled = inicio === 0;
    siguiente.disabled = inicio >= maximo;
    // Un botón deshabilitado pierde el foco (cae al <body>): pasa a la flecha contraria.
    if (document.activeElement === siguiente && siguiente.disabled && !anterior.disabled) anterior.focus();
    if (document.activeElement === anterior && anterior.disabled && !siguiente.disabled) siguiente.focus();
    consulta(this, '[data-exp-posicion]', HTMLElement).textContent = textoPosicion(inicio, fin, lista.length);

    const mas = this.querySelector('[data-exp-mas]');
    if (mas instanceof HTMLButtonElement) {
      mas.setAttribute('aria-expanded', String(this.#abiertas));
      consulta(mas, '[data-exp-mas-texto]', HTMLElement).textContent = this.#abiertas ? 'Ver menos experiencias' : 'Leer más experiencias';
    }
  }
}

export function registrarExperiencias(): void {
  definirElemento('ts-experiencias', TsExperiencias);
}
```

- [ ] **Paso 4: Verde**

Run: `npx vitest run tests/unit/experiencias.test.ts`
Expected: `Tests  10 passed (10)`.

- [ ] **Paso 5: Checkpoint**

```bash
git add src/scripts/experiencias.ts tests/unit/experiencias.test.ts
```
Mensaje propuesto: `feat: añade la paginación accesible de experiencias`

---

### Tarea 4: Bloque 01 — Portada

**Files:**
- Create: `src/components/landing/Portada.astro`

Un solo `<h1>`. «ERGONÓMICAS» con `aria-hidden`. Marquesina con las sillas de `destacados.portada` duplicadas: la copia lleva `aria-hidden="true"` e `inert`, se pausa en hover y se detiene con movimiento reducido (igual que la flecha «SIGUE»). Solo la primera imagen apilada lleva `priority` (es el LCP). `aria-pressed` usa literales (`'true' | 'false'`): `astro check` rechaza un `string` cualquiera. La clase de cada `<Picture>` se aplica al `<img>`, sin `:global`.

- [ ] **Paso 1: `src/components/landing/Portada.astro`**

```astro
---
import { Picture } from 'astro:assets';
import { site } from '@/data/site';
import { gradienteTema, type Silla } from '@/lib/contenido';

interface Props {
  /** `destacados.portada`: la validación de contenido garantiza que todas tienen `tema`. */
  sillas: readonly Silla[];
}

const { sillas } = Astro.props;
const primera = sillas[0];
if (primera === undefined) {
  throw new Error('La portada necesita al menos una silla (destacados.portada).');
}

function enlace(silla: Silla): string {
  return `/catalogo#${silla.id}`;
}

---

<section id="inicio" class="portada">
  <ts-portada class="portada__marco" data-autoplay={String(site.autoplayPortada)}>
    {
      sillas.map((silla, i) => (
        <div class="portada__fondo" data-portada-fondo data-activo={i === 0 ? '' : undefined} style={`background: ${gradienteTema(silla)}`} />
      ))
    }

    <div class="portada__palabra" aria-hidden="true">ERGONÓMICAS</div>

    <div class="marquesina">
      <div class="marquesina__pista">
        {
          [false, true].map((copia) => (
            <div class="marquesina__grupo" aria-hidden={copia ? 'true' : undefined} inert={copia}>
              {sillas.map((silla) => (
                <a class="marquesina__tarjeta" href={enlace(silla)}>
                  <Picture
                    class="marquesina__imagen"
                    src={silla.data.imagen.src}
                    alt={copia ? '' : silla.data.imagen.alt}
                    formats={['avif', 'webp']}
                    width={308}
                    height={284}
                    fit="cover"
                  />
                  <span class="marquesina__nombre">{silla.data.nombre}</span>
                  <span class="marquesina__resumen">{silla.data.resumen}</span>
                </a>
              ))}
            </div>
          ))
        }
      </div>
    </div>

    <h1 class="portada__titulo">Sillas ergonómicas para <span class="portada__enfasis">home office</span></h1>

    <div class="portada__imagenes">
      {
        sillas.map((silla, i) => (
          <div class="portada__imagen" data-portada-imagen data-activo={i === 0 ? '' : undefined} aria-hidden={i === 0 ? undefined : 'true'}>
            <Picture
              class="portada__foto"
              src={silla.data.imagen.src}
              alt={silla.data.imagen.alt}
              formats={['avif', 'webp']}
              width={800}
              height={800}
              widths={[400, 800]}
              sizes="min(400px, 78vw)"
              fit="cover"
              priority={i === 0}
            />
          </div>
        ))
      }
    </div>

    <div class="portada__controles">
      <div class="portada__chip">
        <span class="portada__chip-texto">
          <span class="portada__chip-nombre" data-portada-nombre>{primera.data.nombre}</span>
          <span class="portada__chip-resumen" data-portada-resumen>{primera.data.resumen}</span>
        </span>
        <a class="portada__chip-enlace" href={enlace(primera)} data-portada-enlace>Ver la silla</a>
      </div>
      {
        sillas.length > 1 && (
          <div class="portada__indicadores">
            {sillas.map((silla, i) => (
              <button
                type="button"
                class="portada__indicador"
                data-portada-indicador
                aria-label={silla.data.nombre}
                aria-pressed={i === 0 ? 'true' : 'false'}
                data-nombre={silla.data.nombre}
                data-resumen={silla.data.resumen}
                data-href={enlace(silla)}
              />
            ))}
          </div>
        )
      }
    </div>

    <a class="portada__sigue" href="#necesidades">
      <span class="portada__sigue-texto">Sigue</span>
      <svg width="16" height="18" viewBox="0 0 16 18" fill="none" aria-hidden="true">
        <path d="M8 1v14M2.5 9.5L8 15.5l5.5-6" stroke="currentcolor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"></path>
      </svg>
    </a>
  </ts-portada>
</section>

<script>
  import { registrarPortada } from '@/scripts/portada';

  registrarPortada();
</script>

<style lang="scss">
  .portada {
    position: relative;
    overflow: hidden;
  }

  .portada__marco {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: min(88vh, 760px);
    padding: 56px $padding-lateral 96px;
  }

  // El gradiente no se puede interpolar: cada silla tiene su capa y se funde la opacidad.
  .portada__fondo {
    position: absolute;
    inset: 0;
    opacity: 0;
    transition: opacity 0.7s ease;

    &[data-activo] {
      opacity: 1;
    }
  }

  .portada__palabra {
    position: absolute;
    top: 18px;
    left: 50%;
    transform: translateX(-50%);
    font: 700 clamp(18px, 3.4vw, 30px) / 1 fuente("archivo");
    letter-spacing: 0.36em;
    color: tinta(13%);
    white-space: nowrap;
    pointer-events: none;
  }

  .marquesina {
    position: absolute;
    top: 26%;
    right: 0;
    left: 0;
    display: flex;
    justify-content: center;
    pointer-events: none;
    opacity: 0.95;
  }

  .marquesina__pista {
    display: flex;
    width: max-content;
    pointer-events: auto;
    animation: ts-desliza 38s linear infinite;

    // Pausa con el ratón y con el teclado (una tarjeta enfocada no debe escaparse).
    &:hover,
    &:focus-within {
      animation-play-state: paused;
    }

    @include movimiento-reducido {
      animation: none;
    }
  }

  // Cada grupo lleva su propio espacio final: así la pista mide exactamente dos grupos
  // y el bucle de -50 % a 0 no tiene costura.
  .marquesina__grupo {
    display: flex;
    gap: 26px;
    padding-right: 26px;
  }

  .marquesina__tarjeta {
    flex: none;
    width: 176px;
    padding: 11px;
    border-radius: radio("l");
    background: rgb(255 255 255 / 88%);
    box-shadow: sombra("marquesina");
    transition:
      transform 0.35s ease,
      box-shadow 0.35s ease;

    &:hover {
      transform: translateY(-9px);
      box-shadow: sombra("marquesina-hover");
    }
  }

  .marquesina__imagen {
    width: 100%;
    height: 142px;
    object-fit: cover;
    border-radius: radio("xxs");
  }

  .marquesina__nombre {
    display: block;
    margin-top: 10px;
    font: 600 12.5px / 1.3 fuente("archivo");
    color: color("tinta");
  }

  .marquesina__resumen {
    display: block;
    margin-top: 5px;
    font: 400 10.5px / 1 fuente("mono");
    color: color("gris-medio");
  }

  .portada__titulo {
    @include h1;

    position: relative;
    z-index: 2;
    max-width: 19ch;
    margin: 0 0 26px;
    text-align: center;
  }

  .portada__enfasis {
    @include enfasis-serif;
  }

  .portada__imagenes {
    position: relative;
    z-index: 2;
    width: min(400px, 78vw);
    aspect-ratio: 1 / 1;
    overflow: hidden;
    border-radius: radio("portada");
    box-shadow: sombra("portada");
  }

  .portada__imagen {
    position: absolute;
    inset: 0;
    opacity: 0;
    transform: scale(1.06);
    transition:
      opacity 0.7s ease,
      transform 0.9s ease;

    &[data-activo] {
      opacity: 1;
      transform: scale(1);
    }
  }

  // <Picture> renderiza <picture><img>: la clase va al <img>.
  .portada__foto {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .portada__controles {
    position: relative;
    z-index: 3;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    margin-top: -30px;
  }

  .portada__chip {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 10px 10px 10px 20px;
    border-radius: radio("pill");
    background: rgb(255 255 255 / 92%);
    box-shadow: sombra("chip");
  }

  .portada__chip-texto {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .portada__chip-nombre {
    font: 600 14.5px / 1 fuente("archivo");
    color: color("tinta");
  }

  .portada__chip-resumen {
    font: 400 10.5px / 1 fuente("mono");
    color: color("gris-medio");
  }

  .portada__chip-enlace {
    padding: 10px 16px;
    border-radius: radio("pill");
    background: color("cobalto");
    color: color("blanco");
    font: 600 12.5px / 1 fuente("archivo");

    &:hover {
      color: color("blanco");
      filter: brightness(1.1);
    }
  }

  .portada__indicadores {
    display: flex;
    gap: 7px;
  }

  // Indicadores a 33 px entre centros (26 px + 7 px): el área cubre 44 px en vertical y
  // todo el paso en horizontal; los 44 px en horizontal exigirían separarlos más.
  .portada__indicador {
    @include area-tactil(44px, 33px);

    display: block;
    width: 26px;
    height: 5px;
    padding: 0;
    border: 0;
    border-radius: 3px;
    background: tinta(22%);
    cursor: pointer;
    transition: background 0.3s ease;

    &[aria-pressed="true"] {
      background: color("cobalto");
    }
  }

  .portada__sigue {
    position: absolute;
    bottom: 18px;
    left: 50%;
    z-index: 3;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 5px;
    color: color("tinta");
    transform: translateX(-50%);
    animation: ts-empuja 1.9s ease-in-out infinite;

    &:hover {
      color: color("tinta");
    }

    @include movimiento-reducido {
      animation: none;
    }
  }

  .portada__sigue-texto {
    font: 500 9.5px / 1 fuente("mono");
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: tinta(65%);
  }

  @keyframes ts-desliza {
    from {
      transform: translateX(-50%);
    }

    to {
      transform: translateX(0);
    }
  }

  @keyframes ts-empuja {
    0%,
    100% {
      opacity: 0.75;
      transform: translateX(-50%) translateY(0);
    }

    50% {
      opacity: 1;
      transform: translateX(-50%) translateY(7px);
    }
  }
</style>
```

- [ ] **Paso 2: Tipos y estilos**

Run: `npm run check && npm run lint:styles`
Expected: `0 errors` y Stylelint sin salida.

- [ ] **Paso 3: Checkpoint**

```bash
git add src/components/landing/Portada.astro
```
Mensaje propuesto: `feat: añade la portada con marquesina y carrusel`

---

### Tarea 5: Bloque 01b — Barra de categorías

**Files:**
- Create: `src/components/landing/BarraCategorias.astro`

Chips = `destacados.barra` con `etiquetaLarga`, enlaces reales a `/catalogo/<slug>` (puerta de rastreo). Primera de las dos apariciones de WhatsApp.

- [ ] **Paso 1: `src/components/landing/BarraCategorias.astro`**

```astro
---
import CtaWhatsApp from '@/components/ui/CtaWhatsApp.astro';
import { rutaCategoria } from '@/lib/catalogo';
import type { Categoria } from '@/lib/contenido';

interface Props {
  /** `destacados.barra`. Enlaces reales a las páginas de categoría: son puerta de rastreo. */
  categorias: readonly Categoria[];
}

const { categorias } = Astro.props;
---

<div class="barra">
  <nav class="barra__chips" aria-label="Categorías">
    {categorias.map((categoria) => <a href={rutaCategoria(categoria.data.slug)}>{categoria.data.etiquetaLarga}</a>)}
  </nav>
  <CtaWhatsApp contexto="barra" />
</div>

<style lang="scss">
  .barra {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
    padding: 16px $padding-lateral;
    background: color("tinta");
  }

  .barra__chips {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;

    a {
      padding: 8px 14px;
      border: 1px solid hielo(20%);
      border-radius: radio("pill");
      font: 500 12px / 1 fuente("archivo");
      color: hielo(85%);
      transition:
        border-color 0.2s ease,
        color 0.2s ease;

      &:hover {
        border-color: color("cobalto-claro");
        color: color("blanco");
      }
    }
  }
</style>
```

- [ ] **Paso 2: Checkpoint**

```bash
git add src/components/landing/BarraCategorias.astro
```
Mensaje propuesto: `feat: añade la barra de categorías con CTA de WhatsApp`

---

### Tarea 6: Bloque 02 — Necesidades

**Files:**
- Create: `src/components/landing/Necesidades.astro`

- [ ] **Paso 1: `src/components/landing/Necesidades.astro`**

```astro
---
import EncabezadoSeccion from '@/components/ui/EncabezadoSeccion.astro';
import { rutaCategoria } from '@/lib/catalogo';
import type { NecesidadResuelta } from '@/lib/contenido';

interface Props {
  necesidades: readonly NecesidadResuelta[];
}

const { necesidades } = Astro.props;
---

<section id="necesidades" class="necesidades">
  <div class="necesidades__contenido">
    <EncabezadoSeccion
      etiqueta="Empieza por lo que te pasa"
      titulo="¿Qué buscas resolver?"
      intro="No hace falta saber de mecanismos. Dinos qué te molesta al trabajar y te llevamos a las sillas que resuelven ese caso."
    />
    <div class="necesidades__rejilla">
      {
        necesidades.map(({ entrada, categoria }) => (
          <a class="necesidad" href={rutaCategoria(categoria.data.slug)} data-necesidad={entrada.id}>
            <span class="necesidad__etiqueta">{entrada.data.etiqueta}</span>
            <span class="necesidad__titulo">{entrada.data.titulo}</span>
            <span class="necesidad__descripcion">{entrada.data.descripcion}</span>
            <span class="necesidad__cta">{entrada.data.cta} →</span>
          </a>
        ))
      }
    </div>
  </div>
</section>

<style lang="scss">
  .necesidades {
    @include seccion;

    background: color("hielo");
  }

  .necesidades__contenido {
    @include contenedor;

    display: flex;
    flex-direction: column;
    gap: 32px;
  }

  .necesidades__rejilla {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
    gap: 16px;
  }

  .necesidad {
    display: flex;
    flex-direction: column;
    gap: 10px;
    min-width: 0;
    padding: 24px;
    border: 1px solid tinta(8%);
    border-radius: radio("m");
    background: color("blanco");
    box-shadow: sombra("reposo");
    transition:
      transform 0.3s ease,
      box-shadow 0.3s ease,
      border-color 0.3s ease;

    &:hover {
      border-color: rgb(46 91 219 / 25%);
      box-shadow: sombra("necesidad-hover");
      transform: translateY(-4px);
    }

    @include movimiento-reducido {
      &:hover {
        transform: none;
      }
    }
  }

  .necesidad__etiqueta {
    @include etiqueta-mono(9.5px);

    color: color("cobalto");
  }

  .necesidad__titulo {
    font: 600 19px / 1.22 fuente("archivo");
    letter-spacing: -0.02em;
    color: color("tinta");
    text-wrap: pretty;
  }

  .necesidad__descripcion {
    @include cuerpo(13.5px, 1.6);

    color: color("gris-medio");
  }

  .necesidad__cta {
    margin-top: auto;
    padding-top: 14px;
    font: 600 12.5px / 1 fuente("archivo");
    color: color("cobalto");
  }
</style>
```

- [ ] **Paso 2: Checkpoint**

```bash
git add src/components/landing/Necesidades.astro
```
Mensaje propuesto: `feat: añade el bloque «¿Qué buscas resolver?»`

---

### Tarea 7: Bloque 03 — Muestra de sillas

**Files:**
- Create: `src/components/landing/Muestra.astro`

El `<h2>` se deriva («Tres de las doce sillas Tessera» con `numeroEnLetras(…, 'femenino')`), igual que «Ver las N sillas ergonómicas». Sin precios. La imagen enlaza al mismo destino que el CTA, así que lleva `tabindex="-1"` y `aria-hidden` para no duplicar paradas de teclado. Cierra con la franja `#comparar`.

- [ ] **Paso 1: `src/components/landing/Muestra.astro`**

```astro
---
import { Picture } from 'astro:assets';
import EncabezadoSeccion from '@/components/ui/EncabezadoSeccion.astro';
import FranjaOscura from '@/components/ui/FranjaOscura.astro';
import type { Silla } from '@/lib/contenido';
import { capitalizar, numeroEnLetras } from '@/lib/formato';

interface Props {
  /** `destacados.muestra`. */
  sillas: readonly Silla[];
  /** Tamaño del catálogo completo: el «doce» del título sale de aquí. */
  total: number;
}

const { sillas, total } = Astro.props;
const titulo = `${capitalizar(numeroEnLetras(sillas.length, 'femenino'))} de las ${numeroEnLetras(total, 'femenino')} sillas Tessera`;
---

<section id="sillas" class="muestra">
  <div class="muestra__contenido">
    <EncabezadoSeccion etiqueta="Catálogo" titulo={titulo} ancho="46ch">
      <a slot="accion" class="muestra__todas" href="/catalogo">Ver las {total} sillas ergonómicas</a>
    </EncabezadoSeccion>
    <div class="muestra__rejilla">
      {
        sillas.map((silla) => (
          <article class="ficha" data-muestra={silla.id}>
            <a class="ficha__imagen" href={`/catalogo#${silla.id}`} tabindex="-1" aria-hidden="true">
              <Picture
                class="ficha__foto"
                src={silla.data.imagen.src}
                alt=""
                formats={['avif', 'webp']}
                width={800}
                height={600}
                widths={[400, 800]}
                sizes="(max-width: 899px) calc(100vw - 32px), 400px"
                fit="cover"
              />
            </a>
            <div class="ficha__cuerpo">
              <h3 class="ficha__nombre">{silla.data.nombre}</h3>
              <p class="ficha__descripcion">{silla.data.pitch ?? silla.data.descripcion}</p>
              <a class="ficha__cta" href={`/catalogo#${silla.id}`}>
                Ver la ficha de {silla.data.nombre} →
              </a>
            </div>
          </article>
        ))
      }
    </div>
    <FranjaOscura id="comparar" texto="¿Malla o tapizada? Compáralas lado a lado." enlace={{ texto: 'Abrir el comparador', href: '/comparar' }} />
  </div>
</section>

<style lang="scss">
  .muestra {
    @include seccion;

    border-block: 1px solid tinta(8%);
    background: color("blanco");
  }

  .muestra__contenido {
    @include contenedor;

    display: flex;
    flex-direction: column;
    gap: 34px;
  }

  .muestra__todas {
    @include pill;

    flex: none;
    padding: 13px 22px;
    font-size: 13px;
  }

  .muestra__rejilla {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: 20px;
  }

  .ficha {
    display: flex;
    flex-direction: column;
    min-width: 0;
    overflow: hidden;
    border: 1px solid tinta(8%);
    border-radius: radio("l");
    background: color("hielo");
  }

  .ficha__imagen {
    display: block;
    overflow: hidden;
  }

  .ficha__foto {
    width: 100%;
    aspect-ratio: 4 / 3;
    object-fit: cover;
    transition: transform 0.5s ease;

    .ficha__imagen:hover & {
      transform: scale(1.04);
    }
  }

  .ficha__cuerpo {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 9px;
    padding: 22px;
  }

  .ficha__nombre {
    margin: 0;
    font: 600 19px / 1.2 fuente("archivo");
    letter-spacing: -0.02em;
    color: color("tinta");
  }

  .ficha__descripcion {
    @include cuerpo(13.5px, 1.6);

    color: color("gris-medio");
  }

  .ficha__cta {
    margin-top: auto;
    padding-top: 16px;
    font: 600 12.5px / 1 fuente("archivo");
    color: color("cobalto");
  }
</style>
```

- [ ] **Paso 2: Checkpoint**

```bash
git add src/components/landing/Muestra.astro
```
Mensaje propuesto: `feat: añade la muestra de sillas con totales derivados`

---

### Tarea 8: Bloque 04 — Anatomía

**Files:**
- Create: `src/components/landing/Anatomia.astro`

Foto y gradiente de la silla `destacados.anatomia`; puntos posicionados con los `%` de `ajustes.json`. «Cuatro ajustes…» y el nombre de la silla del texto introductorio se derivan de los datos.

- [ ] **Paso 1: `src/components/landing/Anatomia.astro`**

```astro
---
import { Picture } from 'astro:assets';
import EncabezadoSeccion from '@/components/ui/EncabezadoSeccion.astro';
import { site } from '@/data/site';
import { rangoAjuste } from '@/lib/comparador';
import { gradienteTema, type Ajuste, type Silla } from '@/lib/contenido';
import { capitalizar, numeroEnLetras } from '@/lib/formato';

interface Props {
  /** `destacados.anatomia`: su foto y su gradiente. */
  silla: Silla;
  ajustes: readonly Ajuste[];
}

const { silla, ajustes } = Astro.props;
const fondo = gradienteTema(silla);
const intro = `${capitalizar(numeroEnLetras(ajustes.length, 'antepuesto'))} ajustes deciden si una silla te sirve o te estorba. Toca cada punto para ver el rango real de la ${silla.data.nombre}.`;
const dosCifras = (n: number): string => String(n).padStart(2, '0');
const rango = (ajuste: Ajuste): string => rangoAjuste(ajuste.data, silla.data, site.mercado.locale);
---

<section id="anatomia" class="anatomia">
  <div class="anatomia__contenido">
    <EncabezadoSeccion etiqueta="Anatomía de una Tessera" titulo="Cómo se ajusta una silla ergonómica" intro={intro} ancho="56ch" />
    <ts-anatomia class="anatomia__rejilla">
      <div class="anatomia__foto" style={`background: ${fondo}`}>
        <Picture
          class="anatomia__imagen"
          src={silla.data.imagen.src}
          alt={silla.data.imagen.alt}
          formats={['avif', 'webp']}
          width={1000}
          height={1050}
          widths={[500, 1000]}
          sizes="(max-width: 899px) calc(100vw - 32px), 600px"
          fit="cover"
        />
        {
          ajustes.map((ajuste, i) => (
            <button
              type="button"
              class="anatomia__punto"
              data-ajuste-punto={String(i)}
              aria-label={ajuste.data.titulo}
              aria-pressed={i === 0 ? 'true' : 'false'}
              style={`left: ${String(ajuste.data.punto.x)}%; top: ${String(ajuste.data.punto.y)}%`}
            >
              {i + 1}
            </button>
          ))
        }
      </div>
      <div class="anatomia__detalle">
        {
          ajustes.map((ajuste, i) => (
            <div class="ajuste" data-ajuste-panel={String(i)}>
              <div class="ajuste__numero">
                Ajuste {i + 1} de {ajustes.length}
              </div>
              <h3 class="ajuste__titulo">{ajuste.data.titulo}</h3>
              <div class="ajuste__rango">{rango(ajuste)}</div>
              <p class="ajuste__descripcion">{ajuste.data.descripcion}</p>
              <div class="ajuste__barra">
                <div class="ajuste__relleno" style={`width: ${String(ajuste.data.porcentaje)}%`} />
              </div>
            </div>
          ))
        }
        {
          ajustes.map((ajuste, i) => (
            <button type="button" class="fila-ajuste" data-ajuste-fila={String(i)} aria-pressed={i === 0 ? 'true' : 'false'}>
              <span class="fila-ajuste__numero">{dosCifras(i + 1)}</span>
              <span class="fila-ajuste__titulo">{ajuste.data.titulo}</span>
              <span class="fila-ajuste__rango">{rango(ajuste)}</span>
            </button>
          ))
        }
      </div>
    </ts-anatomia>
  </div>
</section>

<script>
  import { registrarAnatomia } from '@/scripts/anatomia';

  registrarAnatomia();
</script>

<style lang="scss">
  .anatomia {
    @include seccion;

    background: color("hielo");
  }

  .anatomia__contenido {
    @include contenedor;

    display: flex;
    flex-direction: column;
    gap: 36px;
  }

  .anatomia__rejilla {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    align-items: start;
    gap: 28px;
  }

  .anatomia__foto {
    position: relative;
    min-width: 0;
    overflow: hidden;
    border-radius: radio("xl");
  }

  .anatomia__imagen {
    width: 100%;
    aspect-ratio: 1 / 1.05;
    object-fit: cover;
  }

  // Puntos posicionados con los % de `ajustes.json` (recalibrar con la foto real).
  .anatomia__punto {
    @include area-tactil;

    position: absolute;
    width: 30px;
    height: 30px;
    padding: 0;
    border: 2px solid color("tinta");
    border-radius: 50%;
    background: color("hielo");
    color: color("tinta");
    font: 600 12px / 1 fuente("mono");
    cursor: pointer;
    transition:
      background 0.25s ease,
      color 0.25s ease;

    &[aria-pressed="true"] {
      background: color("cobalto");
      color: color("blanco");
    }
  }

  .anatomia__detalle {
    display: flex;
    flex-direction: column;
    gap: 14px;
    min-width: 0;
  }

  .ajuste {
    padding: 28px;
    border: 1px solid tinta(8%);
    border-radius: radio("l");
    background: color("blanco");
  }

  .ajuste__numero {
    @include etiqueta-mono(9.5px);

    color: color("cobalto");
  }

  .ajuste__titulo {
    margin: 10px 0 0;
    font: 600 24px / 1.2 fuente("archivo");
    letter-spacing: -0.025em;
    color: color("tinta");
  }

  .ajuste__rango {
    margin-top: 8px;
    font: 300 34px / 1 fuente("newsreader");
    color: color("cobalto");
  }

  .ajuste__descripcion {
    @include cuerpo(14.5px);

    margin-top: 12px;
  }

  .ajuste__barra {
    height: 5px;
    margin-top: 18px;
    overflow: hidden;
    border-radius: 3px;
    background: tinta(8%);
  }

  .ajuste__relleno {
    height: 100%;
    background: color("cobalto");
    transform-origin: left;
    animation: ts-crece 0.35s ease;

    @include movimiento-reducido {
      animation: none;
    }
  }

  .fila-ajuste {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    padding: 14px 16px;
    border: 1px solid tinta(12%);
    border-radius: radio("xs");
    background: transparent;
    font-family: fuente("archivo");
    text-align: left;
    cursor: pointer;
    transition:
      border-color 0.25s ease,
      background 0.25s ease;

    &:hover {
      border-color: color("cobalto");
    }

    &[aria-pressed="true"] {
      border-color: color("cobalto");
      background: color("blanco");
    }
  }

  .fila-ajuste__numero {
    flex: none;
    font: 500 10.5px / 1 fuente("mono");
    color: color("gris-medio");
  }

  .fila-ajuste__titulo {
    font: 600 14px / 1.3 fuente("archivo");
    color: color("tinta");
  }

  .fila-ajuste__rango {
    margin-left: auto;
    font: 400 11px / 1 fuente("mono");
    color: color("gris-medio");
  }

  @keyframes ts-crece {
    from {
      transform: scaleX(0);
    }

    to {
      transform: scaleX(1);
    }
  }
</style>
```

- [ ] **Paso 2: Checkpoint**

```bash
git add src/components/landing/Anatomia.astro
```
Mensaje propuesto: `feat: añade el bloque de anatomía con ajustes desde datos`

---

### Tarea 9: Bloque 05 — Experiencias

**Files:**
- Create: `src/components/landing/Experiencias.astro`

El único `<h2>` en serif de la landing (variante oscura de `EncabezadoSeccion`). Sin estrellas ni puntuaciones. Por debajo de 900 px las tarjetas van en una columna y las flechas debajo.

- [ ] **Paso 1: `src/components/landing/Experiencias.astro`**

```astro
---
import { Picture } from 'astro:assets';
import EncabezadoSeccion from '@/components/ui/EncabezadoSeccion.astro';
import type { TestimonioResuelto } from '@/lib/contenido';

interface Props {
  testimonios: readonly TestimonioResuelto[];
}

const { testimonios } = Astro.props;
const hayExtras = testimonios.some(({ entrada }) => !entrada.data.destacado);
---

<section id="experiencias" class="experiencias">
  <ts-experiencias class="experiencias__marco">
    <div class="experiencias__cabecera">
      <EncabezadoSeccion etiqueta="Experiencias" titulo="Experiencias de quien ya se sentó" ancho="34ch" variante="oscuro">
        {
          hayExtras && (
            <button slot="accion" type="button" class="experiencias__mas" data-exp-mas aria-expanded="false" hidden>
              <span data-exp-mas-texto>Leer más experiencias</span>
              <span class="experiencias__flecha" aria-hidden="true">
                →
              </span>
            </button>
          )
        }
      </EncabezadoSeccion>
    </div>

    <div class="experiencias__carrusel">
      <button type="button" class="experiencias__paso experiencias__paso--anterior" data-exp-anterior aria-label="Experiencias anteriores" hidden>←</button>
      <div class="experiencias__tarjetas">
        {
          testimonios.map(({ entrada, etiquetaSilla }) => (
            <article class="experiencia" data-experiencia data-destacada={String(entrada.data.destacado)}>
              <Picture
                class="experiencia__imagen"
                src={entrada.data.imagen.src}
                alt={entrada.data.imagen.alt}
                formats={['avif', 'webp']}
                width={800}
                height={420}
                widths={[400, 800]}
                sizes="(max-width: 899px) calc(100vw - 32px), 400px"
                fit="cover"
              />
              <div class="experiencia__cuerpo">
                <div class="experiencia__persona">
                  <span class="experiencia__inicial" aria-hidden="true">
                    {entrada.data.nombre.charAt(0)}
                  </span>
                  <span class="experiencia__quien">
                    <strong class="experiencia__nombre">{entrada.data.nombre}</strong>
                    <span class="experiencia__meta">{entrada.data.meta}</span>
                  </span>
                </div>
                <p class="experiencia__cita">
                  {entrada.data.cita}
                  {entrada.data.ampliacion !== undefined && <span data-ampliacion> {entrada.data.ampliacion}</span>}
                </p>
                {
                  entrada.data.ampliacion !== undefined && (
                    <button type="button" class="experiencia__ver-mas" data-ver-mas aria-expanded="false" hidden>
                      Ver más
                    </button>
                  )
                }
                <div class="experiencia__pie">
                  <span>{etiquetaSilla}</span>
                  <span class="experiencia__punto" aria-hidden="true" />
                  <span>{entrada.data.antiguedad}</span>
                </div>
              </div>
            </article>
          ))
        }
      </div>
      <button type="button" class="experiencias__paso experiencias__paso--siguiente" data-exp-siguiente aria-label="Experiencias siguientes" hidden>→</button>
    </div>

    <div class="experiencias__posicion">
      <span data-exp-posicion aria-live="polite">{testimonios.length} experiencias</span>
      <span class="experiencias__linea" aria-hidden="true"></span>
    </div>
  </ts-experiencias>
</section>

<script>
  import { registrarExperiencias } from '@/scripts/experiencias';

  registrarExperiencias();
</script>

<style lang="scss">
  .experiencias {
    padding: clamp(56px, 7vw, 96px) 0;
    overflow: hidden;
    background: color("tinta");
  }

  .experiencias__marco {
    @include contenedor;

    display: flex;
    flex-direction: column;
    gap: 18px;
    padding: 0 $padding-lateral;
  }

  .experiencias__cabecera {
    margin-bottom: 16px;
  }

  .experiencias__mas {
    display: flex;
    flex: none;
    align-items: center;
    gap: 11px;
    padding: 11px 18px;
    border: 1px solid rgb(127 160 255 / 40%);
    border-radius: radio("pill");
    background: transparent;
    color: color("cobalto-claro");
    font: 600 13px / 1 fuente("archivo");
    cursor: pointer;
    transition:
      border-color 0.25s ease,
      color 0.25s ease;

    &:hover {
      border-color: color("blanco");
      color: color("blanco");
    }

    &[hidden] {
      display: none;
    }
  }

  .experiencias__flecha {
    display: inline-block;
    font: 400 15px / 1 fuente("mono");
    transform: rotate(90deg);
    transition: transform 0.3s ease;

    [aria-expanded="true"] > & {
      transform: rotate(-90deg);
    }
  }

  .experiencias__carrusel {
    display: grid;
    grid-template-columns: 48px minmax(0, 1fr) 48px;
    grid-template-areas: "anterior tarjetas siguiente";
    align-items: center;
    gap: 14px;

    @include movil {
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      grid-template-areas:
        "tarjetas tarjetas"
        "anterior siguiente";
    }
  }

  .experiencias__tarjetas {
    display: grid;
    grid-area: tarjetas;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    align-items: start;
    gap: 20px;

    @include movil {
      grid-template-columns: minmax(0, 1fr);
    }
  }

  .experiencias__paso {
    width: 48px;
    height: 48px;
    border: 1px solid hielo(20%);
    border-radius: 50%;
    background: transparent;
    color: color("hielo");
    font: 400 20px / 1 fuente("mono");
    cursor: pointer;
    transition:
      background 0.25s ease,
      border-color 0.25s ease;

    &:hover:not(:disabled) {
      border-color: color("cobalto-claro");
      background: hielo(12%);
    }

    &:disabled {
      opacity: 0.35;
      cursor: default;
    }

    &[hidden] {
      display: none;
    }
  }

  .experiencias__paso--anterior {
    grid-area: anterior;

    @include movil {
      justify-self: end;
    }
  }

  .experiencias__paso--siguiente {
    grid-area: siguiente;

    @include movil {
      justify-self: start;
    }
  }

  .experiencia {
    display: flex;
    flex-direction: column;
    min-width: 0;
    overflow: hidden;
    border-radius: radio("l");
    background: color("hielo");

    &[hidden] {
      display: none;
    }
  }

  .experiencia__imagen {
    width: 100%;
    height: 210px;
    object-fit: cover;
  }

  .experiencia__cuerpo {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 12px;
    padding: 24px;
  }

  .experiencia__persona {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .experiencia__inicial {
    display: flex;
    flex: none;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    border-radius: 50%;
    background: color("cobalto");
    color: color("blanco");
    font: 600 12px / 1 fuente("archivo");
  }

  .experiencia__quien {
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 0;
  }

  .experiencia__nombre {
    font: 600 12.5px / 1 fuente("archivo");
    color: color("tinta");
  }

  .experiencia__meta {
    font: 400 10px / 1 fuente("mono");
    color: color("gris-medio");
  }

  .experiencia__cita {
    @include cuerpo(14.5px);

    color: color("tinta-2");
  }

  .experiencia__ver-mas {
    align-self: flex-start;
    padding: 0;
    border: 0;
    background: transparent;
    color: color("cobalto");
    font: 600 12px / 1 fuente("archivo");
    cursor: pointer;

    &:hover {
      color: color("cobalto-oscuro");
    }
  }

  .experiencia__pie {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px 8px;
    min-width: 0;
    margin-top: 6px;
    padding-top: 14px;
    border-top: 1px solid tinta(8%);
    font: 400 10px / 1 fuente("mono");
    color: color("gris-medio");
  }

  .experiencia__punto {
    width: 3px;
    height: 3px;
    border-radius: 50%;
    background: rgb(90 100 128 / 40%);
  }

  .experiencias__posicion {
    display: flex;
    align-items: center;
    gap: 12px;
    font: 400 10.5px / 1 fuente("mono");
    color: hielo(48%); // 45 % en el diseño: 48 % es el mínimo con 4,5:1 (WCAG AA)
  }

  .experiencias__linea {
    flex: 1;
    height: 1px;
    background: hielo(12%);
  }
</style>
```

- [ ] **Paso 2: Checkpoint**

```bash
git add src/components/landing/Experiencias.astro
```
Mensaje propuesto: `feat: añade el bloque de experiencias`

---

### Tarea 10: Bloques 06 y 07 — Entrega y FAQ

**Files:**
- Create: `src/components/landing/Entrega.astro`, `src/components/landing/Faq.astro`

Entrega: `<ol>` de `pasos` y el bloque de conversión principal (segunda y última aparición de WhatsApp). FAQ: `<details>` nativo con las respuestas en el HTML.

- [ ] **Paso 1: `src/components/landing/Entrega.astro`**

```astro
---
import BloqueConversion from '@/components/ui/BloqueConversion.astro';
import EncabezadoSeccion from '@/components/ui/EncabezadoSeccion.astro';
import type { Paso } from '@/lib/contenido';

interface Props {
  pasos: readonly Paso[];
}

const { pasos } = Astro.props;
---

<section id="entrega" class="entrega">
  <div class="entrega__contenido">
    <EncabezadoSeccion
      etiqueta="Entrega e instalación"
      titulo="Cómo llega tu silla"
      intro="Cada silla sale calibrada a la persona que la va a usar. Por eso el pedido pasa por un asesor y no por un carrito."
    />
    <ol class="entrega__pasos">
      {
        pasos.map((paso, i) => (
          <li class="paso">
            <span class="paso__numero">Paso {i + 1}</span>
            <h3 class="paso__titulo">{paso.data.titulo}</h3>
            <p class="paso__descripcion">{paso.data.descripcion}</p>
          </li>
        ))
      }
    </ol>
    <BloqueConversion
      titular="Dinos tu estatura y cuántas horas te sientas"
      texto="Un asesor te dice qué modelo y qué ajustes te corresponden. Sin llamadas ni formularios largos."
      contexto="entrega"
    />
  </div>
</section>

<style lang="scss">
  .entrega {
    @include seccion;

    background: color("blanco");
  }

  .entrega__contenido {
    @include contenedor;

    display: flex;
    flex-direction: column;
    gap: 34px;
  }

  .entrega__pasos {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 20px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .paso {
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-width: 0;
    padding: 26px;
    border: 1px solid tinta(8%);
    border-radius: radio("m");
    background: color("hielo");
  }

  .paso__numero {
    @include etiqueta-mono;

    color: color("cobalto");
  }

  .paso__titulo {
    margin: 0;
    font: 600 18.5px / 1.25 fuente("archivo");
    letter-spacing: -0.02em;
    color: color("tinta");
  }

  .paso__descripcion {
    @include cuerpo(13.5px);

    color: color("gris-medio");
  }
</style>
```

- [ ] **Paso 2: `src/components/landing/Faq.astro`**

```astro
---
import type { Faq } from '@/lib/contenido';

interface Props {
  faqs: readonly Faq[];
}

const { faqs } = Astro.props;
---

<section id="faq" class="faq">
  <div class="faq__contenido">
    <h2 class="faq__titulo">Preguntas frecuentes</h2>
    <div class="faq__lista">
      {
        faqs.map((faq) => (
          <details class="pregunta" data-faq={faq.id}>
            <summary class="pregunta__resumen">
              {faq.data.pregunta}
              <span class="pregunta__signo" aria-hidden="true">
                +
              </span>
            </summary>
            <p class="pregunta__respuesta">{faq.data.respuesta}</p>
          </details>
        ))
      }
    </div>
  </div>
</section>

<style lang="scss">
  .faq {
    @include seccion;

    background: color("hielo");
  }

  .faq__contenido {
    @include contenedor("faq");

    display: flex;
    flex-direction: column;
    gap: 28px;
  }

  .faq__titulo {
    @include h2;
  }

  .faq__lista {
    display: flex;
    flex-direction: column;
  }

  .pregunta {
    border-bottom: 1px solid tinta(13%);
  }

  .pregunta__resumen {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 20px 2px;
    font: 600 16.5px / 1.4 fuente("archivo");
    color: color("tinta");
    list-style: none;
    cursor: pointer;

    &:hover {
      color: color("cobalto");
    }
  }

  .pregunta__signo {
    flex: none;
    font: 300 24px / 1 fuente("newsreader");
    color: color("cobalto");
  }

  .pregunta__respuesta {
    @include cuerpo(14.5px, 1.7);

    max-width: 70ch;
    padding: 0 2px 24px;
  }
</style>
```

- [ ] **Paso 3: Checkpoint**

```bash
git add src/components/landing/Entrega.astro src/components/landing/Faq.astro
```
Mensaje propuesto: `feat: añade entrega con conversión y preguntas frecuentes`

---

### Tarea 11: Página de la landing

**Files:**
- Modify: `src/pages/sillas-ergonomicas.astro` (reemplaza la página provisional de la fase 1)

- [ ] **Paso 1: `src/pages/sillas-ergonomicas.astro`**

```astro
---
import Anatomia from '@/components/landing/Anatomia.astro';
import BarraCategorias from '@/components/landing/BarraCategorias.astro';
import Entrega from '@/components/landing/Entrega.astro';
import Experiencias from '@/components/landing/Experiencias.astro';
import Faq from '@/components/landing/Faq.astro';
import Muestra from '@/components/landing/Muestra.astro';
import Necesidades from '@/components/landing/Necesidades.astro';
import Portada from '@/components/landing/Portada.astro';
import BaseLayout from '@/layouts/BaseLayout.astro';
import { obtenerContenido } from '@/lib/contenido';
import { preguntasFrecuentes } from '@/lib/schema';

const contenido = await obtenerContenido();
const faqJsonLd = preguntasFrecuentes(
  contenido.faqs.map((faq) => ({ pregunta: faq.data.pregunta, respuesta: faq.data.respuesta })),
);
---

<BaseLayout
  titulo="Sillas ergonómicas para home office"
  descripcion="Sillas ergonómicas calibradas a tu estatura, tu escritorio y tus horas sentado. Elige por lo que te duele y cotiza con un asesor por WhatsApp."
  ruta="/sillas-ergonomicas"
  jsonLd={[faqJsonLd]}
>
  <Portada sillas={contenido.portada} />
  <BarraCategorias categorias={contenido.barra} />
  <Necesidades necesidades={contenido.necesidades} />
  <Muestra sillas={contenido.muestra} total={contenido.sillas.length} />
  <Anatomia silla={contenido.anatomia} ajustes={contenido.ajustes} />
  <Experiencias testimonios={contenido.testimonios} />
  <Entrega pasos={contenido.pasos} />
  <Faq faqs={contenido.faqs} />
</BaseLayout>
```

- [ ] **Paso 2: Build**

Run: `npm run build`
Expected: `0 errors` y `Complete!`.

- [ ] **Paso 3: Comprobaciones sobre el HTML**

Run: `grep -o 'https://wa.me/' dist/sillas-ergonomicas.html | wc -l`
Expected: `2`.

Run: `grep -o '"@type":"FAQPage"' dist/sillas-ergonomicas.html | wc -l`
Expected: `1`.

Run: `grep -o '<h1' dist/sillas-ergonomicas.html | wc -l`
Expected: `1`.

- [ ] **Paso 4: Revisión visual**

Run: `npm run preview` y abre `http://localhost:4321/sillas-ergonomicas` a 1280 px y a 375 px.
Expected: los siete bloques en orden y como el diseño; la portada rota cada 5 s y se detiene al elegir un indicador; los puntos de anatomía y la lista cambian el panel; «Leer más experiencias» muestra «Experiencias 1–3 de 6». A 375 px las experiencias van en una columna con las flechas debajo.

- [ ] **Paso 5: Checkpoint**

```bash
git add src/pages/sillas-ergonomicas.astro
```
Mensaje propuesto: `feat: arma la landing /sillas-ergonomicas`

---

### Tarea 12: Verificación de la fase

- [ ] **Paso 1: Todo en verde**

Run: `npm run verify && npm run build`
Expected: `0 errors`; ESLint y Stylelint sin salida. Con solo las fases 1, 2 y 3 hechas: `Test Files  13 passed (13)` y `Tests  102 passed (102)` (esta fase añade 21 tests).
