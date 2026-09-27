# Tessera — Fase 4: catálogo `/catalogo` y `/catalogo/[faceta]`

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Catálogo indexable: `/catalogo` con las N sillas y una página estática por categoría (`/catalogo/<slug>`) con su propio `<h1>`, intro, meta, canonical y guía, más un filtro progresivo que estrecha en cliente sin crear URLs indexables nuevas.

**Architecture:** Las páginas se generan en build desde `obtenerContenido()` (fase 2). Todas las opciones del filtro son enlaces reales a su faceta; en una página de faceta, el custom element `<ts-filtros>` intercepta las demás opciones, oculta las tarjetas que no cumplen (`cumpleFiltros`, AND) y refleja los extras en `?y=` con `history.replaceState`; la canonical estática no cambia (spec §6). La lógica vive en `src/scripts/filtros.ts` y `src/lib/migas.ts`, con tests; los `.astro` solo pintan.

**Tech Stack:** Astro 7.3 (páginas estáticas, `getStaticPaths`, `astro:assets` `<Picture>`) · TypeScript 6 · SCSS · Vitest 5 + happy-dom.

**Requisitos previos:** fases 1 y 2 terminadas (`npm run verify` en verde: 81 tests en 10 archivos). Lee `docs/superpowers/plans/2026-09-26-tessera-00-indice.md` (convenciones: el commit lo hace el usuario; sin `any`, sin `as T`, sin `!`).

**Fuente visual:** pantalla 2 de `Tessera Landing SEO.dc.html` (bloques C1, C2, C3). Los textos de `/catalogo` son los del diseño; los de cada faceta salen de `src/content/categorias.json`.

---

## Mapa de archivos

| Archivo | Responsabilidad |
|---|---|
| `src/lib/migas.ts` | Tramos visibles de la miga → migas absolutas para `BreadcrumbList` |
| `src/components/seo/MigaDePan.astro` | `<nav aria-label="Miga de pan">` visible |
| `src/scripts/filtros.ts` | `<ts-filtros>`: estrechamiento en cliente, `?y=`, recuentos, chips, estado vacío |
| `src/components/catalogo/Cabecera.astro` | Bloque C1: miga, `<h1>` con énfasis, intro, chip «n de N sillas · orden: recomendadas» |
| `src/components/catalogo/Rejilla.astro` | Rejilla de tarjetas `<article id="<silla.id>">` (destino de `/catalogo#<id>`) |
| `src/components/catalogo/Filtros.astro` | Bloque C2: aside de opciones (enlaces), chips, rejilla, estado vacío, pie |
| `src/components/catalogo/Guia.astro` | Bloque C3 (`id="cat-guia"`): guía + franja oscura al comparador |
| `src/pages/catalogo/index.astro` | `/catalogo` con los textos del diseño |
| `src/pages/catalogo/[faceta].astro` | Una página por categoría (`getStaticPaths`) |
| `tests/unit/migas.test.ts`, `tests/unit/filtros.test.ts` | Tests |

## Ganchos estables para los e2e (fase 6)

No cambies estos atributos sin actualizar los e2e.

| Selector | Qué es |
|---|---|
| `ts-filtros[data-base="<id>"][data-total="<N>"]` | Contenedor del filtro; `data-base` solo en páginas de faceta |
| `[data-filtros-panel]` | `<details>` del aside: llega cerrado; en escritorio el CSS muestra su contenido con `::details-content` |
| `a[data-opcion="<id>"][data-slug="<slug>"]` | Opción del aside; activa ⇔ `aria-current` (`page` la base, `true` un extra) |
| `[data-recuento]` | Recuento dentro de cada opción |
| `[data-chip-base]` | Chip de la categoría base (enlace que la quita) |
| `button[data-chip="<id>"]` | Chip de un extra (`hidden` si no está activo) |
| `article[data-silla][data-categorias="<ids separados por espacio>"]` con `id="<silla.id>"` | Tarjeta |
| `[data-vacio]` | Estado vacío (`hidden` si hay resultados) |
| `[data-visibles]` (cabecera) · `[data-mostrando]` (pie) | Contadores de sillas visibles |
| `#cat-cabecera` · `#cat-filtros` · `#cat-guia` | Secciones |

---

### Tarea 1: Migas para JSON-LD

**Files:**
- Create: `src/lib/migas.ts`
- Test: `tests/unit/migas.test.ts`

- [ ] **Paso 1: Escribe el test que falla**

```ts
import { describe, expect, it } from 'vitest';
import { migasParaJsonLd } from '@/lib/migas';

describe('migasParaJsonLd', () => {
  it('convierte los href en URLs absolutas', () => {
    expect(
      migasParaJsonLd(
        [
          { nombre: 'Inicio', href: '/sillas-ergonomicas' },
          { nombre: 'Sillas', href: '/catalogo' },
          { nombre: 'Sillas de malla' },
        ],
        'https://tessera.co',
        '/catalogo/malla',
      ),
    ).toEqual([
      { nombre: 'Inicio', url: 'https://tessera.co/sillas-ergonomicas' },
      { nombre: 'Sillas', url: 'https://tessera.co/catalogo' },
      { nombre: 'Sillas de malla', url: 'https://tessera.co/catalogo/malla' },
    ]);
  });

  it('el tramo sin href apunta a la página actual', () => {
    expect(migasParaJsonLd([{ nombre: 'Ergonómicas home office' }], 'https://tessera.co', '/catalogo')).toEqual([
      { nombre: 'Ergonómicas home office', url: 'https://tessera.co/catalogo' },
    ]);
  });

  it('une tramos seguidos con la misma URL (en /catalogo, «Sillas» y el último)', () => {
    expect(
      migasParaJsonLd(
        [{ nombre: 'Inicio', href: '/sillas-ergonomicas' }, { nombre: 'Sillas' }, { nombre: 'Ergonómicas home office' }],
        'https://tessera.co',
        '/catalogo',
      ),
    ).toEqual([
      { nombre: 'Inicio', url: 'https://tessera.co/sillas-ergonomicas' },
      { nombre: 'Sillas', url: 'https://tessera.co/catalogo' },
    ]);
  });
});
```

- [ ] **Paso 2: Comprueba que falla**

Run: `npx vitest run tests/unit/migas.test.ts`
Expected: FAIL con `Error: Cannot find package '@/lib/migas' imported from …/tests/unit/migas.test.ts`

- [ ] **Paso 3: Implementa**

```ts
import type { Miga } from './schema';
import { urlCanonica } from './seo';

/** Tramo visible de la miga de pan; el último (la página actual) va sin `href`. */
export interface MigaVisible {
  readonly nombre: string;
  readonly href?: string;
}

/**
 * Migas para `BreadcrumbList`: URLs absolutas; el tramo sin `href` apunta a la página actual.
 * Tramos seguidos con la misma URL se unen (se queda el primero): Google no admite dos
 * posiciones con la misma URL.
 */
export function migasParaJsonLd(migas: readonly MigaVisible[], origen: string, rutaActual: string): Miga[] {
  const conUrl = migas.map((miga) => ({ nombre: miga.nombre, url: urlCanonica(origen, miga.href ?? rutaActual) }));
  return conUrl.filter((miga, i) => i === 0 || conUrl[i - 1]?.url !== miga.url);
}
```

- [ ] **Paso 4: Comprueba que pasa**

Run: `npx vitest run tests/unit/migas.test.ts`
Expected: `Tests  3 passed (3)`

Run: `npm run test`
Expected: `Test Files  11 passed (11)` y `Tests  84 passed (84)`

- [ ] **Paso 5: Checkpoint (el commit lo hace el usuario)**

```bash
git add src/lib/migas.ts tests/unit/migas.test.ts
```
Mensaje propuesto: `feat(catalogo): migas absolutas para BreadcrumbList`

---

### Tarea 2: Componente de miga de pan

**Files:**
- Create: `src/components/seo/MigaDePan.astro`

- [ ] **Paso 1: Crea el componente**

Lista ordenada semántica; el separador «/» es un pseudo-elemento para que los lectores de pantalla no lo lean. Estilos del bloque C1 del diseño (IBM Plex Mono 11px `#5A6480`, último tramo `#111623`).

```astro
---
import type { MigaVisible } from '@/lib/migas';

interface Props {
  migas: readonly MigaVisible[];
}

const { migas } = Astro.props;
---

<nav class="miga" aria-label="Miga de pan">
  <ol class="miga__lista">
    {
      migas.map((miga, i) => (
        <li class="miga__tramo">
          {miga.href === undefined ? (
            <span class="miga__actual" aria-current={i === migas.length - 1 ? 'page' : undefined}>
              {miga.nombre}
            </span>
          ) : (
            <a class="miga__enlace" href={miga.href}>
              {miga.nombre}
            </a>
          )}
        </li>
      ))
    }
  </ol>
</nav>

<style lang="scss">
  .miga__lista {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    margin: 0;
    padding: 0;
    list-style: none;
    font: 400 11px / 1 fuente("mono");
    color: color("gris-medio");
  }

  .miga__tramo {
    display: flex;
    align-items: center;
    gap: 8px;

    & + &::before {
      content: "/";
    }
  }

  .miga__enlace {
    color: color("gris-medio");

    &:hover {
      color: color("cobalto");
    }
  }

  .miga__actual {
    color: color("tinta");
  }
</style>
```

- [ ] **Paso 2: Comprueba tipos y lint**

Run: `npm run check`
Expected: `- 0 errors`

Run: `npm run lint && npm run lint:styles`
Expected: sin salida de errores (código 0)

- [ ] **Paso 3: Checkpoint (el commit lo hace el usuario)**

```bash
git add src/components/seo/MigaDePan.astro
```
Mensaje propuesto: `feat(seo): componente de miga de pan`

---

### Tarea 3: Custom element `<ts-filtros>`

**Files:**
- Create: `src/scripts/filtros.ts`
- Test: `tests/unit/filtros.test.ts`

Contrato de marcado (lo pinta `Filtros.astro` en la tarea 6; el test lo reproduce): ver «Ganchos estables» arriba. Comportamiento (spec §6):

- En `/catalogo` (sin `data-base`) no intercepta nada: cada opción navega a su faceta.
- En una faceta, la base está activa (`aria-current="page"`) y su enlace la quita; las demás opciones se interceptan y alternan un extra en cliente.
- Los extras se leen de `?y=<slug>,<slug>` al cargar (slugs desconocidos se ignoran) y se escriben con `history.replaceState`.
- Quitar la base con extras activos lleva a la faceta del primer extra y conserva el resto en `?y=` (`hrefSinBase`).
- Recuentos: cuántas sillas quedarían al añadir cada opción (`contar`).
- Estado vacío cuando no queda ninguna silla (spec §8.1).
- Panel `<details>`: no lo toca el script. Llega cerrado en el HTML (móvil) y en escritorio el CSS muestra su contenido con `::details-content` (bajo `@supports`). Cerrarlo con JS al cargar movía toda la página en móvil (Lighthouse: CLS 0,6).

- [ ] **Paso 1: Escribe el test que falla**

Monta el HTML con `montar()` (fase 1) para que el elemento se conecte con sus hijos ya presentes.

```ts
// @vitest-environment happy-dom
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { consulta, consultaTodos } from '@/lib/dom';
import { hrefSinBase, registrarFiltros } from '@/scripts/filtros';
import { montar } from './ayudas/montar';

function opcion(id: string, slug: string): string {
  return `<a href="/catalogo/${slug}" data-opcion="${id}" data-slug="${slug}"><span data-recuento>0</span></a>`;
}

function tarjeta(id: string, categorias: string): string {
  return `<article id="${id}" data-silla data-categorias="${categorias}"></article>`;
}

// Página de faceta «malla»: solo trae las sillas de malla (los extras solo estrechan).
const FACETA_MALLA = `
  <span data-visibles>4</span>
  <ts-filtros data-total="6" data-base="malla">
    <details data-filtros-panel open>
      <summary>Filtros</summary>
      ${opcion('malla', 'malla')}
      ${opcion('lumbar', 'lumbar')}
      ${opcion('intensivo', 'uso-intensivo')}
      ${opcion('alta', 'altos')}
    </details>
    <a href="/catalogo" data-chip-base>malla ×</a>
    <button type="button" data-chip="lumbar" hidden>soporte lumbar ×</button>
    <button type="button" data-chip="intensivo" hidden>uso intensivo ×</button>
    <button type="button" data-chip="alta" hidden>1.85 m o más ×</button>
    ${tarjeta('duna', 'malla lumbar')}
    ${tarjeta('mora-pro', 'malla intensivo alta')}
    ${tarjeta('ignea', 'malla alta intensivo')}
    ${tarjeta('cauce', 'malla alta')}
    <p data-vacio hidden>Ninguna silla cumple todos estos filtros</p>
    <span data-mostrando>4</span>
  </ts-filtros>`;

const INDICE = `
  <ts-filtros data-total="2">
    <details data-filtros-panel open><summary>Filtros</summary>${opcion('malla', 'malla')}</details>
    ${tarjeta('duna', 'malla lumbar')}
    ${tarjeta('llano', 'tapizada lumbar')}
  </ts-filtros>`;

function visibles(): string[] {
  return consultaTodos(document, '[data-silla]', HTMLElement)
    .filter((t) => !t.hidden)
    .map((t) => t.id);
}

function enlace(id: string): HTMLAnchorElement {
  return consulta(document, `[data-opcion="${id}"]`, HTMLAnchorElement);
}

function recuento(id: string): string | null {
  return consulta(enlace(id), '[data-recuento]', HTMLElement).textContent;
}

function pulsar(elemento: HTMLElement): MouseEvent {
  const evento = new MouseEvent('click', { bubbles: true, cancelable: true });
  elemento.dispatchEvent(evento);
  return evento;
}

describe('hrefSinBase', () => {
  it('sin extras vuelve al catálogo', () => {
    expect(hrefSinBase([])).toBe('/catalogo');
  });

  it('con extras navega a la faceta del primero y conserva el resto', () => {
    expect(hrefSinBase(['lumbar'])).toBe('/catalogo/lumbar');
    expect(hrefSinBase(['lumbar', 'altos'])).toBe('/catalogo/lumbar?y=altos');
  });
});

describe('ts-filtros en una página de faceta', () => {
  beforeAll(() => {
    registrarFiltros();
  });

  beforeEach(() => {
    window.history.replaceState(null, '', '/catalogo/malla');
  });

  it('la base queda activa y los recuentos consideran la base', () => {
    montar(FACETA_MALLA);
    expect(enlace('malla').getAttribute('aria-current')).toBe('true');
    expect(recuento('malla')).toBe('4');
    expect(recuento('lumbar')).toBe('1');
    expect(recuento('alta')).toBe('3');
    expect(visibles()).toEqual(['duna', 'mora-pro', 'ignea', 'cauce']);
  });

  it('una opción extra estrecha en cliente sin navegar y actualiza la URL', () => {
    montar(FACETA_MALLA);
    const evento = pulsar(enlace('alta'));
    expect(evento.defaultPrevented).toBe(true);
    expect(visibles()).toEqual(['mora-pro', 'ignea', 'cauce']);
    expect(window.location.search).toBe('?y=altos');
    expect(enlace('alta').getAttribute('aria-current')).toBe('true');
    expect(consulta(document, '[data-chip="alta"]', HTMLButtonElement).hidden).toBe(false);
    expect(consulta(document, '[data-mostrando]', HTMLElement).textContent).toBe('3');
    expect(consulta(document, '[data-visibles]', HTMLElement).textContent).toBe('3');
    expect(recuento('intensivo')).toBe('2');
  });

  it('pulsar de nuevo la opción la quita', () => {
    montar(FACETA_MALLA);
    pulsar(enlace('alta'));
    pulsar(enlace('alta'));
    expect(visibles()).toHaveLength(4);
    expect(window.location.search).toBe('');
    expect(enlace('alta').hasAttribute('aria-current')).toBe(false);
  });

  it('lee los extras de ?y= al cargar e ignora slugs desconocidos', () => {
    window.history.replaceState(null, '', '/catalogo/malla?y=altos,gamer');
    montar(FACETA_MALLA);
    expect(visibles()).toEqual(['mora-pro', 'ignea', 'cauce']);
  });

  it('el chip de un extra lo quita', () => {
    window.history.replaceState(null, '', '/catalogo/malla?y=lumbar');
    montar(FACETA_MALLA);
    pulsar(consulta(document, '[data-chip="lumbar"]', HTMLButtonElement));
    expect(visibles()).toHaveLength(4);
    expect(consulta(document, '[data-chip="lumbar"]', HTMLButtonElement).hidden).toBe(true);
  });

  it('quitar la base con extras lleva a la faceta del primer extra', () => {
    window.history.replaceState(null, '', '/catalogo/malla?y=uso-intensivo,altos');
    montar(FACETA_MALLA);
    expect(consulta(document, '[data-chip-base]', HTMLAnchorElement).getAttribute('href')).toBe('/catalogo/uso-intensivo?y=altos');
    expect(enlace('malla').getAttribute('href')).toBe('/catalogo/uso-intensivo?y=altos');
  });

  it('Ctrl/Cmd+clic no se intercepta: abre la faceta en otra pestaña', () => {
    montar(FACETA_MALLA);
    const evento = new MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true });
    enlace('alta').dispatchEvent(evento);
    expect(evento.defaultPrevented).toBe(false);
    expect(visibles()).toHaveLength(4);
  });

  it('al quitar un extra con su chip, el foco pasa a su opción del aside', () => {
    window.history.replaceState(null, '', '/catalogo/malla?y=lumbar');
    montar(FACETA_MALLA);
    const chip = consulta(document, '[data-chip="lumbar"]', HTMLButtonElement);
    chip.focus();
    pulsar(chip);
    expect(document.activeElement).toBe(enlace('lumbar'));
  });

  it('reconectar no duplica los listeners', () => {
    montar(FACETA_MALLA);
    const elemento = consulta(document, 'ts-filtros', HTMLElement);
    const padre = elemento.parentElement;
    elemento.remove();
    padre?.append(elemento);
    pulsar(enlace('alta'));
    expect(visibles()).toEqual(['mora-pro', 'ignea', 'cauce']);
  });

  it('muestra el estado vacío cuando nada cumple', () => {
    montar(FACETA_MALLA);
    pulsar(enlace('lumbar'));
    pulsar(enlace('alta'));
    expect(visibles()).toEqual([]);
    expect(consulta(document, '[data-vacio]', HTMLElement).hidden).toBe(false);
  });
});

describe('ts-filtros en /catalogo', () => {
  beforeAll(() => {
    registrarFiltros();
  });

  it('no intercepta: las opciones navegan a su faceta', () => {
    window.history.replaceState(null, '', '/catalogo');
    montar(INDICE);
    expect(visibles()).toEqual(['duna', 'llano']);
    expect(pulsar(enlace('malla')).defaultPrevented).toBe(false);
  });
});
```

- [ ] **Paso 2: Comprueba que falla**

Run: `npx vitest run tests/unit/filtros.test.ts`
Expected: FAIL con `Error: Failed to resolve import "@/scripts/filtros" from "tests/unit/filtros.test.ts". Does the file exist?`

- [ ] **Paso 3: Implementa**

```ts
import { contar, cumpleFiltros, escribirExtras, leerExtras, rutaCategoria } from '@/lib/catalogo';
import { consulta, consultaTodos, definirElemento, leerDato } from '@/lib/dom';

interface Opcion {
  readonly id: string;
  readonly slug: string;
  readonly enlace: HTMLAnchorElement;
  readonly recuento: HTMLElement;
}

interface Tarjeta {
  readonly elemento: HTMLElement;
  readonly categorias: readonly string[];
}

/** Destino al quitar la categoría base: la faceta del primer extra (conservando el resto) o el catálogo. */
export function hrefSinBase(slugsExtra: readonly string[]): string {
  const [primero, ...resto] = slugsExtra;
  return primero === undefined ? '/catalogo' : `${rutaCategoria(primero)}${escribirExtras(resto)}`;
}

/**
 * Filtro progresivo del catálogo (spec §6). Sin JS todas las opciones son enlaces a su
 * faceta. En una página de faceta (`data-base`), las demás opciones estrechan en cliente
 * y el estado se refleja en `?y=`; la canonical estática no cambia.
 */
export class TsFiltros extends HTMLElement {
  #opciones: Opcion[] = [];
  #tarjetas: Tarjeta[] = [];
  #base: Opcion | undefined;
  #extras: string[] = [];
  #conexion: AbortController | undefined;

  connectedCallback(): void {
    // Un AbortController por conexión: si el elemento se vuelve a conectar, no se duplican los listeners.
    this.#conexion?.abort();
    this.#conexion = new AbortController();
    const { signal } = this.#conexion;

    this.#opciones = consultaTodos(this, '[data-opcion]', HTMLAnchorElement).map((enlace) => ({
      id: leerDato(enlace, 'opcion'),
      slug: leerDato(enlace, 'slug'),
      enlace,
      recuento: consulta(enlace, '[data-recuento]', HTMLElement),
    }));
    this.#tarjetas = consultaTodos(this, '[data-silla]', HTMLElement).map((elemento) => ({
      elemento,
      categorias: leerDato(elemento, 'categorias').split(' ').filter((id) => id !== ''),
    }));

    const idBase = this.dataset.base;
    this.#base = this.#opciones.find((opcion) => opcion.id === idBase);
    if (this.#base === undefined) return;

    const base = this.#base;
    const otras = this.#opciones.filter((opcion) => opcion !== base);
    const slugsValidos = new Set(otras.map((opcion) => opcion.slug));
    this.#extras = leerExtras(window.location.search, slugsValidos).map((slug) => this.#porSlug(slug).id);

    for (const opcion of otras) {
      opcion.enlace.addEventListener(
        'click',
        (evento) => {
          // Ctrl/Cmd/Mayús+clic o botón central: que el navegador abra la faceta en otra pestaña.
          if (evento.ctrlKey || evento.metaKey || evento.shiftKey || evento.altKey || evento.button !== 0) return;
          evento.preventDefault();
          this.#alternar(opcion.id);
        },
        { signal },
      );
    }
    for (const chip of consultaTodos(this, '[data-chip]', HTMLButtonElement)) {
      const id = leerDato(chip, 'chip');
      chip.addEventListener(
        'click',
        () => {
          this.#alternar(id);
          // El chip se oculta: el foco pasa a su opción del aside en vez de caer al <body>.
          this.#porId(id).enlace.focus();
        },
        { signal },
      );
    }
    this.#pintar();
  }

  disconnectedCallback(): void {
    this.#conexion?.abort();
  }

  #porSlug(slug: string): Opcion {
    const opcion = this.#opciones.find((o) => o.slug === slug);
    if (opcion === undefined) throw new Error(`Filtro desconocido: «${slug}»`);
    return opcion;
  }

  #alternar(id: string): void {
    this.#extras = this.#extras.includes(id) ? this.#extras.filter((extra) => extra !== id) : [...this.#extras, id];
    this.#pintar();
    const slugs = this.#extras.map((extra) => this.#porId(extra).slug);
    window.history.replaceState(window.history.state, '', `${window.location.pathname}${escribirExtras(slugs)}`);
  }

  #porId(id: string): Opcion {
    const opcion = this.#opciones.find((o) => o.id === id);
    if (opcion === undefined) throw new Error(`Filtro desconocido: «${id}»`);
    return opcion;
  }

  #pintar(): void {
    if (this.#base === undefined) return;
    const activas = [this.#base.id, ...this.#extras];
    const sillas = this.#tarjetas.map((tarjeta) => ({ categorias: tarjeta.categorias }));

    let visibles = 0;
    for (const tarjeta of this.#tarjetas) {
      const cumple = cumpleFiltros(tarjeta.categorias, activas);
      tarjeta.elemento.hidden = !cumple;
      if (cumple) visibles += 1;
    }

    for (const opcion of this.#opciones) {
      opcion.recuento.textContent = String(contar(sillas, opcion.id, activas));
      if (opcion === this.#base) continue;
      if (this.#extras.includes(opcion.id)) {
        opcion.enlace.setAttribute('aria-current', 'true');
      } else {
        opcion.enlace.removeAttribute('aria-current');
      }
    }

    for (const chip of consultaTodos(this, '[data-chip]', HTMLButtonElement)) {
      chip.hidden = !this.#extras.includes(leerDato(chip, 'chip'));
    }

    const sinBase = hrefSinBase(this.#extras.map((extra) => this.#porId(extra).slug));
    this.#base.enlace.href = sinBase;
    this.#base.enlace.setAttribute('aria-current', 'true');
    const chipBase = this.querySelector('[data-chip-base]');
    if (chipBase instanceof HTMLAnchorElement) chipBase.href = sinBase;

    const vacio = this.querySelector('[data-vacio]');
    if (vacio instanceof HTMLElement) vacio.hidden = visibles > 0;
    for (const contador of this.ownerDocument.querySelectorAll('[data-visibles], [data-mostrando]')) {
      contador.textContent = String(visibles);
    }
  }
}

export function registrarFiltros(): void {
  definirElemento('ts-filtros', TsFiltros);
}
```

- [ ] **Paso 4: Comprueba que pasa**

Run: `npx vitest run tests/unit/filtros.test.ts`
Expected: `Tests  13 passed (13)`

Run: `npm run test && npm run lint`
Expected: `Test Files  12 passed (12)`, `Tests  97 passed (97)` y ESLint sin errores

- [ ] **Paso 5: Checkpoint (el commit lo hace el usuario)**

```bash
git add src/scripts/filtros.ts tests/unit/filtros.test.ts
```
Mensaje propuesto: `feat(catalogo): filtro progresivo ts-filtros con estado en ?y=`

---

### Tarea 4: Cabecera del catálogo (C1)

**Files:**
- Create: `src/components/catalogo/Cabecera.astro`

- [ ] **Paso 1: Crea el componente**

`{' '}` entre el texto y el énfasis es necesario: Astro no conserva el espacio entre dos expresiones y el `<h1>` quedaría «para*oficina*». El contador lleva `data-visibles` porque `<ts-filtros>` lo actualiza.

```astro
---
import MigaDePan from '@/components/seo/MigaDePan.astro';
import type { Categoria } from '@/lib/contenido';
import type { MigaVisible } from '@/lib/migas';

interface Props {
  migas: readonly MigaVisible[];
  titulo: Categoria['data']['titulo'];
  intro: string;
  /** Sillas visibles al cargar (la faceta o todas). */
  visibles: number;
  total: number;
}

const { migas, titulo, intro, visibles, total } = Astro.props;
---

<section class="cabecera" id="cat-cabecera">
  <div class="cabecera__contenido">
    <MigaDePan migas={migas} />
    <div class="cabecera__fila">
      <div class="cabecera__texto">
        <h1 class="cabecera__titulo">
          {titulo.texto}{titulo.enfasis !== undefined && ' '}
          {titulo.enfasis !== undefined && <span class="cabecera__enfasis">{titulo.enfasis}</span>}
        </h1>
        <p class="cabecera__intro">{intro}</p>
      </div>
      <div class="cabecera__estado">
        <span class="cabecera__recuento"><span data-visibles>{visibles}</span> de {total} sillas</span>
        <span class="cabecera__separador" aria-hidden="true"></span>
        <span class="cabecera__orden">orden: recomendadas</span>
      </div>
    </div>
  </div>
</section>

<style lang="scss">
  .cabecera {
    padding: clamp(40px, 5vw, 68px) $padding-lateral clamp(32px, 4vw, 52px);
    background: color("hielo");
  }

  .cabecera__contenido {
    @include contenedor;

    display: flex;
    flex-direction: column;
    gap: 18px;
  }

  .cabecera__fila {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    justify-content: space-between;
    gap: 28px;
  }

  .cabecera__texto {
    display: flex;
    flex-direction: column;
    gap: 14px;
    max-width: 58ch;
  }

  .cabecera__titulo {
    @include h1-pantalla;
  }

  .cabecera__enfasis {
    @include enfasis-serif;
  }

  .cabecera__intro {
    @include cuerpo;
  }

  .cabecera__estado {
    display: flex;
    flex: none;
    align-items: center;
    gap: 14px;
    padding: 12px 18px;
    border: 1px solid tinta(8%);
    border-radius: radio("xs");
    background: color("blanco");
  }

  .cabecera__recuento {
    font: 400 11px / 1 fuente("mono");
    color: color("gris-medio");
  }

  .cabecera__separador {
    width: 1px;
    height: 16px;
    background: tinta(13%);
  }

  .cabecera__orden {
    font: 500 11px / 1 fuente("mono");
    color: color("tinta");
  }
</style>
```

- [ ] **Paso 2: Comprueba tipos y estilos**

Run: `npm run check && npm run lint:styles`
Expected: `- 0 errors` y stylelint sin errores

- [ ] **Paso 3: Checkpoint (el commit lo hace el usuario)**

```bash
git add src/components/catalogo/Cabecera.astro
```
Mensaje propuesto: `feat(catalogo): cabecera con miga, h1 y contador`

---

### Tarea 5: Rejilla de tarjetas

**Files:**
- Create: `src/components/catalogo/Rejilla.astro`

- [ ] **Paso 1: Crea el componente**

Cada tarjeta es un `<article id="<silla.id>">` sin enlace (no hay fichas, spec §6.1); los CTA «Ver la ficha de …» de la landing y «Ver ficha» del comparador apuntan a `/catalogo#<silla.id>` y la tarjeta se resalta con `:target`. `scroll-margin-top` evita que quede bajo el header sticky. La imagen maestra cuadrada se recorta 1:1 en build (`width`/`height` + `fit="cover"`). El `class` que se pasa a `<Picture>` llega al `<img>` con el atributo de ámbito, así que el estilo scoped funciona.

```astro
---
import { Picture } from 'astro:assets';
import { site } from '@/data/site';
import { idsCategorias, type Silla } from '@/lib/contenido';
import { formatearRango } from '@/lib/formato';

interface Props {
  sillas: readonly Silla[];
}

const { sillas } = Astro.props;
---

<div class="rejilla">
  {
    sillas.map((silla) => (
      <article class="tarjeta" id={silla.id} data-silla data-categorias={idsCategorias(silla).join(' ')}>
        <Picture
          class="tarjeta__imagen"
          src={silla.data.imagen.src}
          alt={silla.data.imagen.alt}
          formats={['avif', 'webp']}
          width={720}
          height={720}
          widths={[240, 360, 480, 720]}
          sizes="(max-width: 899px) calc(100vw - 32px), 240px"
          fit="cover"
        />
        <div class="tarjeta__cuerpo">
          <h3 class="tarjeta__nombre">{silla.data.nombre}</h3>
          <p class="tarjeta__descripcion">{silla.data.descripcion}</p>
          <span class="tarjeta__estatura">{formatearRango(silla.data.estatura, 'm', site.mercado.locale)}</span>
        </div>
      </article>
    ))
  }
</div>

<style lang="scss">
  .rejilla {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 18px;
  }

  .tarjeta {
    display: flex;
    flex-direction: column;
    min-width: 0;
    overflow: hidden;
    border: 1px solid tinta(8%);
    border-radius: radio("s");
    background: color("hielo");
    transition: transform 0.3s ease, box-shadow 0.3s ease;
    scroll-margin-top: 96px;

    &:hover {
      transform: translateY(-4px);
      box-shadow: sombra("ficha-hover");
    }

    // Destino de «Ver la ficha de …» desde la landing y el comparador (/catalogo#<slug>).
    &:target {
      outline: 2px solid color("cobalto");
      outline-offset: 3px;
      box-shadow: sombra("ficha-hover");
    }

    &[hidden] {
      display: none;
    }

    @include movimiento-reducido {
      transition: none;

      &:hover {
        transform: none;
      }
    }
  }

  .tarjeta__imagen {
    width: 100%;
    aspect-ratio: 1 / 1;
    object-fit: cover;
  }

  .tarjeta__cuerpo {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 7px;
    padding: 16px;
  }

  .tarjeta__nombre {
    margin: 0;
    font: 600 15.5px / 1.25 fuente("archivo");
    letter-spacing: -0.015em;
    color: color("tinta");
  }

  .tarjeta__descripcion {
    margin: 0;
    font: 400 12.5px / 1.55 fuente("archivo");
    color: color("gris-medio");
    text-wrap: pretty;
  }

  .tarjeta__estatura {
    margin-top: auto;
    padding-top: 12px;
    font: 400 10.5px / 1 fuente("mono");
    color: color("cobalto");
  }
</style>
```

- [ ] **Paso 2: Comprueba tipos y estilos**

Run: `npm run check && npm run lint:styles`
Expected: `- 0 errors` y stylelint sin errores

- [ ] **Paso 3: Checkpoint (el commit lo hace el usuario)**

```bash
git add src/components/catalogo/Rejilla.astro
```
Mensaje propuesto: `feat(catalogo): rejilla de tarjetas con ancla por silla`

---

### Tarea 6: Filtros + resultados (C2)

**Files:**
- Create: `src/components/catalogo/Filtros.astro`

- [ ] **Paso 1: Crea el componente**

Decisiones que el diseño no fija:

- **Opciones como enlaces.** El prototipo usa `<button>`; aquí son `<a href="/catalogo/<slug>">` con el mismo aspecto, para que las facetas sean rastreables y funcionen sin JS. La anotación de URL bajo cada grupo del prototipo es para el desarrollador y no se pinta.
- **Chips pre-renderizados.** En una faceta se pinta el chip de la base y un `<button hidden>` por cada otra categoría; `<ts-filtros>` solo alterna `hidden`. Así no se crea DOM en cliente y los estilos scoped aplican.
- **La faceta solo trae sus sillas.** Los extras solo estrechan (AND), así que el HTML de la faceta ya contiene todos los resultados posibles.
- **Recuentos en build** con `contar` sobre todas las sillas y la base activa; el script los recalcula al cambiar los extras.
- **Aside sticky a 88 px**: los 24 px del diseño más el header sticky (en el lienzo de revisión el header no era sticky).
- **Móvil (< 900 px):** una columna; el aside es un `<details>` «Filtros» (+/−) con alto táctil de 44 px, cerrado desde el HTML (sin JS ni saltos de maquetación). Chips y «limpiar filtros» quedan fuera del panel, siempre visibles.

```astro
---
import { contar, etiquetaChip, rutaCategoria } from '@/lib/catalogo';
import type { Categoria, EstadoFiltros } from '@/lib/contenido';
import Rejilla from './Rejilla.astro';

interface Props {
  /** Calculado en la página con `estadoFiltros()`. */
  estado: EstadoFiltros;
  /** Total del catálogo. */
  total: number;
  /** Categoría de la página de faceta; en /catalogo no hay. */
  base?: Categoria;
}

const { estado, total, base } = Astro.props;
const { visibles, activas, grupos, otras, datos } = estado;
---

<section class="filtros" id="cat-filtros">
  <ts-filtros class="filtros__contenido" data-total={total} data-base={base?.id}>
    <details class="filtros__panel" data-filtros-panel>
      <summary class="filtros__resumen">Filtros</summary>
      <div class="filtros__grupos">
        {
          grupos.map((grupo) => (
            <div class="filtros__grupo">
              <span class="filtros__titulo-grupo">{grupo.titulo}</span>
              {grupo.opciones.map((categoria) => (
                <a
                  class="filtros__opcion"
                  href={categoria.id === base?.id ? '/catalogo' : rutaCategoria(categoria.data.slug)}
                  aria-current={categoria.id === base?.id ? 'true' : undefined}
                  data-opcion={categoria.id}
                  data-slug={categoria.data.slug}
                >
                  <span class="filtros__casilla" aria-hidden="true" />
                  <span class="filtros__etiqueta">{categoria.data.etiqueta}</span>
                  <span class="filtros__recuento" data-recuento>
                    {contar(datos, categoria.id, activas)}
                  </span>
                </a>
              ))}
            </div>
          ))
        }
      </div>
    </details>

    <div class="filtros__resultados">
      <div class="filtros__chips">
        {
          base === undefined ? (
            <span class="filtros__sin-filtros">sin filtros · las {total} sillas</span>
          ) : (
            <>
              <a class="filtros__chip" href="/catalogo" data-chip-base aria-label={`Quitar filtro: ${base.data.etiqueta}`}>
                {etiquetaChip(base.data.etiqueta)}
              </a>
              {otras.map((categoria) => (
                <button class="filtros__chip" type="button" data-chip={categoria.id} aria-label={`Quitar filtro: ${categoria.data.etiqueta}`} hidden>
                  {etiquetaChip(categoria.data.etiqueta)}
                </button>
              ))}
              <a class="filtros__limpiar" href="/catalogo">
                limpiar filtros
              </a>
            </>
          )
        }
      </div>
      <Rejilla sillas={visibles} />
      <p class="filtros__vacio" data-vacio hidden>Ninguna silla cumple todos estos filtros</p>
      <div class="filtros__pie">
        <span class="filtros__mostrando" aria-live="polite">Mostrando <span data-mostrando>{visibles.length}</span> de {total}</span>
        <a class="filtros__ver-todas" href="/catalogo">Ver las {total} sillas</a>
      </div>
    </div>
  </ts-filtros>
</section>

<script>
  import { registrarFiltros } from '@/scripts/filtros';

  registrarFiltros();
</script>

<style lang="scss">
  .filtros {
    @include seccion-compacta;

    background: color("blanco");
  }

  .filtros__contenido {
    @include contenedor;

    display: grid;
    grid-template-columns: minmax(0, 250px) minmax(0, 1fr);
    align-items: start;
    gap: 34px;
  }

  .filtros__panel {
    position: sticky;

    // Header sticky (~64 px) + los 24 px del diseño.
    top: 88px;
    min-width: 0;
  }

  // El <details> llega cerrado (así lo quiere el móvil) y en escritorio su contenido se
  // muestra con ::details-content: sin JS ni saltos de maquetación. Sin soporte del
  // pseudo-elemento, el escritorio queda como el móvil: un «Filtros» que se abre.
  .filtros__resumen {
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: 44px;
    padding: 0 16px;
    font: 600 13px / 1 fuente("archivo");
    color: color("tinta");
    list-style: none;
    cursor: pointer;

    &::after {
      content: "+";
      font: 300 22px / 1 fuente("newsreader");
      color: color("cobalto");
    }
  }

  .filtros__panel[open] .filtros__resumen::after {
    content: "−";
  }

  @supports selector(::details-content) {
    @media (width >= 900px) {
      .filtros__resumen {
        display: none;
      }

      .filtros__panel::details-content {
        content-visibility: visible;
      }
    }
  }

  .filtros__grupos {
    display: flex;
    flex-direction: column;
    gap: 26px;
  }

  .filtros__grupo {
    display: flex;
    flex-direction: column;
    gap: 11px;
  }

  .filtros__titulo-grupo {
    @include etiqueta-mono(9.5px);

    color: color("cobalto");
  }

  .filtros__opcion {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 9px 12px;
    border: 1px solid tinta(12%);
    border-radius: radio("mini");
    background: transparent;
    transition: border-color 0.2s ease, background 0.2s ease;

    &:hover {
      border-color: color("cobalto");
    }

    &[aria-current] {
      border-color: color("cobalto");
      background: color("hielo");
    }
  }

  .filtros__casilla {
    flex: none;
    width: 14px;
    height: 14px;
    border: 1.5px solid tinta(28%);
    border-radius: radio("casilla");
    transition: background 0.2s ease, border-color 0.2s ease;

    .filtros__opcion[aria-current] & {
      border-color: color("cobalto");
      background: color("cobalto");
    }
  }

  .filtros__etiqueta {
    font: 500 13px / 1.3 fuente("archivo");
    color: color("tinta");
  }

  .filtros__recuento {
    margin-left: auto;
    font: 400 10.5px / 1 fuente("mono");
    color: color("gris-medio");
  }

  .filtros__resultados {
    display: flex;
    flex-direction: column;
    gap: 20px;
    min-width: 0;
  }

  .filtros__chips {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    min-height: 30px;
  }

  .filtros__chip {
    padding: 7px 13px;
    border: 0;
    border-radius: radio("pill");
    background: color("tinta");
    color: color("hielo");
    font: 500 11px / 1 fuente("mono");
    cursor: pointer;

    &:hover {
      background: color("cobalto");
      color: color("hielo");
    }

    &[hidden] {
      display: none;
    }
  }

  .filtros__limpiar {
    padding: 7px 13px;
    border: 1px solid tinta(13%);
    border-radius: radio("pill");
    background: transparent;
    color: color("gris-medio");
    font: 500 11px / 1 fuente("mono");

    &:hover {
      border-color: color("cobalto");
      color: color("cobalto");
    }
  }

  .filtros__sin-filtros {
    font: 400 11px / 1 fuente("mono");
    color: color("gris-claro");
  }

  .filtros__vacio {
    margin: 0;
    padding: 24px 0;
    font: 400 11px / 1.6 fuente("mono");
    color: color("gris-claro");
    text-align: center;

    &[hidden] {
      display: none;
    }
  }

  .filtros__pie {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 14px;
    padding-top: 6px;
  }

  .filtros__mostrando {
    font: 400 11px / 1 fuente("mono");
    color: color("gris-medio");
  }

  .filtros__ver-todas {
    padding: 12px 20px;
    border: 1px solid tinta(13%);
    border-radius: radio("pill");
    background: transparent;
    color: color("tinta");
    font: 600 12.5px / 1 fuente("archivo");

    &:hover {
      border-color: color("cobalto");
      color: color("cobalto");
    }
  }

  @include movil {
    .filtros__contenido {
      grid-template-columns: minmax(0, 1fr);
      gap: 20px;
    }

    .filtros__panel {
      position: static;
      border: 1px solid tinta(12%);
      border-radius: radio("xs");
    }

    .filtros__grupos {
      padding: 4px 16px 18px;
    }
  }
</style>
```

- [ ] **Paso 2: Comprueba tipos, lint y estilos**

Run: `npm run check && npm run lint && npm run lint:styles`
Expected: `- 0 errors` y sin errores de ESLint ni stylelint

- [ ] **Paso 3: Checkpoint (el commit lo hace el usuario)**

```bash
git add src/components/catalogo/Filtros.astro
```
Mensaje propuesto: `feat(catalogo): aside de filtros indexable, chips y rejilla`

---

### Tarea 7: Guía de categoría (C3)

**Files:**
- Create: `src/components/catalogo/Guia.astro`

- [ ] **Paso 1: Crea el componente**

`id="cat-guia"` es el destino de «Guías», «Cómo elegir tu silla» y «Medidas y estatura» (spec §6.1). El `<h2>` usa `clamp(26px, 3.4vw, 40px)`, distinto del mixin `h2` (28–42 px): así está en el diseño. La columna derecha solo se pinta si hay apartados.

```astro
---
import FranjaOscura from '@/components/ui/FranjaOscura.astro';
import type { Categoria } from '@/lib/contenido';

interface Props {
  guia: Categoria['data']['guia'];
  /** Texto de la franja hacia el comparador (`franjaComparador()`). */
  franja: string;
}

const { guia, franja } = Astro.props;
const { titulo, parrafos, apartados } = guia;
---

<section class="guia" id="cat-guia">
  <div class="guia__contenido">
    <h2 class="guia__titulo">{titulo}</h2>
    <div class="guia__columnas">
      <div class="guia__columna">
        {parrafos.map((parrafo) => <p class="guia__parrafo">{parrafo}</p>)}
      </div>
      {
        apartados.length > 0 && (
          <div class="guia__columna">
            {apartados.map((apartado) => (
              <>
                <h3 class="guia__subtitulo">{apartado.titulo}</h3>
                <p class="guia__parrafo">{apartado.texto}</p>
              </>
            ))}
          </div>
        )
      }
    </div>
    <FranjaOscura texto={franja} enlace={{ texto: 'Abrir el comparador', href: '/comparar' }} />
  </div>
</section>

<style lang="scss">
  .guia {
    @include seccion-compacta;

    background: color("hielo");
  }

  .guia__contenido {
    @include contenedor("texto");

    display: flex;
    flex-direction: column;
    gap: 26px;
  }

  .guia__titulo {
    max-width: 24ch;
    margin: 0;
    font: 700 clamp(26px, 3.4vw, 40px) / 1.06 fuente("archivo");
    letter-spacing: -0.035em;
    text-wrap: balance;
  }

  .guia__columnas {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 28px;
  }

  .guia__columna {
    display: flex;
    flex-direction: column;
    gap: 14px;
    min-width: 0;
  }

  .guia__parrafo {
    @include cuerpo(14.5px, 1.75);
  }

  .guia__subtitulo {
    margin: 0;
    font: 600 17px / 1.3 fuente("archivo");
    letter-spacing: -0.02em;
    color: color("tinta");
  }
</style>
```

- [ ] **Paso 2: Comprueba tipos y estilos**

Run: `npm run check && npm run lint:styles`
Expected: `- 0 errors` y stylelint sin errores

- [ ] **Paso 3: Checkpoint (el commit lo hace el usuario)**

```bash
git add src/components/catalogo/Guia.astro
```
Mensaje propuesto: `feat(catalogo): guía de categoría con salida al comparador`

---

### Tarea 8: Página `/catalogo`

**Files:**
- Create: `src/pages/catalogo/index.astro`

- [ ] **Paso 1: Crea la página**

Textos del diseño (C1 y C3) al pie de la letra, salvo el total: «Doce modelos…» se deriva con `numeroEnLetras(sillas.length)`. La intro sirve también de meta description.

```astro
---
import Cabecera from '@/components/catalogo/Cabecera.astro';
import Filtros from '@/components/catalogo/Filtros.astro';
import Guia from '@/components/catalogo/Guia.astro';
import { site } from '@/data/site';
import BaseLayout from '@/layouts/BaseLayout.astro';
import { estadoFiltros, franjaComparador, introCatalogo, obtenerContenido } from '@/lib/contenido';
import { migasParaJsonLd, type MigaVisible } from '@/lib/migas';
import { migaDePan } from '@/lib/schema';

const ruta = '/catalogo';
const contenido = await obtenerContenido();
const total = contenido.sillas.length;

// «Sillas» es esta misma página: va sin enlace (y en el JSON-LD se une con el último tramo).
const migas: MigaVisible[] = [{ nombre: 'Inicio', href: '/sillas-ergonomicas' }, { nombre: 'Sillas' }, { nombre: 'Ergonómicas home office' }];
const intro = introCatalogo(contenido);
---

<BaseLayout
  titulo="Sillas ergonómicas para oficina en casa"
  descripcion={intro}
  ruta={ruta}
  jsonLd={[migaDePan(migasParaJsonLd(migas, site.url, ruta))]}
>
  <Cabecera
    migas={migas}
    titulo={{ texto: 'Sillas ergonómicas para', enfasis: 'oficina en casa' }}
    intro={intro}
    visibles={total}
    total={total}
  />
  <Filtros estado={estadoFiltros(contenido, undefined)} total={total} />
  <Guia
    franja={franjaComparador(contenido)}
    guia={{
      titulo: 'Cómo elegir una silla ergonómica para trabajar en casa',
      parrafos: [
        'La diferencia entre una silla que sirve y una que estorba casi nunca está en el precio: está en si sus rangos de ajuste cubren tu cuerpo y tu escritorio. Antes de mirar modelos, mide la altura de tu mesa y anota cuántas horas seguidas te sientas.',
        'Con esos dos datos, el asiento debe permitir que las rodillas queden a 90° con los pies planos, y los reposabrazos deben subir hasta dejar el antebrazo paralelo a la mesa. Si un modelo no llega a esas dos medidas, ninguna otra característica lo compensa.',
      ],
      apartados: [
        {
          titulo: 'Malla o tapizada',
          texto:
            'La malla ventila y sostiene sin acumular calor: es la opción para climas cálidos y jornadas de más de seis horas. El tapizado da una sensación más mullida y aísla en frío, pero guarda temperatura.',
        },
        {
          titulo: 'Estatura',
          texto:
            'Arriba de 1.85 m el respaldo debe cubrir hasta los hombros y el pistón llegar a 52 cm. Debajo de 1.60 m importa más la profundidad del asiento que la altura del respaldo.',
        },
      ],
    }}
  />
</BaseLayout>
```

- [ ] **Paso 2: Construye**

Run: `npm run build`
Expected: termina con `[build] Complete!` y existe `dist/catalogo.html`

- [ ] **Paso 3: Comprueba el HTML**

Run: `grep -o '<link rel="canonical"[^>]*>' dist/catalogo.html && grep -o '<article' dist/catalogo.html | wc -l && grep -o '"@type":"BreadcrumbList"' dist/catalogo.html`
Expected (con los datos de ejemplo):
```text
<link rel="canonical" href="https://tessera.example/catalogo">
12
"@type":"BreadcrumbList"
```

- [ ] **Paso 4: Checkpoint (el commit lo hace el usuario)**

```bash
git add src/pages/catalogo/index.astro
```
Mensaje propuesto: `feat(catalogo): página /catalogo`

---

### Tarea 9: Páginas por categoría `/catalogo/[faceta]`

**Files:**
- Create: `src/pages/catalogo/[faceta].astro`

- [ ] **Paso 1: Crea la ruta dinámica**

`getStaticPaths` se declara como función con tipo de retorno explícito (regla `explicit-function-return-type`). No uses `satisfies GetStaticPaths`: `interface Props` no tiene firma de índice y `astro check` lo rechaza.

```astro
---
import Cabecera from '@/components/catalogo/Cabecera.astro';
import Filtros from '@/components/catalogo/Filtros.astro';
import Guia from '@/components/catalogo/Guia.astro';
import { site } from '@/data/site';
import BaseLayout from '@/layouts/BaseLayout.astro';
import { rutaCategoria } from '@/lib/catalogo';
import { estadoFiltros, franjaComparador, obtenerContenido, type Categoria } from '@/lib/contenido';
import { migasParaJsonLd, type MigaVisible } from '@/lib/migas';
import { migaDePan } from '@/lib/schema';

interface Props {
  categoria: Categoria;
}

export async function getStaticPaths(): Promise<{ params: { faceta: string }; props: Props }[]> {
  const { categorias } = await obtenerContenido();
  return categorias.map((categoria) => ({ params: { faceta: categoria.data.slug }, props: { categoria } }));
}

const { categoria } = Astro.props;
const contenido = await obtenerContenido();
const ruta = rutaCategoria(categoria.data.slug);
const estado = estadoFiltros(contenido, categoria);
const total = contenido.sillas.length;

const migas: MigaVisible[] = [
  { nombre: 'Inicio', href: '/sillas-ergonomicas' },
  { nombre: 'Sillas', href: '/catalogo' },
  { nombre: categoria.data.etiquetaLarga },
];
---

<BaseLayout
  titulo={categoria.data.seo.titulo}
  descripcion={categoria.data.seo.descripcion}
  ruta={ruta}
  jsonLd={[migaDePan(migasParaJsonLd(migas, site.url, ruta))]}
>
  <Cabecera migas={migas} titulo={categoria.data.titulo} intro={categoria.data.intro} visibles={estado.visibles.length} total={total} />
  <Filtros estado={estado} total={total} base={categoria} />
  <Guia guia={categoria.data.guia} franja={franjaComparador(contenido)} />
</BaseLayout>
```

- [ ] **Paso 2: Construye**

Run: `npm run build && ls dist/catalogo`
Expected:
```text
altos.html
compactas.html
lumbar.html
malla.html
tapizada.html
uso-intensivo.html
```

- [ ] **Paso 3: Comprueba una faceta**

Run: `grep -o '<link rel="canonical"[^>]*>' dist/catalogo/altos.html && grep -o '<article' dist/catalogo/altos.html | wc -l && grep -o '<ts-filtros[^>]*>' dist/catalogo/altos.html`
Expected:
```text
<link rel="canonical" href="https://tessera.example/catalogo/altos">
4
<ts-filtros class="filtros__contenido" data-total="12" data-base="alta" data-astro-cid-…="true">
```
(el sufijo de `data-astro-cid-` cambia)

- [ ] **Paso 4: Checkpoint (el commit lo hace el usuario)**

```bash
git add 'src/pages/catalogo/[faceta].astro'
```
Mensaje propuesto: `feat(catalogo): una página indexable por categoría`

---

### Tarea 10: Verificación de la fase

**Files:** ninguno.

- [ ] **Paso 1: Verificación completa**

Run: `npm run verify && npm run build`
Expected: `- 0 errors`, ESLint y stylelint sin errores, `Test Files  12 passed (12)`, `Tests  97 passed (97)`, `[build] Complete!`

- [ ] **Paso 2: Prueba manual en el navegador**

Run: `npm run preview` y abre la URL que imprime.

| Acción | Resultado esperado |
|---|---|
| Abrir `/catalogo/malla` | 8 tarjetas; «Malla» con casilla azul; chip «malla ×» y «limpiar filtros»; «Mostrando 8 de 12» |
| Pulsar «1.85 m o más» | No navega; quedan 4 tarjetas; la URL pasa a `/catalogo/malla?y=altos`; aparece el chip «1.85 m o más ×»; la cabecera dice «4 de 12 sillas» |
| Pulsar además «Soporte lumbar» | 0 tarjetas y la nota «Ninguna silla cumple todos estos filtros» |
| Pulsar el chip «soporte lumbar ×» | Vuelven las 4 tarjetas; la URL queda en `?y=altos` |
| Pasar el ratón por el chip «malla ×» | Su destino es `/catalogo/altos` (quitar la base conserva el extra) |
| Recargar `/catalogo/malla?y=altos` | Carga ya con 4 tarjetas |
| Abrir `/catalogo#duna` | La tarjeta de la Duna queda resaltada con borde azul y visible bajo el header |
| En `/catalogo`, pulsar «Soporte lumbar» | Navega a `/catalogo/lumbar` |
| DevTools → desactivar JavaScript → `/catalogo/malla` | El aside se ve abierto y sus opciones navegan a su faceta |
| Vista móvil (375 px) → `/catalogo/malla` | Panel «Filtros +» cerrado; chips visibles; una columna de tarjetas |
| Consola del navegador | Sin errores |

- [ ] **Paso 3: Checkpoint (el commit lo hace el usuario)**

Nada que añadir si las tareas anteriores ya quedaron preparadas. Mensaje propuesto para el hito, si se agrupan los commits: `feat(catalogo): fase 4 completa — /catalogo y facetas indexables`

## Pendiente conocido (no bloquea)

- La intro de `/catalogo` dice «garantía de cinco años» y la franja «las tres de malla»: son textos del diseño aprobado, no se derivan de los datos. Si el catálogo real cambia la garantía o el comparador deja de ser de malla, hay que revisar esos textos (spec §12 #2).
- Con la base activa, una opción de otro grupo puede mostrar recuento 0 (p. ej. «Tapizada» en `/catalogo/malla`); pulsarla lleva al estado vacío. Es el comportamiento AND del diseño.
