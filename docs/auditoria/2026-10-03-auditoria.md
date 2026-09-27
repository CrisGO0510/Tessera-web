# Auditoría de Tessera — 3 de octubre de 2026

Análisis completo del sitio (calidad, pruebas, SEO, accesibilidad, conversión y responsive con
Playwright), los cambios aplicados en la rama `mejoras/auditoria-2026-10` y las propuestas que
quedan pendientes. Nada está commiteado: los cambios están en el árbol de trabajo para revisarlos.

## 1. Resumen

- **El sitio técnico está muy sano.** Lighthouse 98–100 en las cuatro categorías, LCP < 2 s,
  CLS ≈ 0, JS por debajo de 20 KB, sin errores de consola ni desbordes en 6 viewports.
- **Lo que impide salir a producción es contenido, no código:** dominio, WhatsApp y correo de
  ejemplo; fotos de producto que son degradados de relleno; testimonios inventados.
- **Pedidos del usuario, hechos:**
  1. Scroll **pantalla a pantalla** en la landing (escritorio: salta un bloque por gesto; móvil: anclaje suave).
  2. Fotos de silla de **cualquier proporción** (vertical, horizontal o cuadrada) sin perder la silla.

## 2. Estado de partida (antes de los cambios)

| Prueba | Resultado |
|---|---|
| `astro check` · ESLint · Stylelint | 0 errores |
| Vitest | 127/127 |
| Build + `npm run links` | 10 páginas, sin enlaces rotos |
| E2E Playwright (escritorio + móvil 375 px, axe WCAG 2.1 AA) | 152/152 contra el build |
| Lighthouse (landing, catálogo, malla, comparar) | Perf 99–100 · A11y 98–100 · BP 100 · SEO 100 |

Problemas de entorno encontrados:

- `npx playwright test` falla con «did not expect test.describe()» porque `node_modules` está
  instalado con **pnpm** mientras el repo versiona `package-lock.json` (npm, el que usa la CI).
  Funciona con `node node_modules/@playwright/test/cli.js test`. → Propuesta P4.
- Con `astro dev` abierto en el 4321, los E2E reutilizaban ese servidor (con la barra de
  desarrollo, que añade `<h1>`) y daban 9 falsos fallos. → **Corregido** (puerto 4322).

## 3. Cambios aplicados

### 3.1 Scroll pantalla a pantalla (landing)

- `<html data-snap-sections>` (prop `snapSections` de `BaseLayout`) activa el modo solo en `/sillas-ergonomicas`.
- **Escritorio** (≥ 900 px de ancho y ≥ 640 px de alto): `scroll-snap-type: y mandatory`; cada
  bloque mide `100svh − header` con el contenido centrado; portada + barra de categorías forman
  la primera pantalla; el footer se ancla por abajo.
- **Rueda del ratón:** con `mandatory`, Chromium devuelve al inicio del bloque un paso de rueda
  corto (~100 px) y el scroll parece atascado. `src/scripts/snap-sections.ts` convierte cada
  gesto en un salto al bloque siguiente/anterior y **deja scroll libre dentro de un bloque más
  alto que la pantalla** hasta su final. Respeta zoom (Ctrl), scroll horizontal y elementos con
  scroll propio; teclado, táctil y barra de scroll siguen nativos y cancelan el salto.
- **Scroll rápido sin lag** (corrección posterior): la primera versión bloqueaba la rueda 220 ms
  tras cada salto y alargaba el bloqueo con cada evento, así que al girar rápido la página se
  quedaba quieta hasta soltar la rueda, y el scroll suave nativo arrancaba lento. Ahora:
  - Cada evento se clasifica (`isNewImpulse`): la inercia del trackpad (deltas que decaen) se
    descarta; una pausa, un delta que vuelve a crecer o una muesca de rueda son intención.
  - Un gesto nuevo a mitad de salto se encola y se encadena al terminar: girar rápido avanza
    varios bloques seguidos.
  - Animación propia de 420 ms (easeOutCubic) con el snap desactivado mientras dura.
  - En el fondo de la página, subir ya no rebota (antes usaba scroll nativo y volvía atrás).

  | Escenario | Antes | Ahora |
  |---|---|---|
  | Respuesta a los 50 ms | 27 px | 260 px |
  | Rueda rápida (3 ráfagas) | 2 bloques, con pausas | 5 bloques encadenados |
  | Trackpad (2 deslizamientos) | 1 bloque | 2 bloques |
  | Subir desde el final | rebote 4718 → 5021 | salto limpio |
- **Móvil/tablet:** los bloques miden 1,2–2,4 pantallas (contenido apilado); un snap obligatorio
  atraparía contenido, así que se usa `proximity`: ancla al inicio de un bloque cuando estás cerca.
- Compactación por alto de ventana (`svh`) en portada, muestra, anatomía y experiencias para que
  cada bloque quepa en una pantalla. Mixins nuevos: `full-screen` y `in-snap-sections`.
- `scroll-padding-top` = alto real del header (`--header-height`, 64 px / 76 px móvil): ningún
  bloque deja asomar el anterior. *Divergencia con la spec §9 (80 px), a propósito.*

Medición (alto de cada bloque / espacio disponible, y `scrollY` tras cada gesto de rueda):

| Ventana | Bloques | Saltos |
|---|---|---|
| 1920×969 | todos 905/905 | 0 → 905 → 1810 → … exactos |
| 1440×900 | todos 836/836 | exactos |
| 1440×789 | todos 725/725 | exactos |
| 1366×657 | Anatomía 634/593 y Experiencias 626/593 | recorre los ~40 px sobrantes y luego salta (ver P10) |

Capturas: `capturas/antes-escritorio-1440x900.jpg` vs `capturas/despues-escritorio-1440x789.jpg`,
`despues-escritorio-1366x657.jpg`, `despues-escritorio-1920x969.jpg`, `despues-movil-390-landing.jpg`.

### 3.2 Fotos de cualquier proporción

- Esquema (`src/content.config.ts`): `imagen.fit` (`contain` | `cover`) y `imagen.focus {x, y}`.
  Sillas: `contain` por defecto (la silla se ve entera). Testimonios: `cover` por defecto.
  Los datos actuales siguen siendo válidos sin tocarlos (son opcionales).
- Componente `src/components/ui/Photo.astro`: genera la imagen **con su proporción original**
  (sin recorte en el build) y aplica `object-fit`/`object-position` según el encuadre. Sustituye
  a los `<Picture fit="cover">` de portada, marquesina, muestra, experiencias, catálogo y comparador.
- **Anatomía:** la foto se muestra siempre entera dentro de un lienzo con la proporción de la
  foto (unidades de contenedor); los puntos se posicionan en % de la foto, no del marco.
- Validado con una foto vertical 9:16 temporal (ya revertida): `capturas/prueba-foto-vertical-9x16.jpg`
  y `capturas/prueba-foto-vertical-portada.jpg`. La prueba destapó que una foto con fondo
  transparente dejaba ver la marquesina a través de la tarjeta de portada → fondo sólido añadido.

### 3.3 Bug corregido: marquesina medio vacía

La pista estaba centrada y la animación la desplaza −50 %: al empezar cada ciclo dejaba vacía la
mitad derecha (visible en 1440 y 1920). Ahora va pegada a la izquierda y cada grupo repite las
sillas hasta cubrir 2560 px; solo el primer pase se lee y se tabula. Con la portada a una
pantalla, la pista baja (`top: 36 %`) para no cruzar el título.

### 3.4 SEO

- `og:image` 1200×630 (foto entera sobre fondo hielo, JPG) en todas las páginas indexables y
  `twitter:card = summary_large_image`: la vista previa en WhatsApp ya lleva imagen.
- `/catalogo`: `<title>` diferenciado de la landing («Catálogo de sillas ergonómicas: 12 modelos»)
  para no competir por la misma búsqueda. El `<h1>` del diseño no cambia.
- Catálogo y facetas: `<h2>` para lectores de pantalla antes de las tarjetas (salto h1 → h3 corregido).
- Primera fila del catálogo y fotos del comparador sin `lazy` y con prioridad (LCP).
- `/comparar`: `BreadcrumbList`.
- `Organization` con `@id` y `logo`; `WebSite` con `@id` y `publisher` enlazado.
- La 404 ya no declara canonical (es `noindex`).

### 3.5 Conversión

- El mensaje de WhatsApp del comparador nombra los modelos comparados
  («Hola, estoy entre Tessera Duna, Tessera Mora Pro o Tessera Ígnea…») — plantilla `{models}`
  en `site.ts` + `messageWithModels()` en `src/lib/contact.ts`.

### 3.6 Accesibilidad

- Autoplay de portada: se pausa con el puntero sobre la foto/chip, con el foco dentro (el enlace
  «Ver la silla» ya no cambia de destino bajo el teclado) y con la pestaña oculta.
- Anatomía: `aria-controls` en puntos y filas, y una región `aria-live` que anuncia el ajuste
  elegido (no al cargar). Los puntos incluyen su número visible en el nombre (WCAG 2.5.3).
- Chips de filtro: nombre accesible que empieza por el texto visible (WCAG 2.5.3).
- Filtros en móvil: al quitar un filtro con el panel plegado, el foco va al resumen «Filtros».
- Enlace «Saltar al contenido» en todas las páginas.
- El menú móvil se cierra al tocar fuera.

### 3.7 Calidad e infraestructura

- Aviso en cada build con datos de relleno (dominio `.example`, correo de ejemplo, WhatsApp con
  ceros). Con `REQUIRE_REAL_DATA=1` el build **falla** (configurarlo en producción de
  Cloudflare Pages; anotado en `docs/operacion.md`).
- E2E en el puerto 4322 (no choca con `astro dev`).

### 3.9 Código en inglés

Todo lo que no es de la página pasó al inglés: identificadores, nombres de archivo
(componentes, `lib`, scripts, tests, colecciones de contenido), clases CSS (BEM), tokens,
funciones y mixins de Sass, claves de los datos (`name`, `image`, `categories`…), valores
internos de enumeraciones, atributos `data-`, custom elements, ids de ARIA y la variable
`REQUIRE_REAL_DATA`. Se mantuvo en español todo lo que es de la página: textos visibles, URLs
y slugs (`/sillas-ergonomicas`, `/catalogo/malla`), anclas que aparecen en la URL
(`#anatomia`, `#faq`, `#cat-guia`…), `alt`/`aria-label`, metadatos, JSON-LD y los nombres de las
imágenes publicadas (`silla-coral.png`).

Verificación: una huella del sitio construido (texto visible, URLs, metadatos, JSON-LD,
atributos) y capturas de las 10 páginas en escritorio y móvil, antes y después. Texto, títulos y
JSON-LD idénticos; capturas idénticas píxel a píxel. Solo cambian los ids internos de ARIA
(`menu-principal` → `main-menu`, `ajuste-*` → `adjustment-*`) y los nombres de los bundles.

### 3.8 Verificación final

| Prueba | Resultado |
|---|---|
| `npm run verify` (check, ESLint, Stylelint, Vitest) | 0 errores · **151/151** tests |
| Build + enlaces | 10 páginas, sin enlaces rotos |
| E2E Playwright | **201/201** (antes 152; nuevos: saltos por rueda —lenta, rápida, trackpad, desde el final—, respuesta inmediata, bloque a pantalla, og:image, marquesina, skip link, 404 sin canonical) |
| Lighthouse | Perf 98–100 · **A11y 100 en todas** (catálogo subió de 98) · BP 100 · SEO 100 |
| Auditoría propia (10 páginas × 6 viewports) | sin desbordes, sin errores de consola |

## 4. Propuestas pendientes (priorizadas)

Requieren datos o decisión del cliente, o cambian el diseño/contrato aprobado.

### Críticas — bloquean la salida a producción

- **P1. Datos reales en `src/data/site.ts`:** dominio, WhatsApp, correo, mercado (`es-MX` o
  `es-CO`; hoy el texto dice México y el contrato está en COP). El build ya lo avisa.
- **P2. Fotos reales de las 12 sillas** (hoy 3 degradados para 12 modelos y 6 testimonios).
  Recomendado: PNG con fondo transparente, cualquier proporción, ≥ 1600 px en el lado largo.
  Después, recalibrar los puntos de `ajustes.json` sobre la foto de anatomía.
- **P3. Testimonios reales con autorización escrita.** Publicar opiniones inventadas como reales
  es un riesgo legal (protección al consumidor en MX y CO).

### Altas

- **P4. Un solo gestor de paquetes.** O npm (borrar `pnpm-lock.yaml` y `pnpm-workspace.yaml`, y
  reinstalar con `npm ci`) o pnpm (versionar `pnpm-lock.yaml`, borrar `package-lock.json`, añadir
  `packageManager`, `pnpm/action-setup` en la CI y Dependabot en `pnpm`). Hoy local ≠ CI.
- **P5. CTA de WhatsApp en el catálogo y las facetas** (una por tarjeta, con el modelo en el
  mensaje vía `{models}`). Son las landings SEO de captación y no tienen ninguna salida a
  conversión. *Cambia la spec §6.1 («tres apariciones»): requiere aprobación del cliente.*
- **P6. «Empresas» por WhatsApp** (contexto `empresas`) en vez de `mailto:`, que en móvil sin
  cliente de correo no hace nada. *Misma aprobación que P5.*
- **P7. Páginas por modelo** (`/sillas/<slug>`) con ficha, specs, foto grande y `Product` en
  JSON-LD. Hoy «Ver ficha» lleva a un ancla del catálogo: no hay URL indexable por nombre de
  modelo. Sin precio no habrá resultado enriquecido de producto, pero sí tráfico por marca/modelo.

### Medias

- **P8. Botón visible de pausa** para la portada y la marquesina (WCAG 2.2.2 completo; la
  marquesina en táctil no se puede pausar). Cambia el diseño.
- **P9. Más contenido en facetas y comparador:** 148–242 palabras por faceta y 261 en `/comparar`;
  ampliar la guía de cada categoría (300–500 palabras) y añadir una FAQ corta por faceta.
- **P10. Portátiles de 1366×657:** Anatomía y Experiencias se pasan ~40 px de la pantalla (el
  scroll recorre el sobrante y luego salta). Opciones: ocultar el párrafo de introducción con
  poca altura, o dos columnas de 2 tarjetas en Experiencias.
- **P11. Logo definitivo** en PNG cuadrado ≥ 112 px para `Organization.logo` (hoy el favicon SVG) y
  `sameAs` con las redes sociales del cliente.
- **P12. Medición de conversión:** eventos de clic en WhatsApp (spec §12 #4). Cloudflare Web
  Analytics no mide clics.
- **P13. Portada con fotos `contain`:** el chip «Ver la silla» tapa la parte baja de la foto
  (las ruedas en una silla vertical). Con las fotos reales, decidir entre dejar aire inferior
  en la foto o usar `cover` con `focus` alto para esa silla.

### Bajas

- **P14. Flechas de Experiencias:** se ven deshabilitadas cuando no hay nada que paginar (3
  destacadas); ocultarlas en ese caso.
- **P15. Spec desactualizada:** §9 dice `scroll-padding-top: 80px`; en la landing ahora es el
  alto del header. Actualizar la spec y añadir el scroll por pantallas y `imagen.fit/focus`.
- **P16. hreflang** solo si algún día hay dos mercados a la vez.
- ~~**P17. Identificadores heredados en español**~~ — **Hecho** (ver §3.9).

## 5. Archivos

- Nuevos: `src/scripts/snap-sections.ts`, `src/components/ui/Photo.astro`, `src/lib/framing.ts`,
  `tests/unit/{snap-sections,framing,placeholder-data}.test.ts`, este documento y `capturas/`.
- Convención: todo el código va en inglés (identificadores, archivos, clases CSS, tokens de
  Sass, claves de contenido, atributos `data-`); comentarios, docs y textos de la página en español.
- Modificados: estilos globales y mixins, header, portada, barra, muestra, anatomía,
  experiencias, catálogo (filtros, rejilla), comparador, SEO (`Seo.astro`, `schema.ts`),
  contacto, validación, `astro.config.ts`, `playwright.config.ts`, páginas y tests.
- `docs/operacion.md`: fotos de cualquier proporción y `REQUIRE_REAL_DATA`.
