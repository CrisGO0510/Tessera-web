# Tessera — Plan de implementación (índice)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sitio estático de Tessera en Astro (landing, catálogo con páginas por categoría y comparador) que cumpla todos los requerimientos del contrato y del diseño aprobado, con SEO técnico completo y datos escalables en Content Collections.

**Architecture:** Astro 7 en modo estático. El contenido escalable (sillas, categorías, testimonios, FAQ…) vive en Content Collections con esquemas Zod estrictos y una validación propia de referencias que rompe el build. Toda la lógica está en módulos TypeScript puros (`src/lib/`) compartidos por el build y el cliente; la interactividad son custom elements en TS (`src/scripts/`). Estilos en SCSS con tokens del diseño emitidos como custom properties.

**Tech Stack:** Astro 7.3 · TypeScript 6.0 (strictest) · Zod 4 (vía `astro/zod`) · SCSS (Dart Sass 1.105) · ESLint 10 + typescript-eslint 8 (typed) · Stylelint 17 · Vitest 5 + happy-dom · Playwright 1.63 + axe · Lighthouse CI · Cloudflare (hosting estático) · GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-09-26-tessera-landing-astro-design.md` (leerla antes de empezar; las referencias `spec §N` apuntan ahí).

---

## Fases

Cada fase deja el proyecto en verde (`npm run verify` y `npm run build` pasan) y es revisable por sí sola.

| # | Archivo | Resultado | Hito (spec §14.1) |
|---|---|---|---|
| 1 | `2026-09-26-tessera-01-base.md` | Proyecto, TS/ESLint/Stylelint/Vitest estrictos, SCSS, fuentes, layout, SEO base, header, footer, 404, redirección | — |
| 2 | `2026-09-26-tessera-02-datos.md` | Colecciones con esquemas estrictos, datos del prototipo migrados, `src/lib/` con tests, validación de referencias | — |
| 3 | `2026-09-26-tessera-03-landing.md` | `/sillas-ergonomicas` completa (bloques 01–07) con sus custom elements | H1 |
| 4 | `2026-09-26-tessera-04-catalogo.md` | `/catalogo` y `/catalogo/[faceta]` con filtros progresivos | H2 |
| 5 | `2026-09-26-tessera-05-comparador.md` | `/comparar` con tabla real y switch | H2 |
| 6 | `2026-09-26-tessera-06-calidad-infra.md` | Verificador de enlaces, e2e + axe, Lighthouse CI, CI, Dependabot, documento de operación, checklist de infraestructura y de puesta en marcha | H3 |

Orden obligatorio: 1 → 2 → (3, 4, 5 en cualquier orden) → 6. Las fases 3–5 dependen de las interfaces de la fase 2.

**Estado (2026-09-27):** las seis fases están ejecutadas en este repositorio y en verde (`verify`: 127 tests unitarios; `e2e`: 152; Lighthouse sin fallos). El código de cada plan es el mismo que está en el repo: se generó y sincronizó a partir de los archivos verificados. Los commits los hace el usuario (todo queda en *staging*).

## Convenciones para quien ejecuta

1. **Commits: los hace el usuario.** Nunca ejecutes `git commit` ni `git push`. Cada tarea termina en un paso **Checkpoint** con el `git add` exacto y un mensaje propuesto; ejecuta el `git add`, muestra el mensaje y sigue.
2. **Idioma:** identificadores, comentarios y textos en español (salvo APIs de terceros). Comentarios solo donde el *porqué* no es obvio.
3. **TypeScript sin escapatorias:** nada de `any`, `as T` (solo `as const`), `!`, `@ts-ignore` ni `@ts-expect-error`. Toda función exportada con tipo de retorno explícito. Si algo no tipa, se corrige el diseño del código, no se silencia el compilador.
4. **Tipos de contenido derivados:** usa `CollectionEntry<'…'>` y `Pick<…>` de esos tipos, siempre con `import type` para que Vitest nunca cargue `astro:content`.
5. **Lógica fuera del `.astro`:** el frontmatter solo obtiene datos y llama a funciones de `src/lib/`; los `<script>` solo importan y registran un custom element.
6. **TDD en `src/lib/` y `src/scripts/`:** test que falla → implementación mínima → test en verde.
7. **Fuente de verdad visual:** `Tessera Landing SEO.dc.html` del proyecto de Claude Design (copia de trabajo: pedir al usuario o leerla con DesignSync, proyecto `d8ca6346-a891-44d1-82a8-41692683253c`). Los estilos de cada componente del plan salen de ahí; si encuentras una diferencia con el plan, manda el diseño y avisa.
8. **No inventar copy:** los textos son los del diseño aprobado o los de las colecciones. Los datos del prototipo son de ejemplo y se sustituyen por los reales del usuario.

## Mapa de archivos

```text
tessera/
  package.json · tsconfig.json · astro.config.ts · eslint.config.ts · vitest.config.ts
  .stylelintrc.json · .node-version · .gitignore · .editorconfig
  playwright.config.ts · lighthouserc.json                      (fase 6)
  .github/workflows/ci.yml · .github/dependabot.yml             (fase 6)
  docs/operacion.md                                              (fase 6)
  public/_redirects · public/favicon.svg
  scripts/verificar-enlaces.ts                                   (fase 6)
  src/
    content.config.ts                                            (fase 2)
    content/                                                     (fase 2)
      sillas/<slug>.md · testimonios/<id>.md
      categorias.json · destacados.json · veredictos.json · ajustes.json
      faqs.json · pasos.json · necesidades.json
    assets/sillas/*.png · assets/testimonios/*.png
    data/site.ts
    lib/
      contacto.ts       URL de WhatsApp por contexto y mailto               (fase 1)
      dom.ts            consulta DOM tipada y registro de custom elements   (fase 1)
      seo.ts            canonical y título                                  (fase 1)
      schema.ts         JSON-LD tipado                                      (fase 1, ampliado en 2)
      formato.ts        rangos, grados, números en letras                   (fase 2)
      catalogo.ts       filtros AND, recuentos, query                        (fase 2)
      comparador.ts     filas derivadas y diff                               (fase 2)
      validacion.ts     reglas de integridad (puro)                          (fase 2)
      contenido.ts      carga + validación + resolución (astro:content)      (fase 2)
      migas.ts          migas de pan para JSON-LD                            (fase 4)
      enlaces.ts        verificador de enlaces y anclas (puro)               (fase 6)
    scripts/            custom elements: menu, portada, anatomia, experiencias, filtros, comparador
    styles/             _tokens.scss · _funciones.scss · _mixins.scss · _index.scss · global.scss
    layouts/BaseLayout.astro
    components/
      seo/  Seo.astro · JsonLd.astro · MigaDePan.astro
      ui/   EncabezadoSeccion.astro · CtaWhatsApp.astro · FranjaOscura.astro · BloqueConversion.astro
      layout/ Header.astro · Footer.astro
      landing/ · catalogo/ · comparador/
    pages/
      sillas-ergonomicas.astro · catalogo/index.astro · catalogo/[faceta].astro
      comparar.astro · 404.astro · robots.txt.ts
  tests/
    unit/  *.test.ts
    e2e/   *.spec.ts                                             (fase 6)
```

## Hallazgos verificados en un proyecto de prueba (2026-09-26)

- **Versiones compatibles:** `typescript-eslint` exige TypeScript `<6.1` y `@astrojs/check` admite `^5 || ^6`: se fija `typescript@~6.0.3` (TypeScript 7 no es compatible todavía).
- **`reference()` roto no rompe el build en Astro 7:** registra `[ERROR] Invalid content reference` y termina con código 0. Por eso existe `src/lib/validacion.ts` (spec §5.3).
- **`z.strictObject()` sí rompe el build** ante claves desconocidas (`Unrecognized key: "precio"`).
- **`image()` + ruta relativa** en frontmatter de `.md` con `glob()` genera AVIF/WebP correctamente.
- **ESLint con tipos en `.astro`:** TypeScript dentro de ESLint no resuelve los tipos de componentes `.astro` importados (salen como `error`), así que las reglas `no-unsafe-*` se apagan solo en `.astro`. `no-explicit-any`, `consistent-type-assertions` y `explicit-function-return-type` siguen activas y funcionan en el frontmatter. `astro check` cubre los tipos de los `.astro`.
- **Fuentes:** la API de fuentes de Astro (`fonts` + `<Font />`) con `fontProviders.fontsource()` autoaloja las fuentes y genera el `preload`; reemplaza a los paquetes `@fontsource/*`.
- **Scripts TS:** Node ≥ 24 ejecuta `.ts` directamente (`node scripts/x.ts`), sin `tsx`.
- **Imágenes marcador del proyecto de diseño:** `DesignSync get_file` las devuelve truncadas (límite de 256 KiB). Hay que descargarlas a mano desde Claude Design o usar las generadas en la fase 2.

## Hallazgos al ejecutar (2026-09-27), ya incorporados a los planes

- **Mixins con variables:** `font: 400 $tamano / $alto` es una división de Sass; se usa `list.slash()` (fase 1).
- **Contraste WCAG AA (axe):** ajuste mínimo de seis textos pequeños del diseño: `gris-claro` `#8a93a8` → `#656e89`, `hielo(45%)` → `hielo(48%)`, nota de WhatsApp 0,75 → 0,8 (fases 1 y 3).
- **CLS:** colapsar el menú móvil y el panel de filtros con JS al cargar movía toda la página (CLS 0,15 y 0,6). `<html data-js>` desde un script inline en `<head>` y `<details>` de filtros cerrado con `::details-content` en escritorio (fases 1 y 4).
- **Área táctil de los indicadores:** a 33 px entre centros, las áreas de 44 px se pisaban; `area-tactil($minimo, $ancho)` reparte el tramo (fases 1 y 3).
- **`aria-pressed` en `.astro`:** `astro check` exige los literales `'true' | 'false'`.
- **Stylelint y `:global()`:** permitido con `ignorePseudoClasses: ["global"]`; en las imágenes se prefiere pasar la clase a `<Picture>`, que la aplica al `<img>`.
- **`astro preview` en Playwright:** usar `--ignore-lock`; Astro 7 deja un lock si un preview anterior siguió vivo.

## Hallazgos de la revisión final de código (2026-09-27), corregidos

- **Crítico — JSON editado a mano:** el loader `file()` de Astro 7 solo registra en el log un JSON inválido, una entrada sin `id` o un `id` repetido; el build salía en verde y se publicaba contenido incompleto o viejo. `contenido.ts` relee los JSON en crudo y los valida (`problemasArchivoJson`, `entradasDesincronizadas`), más `prerenderConflictBehavior: 'error'` (fase 2).
- **Ids con espacios:** todas las colecciones `file()` exigen `id` en formato slug (fase 2).
- **Una sola fuente en anatomía:** los ajustes pueden derivar su rango de la spec de la silla (`spec` en `ajustes.json`, `rangoAjuste`) (fases 2 y 3).
- **Textos del catálogo derivados:** total, garantía común y franja «Compara las N de <respaldo>» salen de los datos (fases 2 y 4).
- **Mínimos de contenido:** al menos una FAQ, paso, necesidad, veredicto, ajuste y testimonio destacado (fase 2).
- **Foco y teclado:** el foco no cae al `<body>` al deshabilitarse una flecha o quitar un chip; Ctrl/Cmd+clic en los filtros abre otra pestaña; el menú se cierra al elegir un enlace; la marquesina se pausa con `:focus-within` (fases 1, 3 y 4).
- **Listeners:** un `AbortController` por conexión en todos los custom elements (fases 3 y 4).
- **HTML y SEO:** sin `<h2>` dentro de `<th>`; la miga de `/catalogo` ya no repite URL en el `BreadcrumbList`; `aria-current="true"` en las opciones activas; chips con `aria-label` «Quitar filtro: …» (fases 4 y 5).
- **E2E:** móvil a 375 px, todas las páginas de categoría, recuentos leídos del contenido, precios buscados con `textContent` (fase 6).
