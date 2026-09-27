# Tessera — Fase 5: Comparador `/comparar`

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Página `/comparar` del diseño aprobado (bloques X1 y X2): tabla comparativa real de las tres sillas de `destacados.comparador`, con el switch «Solo lo que cambia», y el bloque «¿Cuál te conviene?» con su cierre de conversión por WhatsApp.

**Architecture:** La página obtiene el contenido con `obtenerContenido()` y deriva las filas con `derivarFilas(…, definirFilas(locale, entregaHoras))` de `src/lib/comparador.ts` (una sola fuente: ningún valor se escribe a mano y la marca «igual» se calcula). La tabla es un `<table>` real con `th scope`; el switch es el custom element `<ts-comparador>` (TDD con happy-dom) que oculta las filas marcadas con `data-fila-igual`. Sin JS la tabla se ve completa y el switch queda oculto.

**Tech Stack:** Astro 7 · TypeScript 6 strictest · SCSS · Vitest 5 + happy-dom.

**Requisitos previos:** fases 1 y 2 terminadas (`npm run verify` y `npm run build` en verde). Índice y convenciones: `docs/superpowers/plans/2026-09-26-tessera-00-indice.md`. Spec: §5.3, §6.1, §8, §8.1, §9, §15.2.

**Fuente visual:** `Tessera Landing SEO.dc.html`, «Pantalla 3 · comparador /comparar» (bloques X1 y X2). Los estilos de esta fase salen de ahí; el andamiaje de revisión (rótulos X1/X2, bordes de tarjeta, flechas) no se implementa.

---

## Mapa de archivos de la fase

| Archivo | Acción | Responsabilidad |
|---|---|---|
| `src/styles/_mixins.scss` | Modificar | Corrige `cuerpo()` y `etiqueta-mono()`: Sass dividía `tamaño / interlineado` |
| `tests/unit/estilos.test.ts` | Modificar | Test que fija la barra de `font` |
| `src/scripts/comparador.ts` | Crear | `<ts-comparador>`: switch «Solo lo que cambia» |
| `tests/unit/script-comparador.test.ts` | Crear | Tests del switch (happy-dom) |
| `src/components/comparador/TablaComparativa.astro` | Crear | Bloque X1: cabecera, switch, `<table>`, nota al pie; móvil con columna fija |
| `src/components/comparador/Veredictos.astro` | Crear | Bloque X2: tarjetas de veredicto + `BloqueConversion` |
| `src/pages/comparar.astro` | Crear | Página: datos + SEO |

## Ganchos estables para los e2e (fase 6)

| Selector | Qué es |
|---|---|
| `#cmp-tabla`, `#cmp-veredicto` | Secciones X1 y X2 |
| `[data-comparador-switch]` | El switch (`role="switch"`, `aria-checked`); `hidden` hasta que carga el JS |
| `tr[data-fila="<Etiqueta>"]` | Cada fila de la tabla (etiqueta tal cual: «Respaldo», «Garantía»…) |
| `tr[data-fila-igual]` | Filas sin diferencias (las que oculta el switch) |
| `th[data-columna-silla="<id>"]` | Cabecera de columna de cada silla (`id` = nombre del archivo en `src/content/sillas/`) |
| `a[data-ver-ficha="<id>"]` | «Ver ficha» → `/catalogo#<id>` (la fase 4 debe dar `id="<id>"` a cada tarjeta del catálogo) |
| `[data-veredicto="<id>"]` | Tarjeta de veredicto (`id` de `veredictos.json`) |
| `a[data-whatsapp="comparador"]` | CTA de WhatsApp del cierre (de `CtaWhatsApp.astro`) |
| `.tabla__marco` | Contenedor con scroll horizontal en móvil |

---

### Task 1: Corregir la barra de `font` en `cuerpo()` y `etiqueta-mono()`

Con variables, `font: 400 $tamano / $alto …` es una **división** de Sass: `cuerpo(13.5px)` emite `font: 400 8.18px …` y `etiqueta-mono()` pierde el interlineado. Afecta a todo párrafo que use `cuerpo()` (intros de `EncabezadoSeccion`, razones de los veredictos…). Se corrige con `list.slash()`.

> Si la fase 1 ya se ejecutó con esta corrección incluida (el test «cuerpo() y etiqueta-mono() conservan tamaño / interlineado sin dividir» ya existe en `tests/unit/estilos.test.ts`), salta esta tarea.

**Files:**
- Modify: `src/styles/_mixins.scss` (línea 1 y mixins `etiqueta-mono` y `cuerpo`)
- Modify: `tests/unit/estilos.test.ts` (nuevo `it` antes de «los parciales inyectados no emiten CSS»)

- [ ] **Step 1: Escribir el test que falla**

En `tests/unit/estilos.test.ts`, dentro de `describe('funciones SCSS', …)`, añade este caso justo antes de `it('los parciales inyectados no emiten CSS', …)`:

```ts
  it('cuerpo() y etiqueta-mono() conservan tamaño / interlineado sin dividir', () => {
    const { css } = compileString('@use "index" as *; .a { @include cuerpo(13.5px); } .b { @include etiqueta-mono(9.5px); }', cargar);
    expect(css).toContain('font: 400 13.5px / 1.65 var(--fuente-archivo)');
    expect(css).toContain('font: 500 9.5px / 1 var(--fuente-mono)');
  });
```

- [ ] **Step 2: Ejecutarlo y ver que falla**

Run: `npx vitest run tests/unit/estilos.test.ts`
Expected: FAIL con `AssertionError: expected '.a {\n  margin: 0;\n  font: 400 8.181…' to contain 'font: 400 13.5px / 1.65 var(--fuente-ar…'`

- [ ] **Step 3: Corregir los mixins**

Aplica este cambio a `src/styles/_mixins.scss`:

```diff
--- a/src/styles/_mixins.scss
+++ b/src/styles/_mixins.scss
@@ -1,3 +1,4 @@
+@use "sass:list";
 @use "tokens";
 @use "funciones" as *;
 
@@ -35,14 +36,15 @@
 }
 
 @mixin etiqueta-mono($tamano: 10px) {
-  font: 500 $tamano / 1 fuente("mono");
+  font: 500 list.slash($tamano, 1) fuente("mono");
   letter-spacing: 0.1em;
   text-transform: uppercase;
 }
 
+// list.slash: con variables, `$a / $b` sería una división de Sass y no la barra de `font`.
 @mixin cuerpo($tamano: 15px, $alto: 1.65) {
   margin: 0;
-  font: 400 $tamano / $alto fuente("archivo");
+  font: 400 list.slash($tamano, $alto) fuente("archivo");
   color: color("gris-texto");
   text-wrap: pretty;
 }
```

- [ ] **Step 4: Ejecutar tests y lint de estilos**

Run: `npx vitest run tests/unit/estilos.test.ts && npx stylelint "src/**/*.{scss,astro}"`
Expected: `Tests  5 passed (5)` y stylelint sin salida de errores.

- [ ] **Step 5: Checkpoint (el commit lo hace el usuario)**

```bash
git add src/styles/_mixins.scss tests/unit/estilos.test.ts
```

Mensaje propuesto: `fix(estilos): usar list.slash en cuerpo() y etiqueta-mono() para no dividir tamaño e interlineado`

---

### Task 2: Switch `<ts-comparador>` (TDD)

**Files:**
- Create: `tests/unit/script-comparador.test.ts`
- Create: `src/scripts/comparador.ts`

- [ ] **Step 1: Escribir el test que falla**

```ts
// @vitest-environment happy-dom
import { beforeAll, describe, expect, it } from 'vitest';
import { consulta, consultaTodos } from '@/lib/dom';
import { registrarComparador } from '@/scripts/comparador';
import { montar } from './ayudas/montar';

const HTML = `
  <ts-comparador>
    <button type="button" role="switch" aria-checked="false" data-comparador-switch hidden>Solo lo que cambia</button>
    <table>
      <tbody>
        <tr data-fila="Respaldo"><th scope="row">Respaldo</th><td>Malla media</td></tr>
        <tr data-fila="Garantía" data-fila-igual><th scope="row">Garantía</th><td>5 años</td></tr>
        <tr data-fila="Entrega armada" data-fila-igual><th scope="row">Entrega armada</th><td>Sí, 48 h</td></tr>
      </tbody>
    </table>
  </ts-comparador>`;

function interruptor(): HTMLButtonElement {
  return consulta(document, '[data-comparador-switch]', HTMLButtonElement);
}

function filasOcultas(): string[] {
  return consultaTodos(document, '[data-fila]', HTMLTableRowElement)
    .filter((fila) => fila.hidden)
    .map((fila) => fila.dataset.fila ?? '');
}

describe('ts-comparador', () => {
  beforeAll(() => {
    registrarComparador();
  });

  it('al conectarse muestra el switch apagado y todas las filas', () => {
    montar(HTML);
    expect(interruptor().hidden).toBe(false);
    expect(interruptor().getAttribute('aria-checked')).toBe('false');
    expect(filasOcultas()).toEqual([]);
  });

  it('al activarlo oculta solo las filas iguales', () => {
    montar(HTML);
    interruptor().click();
    expect(interruptor().getAttribute('aria-checked')).toBe('true');
    expect(filasOcultas()).toEqual(['Garantía', 'Entrega armada']);
  });

  it('al desactivarlo vuelve a mostrar todas', () => {
    montar(HTML);
    interruptor().click();
    interruptor().click();
    expect(interruptor().getAttribute('aria-checked')).toBe('false');
    expect(filasOcultas()).toEqual([]);
  });
});
```

- [ ] **Step 2: Ejecutarlo y ver que falla**

Run: `npx vitest run tests/unit/script-comparador.test.ts`
Expected: FAIL con `Error: Failed to resolve import "@/scripts/comparador" from "tests/unit/script-comparador.test.ts". Does the file exist?`

- [ ] **Step 3: Implementar el custom element**

```ts
import { consulta, consultaTodos, definirElemento } from '@/lib/dom';

/**
 * Switch «Solo lo que cambia» del comparador. Sin JS el switch no sirve, así que el HTML
 * lo trae oculto y este elemento lo muestra al conectarse.
 */
export class TsComparador extends HTMLElement {
  #interruptor: HTMLButtonElement | null = null;

  connectedCallback(): void {
    const interruptor = consulta(this, '[data-comparador-switch]', HTMLButtonElement);
    this.#interruptor = interruptor;
    interruptor.hidden = false;
    this.#aplicar(interruptor.getAttribute('aria-checked') === 'true');
    interruptor.addEventListener('click', this.#alternar);
  }

  disconnectedCallback(): void {
    this.#interruptor?.removeEventListener('click', this.#alternar);
  }

  #alternar = (): void => {
    this.#aplicar(this.#interruptor?.getAttribute('aria-checked') !== 'true');
  };

  #aplicar(soloDiferencias: boolean): void {
    this.#interruptor?.setAttribute('aria-checked', String(soloDiferencias));
    for (const fila of consultaTodos(this, '[data-fila-igual]', HTMLTableRowElement)) {
      fila.hidden = soloDiferencias;
    }
  }
}

export function registrarComparador(): void {
  definirElemento('ts-comparador', TsComparador);
}
```

- [ ] **Step 4: Ejecutar el test y ver que pasa**

Run: `npx vitest run tests/unit/script-comparador.test.ts`
Expected: `Tests  3 passed (3)`

- [ ] **Step 5: Lint del script**

Run: `npx eslint src/scripts/comparador.ts tests/unit/script-comparador.test.ts`
Expected: sin salida (0 problemas).

- [ ] **Step 6: Checkpoint (el commit lo hace el usuario)**

```bash
git add src/scripts/comparador.ts tests/unit/script-comparador.test.ts
```

Mensaje propuesto: `feat(comparador): switch «Solo lo que cambia» como custom element`

---

### Task 3: Bloque X1 — `TablaComparativa.astro`

Notas de implementación (ya resueltas en el código):
- `<table>` real con `<caption>` solo para lectores de pantalla, `<th scope="col">` por silla y `<th scope="row">` por fila. La esquina superior izquierda es un `<td>` vacío.
- La columna central (índice `Math.floor(n / 2)`) es la recomendada: su cabecera lleva fondo hielo, como en el diseño.
- «Ver ficha» apunta a `/catalogo#<id>` (spec §6.1) y añade «de {nombre}» solo para lectores, para que los tres enlaces no sean idénticos.
- El h1 de X1 es más pequeño que el h1 de la landing (`clamp(28px, 3.8vw, 44px) / 1.05`, `letter-spacing: -0.04em`), por eso la cabecera se compone aquí y no con `EncabezadoSeccion`.
- Móvil (< 900 px, spec §8.1): la tabla mantiene `min-width: 640px` y hace scroll dentro de `.tabla__marco`; la columna de etiquetas es `position: sticky; left: 0`. `.tabla__marco` lleva `position: relative` para que los textos `solo-lectores` (absolutos) no se escapen del scroll y ensanchen la página.
- `<Picture>` pasa `class` y el atributo de scope al `<img>`, así que `.tabla__imagen` aplica sobre la imagen.

**Files:**
- Create: `src/components/comparador/TablaComparativa.astro`

- [ ] **Step 1: Crear el componente**

```astro
---
import { Picture } from 'astro:assets';
import type { FilaComparador } from '@/lib/comparador';
import type { Silla } from '@/lib/contenido';

interface Props {
  sillas: readonly [Silla, Silla, Silla];
  filas: readonly FilaComparador[];
}

const { sillas, filas } = Astro.props;
// La columna central es la recomendada (diseño: fondo hielo en su cabecera).
const destacada = Math.floor(sillas.length / 2);
const nombres = sillas.map((silla) => silla.data.nombre).join(', ');
---

<section id="cmp-tabla" class="comparador">
  <ts-comparador class="comparador__contenido">
    <div class="comparador__cabecera">
      <div class="comparador__titulos">
        <span class="comparador__etiqueta">Comparador</span>
        <h1 class="comparador__titulo">Compara las sillas ergonómicas Tessera</h1>
      </div>
      <button class="interruptor" type="button" role="switch" aria-checked="false" data-comparador-switch hidden>
        <span class="interruptor__pista" aria-hidden="true"><span class="interruptor__perilla"></span></span>
        Solo lo que cambia
      </button>
    </div>

    <div class="tabla__marco">
      <table class="tabla">
        <caption class="tabla__leyenda">Comparación de {nombres}</caption>
        <colgroup>
          <col class="tabla__col-etiqueta" />
          {sillas.map(() => <col />)}
        </colgroup>
        <thead>
          <tr>
            <td class="tabla__esquina"></td>
            {
              sillas.map((silla, i) => (
                <th
                  scope="col"
                  class:list={['tabla__silla', { 'tabla__silla--destacada': i === destacada }]}
                  data-columna-silla={silla.id}
                >
                  <Picture
                    class="tabla__imagen"
                    src={silla.data.imagen.src}
                    alt={silla.data.imagen.alt}
                    formats={['avif', 'webp']}
                    width={150}
                    height={150}
                    densities={[1, 2]}
                    fit="cover"
                  />
                  <span class="tabla__nombre">{silla.data.nombre}</span>
                  <span class="tabla__resumen">{silla.data.resumen}</span>
                  <a class="tabla__ficha" href={`/catalogo#${silla.id}`} data-ver-ficha={silla.id}>
                    Ver ficha<span class="tabla__solo-lectores"> de {silla.data.nombre}</span>
                  </a>
                </th>
              ))
            }
          </tr>
        </thead>
        <tbody>
          {
            filas.map((fila) => (
              <tr
                class:list={['tabla__fila', { 'tabla__fila--igual': !fila.diferencia }]}
                data-fila={fila.etiqueta}
                data-fila-igual={fila.diferencia ? undefined : ''}
              >
                <th scope="row" class="tabla__etiqueta">
                  {fila.etiqueta}
                  {!fila.diferencia && <span class="tabla__igual">igual</span>}
                </th>
                {fila.valores.map((valor) => (
                  <td class="tabla__valor">{valor}</td>
                ))}
              </tr>
            ))
          }
        </tbody>
      </table>
    </div>

    <p class="comparador__nota">Cada columna enlaza a su ficha. Los rangos son los de fábrica, sin calibrar.</p>
  </ts-comparador>
</section>

<script>
  import { registrarComparador } from '@/scripts/comparador';

  registrarComparador();
</script>

<style lang="scss">
  .comparador {
    @include seccion-compacta;

    background: color("blanco");
  }

  .comparador__contenido {
    @include contenedor;

    display: flex;
    flex-direction: column;
    gap: 30px;
  }

  .comparador__cabecera {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    justify-content: space-between;
    gap: 24px;
  }

  .comparador__titulos {
    display: flex;
    flex-direction: column;
    gap: 12px;
    max-width: 44ch;
  }

  .comparador__etiqueta {
    @include etiqueta-mono;

    color: color("cobalto");
  }

  .comparador__titulo {
    margin: 0;
    font: 700 clamp(28px, 3.8vw, 44px) / 1.05 fuente("archivo");
    letter-spacing: -0.04em;
    text-wrap: balance;
  }

  .interruptor {
    display: flex;
    flex: none;
    align-items: center;
    gap: 10px;
    padding: 11px 18px;
    border: 1px solid tinta(16%);
    border-radius: radio("pill");
    background: transparent;
    color: color("tinta");
    font: 600 12.5px / 1 fuente("archivo");
    cursor: pointer;
    transition: background 0.25s ease, color 0.25s ease;

    &[hidden] {
      display: none;
    }

    &[aria-checked="true"] {
      border-color: color("tinta");
      background: color("tinta");
      color: color("hielo");
    }
  }

  .interruptor__pista {
    position: relative;
    display: inline-block;
    width: 26px;
    height: 14px;
    border-radius: radio("pill");
    background: tinta(24%);

    .interruptor[aria-checked="true"] & {
      background: color("cobalto");
    }
  }

  .interruptor__perilla {
    position: absolute;
    top: 2px;
    left: 2px;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: color("blanco");
    transition: left 0.25s ease;

    .interruptor[aria-checked="true"] & {
      left: 14px;
    }
  }

  // position: relative contiene los textos solo-lectores (absolutos) dentro del scroll;
  // sin él se escapan y ensanchan la página en móvil.
  .tabla__marco {
    position: relative;
    overflow-x: auto;
    border: 1px solid tinta(8%);
    border-radius: radio("m");
  }

  .tabla {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    table-layout: fixed;
  }

  .tabla__leyenda {
    @include solo-lectores;
  }

  .tabla__solo-lectores {
    @include solo-lectores;
  }

  .tabla__col-etiqueta {
    width: 190px;
  }

  .tabla__esquina {
    background: color("hielo");
  }

  .tabla__silla {
    padding: 22px 16px;
    border-left: 1px solid tinta(8%);
    background: color("blanco");
    font-weight: inherit;
    text-align: center;
    vertical-align: top;
  }

  .tabla__silla--destacada {
    background: color("hielo");
  }

  // <Picture> renderiza <picture><img>: la clase va al <img>.
  .tabla__imagen {
    width: 100%;
    max-width: 150px;
    height: auto;
    margin: 0 auto 10px;
    aspect-ratio: 1 / 1;
    object-fit: cover;
    border-radius: radio("xs");
  }

  // <span> y no <h2>: el modelo de contenido de <th> no admite encabezados.
  .tabla__nombre {
    display: block;
    margin: 0 0 10px;
    font: 600 16px / 1.25 fuente("archivo");
    letter-spacing: -0.02em;
    color: color("tinta");
  }

  .tabla__resumen {
    display: block;
    margin-bottom: 14px;
    font: 400 10.5px / 1.4 fuente("mono");
    color: color("gris-medio");
  }

  .tabla__ficha {
    @include pill;

    padding: 9px 16px;
    font-size: 11.5px;
  }

  .tabla__etiqueta {
    padding: 16px 18px;
    border-top: 1px solid tinta(8%);
    background: color("hielo");
    color: color("tinta");
    font: 600 12.5px / 1.4 fuente("archivo");
    text-align: left;
  }

  .tabla__igual {
    margin-left: 8px;
    font: 400 9.5px / 1 fuente("mono");
    color: color("gris-claro");
  }

  .tabla__valor {
    padding: 16px 18px;
    border-top: 1px solid tinta(8%);
    border-left: 1px solid tinta(8%);
    background: color("blanco");
    color: color("tinta-2");
    font: 400 13px / 1.5 fuente("archivo");
    vertical-align: top;
  }

  .tabla__fila--igual .tabla__valor {
    background: color("hielo-alterno");
  }

  .comparador__nota {
    margin: 0;
    font: 400 11px / 1.6 fuente("mono");
    color: color("gris-claro");
  }

  // Móvil (spec §8.1): scroll horizontal con la columna de etiquetas fija.
  @include movil {
    .tabla {
      min-width: 640px;
    }

    .tabla__col-etiqueta {
      width: 128px;
    }

    .tabla__esquina,
    .tabla__etiqueta {
      position: sticky;
      left: 0;
      z-index: 1;
      box-shadow: 1px 0 0 tinta(8%);
    }
  }
</style>
```

- [ ] **Step 2: Comprobar tipos y estilos**

Run: `npx astro check && npx stylelint "src/components/comparador/*.astro"`
Expected: `Result (… files): - 0 errors - 0 warnings - 0 hints` y stylelint sin errores.

- [ ] **Step 3: Checkpoint (el commit lo hace el usuario)**

```bash
git add src/components/comparador/TablaComparativa.astro
```

Mensaje propuesto: `feat(comparador): tabla comparativa X1 con <table> real y columna fija en móvil`

---

### Task 4: Bloque X2 — `Veredictos.astro`

El `<h2>` de X2 usa `clamp(26px, 3.4vw, 40px)` (un paso menor que el h2 estándar), por eso lleva su propio estilo. El cierre reutiliza `BloqueConversion` con el gradiente que empieza en blanco y el contexto `comparador` (tercera y última aparición de WhatsApp del sitio; la landing tiene exactamente dos).

**Files:**
- Create: `src/components/comparador/Veredictos.astro`

- [ ] **Step 1: Crear el componente**

```astro
---
import BloqueConversion from '@/components/ui/BloqueConversion.astro';
import type { VeredictoResuelto } from '@/lib/contenido';

interface Props {
  veredictos: readonly VeredictoResuelto[];
}

const { veredictos } = Astro.props;
---

<section id="cmp-veredicto" class="veredicto">
  <div class="veredicto__contenido">
    <h2 class="veredicto__titulo">¿Cuál te conviene?</h2>
    <div class="veredicto__rejilla">
      {
        veredictos.map(({ entrada, silla }) => (
          <div class="veredicto__tarjeta" data-veredicto={entrada.id}>
            <span class="veredicto__perfil">{entrada.data.perfil}</span>
            <strong class="veredicto__silla">{silla.data.nombre}</strong>
            <p class="veredicto__razon">{entrada.data.razon}</p>
          </div>
        ))
      }
    </div>
    <BloqueConversion
      titular="¿Sigues entre dos modelos?"
      texto="Mándanos tu estatura y la altura de tu escritorio: te decimos cuál de las dos te queda."
      contexto="comparador"
      inicioGradiente="blanco"
    />
  </div>
</section>

<style lang="scss">
  .veredicto {
    @include seccion-compacta;

    background: color("hielo");
  }

  .veredicto__contenido {
    @include contenedor("texto");

    display: flex;
    flex-direction: column;
    gap: 26px;
  }

  .veredicto__titulo {
    margin: 0;
    font: 700 clamp(26px, 3.4vw, 40px) / 1.06 fuente("archivo");
    letter-spacing: -0.035em;
  }

  .veredicto__rejilla {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: 16px;
  }

  .veredicto__tarjeta {
    display: flex;
    flex-direction: column;
    gap: 10px;
    min-width: 0;
    padding: 24px;
    border: 1px solid tinta(8%);
    border-radius: radio("m");
    background: color("blanco");
  }

  .veredicto__perfil {
    @include etiqueta-mono(9.5px);

    color: color("cobalto");
  }

  .veredicto__silla {
    font: 600 18px / 1.25 fuente("archivo");
    letter-spacing: -0.02em;
    color: color("tinta");
  }

  .veredicto__razon {
    @include cuerpo(13.5px);

    color: color("gris-medio");
  }
</style>
```

- [ ] **Step 2: Comprobar tipos y estilos**

Run: `npx astro check && npx stylelint "src/components/comparador/*.astro"`
Expected: `- 0 errors` y stylelint sin errores.

- [ ] **Step 3: Checkpoint (el commit lo hace el usuario)**

```bash
git add src/components/comparador/Veredictos.astro
```

Mensaje propuesto: `feat(comparador): bloque «¿Cuál te conviene?» con cierre por WhatsApp`

---

### Task 5: Página `/comparar`

**Files:**
- Create: `src/pages/comparar.astro`

- [ ] **Step 1: Crear la página**

La descripción tiene 149 caracteres (límite de la spec: 160). `tituloPagina()` no añade « · Tessera» porque el título ya contiene la marca.

```astro
---
import TablaComparativa from '@/components/comparador/TablaComparativa.astro';
import Veredictos from '@/components/comparador/Veredictos.astro';
import { site } from '@/data/site';
import BaseLayout from '@/layouts/BaseLayout.astro';
import { definirFilas, derivarFilas } from '@/lib/comparador';
import { obtenerContenido } from '@/lib/contenido';

const { comparador, veredictos } = await obtenerContenido();
const filas = derivarFilas(
  comparador.map((silla) => silla.data),
  definirFilas(site.mercado.locale, site.entregaHoras),
);
---

<BaseLayout
  titulo="Compara las sillas ergonómicas Tessera"
  descripcion="Compara lado a lado respaldo, altura de asiento, reposabrazos, reclinación y lumbar de las sillas ergonómicas Tessera, y elige la tuya con un asesor."
  ruta="/comparar"
>
  <TablaComparativa sillas={comparador} filas={filas} />
  <Veredictos veredictos={veredictos} />
</BaseLayout>
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: termina con `[build] Complete!` y existe `dist/comparar.html`.

- [ ] **Step 3: Comprobar el HTML generado**

Run:

```bash
grep -o '<h1[^>]*>' dist/comparar.html | wc -l
grep -o '<th scope="col"' dist/comparar.html | wc -l
grep -o 'data-fila-igual' dist/comparar.html | wc -l
grep -o '<button[^>]*data-comparador-switch[^>]*>' dist/comparar.html
grep -o 'href="/catalogo#[a-z0-9-]*"' dist/comparar.html
grep -o 'href="https://wa.me/[^"]*"' dist/comparar.html | wc -l
grep -o '<link rel="canonical"[^>]*>' dist/comparar.html
```

Expected, en orden (con los datos de ejemplo de la fase 2):
- `1` (un solo `<h1>`)
- `3` (una columna por silla)
- `2` (Garantía y Entrega armada son iguales en las tres)
- `<button class="interruptor" type="button" role="switch" aria-checked="false" data-comparador-switch hidden data-astro-cid-…>`
- `href="/catalogo#duna"`, `href="/catalogo#mora-pro"`, `href="/catalogo#ignea"`
- `1`
- `<link rel="canonical" href="https://tessera.example/comparar">` (o el dominio real de `site.url`)

- [ ] **Step 4: Revisión visual contra el diseño**

Run: `npm run preview` y abre `http://localhost:4321/comparar`.

Comprueba a 1280 px:
- Cabecera: «COMPARADOR» en mono cobalto, h1 en tres líneas dentro de 44ch, switch a la derecha abajo.
- Tabla con borde de 1 px y radio de 16 px; cabecera de la columna central en hielo; filas «Garantía» y «Entrega armada» con fondo `#F7F9FD` y la marca «igual» en mono gris claro.
- Al pulsar el switch: fondo tinta, pista cobalto, perilla a la derecha; desaparecen las dos filas iguales. Al volver a pulsar, reaparecen.
- X2 sobre hielo, tres tarjetas blancas y el bloque de conversión con gradiente blanco → azul pálido.

Comprueba a 375 px (herramientas de desarrollo → modo responsive):
- La página no tiene scroll horizontal; solo la tabla se desplaza.
- Al desplazar la tabla, la columna de etiquetas queda fija a la izquierda.

- [ ] **Step 5: Checkpoint (el commit lo hace el usuario)**

```bash
git add src/pages/comparar.astro
```

Mensaje propuesto: `feat(comparador): página /comparar`

---

### Task 6: Verificación de la fase

- [ ] **Step 1: Verificación completa**

Run: `npm run verify`
Expected: `astro check` con `0 errors`, ESLint y Stylelint sin errores, y Vitest con todos los archivos en verde (`Test Files  N passed (N)`, 0 failed).

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: `[build] Complete!`; `dist/comparar.html` presente.

- [ ] **Step 3: Checkpoint**

No hay archivos nuevos. Si el usuario agrupa commits por fase, esta es la marca de «Fase 5 lista para revisión (H2)».
