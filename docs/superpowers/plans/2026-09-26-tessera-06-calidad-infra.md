# Tessera — Fase 6: calidad, CI e infraestructura

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que cada requerimiento de la matriz de spec §15 tenga su verificación automática o su paso manual: verificador de enlaces y anclas, e2e con axe en escritorio y móvil, presupuestos de Lighthouse, CI, Dependabot y el documento de operación y traspaso.

**Architecture:** La lógica del verificador de enlaces es un módulo puro (`src/lib/enlaces.ts`, probado en Vitest) que Node ejecuta directamente desde `scripts/verificar-enlaces.ts`. Los e2e (Playwright) corren sobre `astro preview` del build ya generado. Lighthouse CI sirve `dist/` con su propio servidor estático. La CI de GitHub Actions encadena todo en cada PR.

**Tech Stack:** Playwright 1.63 + @axe-core/playwright 4.13 · @lhci/cli 0.15 · node-html-parser 9 · GitHub Actions · Dependabot · Cloudflare Pages.

**Prerrequisito:** fases 1–5 completas.

**Hallazgos de esta fase que ya están corregidos en los planes 01, 03 y 04** (si ejecutas los planes actuales no hay nada que hacer; se documentan para saber por qué el código es así):
- **Contraste (axe):** seis textos pequeños del diseño no llegaban a 4,5:1. Ajuste mínimo: `gris-claro` `#8a93a8` → `#656e89`, `hielo(45%)` → `hielo(48%)` en la barra legal y en el contador de experiencias, y la nota de WhatsApp de opacidad 0,75 → 0,8.
- **CLS (Lighthouse):** el menú móvil y el panel de filtros se colapsaban con JS después del primer pintado y movían toda la página (CLS 0,15 y 0,6). Ahora `<html data-js>` (script inline en `<head>`) deja que el CSS decida el menú desde el principio, y el `<details>` de filtros llega cerrado y se muestra en escritorio con `::details-content`.
- **Área táctil de los indicadores de la portada:** 44 px en vertical; en horizontal cubren su tramo de 33 px (el diseño los separa 33 px entre centros). Mixin `area-tactil($minimo, $ancho)`.

---

### Tarea 1: Dependencias y scripts

**Files:**
- Modify: `package.json` (dependencias de desarrollo y scripts)

- [ ] **Paso 1: Instalar**

```bash
npm install -D @playwright/test@^1.63.0 @axe-core/playwright@^4.13.0 @lhci/cli@^0.15.1 node-html-parser@^9.0.4
npx playwright install chromium
```

Expected: `found 0 vulnerabilities`. En distribuciones que Playwright no soporta oficialmente (p. ej. Arch) avisa `downloading fallback build for ubuntu24.04-x64` y funciona igual.

- [ ] **Paso 2: Scripts de `package.json`**

Deja el bloque `scripts` así:

```json
{
  "dev": "astro dev",
  "check": "astro check",
  "lint": "eslint .",
  "lint:styles": "stylelint \"src/**/*.{scss,astro}\"",
  "test": "vitest run",
  "verify": "npm run check && npm run lint && npm run lint:styles && npm run test",
  "build": "astro check && astro build",
  "preview": "astro preview",
  "links": "node scripts/verificar-enlaces.ts dist",
  "e2e": "playwright test",
  "lhci": "lhci autorun",
  "audit": "npm audit --omit=dev --audit-level=high"
}
```

- [ ] **Paso 3: Checkpoint**

```bash
git add package.json package-lock.json
```
Mensaje propuesto: `chore: añade Playwright, axe y Lighthouse CI`

---

### Tarea 2: Verificador de enlaces y anclas

**Files:**
- Create: `src/lib/enlaces.ts`, `scripts/verificar-enlaces.ts`
- Test: `tests/unit/enlaces.test.ts`

Falla si un enlace interno apunta a una ruta que no existe, a `/` (es la redirección 301) o a un `#ancla` sin `id` en la página destino. `enlaces.ts` no importa nada de `src/lib`: Node lo ejecuta sin bundler (por eso el script importa con extensión `.ts`, que `allowImportingTsExtensions` de la config de Astro permite).

- [ ] **Paso 1: Test que falla**

```ts
import { describe, expect, it } from 'vitest';
import { analizarHtml, enlacesRotos, rutaDeArchivo } from '@/lib/enlaces';

describe('rutaDeArchivo', () => {
  it('quita la extensión y añade la barra inicial', () => {
    expect(rutaDeArchivo('catalogo/malla.html')).toBe('/catalogo/malla');
    expect(rutaDeArchivo('sillas-ergonomicas.html')).toBe('/sillas-ergonomicas');
  });
});

describe('analizarHtml', () => {
  it('recoge ids y hrefs', () => {
    const pagina = analizarHtml('/x', '<section id="faq"><a href="/catalogo">a</a><a href="#faq">b</a></section>');
    expect([...pagina.ids]).toEqual(['faq']);
    expect(pagina.enlaces).toEqual(['/catalogo', '#faq']);
  });
});

describe('enlacesRotos', () => {
  const landing = analizarHtml(
    '/sillas-ergonomicas',
    '<section id="anatomia"></section><a href="/catalogo#duna">a</a><a href="mailto:hola@x.co">b</a><a href="https://wa.me/57300">c</a>',
  );
  const catalogo = analizarHtml('/catalogo', '<article id="duna"></article><a href="/sillas-ergonomicas#anatomia">a</a><a href="/catalogo/malla?y=lumbar">b</a>');

  it('acepta rutas, anclas y queries existentes e ignora mailto y externos', () => {
    expect(enlacesRotos([landing, catalogo, analizarHtml('/catalogo/malla', '')], new Set())).toEqual([]);
  });

  it('reporta anclas inexistentes', () => {
    expect(enlacesRotos([landing, catalogo, analizarHtml('/catalogo/malla', '<a href="#arriba">a</a>')], new Set())).toEqual([
      '/catalogo/malla: «#arriba» apunta a un ancla que no existe en /catalogo/malla.',
    ]);
  });

  it('reporta rutas inexistentes salvo archivos conocidos, una sola vez', () => {
    const pagina = analizarHtml('/a', '<a href="/fichas/duna">x</a><a href="/fichas/duna">x</a><a href="/favicon.svg">y</a>');
    expect(enlacesRotos([pagina], new Set(['/favicon.svg']))).toEqual(['/a: «/fichas/duna» apunta a una ruta que no existe.']);
  });

  it('prohíbe enlazar a la raíz', () => {
    expect(enlacesRotos([analizarHtml('/a', '<a href="/">x</a>')], new Set())).toEqual([
      '/a: enlaza a «/», que es una redirección; usa /sillas-ergonomicas.',
    ]);
  });
});
```

- [ ] **Paso 2: Ejecutarlo**

Run: `npx vitest run tests/unit/enlaces.test.ts`
Expected: FAIL con `Cannot find package '@/lib/enlaces'`.

- [ ] **Paso 3: Implementación**

`src/lib/enlaces.ts`:

```ts
// Verificación de enlaces internos del build. Autocontenido (sin imports de src/lib) porque
// scripts/verificar-enlaces.ts lo ejecuta Node directamente, sin el bundler.
import { parse } from 'node-html-parser';

export interface PaginaAnalizada {
  /** Ruta pública sin extensión: `/catalogo/malla`. */
  readonly ruta: string;
  readonly ids: ReadonlySet<string>;
  readonly enlaces: readonly string[];
}

/** `catalogo/malla.html` → `/catalogo/malla` (build.format: 'file', trailingSlash: 'never'). */
export function rutaDeArchivo(archivoRelativo: string): string {
  return `/${archivoRelativo.replace(/\\/g, '/').replace(/\.html$/, '')}`;
}

export function analizarHtml(ruta: string, html: string): PaginaAnalizada {
  const raiz = parse(html);
  const ids = new Set(raiz.querySelectorAll('[id]').map((el) => el.getAttribute('id') ?? ''));
  const enlaces = raiz
    .querySelectorAll('a[href]')
    .map((a) => a.getAttribute('href') ?? '')
    .filter((href) => href !== '');
  return { ruta, ids, enlaces };
}

function esInterno(href: string): boolean {
  return href.startsWith('/') || href.startsWith('#');
}

/**
 * Enlaces internos rotos: ruta inexistente, enlace a `/` (es una redirección 301, nunca se
 * enlaza) o ancla sin `id` en la página destino. `archivos` son rutas de recursos que no son
 * páginas (`/favicon.svg`, `/robots.txt`…).
 */
export function enlacesRotos(paginas: readonly PaginaAnalizada[], archivos: ReadonlySet<string>): string[] {
  const porRuta = new Map(paginas.map((pagina) => [pagina.ruta, pagina]));
  const problemas = new Set<string>();
  for (const pagina of paginas) {
    for (const href of pagina.enlaces.filter(esInterno)) {
      const [camino = '', ancla] = href.split('#', 2);
      const rutaDestino = camino === '' ? pagina.ruta : (camino.split('?')[0] ?? camino);
      if (rutaDestino === '/') {
        problemas.add(`${pagina.ruta}: enlaza a «/», que es una redirección; usa /sillas-ergonomicas.`);
        continue;
      }
      const destino = porRuta.get(rutaDestino);
      if (destino === undefined) {
        if (!archivos.has(rutaDestino)) problemas.add(`${pagina.ruta}: «${href}» apunta a una ruta que no existe.`);
        continue;
      }
      if (ancla !== undefined && ancla !== '' && !destino.ids.has(ancla)) {
        problemas.add(`${pagina.ruta}: «${href}» apunta a un ancla que no existe en ${destino.ruta}.`);
      }
    }
  }
  return [...problemas];
}
```

- [ ] **Paso 4: Verde**

Run: `npx vitest run tests/unit/enlaces.test.ts`
Expected: `Tests  6 passed (6)`.

- [ ] **Paso 5: Script**

`scripts/verificar-enlaces.ts`:

```ts
// Uso: node scripts/verificar-enlaces.ts [dist]
import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { analizarHtml, enlacesRotos, rutaDeArchivo, type PaginaAnalizada } from '../src/lib/enlaces.ts';

async function listar(directorio: string): Promise<string[]> {
  const entradas = await readdir(directorio, { withFileTypes: true, recursive: true });
  return entradas.filter((entrada) => entrada.isFile()).map((entrada) => join(entrada.parentPath, entrada.name));
}

const dist = process.argv[2] ?? 'dist';
const archivos = await listar(dist);
const paginas: PaginaAnalizada[] = await Promise.all(
  archivos
    .filter((archivo) => archivo.endsWith('.html'))
    .map(async (archivo) => analizarHtml(rutaDeArchivo(relative(dist, archivo)), await readFile(archivo, 'utf-8'))),
);
const recursos = new Set(archivos.filter((archivo) => !archivo.endsWith('.html')).map((archivo) => `/${relative(dist, archivo)}`));
const problemas = enlacesRotos(paginas, recursos);

if (problemas.length > 0) {
  console.error(`Enlaces rotos (${String(problemas.length)}):\n- ${problemas.join('\n- ')}`);
  process.exit(1);
}
console.log(`Enlaces internos correctos en ${String(paginas.length)} páginas.`);
```

- [ ] **Paso 6: Sobre el build**

Run: `npm run build && npm run links`
Expected: `Enlaces internos correctos en 10 páginas.`

- [ ] **Paso 7: Checkpoint**

```bash
git add src/lib/enlaces.ts scripts/verificar-enlaces.ts tests/unit/enlaces.test.ts
```
Mensaje propuesto: `feat: verifica enlaces internos y anclas del build`

---

### Tarea 3: Tests end-to-end con axe

**Files:**
- Create: `playwright.config.ts`, `tests/e2e/ayudas.ts`, `tests/e2e/comunes.spec.ts`, `tests/e2e/landing.spec.ts`, `tests/e2e/catalogo.spec.ts`, `tests/e2e/comparador.spec.ts`

Dos proyectos: escritorio y Pixel 7 a 375 px (el ancho de referencia de la spec). `RUTAS` y los recuentos (`CONTENIDO`) se leen de `src/content/`: los e2e siguen valiendo cuando entre el catálogo real. `astro preview` va con `--ignore-lock`: Astro 7 guarda un lock del servidor de preview y uno anterior que quedara vivo bloquearía el arranque («Process from config.webServer exited early»; se para con `npx astro preview stop`). El área táctil se mide con `elementFromPoint` (el `boundingBox()` no incluye el `::after`), con el control centrado en pantalla.

- [ ] **Paso 1: `playwright.config.ts`**

```ts
import { defineConfig, devices } from '@playwright/test';

const enCi = process.env.CI !== undefined;

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: enCi,
  retries: enCi ? 1 : 0,
  reporter: enCi ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:4321',
    trace: 'on-first-retry',
  },
  // Sirve el build ya generado (npm run build antes). `astro preview` no aplica
  // public/_redirects: la 301 de «/» se comprueba a mano contra el hosting.
  webServer: {
    command: 'npx astro preview --port 4321 --ignore-lock',
    url: 'http://localhost:4321/sillas-ergonomicas',
    reuseExistingServer: !enCi,
  },
  projects: [
    { name: 'escritorio', use: { ...devices['Desktop Chrome'] } },
    // Pixel 7 a 375 px: el ancho de referencia de la spec (§8.1, §15).
    { name: 'movil', use: { ...devices['Pixel 7'], viewport: { width: 375, height: 812 } } },
  ],
});
```

- [ ] **Paso 2: `tests/e2e/ayudas.ts`**

```ts
import { readdirSync, readFileSync } from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

// Recuentos y rutas salen del contenido: los tests siguen valiendo con el catálogo real.
function leerLista(archivo: string): unknown[] {
  const datos: unknown = JSON.parse(readFileSync(`src/content/${archivo}`, 'utf-8'));
  return Array.isArray(datos) ? datos : [];
}

function contarMarkdown(carpeta: string): number {
  return readdirSync(`src/content/${carpeta}`).filter((archivo) => archivo.endsWith('.md')).length;
}

const slugsCategorias = leerLista('categorias.json').flatMap((categoria) =>
  typeof categoria === 'object' && categoria !== null && 'slug' in categoria && typeof categoria.slug === 'string' ? [categoria.slug] : [],
);

export const CONTENIDO = {
  sillas: contarMarkdown('sillas'),
  testimonios: contarMarkdown('testimonios'),
  faqs: leerLista('faqs.json').length,
  ajustes: leerLista('ajustes.json').length,
} as const;

export const RUTAS: readonly string[] = [
  '/sillas-ergonomicas',
  '/catalogo',
  ...slugsCategorias.map((slug) => `/catalogo/${slug}`),
  '/comparar',
];

/** Nodos JSON-LD de la página, ya parseados (falla si alguno no es JSON válido). */
export async function jsonLd(pagina: Page): Promise<unknown[]> {
  const bloques = await pagina.locator('script[type="application/ld+json"]').allTextContents();
  return bloques.flatMap((texto): unknown[] => {
    const valor: unknown = JSON.parse(texto);
    return Array.isArray(valor) ? valor : [valor];
  });
}

export function tipos(nodos: readonly unknown[]): string[] {
  return nodos.flatMap((nodo) =>
    typeof nodo === 'object' && nodo !== null && '@type' in nodo && typeof nodo['@type'] === 'string' ? [nodo['@type']] : [],
  );
}

export async function sinViolacionesAxe(pagina: Page): Promise<void> {
  const resultado = await new AxeBuilder({ page: pagina }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  const resumen = resultado.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
  expect(resumen).toEqual([]);
}

/**
 * El área táctil real llega a `radio` px del centro en cada eje (21 → 44 px): esos puntos
 * siguen perteneciendo al control. `boundingBox()` no sirve porque no incluye el ::after.
 */
export async function areaTactilMinima(
  pagina: Page,
  selector: string,
  radio: { readonly horizontal: number; readonly vertical: number } = { horizontal: 21, vertical: 21 },
): Promise<boolean[]> {
  return pagina.locator(selector).evaluateAll((controles, { horizontal, vertical }) =>
    controles.map((control) => {
      // Centrado en pantalla: fuera del viewport elementFromPoint devuelve null.
      control.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' });
      const caja = control.getBoundingClientRect();
      const cx = caja.left + caja.width / 2;
      const cy = caja.top + caja.height / 2;
      return [
        [cx - horizontal, cy],
        [cx + horizontal, cy],
        [cx, cy - vertical],
        [cx, cy + vertical],
      ].every(([x = 0, y = 0]) => {
        const elemento = document.elementFromPoint(x, y);
        return elemento !== null && (elemento === control || control.contains(elemento));
      });
    }),
    radio,
  );
}
```

- [ ] **Paso 3: `tests/e2e/comunes.spec.ts`** (un `<h1>`, canonical, JSON-LD, correo, sin precios, axe WCAG 2.1 AA, sin desborde horizontal, contenido sin JS)

```ts
import { expect, test } from '@playwright/test';
import { site } from '../../src/data/site';
import { CONTENIDO, jsonLd, RUTAS, sinViolacionesAxe, tipos } from './ayudas';

for (const ruta of RUTAS) {
  test.describe(ruta, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(ruta);
    });

    test('tiene un solo h1 y canonical propia', async ({ page }) => {
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${site.url}${ruta}`);
    });

    test('JSON-LD válido con Organization y WebSite', async ({ page }) => {
      const nodos = tipos(await jsonLd(page));
      expect(nodos).toContain('Organization');
      expect(nodos).toContain('WebSite');
    });

    test('ofrece contacto por correo', async ({ page }) => {
      await expect(page.locator(`footer a[href="mailto:${site.contacto.correo}"]`)).toHaveCount(1);
    });

    test('no muestra precios', async ({ page }) => {
      // textContent, no innerText: incluye las FAQ cerradas y el texto que oculta el JS.
      const texto = (await page.locator('main').textContent()) ?? '';
      // Importes, no la palabra: la guía del diseño habla del precio en general.
      expect(texto).not.toMatch(/\$\s?\d|\d\s?(COP|MXN)\b|(COP|MXN)\s?\$?\s?\d/);
    });

    test('sin violaciones de accesibilidad (axe, WCAG 2.1 AA)', async ({ page }) => {
      await sinViolacionesAxe(page);
    });

    test('no desborda en horizontal', async ({ page }) => {
      const desborde = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(desborde).toBeLessThanOrEqual(0);
    });
  });
}

test.describe('sin JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('la landing sirve todo el texto en el HTML', async ({ page }) => {
    await page.goto('/sillas-ergonomicas');
    await expect(page.locator('details[data-faq]')).toHaveCount(CONTENIDO.faqs);
    await expect(page.locator('[data-experiencia]')).toHaveCount(CONTENIDO.testimonios);
    await expect(page.locator('[data-ampliacion]').first()).toBeVisible();
    await expect(page.locator('[data-ajuste-panel]')).toHaveCount(CONTENIDO.ajustes);
  });

  test('la guía del catálogo está en el HTML', async ({ page }) => {
    await page.goto('/catalogo');
    await expect(page.locator('#cat-guia h2')).toBeVisible();
  });
});
```

- [ ] **Paso 4: `tests/e2e/landing.spec.ts`**

```ts
import { expect, test } from '@playwright/test';
import { areaTactilMinima, jsonLd, tipos } from './ayudas';

test.describe('landing', () => {
  test('bloques en el orden del diseño', async ({ page }) => {
    await page.goto('/sillas-ergonomicas');
    const ids = await page.locator('main section[id]').evaluateAll((secciones) => secciones.map((s) => s.id));
    expect(ids).toEqual(['inicio', 'necesidades', 'sillas', 'anatomia', 'experiencias', 'entrega', 'faq']);
  });

  test('WhatsApp aparece exactamente dos veces', async ({ page }) => {
    await page.goto('/sillas-ergonomicas');
    await expect(page.locator('a[href^="https://wa.me/"]')).toHaveCount(2);
    await expect(page.locator('[data-whatsapp="barra"]')).toHaveCount(1);
    await expect(page.locator('[data-whatsapp="entrega"]')).toHaveCount(1);
  });

  test('FAQPage con las cinco preguntas', async ({ page }) => {
    await page.goto('/sillas-ergonomicas');
    expect(tipos(await jsonLd(page))).toContain('FAQPage');
  });

  test('chips y necesidades enlazan a páginas de categoría', async ({ page }) => {
    await page.goto('/sillas-ergonomicas');
    for (const href of await page.locator('nav[aria-label="Categorías"] a, [data-necesidad]').evaluateAll((as) => as.map((a) => a.getAttribute('href')))) {
      expect(href).toMatch(/^\/catalogo\/[a-z-]+$/);
    }
  });

  test('la portada rota cada 5 s y el primer clic la detiene', async ({ page }) => {
    await page.clock.install();
    await page.goto('/sillas-ergonomicas');
    const indicadores = page.locator('[data-portada-indicador]');
    await expect(indicadores.nth(0)).toHaveAttribute('aria-pressed', 'true');
    await page.clock.runFor(5000);
    await expect(indicadores.nth(1)).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-portada-enlace]')).toHaveAttribute('href', /^\/catalogo#/);
    await indicadores.nth(2).click();
    await page.clock.runFor(20000);
    await expect(indicadores.nth(2)).toHaveAttribute('aria-pressed', 'true');
  });

  test('áreas táctiles de al menos 44 px', async ({ page }) => {
    await page.goto('/sillas-ergonomicas');
    // Los indicadores están a 33 px entre centros (26 px + 7 px de separación del diseño):
    // en horizontal cada área ocupa su tramo del paso (±15 px con margen subpíxel frente al
    // vecino); los 44 px en horizontal exigirían separarlos más.
    expect(await areaTactilMinima(page, '[data-portada-indicador]', { horizontal: 15, vertical: 21 })).toEqual([true, true, true]);
    expect(await areaTactilMinima(page, '[data-ajuste-punto]')).toEqual([true, true, true, true]);
  });

  test('anatomía: punto y fila comparten estado', async ({ page }) => {
    await page.goto('/sillas-ergonomicas');
    await page.locator('[data-ajuste-punto="2"]').click();
    await expect(page.locator('[data-ajuste-fila="2"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-ajuste-panel="2"]')).toBeVisible();
    await expect(page.locator('[data-ajuste-panel="0"]')).toBeHidden();
  });

  test('experiencias: «Leer más» amplía y pagina', async ({ page }) => {
    await page.goto('/sillas-ergonomicas');
    await expect(page.locator('[data-exp-posicion]')).toHaveText('3 experiencias');
    await page.locator('[data-exp-mas]').click();
    await expect(page.locator('[data-exp-posicion]')).toHaveText('Experiencias 1–3 de 6');
    await page.locator('[data-exp-siguiente]').click();
    await expect(page.locator('[data-exp-posicion]')).toHaveText('Experiencias 2–4 de 6');
  });

  test('header sticky y anclas compensadas 80 px', async ({ page }) => {
    await page.goto('/sillas-ergonomicas');
    expect(await page.locator('header.header').evaluate((el) => getComputedStyle(el).position)).toBe('sticky');
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollPaddingTop)).toBe('80px');
  });

  test('«ERGONÓMICAS» es decoración: no se lee', async ({ page }) => {
    await page.goto('/sillas-ergonomicas');
    await expect(page.locator('.portada__palabra')).toHaveAttribute('aria-hidden', 'true');
  });

  test('marquesina: la copia no se lee ni se tabula', async ({ page }) => {
    await page.goto('/sillas-ergonomicas');
    const copia = page.locator('.marquesina__grupo').nth(1);
    await expect(copia).toHaveAttribute('aria-hidden', 'true');
    await expect(copia).toHaveAttribute('inert', '');
  });
});

test.describe('movimiento reducido', () => {
  test.use({ reducedMotion: 'reduce' });

  test('marquesina y flecha quietas, sin autoplay', async ({ page }) => {
    await page.clock.install();
    await page.goto('/sillas-ergonomicas');
    const animaciones = await page
      .locator('.marquesina__pista, .portada__sigue')
      .evaluateAll((elementos) => elementos.map((el) => getComputedStyle(el).animationName));
    expect(animaciones).toEqual(['none', 'none']);
    await page.clock.runFor(15000);
    await expect(page.locator('[data-portada-indicador]').nth(0)).toHaveAttribute('aria-pressed', 'true');
  });
});
```

- [ ] **Paso 5: `tests/e2e/catalogo.spec.ts`**

```ts
import { expect, test } from '@playwright/test';
import { site } from '../../src/data/site';
import { CONTENIDO, jsonLd, tipos } from './ayudas';

test.describe('catálogo', () => {
  test('muestra todas las sillas y la miga en JSON-LD', async ({ page }) => {
    await page.goto('/catalogo');
    await expect(page.locator('article[data-silla]')).toHaveCount(CONTENIDO.sillas);
    expect(tipos(await jsonLd(page))).toContain('BreadcrumbList');
  });

  test('cada tarjeta es destino de /catalogo#<id>', async ({ page }) => {
    await page.goto('/catalogo#duna');
    await expect(page.locator('article#duna')).toBeVisible();
  });

  test('en /catalogo una opción navega a su página de categoría', async ({ page, isMobile }) => {
    await page.goto('/catalogo');
    if (isMobile) await page.locator('[data-filtros-panel] summary').click();
    await page.locator('a[data-opcion="malla"]').click();
    await expect(page).toHaveURL(/\/catalogo\/malla$/);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${site.url}/catalogo/malla`);
  });

  test('en una faceta, un filtro extra estrecha en cliente sin cambiar la canonical', async ({ page, isMobile }) => {
    await page.goto('/catalogo/malla');
    const total = await page.locator('article[data-silla]:visible').count();
    if (isMobile) await page.locator('[data-filtros-panel] summary').click();
    await page.locator('a[data-opcion="lumbar"]').click();
    await expect(page).toHaveURL(/\/catalogo\/malla\?y=lumbar$/);
    const visibles = await page.locator('article[data-silla]:visible').count();
    expect(visibles).toBeLessThan(total);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${site.url}/catalogo/malla`);
  });

  test('lee los extras de la query al cargar', async ({ page }) => {
    await page.goto('/catalogo/malla?y=lumbar');
    await expect(page.locator('a[data-opcion="lumbar"]')).toHaveAttribute('aria-current', 'true');
    await expect(page.locator('button[data-chip="lumbar"]')).toBeVisible();
  });
});
```

- [ ] **Paso 6: `tests/e2e/comparador.spec.ts`**

```ts
import { expect, test } from '@playwright/test';

test.describe('comparador', () => {
  test('es una tabla real con cabeceras de columna y fila', async ({ page }) => {
    await page.goto('/comparar');
    await expect(page.locator('table th[scope="col"][data-columna-silla]')).toHaveCount(3);
    await expect(page.locator('table tbody th[scope="row"]')).toHaveCount(8);
  });

  test('«Solo lo que cambia» es un switch que oculta las filas iguales', async ({ page }) => {
    await page.goto('/comparar');
    const interruptor = page.locator('[data-comparador-switch]');
    await expect(interruptor).toHaveAttribute('role', 'switch');
    await expect(interruptor).toHaveAttribute('aria-checked', 'false');
    const filas = await page.locator('tr[data-fila]').count();
    const iguales = await page.locator('tr[data-fila-igual]').count();
    await interruptor.click();
    await expect(interruptor).toHaveAttribute('aria-checked', 'true');
    for (const fila of await page.locator('tr[data-fila-igual]').all()) await expect(fila).toBeHidden();
    await expect(page.locator('tr[data-fila]:visible')).toHaveCount(filas - iguales);
  });

  test('«Ver ficha» lleva a la tarjeta del catálogo', async ({ page }) => {
    await page.goto('/comparar');
    for (const href of await page.locator('a[data-ver-ficha]').evaluateAll((as) => as.map((a) => a.getAttribute('href')))) {
      expect(href).toMatch(/^\/catalogo#[a-z-]+$/);
    }
  });
});
```

- [ ] **Paso 7: Ejecutar**

Run: `npm run build && npm run e2e`
Expected: `152 passed` (76 por proyecto; las rutas y los recuentos se leen del contenido, así que el número cambia con el catálogo real).

- [ ] **Paso 8: Checkpoint**

```bash
git add playwright.config.ts tests/e2e
```
Mensaje propuesto: `test: añade e2e con axe en escritorio y móvil`

---

### Tarea 4: Presupuestos de Lighthouse

**Files:**
- Create: `lighthouserc.json`

- [ ] **Paso 1: `lighthouserc.json`**

```json
{
  "ci": {
    "collect": {
      "staticDistDir": "./dist",
      "url": [
        "http://localhost/sillas-ergonomicas.html",
        "http://localhost/catalogo.html",
        "http://localhost/catalogo/malla.html",
        "http://localhost/comparar.html"
      ],
      "numberOfRuns": 1,
      "settings": { "chromeFlags": "--no-sandbox --headless=new" }
    },
    "assert": {
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.9 }],
        "categories:accessibility": ["error", { "minScore": 0.95 }],
        "categories:seo": ["error", { "minScore": 1 }],
        "largest-contentful-paint": ["error", { "maxNumericValue": 2500 }],
        "cumulative-layout-shift": ["error", { "maxNumericValue": 0.1 }],
        "total-blocking-time": ["error", { "maxNumericValue": 200 }],
        "resource-summary:script:size": ["error", { "maxNumericValue": 20480 }]
      }
    },
    "upload": { "target": "filesystem", "outputDir": "./.lighthouseci" }
  }
}
```

- [ ] **Paso 2: Ejecutar**

Run: `npm run build && npm run lhci`
(Sin Google Chrome instalado, usa el Chromium de Playwright: `CHROME_PATH=$(ls -d ~/.cache/ms-playwright/chromium-*/chrome-linux64)/chrome npm run lhci`.)
Expected: sin fallos de aserciones. Referencia verificada: rendimiento 0,99–1, accesibilidad 0,98–1, SEO 1, CLS 0 en landing y catálogo (0,05 en el comparador), LCP < 2 s, TBT 0.

- [ ] **Paso 3: Checkpoint**

```bash
git add lighthouserc.json
```
Mensaje propuesto: `test: añade presupuestos de Lighthouse CI`

---

### Tarea 5: CI y Dependabot

**Files:**
- Create: `.github/workflows/ci.yml`, `.github/dependabot.yml`

- [ ] **Paso 1: `.github/workflows/ci.yml`**

```yaml
name: CI

on:
  pull_request:
  push:
    branches: [main]

permissions:
  contents: read

jobs:
  verificar:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5

      - uses: actions/setup-node@v5
        with:
          node-version-file: .node-version
          cache: npm

      - run: npm ci

      # Solo dependencias de producción y severidad alta: los avisos de herramientas de
      # desarrollo no bloquean (spec §13).
      - run: npm run audit

      - run: npm run verify
      - run: npm run build
      - run: npm run links

      - run: npx playwright install --with-deps chromium
      - run: npm run e2e

      # ubuntu-latest trae Google Chrome; Lighthouse CI lo encuentra solo.
      - run: npm run lhci

      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: informes
          path: |
            playwright-report/
            .lighthouseci/
          retention-days: 14
```

- [ ] **Paso 2: `.github/dependabot.yml`**

```yaml
version: 2
updates:
  - package-ecosystem: npm
    directory: /
    schedule:
      interval: weekly
      day: monday
    open-pull-requests-limit: 5
    groups:
      menores:
        update-types: [minor, patch]
    ignore:
      # typescript-eslint exige TypeScript < 6.1 y @astrojs/check ^5 || ^6: el salto de
      # mayor versión se hace a mano cuando ambos lo admitan.
      - dependency-name: typescript
        update-types: ["version-update:semver-major"]

  - package-ecosystem: github-actions
    directory: /
    schedule:
      interval: monthly
```

- [ ] **Paso 3: Checkpoint**

```bash
git add .github
```
Mensaje propuesto: `ci: verifica, construye y prueba cada PR; Dependabot semanal`

---

### Tarea 6: Documento de operación y traspaso

**Files:**
- Create: `docs/operacion.md`

- [ ] **Paso 1: `docs/operacion.md`**

```markdown
# Operación de Tessera

Documento de operación y traspaso (contrato, cláusulas 4 y 10). Mantenerlo al día: es la
lista de comprobación para entregar las cuentas al cliente y la guía del mantenimiento anual.

## Inventario de servicios

Todo en planes gratuitos que permiten uso comercial. Cualquier plan de pago lo aprueba y lo
paga el cliente (cláusulas 2 y 6).

| Servicio | Para qué | Titular | Plan | Costo |
|---|---|---|---|---|
| GitHub (organización del proyecto) | Código, CI, Dependabot | Desarrollador → cliente al traspaso | Free | 0 |
| Cloudflare Pages | Hosting estático, SSL, previews por rama | Cuenta del proyecto | Free | 0 |
| Cloudflare DNS | DNS del dominio | Cuenta del proyecto | Free | 0 |
| Registrador del dominio | Dominio | **Cliente** | — | Renovación anual, la paga el cliente |
| Google Workspace | Correo del dominio | **Cliente** | Según licencias | Lo paga el cliente |
| Monitor de disponibilidad | Alerta si el sitio cae | Cuenta del proyecto | Gratuito con uso comercial (verificar términos) | 0 |

Completar con: nombre de la organización de GitHub, correo de la cuenta de Cloudflare,
registrador, servicio de monitoreo y quién tiene acceso a cada uno.

## Despliegue

- **Cloudflare Pages** conectado al repositorio: comando `npm run build`, carpeta `dist`, versión de Node desde `.node-version`.
- Cada rama y cada PR generan una URL de preview: es la que revisa el delegado del cliente en cada hito.
- `main` despliega a producción.
- `public/_redirects` hace la 301 de `/` a `/sillas-ergonomicas`. Comprobar tras cada cambio de hosting: `curl -I https://<dominio>/` debe devolver `301` con `location: /sillas-ergonomicas`.

### Revertir

Cloudflare Pages → proyecto → *Deployments* → despliegue anterior → *Rollback to this deployment*. Después, revertir el commit en `main` para que el siguiente despliegue no lo reintroduzca.

## Registros DNS

| Tipo | Nombre | Valor | Para qué |
|---|---|---|---|
| CNAME | `@` / `www` | `<proyecto>.pages.dev` (lo crea Cloudflare al añadir el dominio personalizado) | Sitio |
| MX | `@` | `smtp.google.com`, prioridad 1 | Google Workspace |
| TXT | `@` | `v=spf1 include:_spf.google.com ~all` | SPF |
| TXT | `google._domainkey` | Clave que genera la consola de Workspace (*Aplicaciones → Gmail → Autenticar correo*) | DKIM |
| TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:<correo-de-informes>` | DMARC (recomendado) |
| TXT | `@` | `google-site-verification=…` | Search Console (verificación por DNS) |

Comprobar: `dig MX <dominio> +short`, `dig TXT <dominio> +short`, `dig TXT google._domainkey.<dominio> +short` y enviar un correo de prueba a una cuenta de Gmail: en *Mostrar original*, SPF y DKIM deben salir `PASS`.

## Mantenimiento anual (cláusula 4)

Incluye infraestructura, DNS, SSL, monitoreo, actualizaciones de seguridad y bugs. **No incluye** cambios de diseño ni edición de contenido.

- **Semanal (lunes):** revisar los PR de Dependabot. Si la CI está en verde, fusionar los de parches y menores; los de versión mayor se prueban en local (`npm run verify && npm run build && npm run e2e`).
- **Mensual:** `npm run audit` en local; revisar alertas del monitor y el panel de Cloudflare.
- **Ante una alerta de caída:** estado de Cloudflare Pages, último despliegue, DNS. Revertir si el fallo viene del último despliegue.

## Cambios de contenido (trabajo aparte del mantenimiento)

- **Añadir una silla:** crear `src/content/sillas/<slug>.md` (copiar una existente), su foto en `src/assets/sillas/`, y referenciar categorías existentes. Si va en la portada o en anatomía necesita `tema.gradiente`. `npm run build` falla con un mensaje claro si falta algo o una referencia no existe.
- **Añadir una categoría:** entrada nueva en `src/content/categorias.json` con `slug`, textos y guía; genera su página `/catalogo/<slug>` y aparece en el sitemap. Debe tener al menos una silla o el build falla.
- **Cambiar qué se destaca:** `src/content/destacados.json` (portada, muestra, comparador —exactamente 3—, anatomía y barra de categorías).
- Tras cualquier cambio: `npm run verify && npm run build && npm run links`.

## Traspaso (cláusula 10, ≤ 10 días hábiles)

- [ ] Transferir la organización de GitHub (o el repositorio) al cliente y quitar el acceso del desarrollador si así se acuerda.
- [ ] Cambiar el propietario de la cuenta de Cloudflare al correo del cliente.
- [ ] Confirmar que el dominio y Google Workspace están a nombre del cliente (deberían estarlo desde el inicio).
- [ ] Traspasar el monitor de disponibilidad.
- [ ] Entregar este documento actualizado y la lista de accesos.

## Puesta en marcha (hito H3)

- [ ] `src/data/site.ts`: `url` con el dominio real, `contacto.whatsapp`, `contacto.correo`, `mercado` (`es-CO` o `es-MX`), `textoEnvios` y `notaWhatsApp` confirmados por el cliente.
- [ ] Contenido real: sillas, categorías (con su copy SEO), testimonios con permiso, FAQ, garantía y devoluciones validados por el cliente (cláusula 8).
- [ ] Fotos reales en `src/assets/` y puntos de anatomía recalibrados (`src/content/ajustes.json`).
- [ ] Favicon y logo definitivos.
- [ ] `npm run verify && npm run build && npm run links && npm run e2e && npm run lhci` en verde.
- [ ] DNS, SSL y correo comprobados (sección «Registros DNS»).
- [ ] `curl -I` de la redirección de `/`.
- [ ] Search Console: propiedad verificada, sitemap `https://<dominio>/sitemap-index.xml` enviado.
- [ ] Rich Results Test sobre `/sillas-ergonomicas` (FAQPage) y `/catalogo` (BreadcrumbList).
- [ ] Monitor de disponibilidad activo con una alerta de prueba.
```

- [ ] **Paso 2: Checkpoint**

```bash
git add docs/operacion.md
```
Mensaje propuesto: `docs: añade operación, DNS, mantenimiento y traspaso`

---

### Tarea 7: Infraestructura (manual, la hace el usuario)

No es código: son cuentas y DNS. El orden importa porque el correo del dominio sirve para crear el resto de cuentas.

- [ ] **Paso 1:** Dominio registrado **a nombre del cliente** (lo paga él). Apuntar sus nameservers a Cloudflare (plan Free).
- [ ] **Paso 2:** Google Workspace: MX, SPF, DKIM y DMARC en Cloudflare DNS según `docs/operacion.md`. Comprobar con `dig` y un correo de prueba a Gmail (SPF y DKIM en `PASS`).
- [ ] **Paso 3:** Organización de GitHub del proyecto; subir el repositorio (privado hasta el pago final, cláusula 9). Activar Dependabot y las alertas de seguridad.
- [ ] **Paso 4:** Cloudflare Pages conectado al repositorio: comando `npm run build`, salida `dist`. Añadir el dominio personalizado.
- [ ] **Paso 5:** Monitor de disponibilidad con plan gratuito que permita uso comercial (verificar términos) y una alerta de prueba.
- [ ] **Paso 6:** Completar el inventario de `docs/operacion.md` con cuentas, titulares y accesos.

---

### Tarea 8: Verificación final

- [ ] **Paso 1: Todo en verde**

Run: `npm run audit && npm run verify && npm run build && npm run links && npm run e2e && npm run lhci`
Expected: `found 0 vulnerabilities`; `0 errors`; `Test Files  17 passed (17)` y `Tests  127 passed (127)`; `Complete!`; `Enlaces internos correctos en 10 páginas.`; `152 passed`; Lighthouse sin fallos.

- [ ] **Paso 2:** La puesta en marcha (hito H3) sigue la lista «Puesta en marcha» de `docs/operacion.md`.
