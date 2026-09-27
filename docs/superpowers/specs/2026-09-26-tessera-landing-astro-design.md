# Tessera — landing, catálogo y comparador en Astro

- **Fecha:** 2026-09-26
- **Estado:** diseño visual **aprobado por el cliente**; diseño técnico aprobado en conversación. Alcance = las tres pantallas del diseño aprobado. Trazabilidad de requerimientos en §15.
- **Marco contractual:** contrato de prestación de servicios con el cliente (landing de Tessera, 3 semanas desde la entrega de materiales, aprobación por fases a cargo de un delegado del cliente). Restricciones en §2.1; operación en §13; entregas en §14.
- **Fuente de diseño:** proyecto de Claude Design «Tienda de sillas online» (`d8ca6346-a891-44d1-82a8-41692683253c`), archivo `Tessera Landing SEO.dc.html` + `design_handoff_tessera/README.md`.

## 1. Objetivo

Recrear en Astro las tres pantallas del handoff (landing, catálogo, comparador) con dos prioridades:

1. **SEO**: HTML indexable servido estático, un `<h1>` por página, URLs de faceta propias, JSON-LD.
2. **Escalabilidad de datos**: agregar o cambiar una silla o una categoría es editar un archivo de contenido; páginas, recuentos, sitemap y JSON-LD se regeneran en el build.

Tessera no tiene carrito ni precios públicos: la conversión es un CTA a WhatsApp con un asesor, que cotiza.

**Alcance:** el diseño aprobado, tal cual: landing, catálogo (con sus páginas de categoría) y comparador. No se modifica el diseño; donde el diseño no define algo (responsive, destino de enlaces sin página, estado vacío), la spec decide dentro de su lenguaje visual (§6.1, §8.1).

### Fuera de alcance

- Carrito, pagos, cuentas de usuario, formularios.
- Selección libre de modelos en el comparador (compara los modelos fijados en datos).
- Ordenamiento del catálogo (solo etiquetado en el diseño).
- Fichas de producto `/sillas/[slug]`: no están en el diseño aprobado. Sus enlaces se resuelven en §6.1.
- CMS: el catálogo lo mantiene el desarrollador editando las Content Collections en el repo.

## 2. Decisiones tomadas

| Tema | Decisión |
|---|---|
| Framework | Astro, `output: 'static'` (SSG). Sin servidor. |
| Datos | **Content Collections** (Content Layer API) con esquemas Zod. |
| Esquemas de datos | Los de §5 son una propuesta; se ajustan a los catálogos reales que entrega el cliente como materiales (§14.2). |
| Mantenimiento del catálogo | El usuario, editando archivos en `src/content/`. Sin CMS. |
| Lenguaje | **TypeScript en todo** (build y cliente). Cero archivos `.js`/`.mjs`. Sin `any`. Tipos obligatorios (ver §3). |
| Estilos | **SCSS** (Dart Sass, sistema de módulos `@use`). |
| UI interactiva | Sin framework de UI. Custom elements en TypeScript. |
| Datos del prototipo | Son de ejemplo. Los catálogos reales llegan con los materiales del cliente. |
| Hosting | Cloudflare, plan gratuito (§13). |
| Precios | **No se publican.** La cotización es 100 % por el asesor (WhatsApp). No hay campo de precio en los datos ni flag para mostrarlo; si algún día se publican, se añade como campo opcional. |

### 2.1 Restricciones que impone el contrato de servicios

| Cláusula | Qué dice | Consecuencia en el diseño |
|---|---|---|
| 1. Objeto | «Landing Page» + configuración del entorno digital + enlaces directos de **WhatsApp y correo** | Alcance = el diseño aprobado (landing + catálogo + comparador). El diseño no tenía enlace de correo: se cubre con enlaces existentes del diseño que pasan a `mailto:` (§6.1). |
| 2 y 6. Costos externos | Dominio, Google Workspace e infraestructura por encima de planes gratuitos los paga el cliente, previa aprobación | Todo el stack debe caber en planes gratuitos **que permitan uso comercial** (§13). |
| 4. Mantenimiento | Incluye servidor/DNS, SSL, actualizaciones de seguridad de dependencias, bugs. **No incluye** cambios de diseño ni edición de contenido | Automatizar desde el día 1 lo que se cobra como mantenimiento (actualizaciones de dependencias, monitoreo). Cada cambio de contenido es trabajo aparte: editar un archivo de la colección. |
| 5. Google Workspace | El desarrollador configura MX, SPF y DKIM | DNS en Cloudflare con esos registros (§13). |
| 7. Plazos | 3 semanas desde la entrega de materiales; no incluye procesar imágenes no aptas para web | La lista de materiales (§14.2) debe salir pronto y con especificaciones de fotos. `astro:assets` resuelve formatos y tamaños; retoque y fondos no. |
| 7. Cambios | Fase aprobada = fase cerrada; modificarla se cobra aparte | El plan se organiza en hitos con aprobación escrita del delegado (§14.1). |
| 8. Contenido | El cliente es responsable legal del contenido | Garantía, devoluciones y testimonios los valida el cliente; no se publican textos de ejemplo. |
| 9. Propiedad intelectual | Los derechos patrimoniales del código se ceden tras el pago total | Repo privado y bajo control del desarrollador hasta el pago final (§13). |
| 10. Salida | Traspaso de GitHub, hosting y dominio en ≤ 10 días hábiles | Cuentas dedicadas al proyecto y documento de operación desde el inicio (§13). |
| 11. Garantía | 3 meses contra bugs | Refuerza la política de tests y verificación (§11). |

## 3. TypeScript estricto

### 3.1 Configuración

- `tsconfig.json` extiende `astro/tsconfigs/strictest` (incluye `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`, etc.).
- `allowJs: false`. Alias de ruta `@/*` → `src/*`.
- Archivos de configuración en TypeScript: `astro.config.ts`, `eslint.config.ts`, `vitest.config.ts`, `playwright.config.ts`.

### 3.2 Lint (typescript-eslint, configuración con tipos)

- Presets: `strictTypeChecked` + `stylisticTypeChecked` de `typescript-eslint`, y `eslint-plugin-astro`.
- Reglas en `error`:
  - `@typescript-eslint/no-explicit-any`
  - `@typescript-eslint/no-unsafe-*` (assignment, member-access, call, return, argument)
  - `@typescript-eslint/explicit-function-return-type`
  - `@typescript-eslint/explicit-module-boundary-types`
  - `@typescript-eslint/no-non-null-assertion`
  - `@typescript-eslint/consistent-type-assertions` con `assertionStyle: 'never'` salvo `as const` (se permite `as const`; se prohíben los casts `as T`)
  - `@typescript-eslint/consistent-type-imports`
- Los `// eslint-disable` requieren descripción (`@eslint-community/eslint-comments/require-description`).

### 3.3 Reglas de código

- **Lógica fuera del `.astro`.** Toda lógica vive en módulos `.ts` (`src/lib/`, `src/scripts/`). Los `<script>` de los componentes solo importan y registran; así la lógica cliente queda bajo el mismo type-check, lint y tests que la del build.
- **Tipos de contenido derivados, nunca duplicados.** Se usan `CollectionEntry<'sillas'>` y `z.infer<>`; no se reescriben interfaces que ya definen los esquemas.
- **Cada componente declara `interface Props`.**
- **DOM tipado sin casts.** Un helper `consulta(raiz, selector, Constructor)` valida con `instanceof` y lanza un error descriptivo si no encuentra el elemento o su tipo no coincide.
- **Datos servidor → cliente** por atributos `data-*` leídos con parsers tipados. No se usa `define:vars` (desactiva el bundling del script).
- **`<script>` dentro de `.astro`**: ESLint los expone como archivos virtuales (`**/*.astro/*.ts`) fuera del proyecto TS, así que se les aplica `disableTypeChecked`. Es seguro porque solo contienen `import` + registro (regla de arriba). El frontmatter de los `.astro` sí lleva lint con tipos; se valida con una prueba temprana en la fase 1 del plan.

### 3.4 Scripts de verificación

```text
npm run check        → astro check        (tipos de .astro y .ts, esquemas de contenido)
npm run lint         → eslint .
npm run lint:styles  → stylelint "src/**/*.{scss,astro}"
npm run test         → vitest run
npm run verify       → check + lint + lint:styles + test
npm run build        → astro check && astro build
npm run links        → verificador de enlaces internos sobre dist/ (rutas y que cada #ancla exista como id en la página destino)
npm run lhci         → Lighthouse CI sobre dist/ con los presupuestos de §9
npm run e2e          → playwright test (webServer: astro preview) + axe por ruta
```

`build` falla si hay errores de tipos, si algún archivo de contenido viola su esquema o si alguna referencia entre colecciones no existe (§5.3). `links` y `lhci` corren en local sobre el build y también en CI (§13).

### 3.5 Configuración de herramientas sin `.js`

- `eslint.config.ts` requiere ESLint ≥ 9.18 con `jiti` instalado.
- Herramientas sin soporte TS de configuración usan JSON: `.stylelintrc.json`, `lighthouserc.json`.

## 4. Estilos (SCSS)

- Dependencia `sass`; estilos en `<style lang="scss">` scoped por componente.
- Sistema de módulos: `@use` / `@forward`. Prohibido `@import` (deprecado en Dart Sass).
- **Tokens**: los del handoff (color, tipografía, espaciado, radios, sombras, duraciones) se definen en mapas SCSS y se emiten como **custom properties CSS** en `:root`. Así los valores que cambian en ejecución (p. ej. el gradiente de la silla activa en la portada) se asignan por variable CSS.
- **Mixins**: presets tipográficos (`h1`, `h2`, `h2-serif`, `etiqueta-mono`, `cuerpo`…), breakpoints, `pill`, `foco-visible`, `movimiento-reducido`.
- Inyección automática de tokens/mixins en cada componente con `vite.css.preprocessorOptions.scss.additionalData`.
- **Lo inyectado no emite CSS.** `_tokens.scss`, `_mixins.scss` e `_index.scss` solo contienen mapas, funciones y mixins; cada `<style>` de Astro se compila por separado, así que cualquier regla ahí se duplicaría por componente. La emisión de custom properties a `:root` vive en `global.scss`, que `BaseLayout` carga una sola vez.
- Lint de estilos: `stylelint` + `stylelint-config-standard-scss` + `postcss-html` (para leer los `<style>` de los `.astro`).

```text
src/styles/
  _tokens.scss       mapas de tokens (sin salida CSS)
  _mixins.scss       tipografía, breakpoints, pill, foco, movimiento reducido (sin salida CSS)
  _index.scss        @forward de tokens y mixins (lo que inyecta additionalData)
  global.scss        emisión de tokens a :root, reset, body, fuentes, scroll-padding-top: 80px
```

## 5. Modelo de datos (propuesta — se ajusta a los catálogos reales)

Archivos en `src/content/`, esquemas en `src/content.config.ts`. Loaders `glob()` y `file()` de `astro/loaders`; `z` de `astro/zod`.

### 5.1 Colecciones

| Colección | Loader | Archivo(s) | Contenido |
|---|---|---|---|
| `sillas` | `glob()` | `sillas/<slug>.md` | Una silla por archivo, **solo frontmatter** (sin cuerpo: no hay fichas). Se usa `.md` porque es el formato donde `image()` resuelve rutas relativas de forma documentada. |
| `categorias` | `file()` | `categorias.json` | Facetas del catálogo: id, slug de URL, grupo, etiqueta, `h1`, intro, meta title/description, texto de guía (bloque C3). **Toda categoría genera su página indexable** (§6). |
| `destacados` | `file()` | `destacados.json` | **Una sola entrada** con tres campos que dicen qué sillas aparecen dónde: `portada` (`.min(1)`), `muestra`, `comparador` (`.length(3)`, la tabla es de 3 columnas) — listas de `reference('sillas')`. |
| `veredictos` | `file()` | `veredictos.json` | Bloque X2: perfil («Si es tu primera silla buena»), `silla: reference('sillas')` y razón. |
| `ajustes` | `file()` | `ajustes.json` | Los ajustes del bloque de anatomía: título, rango, porcentaje de barra, descripción y **coordenadas `x`/`y` (%) del punto** sobre la foto. |
| `testimonios` | `glob()` | `testimonios/<id>.md` | Cita, texto ampliado, autor, meta, `silla: reference('sillas')` (opcional para pedidos de empresa), antigüedad, objeción que cubre (`horas` / `estatura` / `clima`), foto + alt, `destacado` (los 3 visibles de entrada). |
| `faqs` | `file()` | `faqs.json` | Pregunta y respuesta, en orden. |
| `pasos` | `file()` | `pasos.json` | Los 3 pasos de entrega. |
| `necesidades` | `file()` | `necesidades.json` | Tarjetas del bloque 02; cada una con `categoria: reference('categorias')` (de ahí sale su URL). |

Configuración no editorial en `src/data/site.ts` (tipado con `satisfies`): `mercado` (`locale`, país), número de WhatsApp, **correo de contacto**, navegación principal, columnas del footer, `autoplayPortada` (por defecto `true`), URL del sitio.

Los loaders `file()` sobre arrays JSON requieren un `id` único por entrada.

### 5.2 Esquema propuesto de `sillas`

```ts
// Boceto: los nombres y campos definitivos salen de los catálogos reales del cliente.
const sillas = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/sillas' }),
  schema: ({ image }) =>
    z.strictObject({
      nombre: z.string(),
      resumen: z.string(),                 // línea corta: portada, comparador
      descripcion: z.string(),             // tarjeta de catálogo
      pitch: z.string(),                   // tarjeta de la muestra en la landing
      imagen: z.object({ src: image(), alt: z.string().min(1) }),
      categorias: z.array(reference('categorias')).min(1),
      estatura: z.object({ min: z.number(), max: z.number() }),
      specs: z.object({
        respaldo: z.string(),
        alturaAsiento: z.object({ min: z.number(), max: z.number() }), // cm
        reposabrazos: z.string(),
        reclinacionMax: z.number().int(),  // grados
        lumbar: z.string(),
        garantiaAnios: z.number().int(),
        entregaArmada: z.boolean(),
      }),
      tema: z.object({ gradiente: z.tuple([z.string(), z.string(), z.string()]) }).optional(),
    }),
});
```

### 5.3 Reglas del modelo

- **Esquemas estrictos.** Todas las colecciones usan `z.strictObject()`: una clave que el esquema no conoce (p. ej. un `precio` añadido a mano) rompe el build en vez de descartarse en silencio.
- **Una sola fuente para las specs.** Rangos formateados («1.55 – 1.80 m», «42 – 50 cm»), filas del comparador y textos derivados salen de los campos numéricos/estructurados de cada silla. Ningún componente escribe una spec a mano.
- **`diff` del comparador se calcula**: una fila es «igual» si todas las sillas comparadas tienen el mismo valor formateado.
- **Imágenes en `src/assets/`**, referenciadas por ruta relativa desde el archivo de contenido, para que `astro:assets` genere AVIF/WebP, `srcset`, `width`/`height`. Una foto maestra por silla; los recortes 1:1 (catálogo) y 4:3 (landing) se generan en build.
- **Referencias validadas de forma explícita.** En Content Layer, `reference()` solo valida la forma del id, no que la entrada exista: `getEntry()` devolvería `undefined` en silencio. Por eso `src/lib/contenido.ts`, la primera vez que se consulta en el build, **valida todas las referencias de todas las colecciones** (no solo las que alguna página resuelve) y lanza un error descriptivo (colección, id que falta, entrada de origen). También falla si una categoría queda sin sillas, porque generaría una página indexable vacía. Así una silla que apunta a una categoría inexistente, o un destacado a una silla inexistente, rompe el build.
- **Slug de URL ≠ id interno** en categorías (p. ej. id `intensivo` → `/catalogo/uso-intensivo`). El mapeo vive en `categorias.json`, no en código.

### 5.4 Funciones puras (`src/lib/`)

| Módulo | Responsabilidad |
|---|---|
| `contenido.ts` | Resolución de referencias con error si falta la entrada (§5.3); consultas tipadas por colección (sillas ordenadas, destacados resueltos). |
| `catalogo.ts` | `cumpleFiltros(tagsSilla, activos)` (AND), recuento por categoría, ruta de faceta. **Compartida por build y cliente.** |
| `comparador.ts` | Definición de filas (etiqueta + extractor de valor) y derivación de filas con `diff`. |
| `formato.ts` | Rangos de estatura/altura (cm, m) y grados, con separadores de `site.mercado.locale`; total de sillas en letras para el `<h2>` de la muestra («Tres de las doce sillas…»). |
| `contacto.ts` | `mailto:` y URL `https://wa.me/<número>?text=` con mensaje prellenado según el lugar del diseño donde aparece: `barra` (barra de categorías), `entrega` (bloque 06), `comparador` (X2). Son las únicas tres apariciones del sitio; el footer no lleva WhatsApp. |
| `schema.ts` | Constructores de JSON-LD tipados con `schema-dts`. |
| `dom.ts` | Helpers de consulta DOM tipados (§3.3). |

## 6. Rutas y estrategia de facetas

| Ruta | Página | Indexable | Origen |
|---|---|---|---|
| `/` | Redirección **301** a `/sillas-ergonomicas` | — | `public/_redirects` del hosting (el `redirects` de Astro en modo estático genera un meta refresh, no un 301) |
| `/sillas-ergonomicas` | Landing (bloques 01–07), URL del diseño aprobado | sí | todas las colecciones |
| `/catalogo` | Catálogo completo (C1–C3) | sí | `sillas`, `categorias` |
| `/catalogo/[faceta]` | Una página por categoría | sí | `getStaticPaths()` sobre `categorias` |
| `/comparar` | Comparador (X1–X2) | sí | `destacados.comparador`, `veredictos` |
| `/404` | Página de error | no | — |

Cada página de faceta tiene su propio `<h1>`, intro, meta title/description, canonical a sí misma y entrada en el sitemap.

### 6.1 Destino de los enlaces del diseño que no tienen página

Ningún enlace del sitio puede apuntar a una ruta inexistente (lo verifica `npm run links`). Los textos del diseño se conservan; solo se fija su destino:

| Enlace del diseño | Destino |
|---|---|
| «Ver la ficha de {nombre}» (muestra de la landing), «Ver ficha» (comparador) | `/catalogo#<slug>`: la tarjeta de la silla en el catálogo, resaltada con `:target` |
| Tarjetas de la rejilla del catálogo | Sin enlace (`<article>`), porque no hay ficha a la que ir |
| Wordmark «TESSERA» del header y del footer | `/sillas-ergonomicas` (nunca `/`, que es una redirección) |
| Nav «Sillas» / «Ver catálogo» / «Ver las N sillas» | `/catalogo` |
| Nav «Cómo se ajusta» · footer «Guía de ajustes» | `/sillas-ergonomicas#anatomia` |
| Nav «Comparar» · «Abrir el comparador» · footer «Comparador de sillas» | `/comparar` |
| Nav «Guías» · footer «Cómo elegir tu silla» y «Medidas y estatura» | `/catalogo#cat-guia` |
| Header «Empresas» · footer «Ventas a empresa» | `mailto:` al correo de contacto con asunto «Ventas a empresa» |
| Footer «Entrega e instalación» | `/sillas-ergonomicas#entrega` |
| Footer «Garantía y devoluciones» | `/sillas-ergonomicas#faq` |
| Footer «Contacto» | `mailto:` al correo de contacto — cubre el requisito de correo del contrato (cláusula 1) |
| Chips de categoría, tarjetas de necesidad, columna «Sillas» del footer | `/catalogo/<slug>` de su categoría |

### Filtros múltiples sin facetas duplicadas

El filtrado es AND, así que agregar un filtro solo reduce resultados:

1. **Todas las opciones del aside son enlaces reales** (`<a href="/catalogo/<slug>">`): sin JS navegan a la faceta, y las facetas quedan enlazadas entre sí para el rastreo. En `/catalogo` el clic navega.
2. **Filtros adicionales dentro de una faceta = estrechamiento en cliente.** En una página de faceta, `<ts-filtros>` intercepta el clic en las demás opciones y estrecha en vez de navegar. La página de faceta ya contiene en su HTML todas las sillas posibles; un custom element oculta las que no cumplen (`cumpleFiltros`) y refleja el estado en la query con el **slug de URL** de cada categoría (`/catalogo/malla?y=lumbar`, varios separados por coma) con `history.replaceState`. Al cargar, lee la query y aplica el estado. La canonical estática sigue apuntando a `/catalogo/malla`: las combinaciones nunca generan URLs indexables.
3. **Quitar el filtro base** = navegar a la faceta restante (conservando los extra en la query) o a `/catalogo`.
4. **No se generan páginas de combinaciones.** Si más adelante una combinación tiene demanda de búsqueda propia, se diseña aparte (fuera de alcance).
5. **Estado vacío**: si una combinación en cliente da cero, se muestra el estado vacío de §8.1.

Recuentos del aside: el HTML trae los recuentos de la página calculados en build; con filtros extra activos, `<ts-filtros>` los recalcula en cliente con la misma `cumpleFiltros` de `src/lib/catalogo.ts`.

## 7. SEO técnico

- `site` en `astro.config.ts`; `trailingSlash: 'never'` + `build.format: 'file'` (URLs sin barra final en canonical, sitemap y `href` internos), con redirecciones del hosting coherentes.
- `@astrojs/sitemap` excluyendo páginas no indexables.
- `robots.txt` generado desde un endpoint `src/pages/robots.txt.ts`.
- `<html lang>` desde `site.mercado.locale` (`es-MX` o `es-CO`, §12 #1).
- Componente `Seo.astro`: title, description, canonical, Open Graph, Twitter card, `robots` cuando aplique.
- Fuentes autoalojadas (Fontsource): Archivo 400–800, Newsreader 300 + italic, IBM Plex Mono 400/500; subset latino, `font-display: swap`, preload solo de Archivo 700.
- Todo el contenido textual en el HTML servido: respuestas de FAQ (`<details>` nativo), textos ampliados de testimonios y testimonios extra, guía de categoría.

### JSON-LD (componente `JsonLd.astro` + `src/lib/schema.ts`)

| Tipo | Dónde | Nota |
|---|---|---|
| `Organization`, `WebSite` | todas las páginas | `Organization.contactPoint` con teléfono de WhatsApp y correo. |
| `BreadcrumbList` | catálogo y facetas | Miga visible y JSON-LD salen de la misma función. |
| `FAQPage` | landing | Google limita el resultado enriquecido de FAQ a sitios de gobierno y salud; se incluye igual por bajo costo. |

## 8. Interactividad (custom elements en TS)

Cada interacción es un custom element en `src/scripts/<nombre>.ts`, registrado desde el `<script>` del componente. El HTML funciona sin JS; el script mejora.

| Elemento | Comportamiento |
|---|---|
| `<ts-portada>` | Autoplay 5000 ms (0→…→N−1, cíclico; con N = 1 no hay autoplay ni indicadores), cancelado **permanentemente** al primer clic en un indicador; cambia gradiente de fondo (variable CSS), imagen activa e indicadores. Respeta `autoplayPortada` de `site.ts`. |
| `<ts-anatomia>` | Punto y fila de la lista escriben el mismo estado; sincroniza panel, barra y controles. |
| `<ts-experiencias>` | Paginación anterior/siguiente de a 3, «Leer más experiencias» (muestra las extra), «Ver más» por tarjeta con `aria-expanded`. Todo el texto está en el HTML. |
| `<ts-filtros>` | Estrechamiento en cliente descrito en §6. |
| `<ts-comparador>` | Switch «Solo lo que cambia» (`role="switch"`, `aria-checked`); oculta filas `diff: false`. |
| `<ts-menu>` | Menú del header por debajo de 900 px (§8.1). |

### 8.1 Lo que el diseño no define (decisiones dentro de su lenguaje visual)

Breakpoint único: **900 px**, donde el handoff indica que hacen falta decisiones propias.

| Pieza | Por debajo de 900 px |
|---|---|
| Header | Wordmark, «Ver catálogo» y un botón de menú (`aria-expanded`, `aria-controls`) siempre visibles; la nav principal y «Empresas» pasan al panel desplegable. El estado inicial lo pone el CSS con `<html data-js>` (script inline en `<head>`, antes del primer pintado) para no provocar CLS; `<ts-menu>` solo alterna. Sin JS el panel se muestra como lista. |
| Aside de filtros | Pasa encima de la rejilla como `<details>` «Filtros» cerrado por defecto; los chips activos y «limpiar filtros» quedan fuera, siempre visibles. El `<details>` llega cerrado desde el HTML y en escritorio su contenido se muestra con `::details-content` (bajo `@supports`), sin JS. |
| Tabla del comparador | Scroll horizontal dentro de su contenedor, con la columna de etiquetas fija (`position: sticky; left: 0`). Sigue siendo `<table>`. |

**Estado vacío del catálogo** (cualquier ancho): nota en IBM Plex Mono «Ninguna silla cumple todos estos filtros» + el botón «limpiar filtros» existente.

## 9. Accesibilidad y rendimiento

### Accesibilidad (requisitos del handoff)

- `prefers-reduced-motion: reduce` detiene las dos marquesinas, la flecha «SIGUE» y el autoplay; la marquesina también se pausa en hover.
- Áreas táctiles ≥ 44 px en indicadores de portada y puntos de anatomía, sin cambiar el aspecto visual (pseudo-elemento de hit area).
- Copia duplicada de la marquesina con `aria-hidden="true"` e `inert`; palabra de fondo «ERGONÓMICAS» con `aria-hidden`.
- Comparador como `<table>` real con `<th scope="col">` / `<th scope="row">`.
- `alt` descriptivos obligatorios por esquema.
- Foco visible en todos los controles.
- Header `position: sticky; top: 0; z-index: 20` (en el prototipo estaba en `relative` solo por el lienzo de revisión).
- `scroll-behavior: smooth` en `html`, desactivado con `prefers-reduced-motion`; `scroll-padding-top: 80px` y `scroll-margin-top: 80px` en las secciones con `id`.
- Se eliminan las anotaciones de desarrollador del prototipo (URLs bajo los grupos de filtros) y la animación `tsRise`, declarada y sin uso.

### Rendimiento

- Imagen de portada activa inicial: `loading="eager"` + `fetchpriority="high"`; el resto `lazy`.
- Presupuestos (Lighthouse CI, móvil): LCP < 2.5 s, CLS < 0.1, TBT < 200 ms, JS < 20 KB gzip por página, SEO 100, accesibilidad ≥ 95.

## 10. Estructura del proyecto

```text
tessera/
  astro.config.ts
  eslint.config.ts
  tsconfig.json
  vitest.config.ts
  playwright.config.ts
  lighthouserc.json
  .stylelintrc.json
  .github/workflows/ci.yml
  .github/dependabot.yml
  docs/operacion.md
  public/_redirects
  src/
    content.config.ts
    content/
      sillas/<slug>.md
      testimonios/<id>.md
      categorias.json
      destacados.json
      veredictos.json
      ajustes.json
      faqs.json
      pasos.json
      necesidades.json
    assets/
      sillas/<slug>.{png,jpg}
      testimonios/<id>.jpg
    data/site.ts
    lib/          contenido.ts, catalogo.ts, comparador.ts, formato.ts, contacto.ts, schema.ts, dom.ts, migas.ts, enlaces.ts
    scripts/      portada.ts, anatomia.ts, experiencias.ts, filtros.ts, comparador.ts, menu.ts
    styles/       _tokens.scss, _mixins.scss, _index.scss, global.scss
    layouts/      BaseLayout.astro
    components/
      seo/        Seo.astro, JsonLd.astro, MigaDePan.astro
      ui/         EncabezadoSeccion.astro, FranjaOscura.astro, CtaWhatsApp.astro, BloqueConversion.astro
      layout/     Header.astro, Footer.astro
      landing/    Portada, BarraCategorias, Necesidades, Muestra, Anatomia, Experiencias, Entrega, Faq
      catalogo/   Cabecera, Filtros, Rejilla, Guia
      comparador/ TablaComparativa, Veredictos
    pages/
      sillas-ergonomicas.astro
      catalogo/index.astro
      catalogo/[faceta].astro
      comparar.astro
      robots.txt.ts
      404.astro
  tests/
    unit/        (Vitest: src/lib/*)
    e2e/         (Playwright + @axe-core/playwright)
```

## 11. Pruebas y verificación

- **Unitarias (Vitest)** sobre `src/lib/`: filtrado AND y recuentos, derivación de filas y `diff`, formato de rangos, URL de WhatsApp por contexto (`barra`, `entrega`, `comparador`), constructores de JSON-LD. TDD.
- **Contenido**: el esquema Zod es el contrato ejecutable; `astro check` / `astro build` fallan ante datos inválidos. Las referencias rotas y las categorías vacías las detecta la validación de `contenido.ts` durante el build (§5.3). La lógica de esa validación es una función pura sobre datos planos, testeada en Vitest sin `astro:content`.
- **E2E (Playwright)**: humo por ruta, un solo `<h1>`, canonical correcta, JSON-LD parseable, filtros (enlace + estrechamiento), switch del comparador, autoplay cancelado al clic.
- **Accesibilidad**: `@axe-core/playwright` en cada ruta.
- **Enlaces**: verificador de enlaces internos sobre `dist/` (ningún enlace a ruta inexistente).
- **Lighthouse CI** con los presupuestos de §9.
- Manual antes de publicar: Rich Results Test, envío de sitemap en Search Console.

## 12. Pendientes

Ninguno bloquea empezar: se avanza con los datos del prototipo y se sustituyen al llegar.

| # | Pendiente | Responsable | Afecta |
|---|---|---|---|
| 1 | **Mercado.** El copy del diseño habla de México («envíos a todo México», CDMX, Monterrey) y el contrato está en COP. Es un valor de configuración (`site.mercado`) más los textos; se fija al cargar los textos reales | usuario | `lang`, formatos, textos de envío, país en Search Console |
| 2 | Catálogos reales (sillas, categorías, testimonios, FAQ) y copy SEO por categoría | usuario | contenido final |
| 3 | Fotos reales: una de producto por silla (fondo neutro), 3 de ambiente, 1 frontal para anatomía (recalibrar puntos) | cliente (materiales) | contenido final |
| 4 | Analítica: Cloudflare Web Analytics (visitas, sin cookies) va incluida; medir clics de WhatsApp requiere GA4 u otra herramienta, y el contrato excluye marketing | usuario | medición de conversión (opcional) |

**Totales derivados:** ningún número de sillas se escribe a mano («Tres de las doce», «Ver las 12 sillas», «{n} de 12», «Mostrando {n} de 12»): todos salen del tamaño de la colección, porque el catálogo real puede no tener 12.

## 13. Infraestructura, operación y traspaso

Todo en planes gratuitos que permiten uso comercial (cláusulas 2 y 6). Descartado Vercel Hobby: sus términos lo limitan a uso no comercial.

| Pieza | Servicio | Notas |
|---|---|---|
| Repositorio | GitHub, **organización dedicada al proyecto** (no la cuenta personal) | La organización o el repo se transfieren completos (cláusula 10). Privado hasta el pago final (cláusula 9). |
| Hosting | Cloudflare (sitio estático), plan gratuito | SSL automático. Un despliegue de preview por rama: URL de revisión para el delegado (§14.1). |
| Dominio y DNS | Dominio **registrado a nombre del cliente** (lo paga él); DNS en Cloudflare | Registros de Google Workspace: MX, SPF (TXT), DKIM (TXT generado en la consola de Workspace). Recomendado añadir DMARC `p=none` (un TXT; hoy lo piden Gmail y Yahoo). |
| CI | GitHub Actions | En cada PR: `verify`, `build`, `links`, `lhci`, `e2e`. |
| Dependencias | **Dependabot** (nativo de GitHub; se transfiere con el repo, sin instalar apps) + `npm audit --omit=dev --audit-level=high` en CI | Cubre «actualizaciones de seguridad de dependencias» del mantenimiento. |
| Disponibilidad | Monitor HTTP externo con plan gratuito (verificar que sus términos permitan uso comercial) | Cubre «monitoreo de disponibilidad». |
| Cuentas | Creadas con un correo del proyecto (idealmente del dominio del cliente, tras configurar Workspace); el desarrollador como administrador | Traspaso = cambiar de propietario, no migrar. |

**Documento de operación** (`docs/operacion.md`, en el repo): inventario de servicios y quién es el propietario de cada uno, registros DNS, variables de entorno, cómo desplegar y revertir, cómo agregar una silla. Es el checklist de traspaso de la cláusula 10 y la guía del mantenimiento anual.

## 14. Entregas, aprobaciones y materiales

### 14.1 Hitos con aprobación escrita (cláusula 7)

Cada hito se aprueba por escrito (correo del delegado) sobre una URL de preview. Lo aprobado queda cerrado; cambiarlo se cotiza aparte.

| Hito | Se aprueba | Antes de |
|---|---|---|
| H0 | ✓ **Aprobado:** diseño de Claude Design (tres pantallas) | — |
| H1 | Base + landing completa con datos de ejemplo | catálogo y comparador |
| H2 | Catálogo + comparador | carga de contenido real |
| H3 | Contenido real cargado, QA pasado, dominio y correo funcionando | puesta en marcha (dispara el segundo 50 %) |

### 14.2 Lista de materiales para el delegado

El plazo de 3 semanas empieza con esta entrega completa, así que conviene enviarla cuanto antes. Los campos de cada silla salen del esquema de §5.2.

- **Marca:** logo en SVG, variante para fondo oscuro, favicon o su fuente.
- **Contacto:** número de WhatsApp del asesor, correo público, ciudad o zona de entrega en 48 h.
- **Mercado:** país y ciudades de entrega.
- **Catálogo:** por silla, los campos del esquema (nombre, descripciones, categorías, rango de estatura, specs). Sin precios. Además, qué sillas van en portada, muestra y comparador.
- **Categorías:** lista final y, por cada una, título, intro y texto de guía.
- **Textos legales y comerciales:** garantía, devoluciones y FAQ. Son compromisos del cliente (cláusula 8): «30 días de prueba» y «5 años de garantía» son texto de ejemplo del diseño.
- **Testimonios:** reales, con permiso de quien aparece; nombre, ciudad, silla y foto.
- **Fotos:** una de producto por silla, sobre fondo neutro, cuadrada, ≥ 1600 px de lado, sin marcas de agua, con la silla centrada ocupando como máximo el 70 % de la altura (de ella sale también el recorte 4:3 de la landing); 3 de ambiente; 1 frontal de la silla de anatomía. Las que no cumplan requieren tratamiento fuera del plazo (cláusula 7).
- **Accesos:** registrador del dominio, consola de administración de Google Workspace.

## 15. Trazabilidad de requerimientos

Cada requerimiento del contrato y del diseño aprobado, dónde se cumple y cómo se verifica. Verificación: **build** (falla el build), **unit** (Vitest), **e2e** (Playwright), **axe**, **lhci**, **manual** (checklist de H3).

### 15.1 Contrato

| Requerimiento | Cláusula | Dónde | Verificación |
|---|---|---|---|
| Landing de Tessera desplegada | 1 | §6 | e2e (humo por ruta) · manual |
| Enlace directo a WhatsApp | 1 | `CtaWhatsApp` + `contacto.ts` | unit (URL) · e2e (`href` a `wa.me` con el número de `site.ts`) |
| Enlace directo a correo | 1 | Footer «Contacto», «Empresas» (§6.1) | e2e (`mailto:` presente en todas las páginas) |
| Configuración del entorno digital (dominio, DNS, hosting) | 1 | §13 | manual |
| Registros MX, SPF, DKIM de Google Workspace | 5 | §13 | manual: `dig MX/TXT`, consola de Workspace («Autenticar correo»), correo de prueba a Gmail con SPF y DKIM en `pass` |
| SSL | 4 | Cloudflare | manual · monitor |
| Monitoreo de disponibilidad | 4 | §13 | manual (alerta de prueba) |
| Actualizaciones de seguridad de dependencias | 4 | Dependabot + `npm audit --omit=dev --audit-level=high` | CI |
| Solo planes gratuitos con uso comercial | 2, 6 | §13 | manual (inventario en `docs/operacion.md`) |
| Traspaso en ≤ 10 días hábiles | 10 | Organización de GitHub, cuentas del proyecto, `docs/operacion.md` | manual |
| Imágenes optimizadas para web | 7 | `astro:assets` (§5.3) | lhci |
| Garantía de 3 meses contra bugs | 11 | §3, §11 | `verify` + e2e en CI |

### 15.2 Diseño aprobado (handoff)

| Requerimiento | Dónde | Verificación |
|---|---|---|
| Un solo `<h1>` por página, jerarquía `h2`/`h3` real | componentes de página | e2e |
| Orden de bloques de la landing (01 → 07), sin reordenar | `sillas-ergonomicas.astro` | e2e (orden de `section[id]`) |
| Header sticky; móvil con «Ver catálogo» visible | `Header.astro`, §8.1, §9 | e2e (desktop y 375 px) |
| `/` redirige con 301 a la landing | `public/_redirects` (§6) | manual: `curl -I` sobre la URL de preview y de producción (`astro preview` no aplica `_redirects`) |
| Ningún enlace interno roto, incluidas las anclas | §6.1 | `npm run links` |
| Portada: autoplay 5 s, se cancela para siempre al primer clic en un indicador | `<ts-portada>` | e2e (reloj simulado) |
| Portada: gradiente, imagen e indicador sincronizados con transiciones del handoff | `<ts-portada>` + SCSS | e2e (estado) · revisión visual |
| «ERGONÓMICAS» decorativa, no se lee | `aria-hidden` | axe · e2e |
| Marquesinas sin costura; se detienen con `prefers-reduced-motion` y en hover | CSS + copia `aria-hidden`/`inert` | e2e (emulación de movimiento reducido) · axe · revisión visual (costura) |
| Flecha «SIGUE» se detiene con movimiento reducido | SCSS | e2e |
| Áreas táctiles ≥ 44 px (indicadores de portada, puntos de anatomía) | pseudo-elemento de hit area | e2e: `document.elementFromPoint()` en los bordes del cuadrado de 44 px alrededor del centro devuelve el control (el `boundingBox()` no incluye el pseudo-elemento) |
| Chips de categoría y tarjetas de necesidad = enlaces reales a facetas | §6.1 | e2e (`href` = `/catalogo/<slug>`) · links |
| Precios no visibles | sin campo de precio (§2), esquemas estrictos (§5.3) | build (clave desconocida rompe el build) · e2e (el `textContent` de `main` en cada ruta —incluidas todas las categorías y las FAQ cerradas— no contiene importes: `$` seguido de cifra, o cifra con `COP`/`MXN`; la palabra «precio» sí puede aparecer en la copy) |
| Anatomía: punto y fila escriben el mismo estado; puntos como datos | `<ts-anatomia>`, colección `ajustes` | e2e · build |
| Experiencias sin estrellas ni puntuaciones; ejes horas/estatura/clima | esquema de `testimonios` (`objecion` enum) | build · revisión |
| Todo el texto de experiencias (incluido «ver más» y extra) en el HTML | `Experiencias.astro` | e2e (con JS desactivado) |
| CTA de WhatsApp **exactamente dos veces** en la landing | barra de categorías + bloque 06 | e2e (enlaces a `wa.me` en toda la página = 2) |
| FAQ con `<details>` nativo; respuestas en el HTML servido; `FAQPage` JSON-LD | `Faq.astro`, `schema.ts` | e2e (JS desactivado, JSON-LD parseable) · unit |
| Anclas con scroll suave y compensación de 80 px del header | `global.scss` (suave desactivado con movimiento reducido) | e2e |
| Migas del catálogo con `BreadcrumbList` JSON-LD | `MigaDePan.astro` | e2e · unit |
| Cada categoría con URL propia, renderizada en build, con `h1`/texto propios y canonical | `/catalogo/[faceta]` | e2e · build |
| Combinaciones de filtros sin URLs indexables duplicadas | §6 (estrechamiento en cliente, canonical estática) | e2e (canonical con `?y=`) |
| Filtro AND; recuentos, chips activos, contador y «limpiar filtros» sincronizados | `<ts-filtros>`, `catalogo.ts` | unit · e2e |
| Sin anotaciones de desarrollador (URLs bajo los grupos de filtros) | `Filtros.astro`, §9 | revisión |
| Guía de categoría servida en HTML | `Guia.astro` | e2e (JS desactivado) |
| Comparador como `<table>` real con `th scope` | `TablaComparativa.astro` | axe · e2e |
| Switch «Solo lo que cambia» con semántica de switch; filas `diff` calculadas | `<ts-comparador>`, `comparador.ts` | unit · e2e · axe |
| Una sola fuente para las especificaciones técnicas | §5.3 | unit (derivaciones) · revisión de código (ningún componente escribe una spec) |
| `alt` descriptivos en todas las imágenes | esquemas (`alt` obligatorio) | build · axe |
| Tokens de color, tipografía, espaciado, radios y sombras del handoff | `_tokens.scss` | revisión visual |
| Responsive < 900 px de header, filtros y tabla | §8.1 | e2e (375 px) · revisión visual |
| Rendimiento y SEO técnico | §7, §9 | lhci (presupuestos) |

## 16. Ajustes de accesibilidad sobre el diseño aprobado

Detectados por axe y Lighthouse al ejecutar; son el mínimo para cumplir WCAG 2.1 AA (requerimiento de §9 y §15). El resto del diseño no cambia.

| Elemento | Diseño | Implementado | Motivo |
|---|---|---|---|
| Token `gris-claro` (anotaciones: «igual», nota del comparador, «sin filtros») | `#8a93a8` | `#656e89` | 2,75:1 sobre hielo → 4,52:1 |
| Barra legal del footer y contador de experiencias | `hielo(45%)` | `hielo(48%)` | 4,14:1 → 4,56:1 sobre tinta |
| Nota «responde en 3 min» del CTA de WhatsApp | opacidad 0,75 | 0,8 | 4,43:1 → ≥ 4,5:1 sobre el verde |
| Área táctil de los indicadores de la portada | 26 × 5 px | 44 px en vertical, 33 px en horizontal | El diseño los separa 33 px entre centros: 44 px en horizontal exigirían separarlos |

