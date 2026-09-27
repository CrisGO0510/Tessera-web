# Tessera — Fase 1: base del proyecto

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Proyecto Astro en verde con TypeScript/ESLint/Stylelint/Vitest estrictos, tokens SCSS del diseño, fuentes autoalojadas, layout con SEO base, header (con menú móvil), footer, 404, `robots.txt` y la redirección de `/`.

**Architecture:** Configuración en TypeScript (`astro.config.ts`, `eslint.config.ts`, `vitest.config.ts`). Datos no editoriales en `src/data/site.ts`. Lógica en módulos puros de `src/lib/` probados con Vitest. SCSS con mapas de tokens que no emiten CSS, inyectados en cada componente; las custom properties se emiten una sola vez en `global.scss`. El menú móvil es un custom element (`<ts-menu>`).

**Tech Stack:** Astro 7.3 · TypeScript 6.0 · Sass 1.105 · ESLint 10 + typescript-eslint 8 · Stylelint 17 · Vitest 5 + happy-dom 20 · schema-dts 2.

Convenciones: ver `2026-09-26-tessera-00-indice.md` (commits del usuario, TDD, sin `any`, lógica fuera de `.astro`).

---

### Tarea 1: Proyecto y dependencias

**Files:**
- Create: `package.json`, `.gitignore`, `.node-version`, `.editorconfig`, `tsconfig.json`

- [ ] **Paso 1: Comprobar Node**

Run: `node --version`
Expected: `v24.x` o superior (Astro 7 exige ≥ 22.12; los scripts `.ts` de la fase 6 se ejecutan con Node ≥ 24 sin `tsx`).

- [ ] **Paso 2: Crear `package.json`**

```json
{
  "name": "tessera",
  "type": "module",
  "version": "0.1.0",
  "private": true,
  "engines": {
    "node": ">=24"
  },
  "scripts": {
    "dev": "astro dev",
    "check": "astro check",
    "lint": "eslint .",
    "lint:styles": "stylelint \"src/**/*.{scss,astro}\"",
    "test": "vitest run",
    "verify": "npm run check && npm run lint && npm run lint:styles && npm run test",
    "build": "astro check && astro build",
    "preview": "astro preview"
  },
  "allowScripts": {
    "esbuild": true
  }
}
```

- [ ] **Paso 3: Instalar dependencias**

```bash
npm install astro@^7.3.5 @astrojs/sitemap@^3.7.4
npm install -D typescript@~6.0.3 @astrojs/check@^0.9.10 sass@^1.105.0 \
  eslint@^10.11.0 @eslint/js@^10.0.1 typescript-eslint@^8.70.1 eslint-plugin-astro@^3.2.1 \
  @eslint-community/eslint-plugin-eslint-comments@^4.8.1 jiti@^2.7.0 \
  vitest@^5.0.2 happy-dom@^20.14.5 \
  stylelint@^17.15.0 stylelint-config-standard-scss@^17.0.0 postcss-html@^2.0.0 postcss@^8.5.0 \
  schema-dts@^2.0.0 @types/node@^24
```

Expected: `found 0 vulnerabilities`. Un aviso `install-scripts … @parcel/watcher` es normal (dependencia opcional de Sass para el modo watch; no se usa).

**No** instales `typescript@7`: `typescript-eslint` exige `<6.1` y `@astrojs/check` `^5 || ^6`.

- [ ] **Paso 4: Archivos de repositorio**

`.gitignore`:

```text
node_modules/
dist/
.astro/
.lighthouseci/
test-results/
playwright-report/
.env
.env.*
```

`.node-version` (lo lee el build de Cloudflare):

```text
24
```

`.editorconfig`:

```text
root = true

[*]
charset = utf-8
end_of_line = lf
indent_style = space
indent_size = 2
insert_final_newline = true
trim_trailing_whitespace = true
```

- [ ] **Paso 5: `tsconfig.json`**

```json
{
  "extends": "astro/tsconfigs/strictest",
  "include": [".astro/types.d.ts", "**/*"],
  "exclude": ["dist", "node_modules"],
  "compilerOptions": {
    "allowJs": false,
    "erasableSyntaxOnly": true,
    "verbatimModuleSyntax": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

`strictest` incluye `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`, `noUnusedLocals`/`Parameters`. `erasableSyntaxOnly` prohíbe `enum`, `namespace` y parameter properties, para que Node pueda ejecutar los `.ts` directamente.

- [ ] **Paso 6: Inicializar git si hace falta**

Run: `git rev-parse --is-inside-work-tree 2>/dev/null || git init -b main`
Expected: `true`, o `Initialized empty Git repository`.

- [ ] **Paso 7: Checkpoint**

```bash
git add package.json package-lock.json .gitignore .node-version .editorconfig tsconfig.json
```
Mensaje propuesto: `chore: inicializa el proyecto Astro con TypeScript estricto`

---

### Tarea 2: Lint, estilos y tests configurados

**Files:**
- Create: `eslint.config.ts`, `.stylelintrc.json`, `vitest.config.ts`

- [ ] **Paso 1: `eslint.config.ts`**

```ts
import js from '@eslint/js';
import comments from '@eslint-community/eslint-plugin-eslint-comments/configs';
import astro from 'eslint-plugin-astro';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig(
  { ignores: ['dist/', '.astro/', 'node_modules/', '.lighthouseci/', 'test-results/', 'playwright-report/'] },
  js.configs.recommended,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  astro.configs.recommended,
  comments.recommended,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
        extraFileExtensions: ['.astro'],
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/explicit-function-return-type': 'error',
      '@typescript-eslint/explicit-module-boundary-types': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/consistent-type-assertions': ['error', { assertionStyle: 'never' }],
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/ban-ts-comment': ['error', { 'ts-expect-error': true, 'ts-ignore': true, 'ts-nocheck': true }],
      '@eslint-community/eslint-comments/require-description': 'error',
      '@eslint-community/eslint-comments/no-unlimited-disable': 'error',
    },
  },
  {
    // TypeScript dentro de ESLint no resuelve los tipos de componentes .astro importados
    // (salen como `error`); astro check cubre esos tipos. El resto de reglas sigue activo.
    files: ['**/*.astro'],
    languageOptions: {
      parserOptions: {
        projectService: false,
        project: './tsconfig.json',
        parser: tseslint.parser,
      },
    },
    rules: {
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
    },
  },
  {
    // Los <script> de los .astro son archivos virtuales fuera del proyecto TS;
    // solo importan y registran custom elements (la lógica vive en src/scripts/).
    files: ['**/*.astro/*.ts'],
    extends: [tseslint.configs.disableTypeChecked],
  },
);
```

- [ ] **Paso 2: `.stylelintrc.json`**

```json
{
  "extends": [
    "stylelint-config-standard-scss"
  ],
  "overrides": [
    {
      "files": [
        "**/*.astro"
      ],
      "customSyntax": "postcss-html"
    }
  ],
  "rules": {
    "at-rule-disallowed-list": [
      "import"
    ],
    "selector-class-pattern": [
      "^[a-z][a-z0-9]*(-[a-z0-9]+)*(__[a-z0-9]+(-[a-z0-9]+)*)?(--[a-z0-9]+(-[a-z0-9]+)*)?$",
      {
        "message": "Usa clases BEM en kebab-case: bloque__elemento--modificador"
      }
    ],
    "color-named": "never",
    "declaration-no-important": true,
    "scss/dollar-variable-empty-line-before": null,
    "selector-pseudo-class-no-unknown": [
      true,
      {
        "ignorePseudoClasses": [
          "global"
        ]
      }
    ]
  }
}
```

- [ ] **Paso 3: `vitest.config.ts`**

```ts
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
  },
});
```

- [ ] **Paso 4: Prueba de humo del lint (debe fallar)**

Crea `src/lib/humo-lint.ts` temporal:

```ts
// Archivo temporal: debe fallar el lint. Se borra al terminar el paso.
export function malo(x: any) {
  return x as string;
}
```

Run: `npx eslint src/lib/humo-lint.ts`
Expected: 5 errores, entre ellos `Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any`, `Do not use any type assertions  @typescript-eslint/consistent-type-assertions` y `Missing return type on function`.

- [ ] **Paso 5: Borrar el archivo de humo**

Run: `rm src/lib/humo-lint.ts`

- [ ] **Paso 6: Checkpoint**

```bash
git add eslint.config.ts .stylelintrc.json vitest.config.ts
```
Mensaje propuesto: `chore: configura ESLint con tipos, Stylelint SCSS y Vitest`

---

### Tarea 3: Enlaces de contacto (WhatsApp y correo)

**Files:**
- Create: `src/lib/contacto.ts`
- Test: `tests/unit/contacto.test.ts`

- [ ] **Paso 1: Test que falla**

```ts
import { describe, expect, it } from 'vitest';
import { urlCorreo, urlWhatsApp } from '@/lib/contacto';

describe('urlWhatsApp', () => {
  it('arma la URL de wa.me con el mensaje codificado', () => {
    expect(urlWhatsApp('573001234567', 'Hola, ¿me ayudas?')).toBe(
      'https://wa.me/573001234567?text=Hola%2C%20%C2%BFme%20ayudas%3F',
    );
  });

  it('rechaza números con signos o espacios', () => {
    expect(() => urlWhatsApp('+57 300 123 4567', 'x')).toThrow(/inválido/);
  });
});

describe('urlCorreo', () => {
  it('sin asunto', () => {
    expect(urlCorreo('hola@tessera.co')).toBe('mailto:hola@tessera.co');
  });

  it('con asunto codificado', () => {
    expect(urlCorreo('hola@tessera.co', 'Ventas a empresa')).toBe('mailto:hola@tessera.co?subject=Ventas%20a%20empresa');
  });

  it('rechaza correos mal formados', () => {
    expect(() => urlCorreo('hola@')).toThrow(/inválido/);
  });
});
```

- [ ] **Paso 2: Ejecutarlo**

Run: `npx vitest run tests/unit/contacto.test.ts`
Expected: FAIL con `Error: Cannot find package '@/lib/contacto'`.

- [ ] **Paso 3: Implementación**

```ts
export type ContextoWhatsApp = 'barra' | 'entrega' | 'comparador';

/** Número en formato internacional sin signos: solo dígitos, con indicativo de país. */
export function urlWhatsApp(numero: string, mensaje: string): string {
  if (!/^\d{10,15}$/.test(numero)) {
    throw new Error(`Número de WhatsApp inválido: "${numero}". Usa solo dígitos con indicativo, p. ej. 573001234567.`);
  }
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
}

export function urlCorreo(correo: string, asunto?: string): string {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
    throw new Error(`Correo inválido: "${correo}".`);
  }
  return asunto === undefined ? `mailto:${correo}` : `mailto:${correo}?subject=${encodeURIComponent(asunto)}`;
}
```

- [ ] **Paso 4: Verde**

Run: `npx vitest run tests/unit/contacto.test.ts`
Expected: `Tests  5 passed (5)`.

- [ ] **Paso 5: Checkpoint**

```bash
git add src/lib/contacto.ts tests/unit/contacto.test.ts
```
Mensaje propuesto: `feat: genera enlaces de WhatsApp y correo validados`

---

### Tarea 4: Configuración del sitio

**Files:**
- Create: `src/data/site.ts`

Datos no editoriales: mercado, contacto, mensajes de WhatsApp por contexto (los tres lugares del diseño donde aparece: `barra`, `entrega`, `comparador`), navegación y columnas fijas del footer con los destinos de spec §6.1. `url`, `contacto` y `mercado` son provisionales hasta H3 (spec §12 #1).

- [ ] **Paso 1: Crear `src/data/site.ts`**

```ts
import { urlCorreo, type ContextoWhatsApp } from '@/lib/contacto';

export interface Enlace {
  readonly texto: string;
  readonly href: string;
}

export interface ColumnaFooter {
  readonly titulo: string;
  readonly enlaces: readonly Enlace[];
}

export type Locale = 'es-CO' | 'es-MX';

interface Site {
  readonly nombre: string;
  /** Origen del sitio, sin barra final. */
  readonly url: string;
  readonly lema: string;
  readonly mercado: { readonly locale: Locale; readonly pais: 'CO' | 'MX' };
  readonly contacto: { readonly whatsapp: string; readonly correo: string };
  readonly entregaHoras: number;
  /** Segunda frase de la barra legal del footer. */
  readonly textoEnvios: string;
  readonly autoplayPortada: boolean;
  /** Nota junto a cada CTA de WhatsApp («responde en 3 min»): es una promesa comercial, la confirma el cliente. */
  readonly notaWhatsApp: string;
  readonly mensajesWhatsApp: Readonly<Record<ContextoWhatsApp, string>>;
  readonly nav: readonly Enlace[];
  readonly enlaceEmpresas: Enlace;
  readonly footer: readonly ColumnaFooter[];
}

// PENDIENTE (spec §12 #1): url, contacto y mercado se sustituyen por los reales antes de H3.
const correo = 'hola@tessera.example';

export const site = {
  nombre: 'Tessera',
  url: 'https://tessera.example',
  lema: 'Sillas ergonómicas calibradas a la persona que las usa.',
  mercado: { locale: 'es-MX', pais: 'MX' },
  contacto: { whatsapp: '525500000000', correo },
  entregaHoras: 48,
  textoEnvios: 'Envíos a todo México · 48 h en zona metropolitana',
  autoplayPortada: true,
  notaWhatsApp: 'responde en 3 min',
  mensajesWhatsApp: {
    barra: 'Hola, quiero que me ayuden a elegir una silla Tessera.',
    entrega: 'Hola, quiero cotizar una silla Tessera. Mi estatura es … y me siento … horas al día.',
    comparador: 'Hola, estoy entre dos modelos de Tessera y quiero que me ayuden a decidir.',
  },
  nav: [
    { texto: 'Sillas', href: '/catalogo' },
    { texto: 'Cómo se ajusta', href: '/sillas-ergonomicas#anatomia' },
    { texto: 'Comparar', href: '/comparar' },
    { texto: 'Guías', href: '/catalogo#cat-guia' },
  ],
  enlaceEmpresas: { texto: 'Empresas', href: urlCorreo(correo, 'Ventas a empresa') },
  footer: [
    {
      titulo: 'Decide',
      enlaces: [
        { texto: 'Comparador de sillas', href: '/comparar' },
        { texto: 'Cómo elegir tu silla', href: '/catalogo#cat-guia' },
        { texto: 'Guía de ajustes', href: '/sillas-ergonomicas#anatomia' },
        { texto: 'Medidas y estatura', href: '/catalogo#cat-guia' },
      ],
    },
    {
      titulo: 'Tessera',
      enlaces: [
        { texto: 'Ventas a empresa', href: urlCorreo(correo, 'Ventas a empresa') },
        { texto: 'Entrega e instalación', href: '/sillas-ergonomicas#entrega' },
        { texto: 'Garantía y devoluciones', href: '/sillas-ergonomicas#faq' },
        { texto: 'Contacto', href: urlCorreo(correo) },
      ],
    },
  ],
} as const satisfies Site;
```

- [ ] **Paso 2: Tipos**

Run: `npx tsc --noEmit -p .`
Expected: sin salida (0 errores).

- [ ] **Paso 3: Checkpoint**

```bash
git add src/data/site.ts
```
Mensaje propuesto: `feat: añade la configuración del sitio y los destinos de navegación`

---

### Tarea 5: Utilidades SEO

**Files:**
- Create: `src/lib/seo.ts`
- Test: `tests/unit/seo.test.ts`

- [ ] **Paso 1: Test que falla**

```ts
import { describe, expect, it } from 'vitest';
import { localeOpenGraph, tituloPagina, urlCanonica } from '@/lib/seo';

describe('urlCanonica', () => {
  it('une origen y ruta sin barra final', () => {
    expect(urlCanonica('https://tessera.co/', '/catalogo/malla/')).toBe('https://tessera.co/catalogo/malla');
  });

  it('conserva la raíz', () => {
    expect(urlCanonica('https://tessera.co', '/')).toBe('https://tessera.co/');
  });

  it('rechaza rutas relativas, queries y anclas', () => {
    expect(() => urlCanonica('https://tessera.co', 'catalogo')).toThrow();
    expect(() => urlCanonica('https://tessera.co', '/catalogo?y=lumbar')).toThrow();
    expect(() => urlCanonica('https://tessera.co', '/catalogo#cat-guia')).toThrow();
  });
});

describe('tituloPagina', () => {
  it('añade la marca', () => {
    expect(tituloPagina('Compara las sillas', 'Tessera')).toBe('Compara las sillas · Tessera');
  });

  it('no la duplica', () => {
    expect(tituloPagina('Tessera — sillas', 'Tessera')).toBe('Tessera — sillas');
  });
});

describe('localeOpenGraph', () => {
  it('convierte el guion', () => {
    expect(localeOpenGraph('es-CO')).toBe('es_CO');
  });
});
```

- [ ] **Paso 2: Ejecutarlo**

Run: `npx vitest run tests/unit/seo.test.ts`
Expected: FAIL con `Error: Cannot find package '@/lib/seo'`.

- [ ] **Paso 3: Implementación**

```ts
/** URL absoluta sin barra final (trailingSlash: 'never'). La raíz se queda como `/`. */
export function urlCanonica(origen: string, ruta: string): string {
  if (!ruta.startsWith('/')) {
    throw new Error(`La ruta canónica debe empezar por "/": "${ruta}"`);
  }
  if (ruta.includes('?') || ruta.includes('#')) {
    throw new Error(`La ruta canónica no lleva query ni ancla: "${ruta}"`);
  }
  const limpia = ruta.length > 1 ? ruta.replace(/\/+$/, '') : ruta;
  return `${origen.replace(/\/+$/, '')}${limpia}`;
}

export function tituloPagina(titulo: string, marca: string): string {
  return titulo.includes(marca) ? titulo : `${titulo} · ${marca}`;
}

/** `es-MX` → `es_MX`, el formato de og:locale. */
export function localeOpenGraph(locale: string): string {
  return locale.replace('-', '_');
}
```

- [ ] **Paso 4: Verde**

Run: `npx vitest run tests/unit/seo.test.ts`
Expected: `Tests  6 passed (6)`.

- [ ] **Paso 5: Checkpoint**

```bash
git add src/lib/seo.ts tests/unit/seo.test.ts
```
Mensaje propuesto: `feat: añade canonical, título y og:locale`

---

### Tarea 6: JSON-LD base

**Files:**
- Create: `src/lib/schema.ts`
- Test: `tests/unit/schema.test.ts`

- [ ] **Paso 1: Test que falla**

```ts
import { describe, expect, it } from 'vitest';
import { organizacion, serializarJsonLd, sitioWeb } from '@/lib/schema';

describe('organizacion', () => {
  it('incluye el punto de contacto con teléfono y correo', () => {
    const org = organizacion({
      nombre: 'Tessera',
      url: 'https://tessera.co',
      correo: 'hola@tessera.co',
      telefono: '573001234567',
      descripcion: 'Sillas ergonómicas',
    });
    expect(org).toMatchObject({
      '@type': 'Organization',
      contactPoint: { '@type': 'ContactPoint', telephone: '+573001234567', email: 'hola@tessera.co' },
    });
  });
});

describe('sitioWeb', () => {
  it('declara el idioma', () => {
    expect(sitioWeb('Tessera', 'https://tessera.co', 'es-CO')).toMatchObject({ '@type': 'WebSite', inLanguage: 'es-CO' });
  });
});

describe('serializarJsonLd', () => {
  it('escapa < para no cerrar el script', () => {
    const json = serializarJsonLd({ '@type': 'Thing', name: '</script><script>alert(1)</script>' });
    expect(json).not.toContain('</script>');
    expect(JSON.parse(json)).toMatchObject({ name: '</script><script>alert(1)</script>' });
  });
});
```

- [ ] **Paso 2: Ejecutarlo**

Run: `npx vitest run tests/unit/schema.test.ts`
Expected: FAIL con `Error: Cannot find package '@/lib/schema'`.

- [ ] **Paso 3: Implementación**

```ts
import type { Organization, Thing, WebSite, WithContext } from 'schema-dts';

export interface DatosOrganizacion {
  readonly nombre: string;
  readonly url: string;
  readonly correo: string;
  /** Solo dígitos con indicativo. */
  readonly telefono: string;
  readonly descripcion: string;
}

export function organizacion(datos: DatosOrganizacion): WithContext<Organization> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: datos.nombre,
    url: datos.url,
    description: datos.descripcion,
    email: datos.correo,
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'sales',
      telephone: `+${datos.telefono}`,
      email: datos.correo,
    },
  };
}

export function sitioWeb(nombre: string, url: string, idioma: string): WithContext<WebSite> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: nombre,
    url,
    inLanguage: idioma,
  };
}

/** JSON para <script type="application/ld+json">: escapa `<` para que el texto no pueda cerrar la etiqueta. */
export function serializarJsonLd(datos: Thing | readonly Thing[]): string {
  return JSON.stringify(datos).replace(/</g, '\\u003c');
}
```

- [ ] **Paso 4: Verde**

Run: `npx vitest run tests/unit/schema.test.ts`
Expected: `Tests  3 passed (3)`.

- [ ] **Paso 5: Checkpoint**

```bash
git add src/lib/schema.ts tests/unit/schema.test.ts
```
Mensaje propuesto: `feat: genera JSON-LD de Organization y WebSite`

---

### Tarea 7: DOM tipado y registro de custom elements

**Files:**
- Create: `src/lib/dom.ts`, `tests/unit/ayudas/montar.ts`
- Test: `tests/unit/dom.test.ts`

`montar()` pasa el HTML por un `<template>`: si se asigna `innerHTML` directamente con el elemento ya definido, happy-dom (igual que un navegador) conecta el custom element antes de parsear sus hijos. En el sitio no ocurre porque los scripts de Astro son módulos diferidos.

- [ ] **Paso 1: Ayuda de montaje**

```ts
/**
 * Monta HTML ya completo en el documento. Se pasa por un <template> para que los
 * custom elements se conecten con sus hijos ya presentes, como ocurre en el sitio
 * (los scripts de Astro son módulos diferidos y se ejecutan después del parseo).
 */
export function montar(html: string): void {
  const plantilla = document.createElement('template');
  plantilla.innerHTML = html;
  document.body.replaceChildren(plantilla.content.cloneNode(true));
}
```

- [ ] **Paso 2: Test que falla**

```ts
// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { consulta, consultaTodos, definirElemento, leerDato } from '@/lib/dom';
import { montar } from './ayudas/montar';

describe('consulta', () => {
  it('devuelve el elemento con su tipo', () => {
    montar('<button id="b">x</button>');
    expect(consulta(document, '#b', HTMLButtonElement).textContent).toBe('x');
  });

  it('falla si no existe', () => {
    montar('<p></p>');
    expect(() => consulta(document, '#b', HTMLButtonElement)).toThrow('No se encontró "#b".');
  });

  it('falla si el tipo no coincide', () => {
    montar('<div id="b"></div>');
    expect(() => consulta(document, '#b', HTMLButtonElement)).toThrow(/tipo esperado/);
  });
});

describe('consultaTodos', () => {
  it('devuelve todos con su tipo', () => {
    montar('<button>a</button><button>b</button>');
    expect(consultaTodos(document, 'button', HTMLButtonElement)).toHaveLength(2);
  });
});

describe('leerDato', () => {
  it('lee data-* y falla si falta', () => {
    montar('<div id="d" data-total-sillas="12"></div>');
    const div = consulta(document, '#d', HTMLDivElement);
    expect(leerDato(div, 'totalSillas')).toBe('12');
    expect(() => leerDato(div, 'otro')).toThrow('Falta data-otro.');
  });
});

describe('definirElemento', () => {
  it('no falla si se registra dos veces', () => {
    class Prueba extends HTMLElement {}
    definirElemento('ts-prueba', Prueba);
    expect(() => {
      definirElemento('ts-prueba', Prueba);
    }).not.toThrow();
  });
});
```

- [ ] **Paso 3: Ejecutarlo**

Run: `npx vitest run tests/unit/dom.test.ts`
Expected: FAIL con `Error: Cannot find package '@/lib/dom'`.

- [ ] **Paso 4: Implementación**

```ts
interface ConstructorElemento<T extends Element> {
  readonly prototype: T;
  new (): T;
}

/** Primer elemento que cumple el selector y es del tipo pedido; si no, error descriptivo. */
export function consulta<T extends Element>(raiz: ParentNode, selector: string, tipo: ConstructorElemento<T>): T {
  const elemento = raiz.querySelector(selector);
  if (elemento === null) {
    throw new Error(`No se encontró "${selector}".`);
  }
  if (!(elemento instanceof tipo)) {
    throw new Error(`"${selector}" no es del tipo esperado (${tipo.name}).`);
  }
  return elemento;
}

export function consultaTodos<T extends Element>(raiz: ParentNode, selector: string, tipo: ConstructorElemento<T>): T[] {
  return Array.from(raiz.querySelectorAll(selector), (elemento) => {
    if (!(elemento instanceof tipo)) {
      throw new Error(`Un elemento de "${selector}" no es del tipo esperado (${tipo.name}).`);
    }
    return elemento;
  });
}

/** Valor de un atributo data-*; error si falta. */
export function leerDato(elemento: HTMLElement, nombre: string): string {
  const valor = elemento.dataset[nombre];
  if (valor === undefined) {
    throw new Error(`Falta data-${nombre.replace(/[A-Z]/g, (letra) => `-${letra.toLowerCase()}`)}.`);
  }
  return valor;
}

/** Registra un custom element una sola vez (los scripts pueden cargarse en varias páginas). */
export function definirElemento(nombre: string, clase: CustomElementConstructor): void {
  if (customElements.get(nombre) === undefined) {
    customElements.define(nombre, clase);
  }
}

export function prefiereMovimientoReducido(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
```

- [ ] **Paso 5: Verde**

Run: `npx vitest run tests/unit/dom.test.ts`
Expected: `Tests  6 passed (6)`.

- [ ] **Paso 6: Checkpoint**

```bash
git add src/lib/dom.ts tests/unit/ayudas/montar.ts tests/unit/dom.test.ts
```
Mensaje propuesto: `feat: añade consultas DOM tipadas sin casts`

---

### Tarea 8: Tokens y estilos globales

**Files:**
- Create: `src/styles/_tokens.scss`, `src/styles/_funciones.scss`, `src/styles/_mixins.scss`, `src/styles/_index.scss`, `src/styles/global.scss`
- Test: `tests/unit/estilos.test.ts`

Lo que se inyecta en cada componente (`_index.scss`) solo contiene mapas, funciones y mixins: cada `<style>` de Astro se compila por separado y cualquier regla ahí se duplicaría (spec §4). Las custom properties se emiten en `global.scss`, que carga `BaseLayout` una vez. `color("nombre")` falla al compilar si el token no existe.

- [ ] **Paso 1: Test que falla**

```ts
import { compileString } from 'sass';
import { describe, expect, it } from 'vitest';

const cargar = { loadPaths: ['src/styles'] };

describe('funciones SCSS', () => {
  it('color() devuelve la custom property', () => {
    const { css } = compileString('@use "index" as *; a { color: color("cobalto"); }', cargar);
    expect(css).toContain('color: var(--color-cobalto)');
  });

  it('color() falla con un token desconocido', () => {
    expect(() => compileString('@use "index" as *; a { color: color("rojo"); }', cargar)).toThrow(/Color desconocido/);
  });

  it('tinta() produce la alfa del handoff', () => {
    const { css } = compileString('@use "index" as *; a { border-color: tinta(8%); }', cargar);
    expect(css).toMatch(/rgba\(17, 22, 35, 0\.08\)|rgb\(17 22 35 \/ 8%\)/);
  });

  it('cuerpo() y etiqueta-mono() conservan la barra de font (no dividen)', () => {
    const { css } = compileString('@use "index" as *; p { @include cuerpo(13.5px); } span { @include etiqueta-mono(9.5px); }', cargar);
    expect(css).toContain('font: 400 13.5px / 1.65 var(--fuente-archivo)');
    expect(css).toContain('font: 500 9.5px / 1 var(--fuente-mono)');
  });

  it('los parciales inyectados no emiten CSS', () => {
    expect(compileString('@use "index" as *;', cargar).css.trim()).toBe('');
  });
});
```

- [ ] **Paso 2: Ejecutarlo**

Run: `npx vitest run tests/unit/estilos.test.ts`
Expected: FAIL con `Can't find stylesheet to import` (aún no existe `src/styles/_index.scss`).

- [ ] **Paso 3: Tokens**

`src/styles/_tokens.scss`:

```scss
// Tokens del diseño aprobado (handoff «Design Tokens»).
// Solo mapas y variables: este archivo se inyecta en cada componente y NO debe emitir CSS.

$colores: (
  "hielo": #eef2fb,
  "blanco": #fff,
  "hielo-alterno": #f7f9fd,
  "tinta": #111623,
  "tinta-2": #1b2536,
  "cobalto": #2e5bdb,
  "cobalto-oscuro": #1b3ea8,
  "cobalto-claro": #7fa0ff,
  "gris-texto": #454f66,
  "gris-medio": #5a6480,
  // #8a93a8 en el diseño: oscurecido al mínimo que da 4,5:1 (WCAG AA) sobre hielo.
  "gris-claro": #656e89,
  "azul-palido": #dce6f2,
  "whatsapp": #25d366,
  "whatsapp-hover": #1eb857,
  "whatsapp-texto": #0b2c17,
);

$radios: (
  "pill": 999px,
  "portada": 26px,
  "xl": 20px,
  "l": 18px,
  "m": 16px,
  "s": 14px,
  "xs": 12px,
  "xxs": 11px,
  "mini": 9px,
  "casilla": 4px,
);

$sombras: (
  "reposo": 0 1px 2px rgb(17 22 35 / 4%),
  "marquesina": 0 16px 34px rgb(17 22 35 / 15%),
  "ficha-hover": 0 18px 36px rgb(17 22 35 / 12%),
  "chip": 0 18px 38px rgb(17 22 35 / 22%),
  "necesidad-hover": 0 20px 40px rgb(17 22 35 / 12%),
  "marquesina-hover": 0 26px 46px rgb(17 22 35 / 24%),
  "portada": (0 34px 70px rgb(17 22 35 / 30%), 0 0 0 1px rgb(17 22 35 / 8%)),
);

// Variables CSS que genera la API de fuentes de Astro (astro.config.ts → fonts).
$fuentes: (
  "archivo": (var(--fuente-archivo), system-ui, sans-serif),
  "newsreader": (var(--fuente-newsreader), georgia, serif),
  "mono": (var(--fuente-mono), ui-monospace, monospace),
);

$anchos: (
  "general": 1240px,
  "texto": 1000px,
  "faq": 900px,
);

$movil: 900px;
$padding-lateral: clamp(16px, 4vw, 48px);
```

- [ ] **Paso 4: Funciones**

`src/styles/_funciones.scss` (las alfas usan interpolación: sin ella Sass interpreta `35 / $alfa` como una división):

```scss
@use "sass:map";
@use "tokens";

@function -token($mapa, $nombre, $tipo) {
  @if not map.has-key($mapa, $nombre) {
    @error "#{$tipo} desconocido: '#{$nombre}'. Opciones: #{map.keys($mapa)}";
  }

  @return map.get($mapa, $nombre);
}

// Colores como custom properties (emitidas una vez en global.scss).
@function color($nombre) {
  $valor: -token(tokens.$colores, $nombre, "Color");

  @return var(--color-#{$nombre});
}

@function radio($nombre) {
  @return -token(tokens.$radios, $nombre, "Radio");
}

@function sombra($nombre) {
  @return -token(tokens.$sombras, $nombre, "Sombra");
}

@function fuente($nombre) {
  @return -token(tokens.$fuentes, $nombre, "Fuente");
}

@function ancho($nombre) {
  @return -token(tokens.$anchos, $nombre, "Ancho");
}

// Alfas recurrentes del handoff sobre tinta (#111623) y sobre hielo (#EEF2FB).
@function tinta($alfa) {
  @return rgb(17 22 35 / #{$alfa});
}

@function hielo($alfa) {
  @return rgb(238 242 251 / #{$alfa});
}
```

- [ ] **Paso 5: Mixins**

`src/styles/_mixins.scss`:

```scss
@use "sass:list";
@use "tokens";
@use "funciones" as *;

// Tipografía (handoff «Tipografía»).
@mixin h1 {
  margin: 0;
  font: 700 clamp(34px, 5.2vw, 60px) / 1.02 fuente("archivo");
  letter-spacing: -0.045em;
  text-wrap: balance;
}

@mixin h1-pantalla {
  margin: 0;
  font: 700 clamp(30px, 4.2vw, 50px) / 1.04 fuente("archivo");
  letter-spacing: -0.04em;
  text-wrap: balance;
}

@mixin h2 {
  margin: 0;
  font: 700 clamp(28px, 3.6vw, 42px) / 1.06 fuente("archivo");
  letter-spacing: -0.035em;
}

@mixin h2-serif {
  margin: 0;
  font: 300 clamp(28px, 3.8vw, 44px) / 1.08 fuente("newsreader");
  letter-spacing: -0.02em;
  text-wrap: balance;
}

@mixin enfasis-serif {
  font-family: fuente("newsreader");
  font-style: italic;
  font-weight: 300;
  color: color("cobalto");
}

@mixin etiqueta-mono($tamano: 10px) {
  font: 500 list.slash($tamano, 1) fuente("mono");
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

// list.slash: con variables, `$a / $b` sería una división de Sass y no la barra de `font`.
@mixin cuerpo($tamano: 15px, $alto: 1.65) {
  margin: 0;
  font: 400 list.slash($tamano, $alto) fuente("archivo");
  color: color("gris-texto");
  text-wrap: pretty;
}

// Estructura.
@mixin seccion {
  padding: clamp(56px, 7vw, 96px) tokens.$padding-lateral;
}

@mixin seccion-compacta {
  padding: clamp(40px, 5vw, 68px) tokens.$padding-lateral;
}

@mixin contenedor($nombre: "general") {
  max-width: ancho($nombre);
  margin-inline: auto;
}

@mixin movil {
  @media (width < tokens.$movil) {
    @content;
  }
}

@mixin movimiento-reducido {
  @media (prefers-reduced-motion: reduce) {
    @content;
  }
}

// Botón pill (header, CTAs oscuros).
@mixin pill($fondo: color("tinta"), $texto: color("hielo"), $hover: color("cobalto")) {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 17px;
  border-radius: radio("pill");
  background: $fondo;
  color: $texto;
  font: 600 12.5px / 1 fuente("archivo");
  text-decoration: none;
  transition: background 0.2s ease, color 0.2s ease;

  &:hover {
    background: $hover;
    color: $texto;
  }
}

@mixin foco-visible {
  &:focus-visible {
    outline: 2px solid color("cobalto");
    outline-offset: 3px;
  }
}

// Amplía el área táctil a $minimo sin cambiar el aspecto (spec §9). $ancho permite
// limitarla en horizontal cuando los controles están más juntos que $minimo, para que
// el área de uno no invada la del vecino.
@mixin area-tactil($minimo: 44px, $ancho: $minimo) {
  position: relative;

  &::after {
    content: "";
    position: absolute;
    top: 50%;
    left: 50%;
    width: max(100%, #{$ancho});
    height: max(100%, #{$minimo});
    transform: translate(-50%, -50%);
  }
}

@mixin solo-lectores {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
```

- [ ] **Paso 6: Índice inyectado**

`src/styles/_index.scss`:

```scss
// Lo que additionalData inyecta en cada <style lang="scss">. Nada aquí emite CSS.
@forward "tokens";
@forward "funciones";
@forward "mixins";
```

- [ ] **Paso 7: Estilos globales**

`src/styles/global.scss` (recibe el índice por `additionalData`, por eso usa `color()` y `$colores` sin `@use`):

```scss
@use "sass:map";

// Única salida de tokens a :root (spec §4). Se carga una vez desde BaseLayout.
:root {
  @each $nombre, $valor in $colores {
    --color-#{$nombre}: #{$valor};
  }
}

*,
*::before,
*::after {
  box-sizing: border-box;
}

html {
  scroll-behavior: smooth;
  scroll-padding-top: 80px;

  @include movimiento-reducido {
    scroll-behavior: auto;
  }
}

body {
  margin: 0;
  background: color("hielo");
  color: color("tinta");
  font-family: fuente("archivo");
  -webkit-font-smoothing: antialiased;
}

a {
  color: color("cobalto");
  text-decoration: none;

  &:hover {
    color: color("cobalto-oscuro");
  }
}

img {
  display: block;
  max-width: 100%;
  height: auto;
}

section[id] {
  scroll-margin-top: 80px;
}

summary::-webkit-details-marker {
  display: none;
}

:focus-visible {
  outline: 2px solid color("cobalto");
  outline-offset: 3px;
}
```

- [ ] **Paso 8: Verde**

Run: `npx vitest run tests/unit/estilos.test.ts`
Expected: `Tests  5 passed (5)`.

- [ ] **Paso 9: Checkpoint**

```bash
git add src/styles tests/unit/estilos.test.ts
```
Mensaje propuesto: `feat: añade los tokens del diseño en SCSS`

---

### Tarea 9: Menú móvil (`<ts-menu>`)

**Files:**
- Create: `src/scripts/menu.ts`
- Test: `tests/unit/menu.test.ts`

- [ ] **Paso 1: Test que falla**

```ts
// @vitest-environment happy-dom
import { beforeAll, describe, expect, it } from 'vitest';
import { consulta } from '@/lib/dom';
import { registrarMenu } from '@/scripts/menu';
import { montar } from './ayudas/montar';

const HTML = `
  <ts-menu>
    <div data-menu-panel id="menu-principal"><a href="/catalogo">Sillas</a></div>
    <button type="button" data-menu-boton aria-controls="menu-principal" aria-expanded="false">Menú</button>
  </ts-menu>`;

function partes(): { boton: HTMLButtonElement; panel: HTMLElement } {
  return {
    boton: consulta(document, '[data-menu-boton]', HTMLButtonElement),
    panel: consulta(document, '[data-menu-panel]', HTMLElement),
  };
}

describe('ts-menu', () => {
  beforeAll(() => {
    registrarMenu();
  });

  it('al conectarse deja el panel cerrado', () => {
    montar(HTML);
    const { boton, panel } = partes();
    expect(boton.getAttribute('aria-expanded')).toBe('false');
    expect(panel.hasAttribute('data-abierto')).toBe(false);
  });

  it('el botón abre y cierra el panel', () => {
    montar(HTML);
    const { boton, panel } = partes();
    boton.click();
    expect(boton.getAttribute('aria-expanded')).toBe('true');
    expect(panel.hasAttribute('data-abierto')).toBe(true);
    boton.click();
    expect(panel.hasAttribute('data-abierto')).toBe(false);
  });

  it('elegir un enlace del panel lo cierra (si no, taparía el ancla de destino)', () => {
    montar(HTML);
    const { boton, panel } = partes();
    boton.click();
    consulta(document, '[data-menu-panel] a', HTMLAnchorElement).dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    expect(boton.getAttribute('aria-expanded')).toBe('false');
    expect(panel.hasAttribute('data-abierto')).toBe(false);
  });

  it('Escape cierra y devuelve el foco al botón', () => {
    montar(HTML);
    const { boton, panel } = partes();
    boton.click();
    panel.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(boton.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(boton);
  });
});
```

- [ ] **Paso 2: Ejecutarlo**

Run: `npx vitest run tests/unit/menu.test.ts`
Expected: FAIL con `Error: Cannot find package '@/scripts/menu'`.

- [ ] **Paso 3: Implementación**

```ts
import { consulta, definirElemento } from '@/lib/dom';

/**
 * Menú del header por debajo de 900 px. El estado inicial (panel cerrado, botón visible)
 * lo pone el CSS con <html data-js> antes del primer pintado; aquí solo se alterna.
 * Sin JS el panel se ve como lista y el botón no aparece.
 */
export class TsMenu extends HTMLElement {
  #boton: HTMLButtonElement | null = null;
  #panel: HTMLElement | null = null;

  connectedCallback(): void {
    const boton = consulta(this, '[data-menu-boton]', HTMLButtonElement);
    const panel = consulta(this, '[data-menu-panel]', HTMLElement);
    this.#boton = boton;
    this.#panel = panel;
    this.#cerrar();

    boton.addEventListener('click', this.#alternar);
    panel.addEventListener('click', this.#alElegirEnlace);
    this.addEventListener('keydown', this.#alPulsarTecla);
  }

  disconnectedCallback(): void {
    this.#boton?.removeEventListener('click', this.#alternar);
    this.#panel?.removeEventListener('click', this.#alElegirEnlace);
    this.removeEventListener('keydown', this.#alPulsarTecla);
  }

  /** Un ancla de la misma página no recarga: sin cerrar, el panel taparía el destino. */
  #alElegirEnlace = (evento: MouseEvent): void => {
    if (evento.target instanceof Element && evento.target.closest('a') !== null) this.#cerrar();
  };

  #alternar = (): void => {
    if (this.#boton?.getAttribute('aria-expanded') === 'true') {
      this.#cerrar();
    } else {
      this.#abrir();
    }
  };

  #alPulsarTecla = (evento: KeyboardEvent): void => {
    if (evento.key === 'Escape' && this.#boton?.getAttribute('aria-expanded') === 'true') {
      this.#cerrar();
      this.#boton.focus();
    }
  };

  #abrir(): void {
    this.#boton?.setAttribute('aria-expanded', 'true');
    if (this.#panel !== null) this.#panel.dataset.abierto = '';
  }

  #cerrar(): void {
    this.#boton?.setAttribute('aria-expanded', 'false');
    if (this.#panel !== null) delete this.#panel.dataset.abierto;
  }
}

export function registrarMenu(): void {
  definirElemento('ts-menu', TsMenu);
}
```

- [ ] **Paso 4: Verde**

Run: `npx vitest run tests/unit/menu.test.ts`
Expected: `Tests  4 passed (4)`.

- [ ] **Paso 5: Checkpoint**

```bash
git add src/scripts/menu.ts tests/unit/menu.test.ts
```
Mensaje propuesto: `feat: añade el menú móvil accesible del header`

---

### Tarea 10: Header y footer

**Files:**
- Create: `src/components/layout/Header.astro`, `src/components/layout/Footer.astro`

Diseño: header de la pantalla 1 (`position: sticky` en producción; en el prototipo estaba en `relative` solo por el lienzo). Por debajo de 900 px: marca, «Ver catálogo» y botón de menú visibles; la nav y «Empresas» pasan al panel (spec §8.1). El footer lleva por ahora las columnas fijas; la columna «Sillas» (categorías y total) se añade en la fase 2.

- [ ] **Paso 1: `src/components/layout/Header.astro`**

```astro
---
import { site } from '@/data/site';
---

<header class="header">
  <ts-menu class="header__menu">
    <a class="header__marca" href="/sillas-ergonomicas">TESSERA</a>
    <div class="header__panel" id="menu-principal" data-menu-panel>
      <nav class="header__nav" aria-label="Principal">
        {site.nav.map((enlace) => <a href={enlace.href}>{enlace.texto}</a>)}
      </nav>
      <a class="header__empresas header__empresas--movil" href={site.enlaceEmpresas.href}>{site.enlaceEmpresas.texto}</a>
    </div>
    <div class="header__acciones">
      <a class="header__empresas header__empresas--escritorio" href={site.enlaceEmpresas.href}>{site.enlaceEmpresas.texto}</a>
      <a class="header__cta" href="/catalogo">Ver catálogo</a>
      <button class="header__boton-menu" type="button" data-menu-boton aria-controls="menu-principal" aria-expanded="false">
        Menú
      </button>
    </div>
  </ts-menu>
</header>

<script>
  import { registrarMenu } from '@/scripts/menu';

  registrarMenu();
</script>

<style lang="scss">
  .header {
    position: sticky;
    top: 0;
    z-index: 20;
    padding: 14px $padding-lateral;
    background: rgb(238 242 251 / 95%);
    backdrop-filter: blur(10px);
    border-bottom: 1px solid tinta(8%);
  }

  .header__menu {
    display: grid;
    grid-template-columns: repeat(3, auto);
    grid-template-areas: "marca panel acciones";
    align-items: center;
    justify-content: space-between;
    gap: 20px;
  }

  .header__marca {
    grid-area: marca;
    font: 800 19px / 1 fuente("archivo");
    letter-spacing: -0.04em;
    color: color("tinta");

    &:hover {
      color: color("tinta");
    }
  }

  .header__panel {
    grid-area: panel;
  }

  .header__nav {
    display: flex;
    gap: clamp(12px, 2vw, 22px);
    font: 500 13.5px / 1 fuente("archivo");

    a {
      color: tinta(80%);

      &:hover {
        color: color("cobalto");
      }
    }
  }

  .header__acciones {
    grid-area: acciones;
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .header__empresas {
    font: 500 12.5px / 1 fuente("archivo");
    color: tinta(65%);

    &:hover {
      color: color("cobalto");
    }
  }

  .header__empresas--movil,
  .header__boton-menu {
    display: none;
  }

  .header__cta {
    @include pill;
  }

  @include movil {
    .header__menu {
      grid-template-columns: auto 1fr;
      grid-template-areas:
        "marca acciones"
        "panel panel";
      row-gap: 0;
    }

    .header__acciones {
      justify-self: end;
    }

    .header__empresas--escritorio {
      display: none;
    }

    // Sin JS el botón no haría nada: solo aparece con <html data-js> (lo pone BaseLayout).
    :global(html[data-js]) .header__boton-menu {
      display: inline-flex;
      align-items: center;
      min-height: 44px;
      padding: 0 14px;
      border: 1px solid tinta(16%);
      border-radius: radio("pill");
      background: transparent;
      color: color("tinta");
      font: 600 12.5px / 1 fuente("archivo");
      cursor: pointer;
    }

    .header__panel {
      display: flex;
      flex-direction: column;
      gap: 14px;
      padding-top: 14px;
    }

    :global(html[data-js]) .header__panel:not([data-abierto]) {
      display: none;
    }

    .header__nav {
      flex-direction: column;
      gap: 14px;
      font-size: 15px;
    }

    .header__empresas--movil {
      display: block;
      font-size: 15px;
    }
  }
</style>
```

- [ ] **Paso 2: `src/components/layout/Footer.astro`**

```astro
---
import { site } from '@/data/site';

// La columna «Sillas» (categorías y total) se añade en la fase 2, cuando existe el contenido.
const columnas = site.footer;
const anio = new Date().getFullYear();
---

<footer class="footer">
  <div class="footer__contenido">
    <div class="footer__columnas">
      <div class="footer__marca">
        <a class="footer__wordmark" href="/sillas-ergonomicas">TESSERA</a>
        <p class="footer__lema">{site.lema}</p>
      </div>
      {
        columnas.map((columna) => (
          <nav class="footer__columna" aria-label={columna.titulo}>
            <span class="footer__titulo">{columna.titulo}</span>
            {columna.enlaces.map((enlace) => (
              <a href={enlace.href}>{enlace.texto}</a>
            ))}
          </nav>
        ))
      }
    </div>
    <div class="footer__legal">
      <span>© {anio} {site.nombre}. Sillas ergonómicas para home office.</span>
      <span>{site.textoEnvios}</span>
    </div>
  </div>
</footer>

<style lang="scss">
  .footer {
    padding: clamp(48px, 6vw, 72px) $padding-lateral 40px;
    background: color("tinta");
    color: color("hielo");
  }

  .footer__contenido {
    @include contenedor;

    display: flex;
    flex-direction: column;
    gap: 40px;
  }

  .footer__columnas {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
    gap: 28px;
  }

  .footer__marca {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .footer__wordmark {
    font: 800 19px / 1 fuente("archivo");
    letter-spacing: -0.04em;
    color: color("hielo");

    &:hover {
      color: color("blanco");
    }
  }

  .footer__lema {
    max-width: 26ch;
    margin: 0;
    font: 400 12.5px / 1.7 fuente("archivo");
    color: hielo(55%);
  }

  .footer__columna {
    display: flex;
    flex-direction: column;
    gap: 11px;
    min-width: 0;

    a {
      font: 400 13px / 1.5 fuente("archivo");
      color: hielo(80%);

      &:hover {
        color: color("blanco");
      }
    }
  }

  .footer__titulo {
    @include etiqueta-mono(9.5px);

    color: color("cobalto-claro");
  }

  .footer__legal {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding-top: 22px;
    border-top: 1px solid hielo(12%);
    font: 400 11px / 1.6 fuente("mono");
    color: hielo(48%); // 45 % en el diseño: 48 % es el mínimo con 4,5:1 (WCAG AA)
  }
</style>
```

- [ ] **Paso 3: Checkpoint**

```bash
git add src/components/layout
```
Mensaje propuesto: `feat: añade header sticky con menú móvil y footer`

---

### Tarea 11: Layout, SEO y fuentes

**Files:**
- Create: `astro.config.ts`, `src/components/seo/Seo.astro`, `src/components/seo/JsonLd.astro`, `src/layouts/BaseLayout.astro`, `src/pages/sillas-ergonomicas.astro` (provisional), `public/favicon.svg`

- [ ] **Paso 1: `astro.config.ts`**

La API de fuentes de Astro descarga Archivo, Newsreader e IBM Plex Mono desde Fontsource en el build y las sirve desde el propio sitio. `additionalData` inyecta el índice SCSS con ruta absoluta.

```ts
import { fileURLToPath } from 'node:url';
import sitemap from '@astrojs/sitemap';
import { defineConfig, fontProviders } from 'astro/config';
import { site } from './src/data/site';

const indiceScss = fileURLToPath(new URL('./src/styles/_index.scss', import.meta.url));

export default defineConfig({
  site: site.url,
  trailingSlash: 'never',
  // Un id repetido en una colección file() rompe el build en vez de avisar (ver src/lib/validacion.ts).
  prerenderConflictBehavior: 'error',
  build: { format: 'file' },
  integrations: [
    sitemap({
      filter: (pagina) => !pagina.endsWith('/404'),
    }),
  ],
  fonts: [
    {
      provider: fontProviders.fontsource(),
      name: 'Archivo',
      cssVariable: '--fuente-archivo',
      weights: [400, 500, 600, 700, 800],
      styles: ['normal'],
      subsets: ['latin'],
      fallbacks: ['system-ui', 'sans-serif'],
    },
    {
      provider: fontProviders.fontsource(),
      name: 'Newsreader',
      cssVariable: '--fuente-newsreader',
      weights: [300],
      styles: ['normal', 'italic'],
      subsets: ['latin'],
      fallbacks: ['Georgia', 'serif'],
    },
    {
      provider: fontProviders.fontsource(),
      name: 'IBM Plex Mono',
      cssVariable: '--fuente-mono',
      weights: [400, 500],
      styles: ['normal'],
      subsets: ['latin'],
      fallbacks: ['ui-monospace', 'monospace'],
    },
  ],
  vite: {
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: `@use "${indiceScss}" as *;\n`,
        },
      },
    },
  },
});
```

- [ ] **Paso 2: `src/components/seo/JsonLd.astro`**

```astro
---
import type { Thing } from 'schema-dts';
import { serializarJsonLd } from '@/lib/schema';

interface Props {
  datos: Thing | readonly Thing[];
}

const { datos } = Astro.props;
---

<script type="application/ld+json" is:inline set:html={serializarJsonLd(datos)} />
```

- [ ] **Paso 3: `src/components/seo/Seo.astro`**

```astro
---
import { site } from '@/data/site';
import { localeOpenGraph, tituloPagina, urlCanonica } from '@/lib/seo';

interface Props {
  titulo: string;
  descripcion: string;
  ruta: string;
  indexable: boolean;
}

const { titulo, descripcion, ruta, indexable } = Astro.props;
const tituloCompleto = tituloPagina(titulo, site.nombre);
const canonica = urlCanonica(site.url, ruta);
---

<title>{tituloCompleto}</title>
<meta name="description" content={descripcion} />
<link rel="canonical" href={canonica} />
{!indexable && <meta name="robots" content="noindex, follow" />}
<meta property="og:type" content="website" />
<meta property="og:site_name" content={site.nombre} />
<meta property="og:locale" content={localeOpenGraph(site.mercado.locale)} />
<meta property="og:title" content={tituloCompleto} />
<meta property="og:description" content={descripcion} />
<meta property="og:url" content={canonica} />
<meta name="twitter:card" content="summary" />
```

- [ ] **Paso 4: `src/layouts/BaseLayout.astro`**

El `<script is:inline>` del `<head>` marca `<html data-js>` antes del primer pintado: así el CSS colapsa el menú móvil desde el principio. Colapsarlo desde `<ts-menu>` al cargar movía toda la página (Lighthouse: CLS 0,15).

```astro
---
import type { Thing } from 'schema-dts';
import { Font } from 'astro:assets';
import Footer from '@/components/layout/Footer.astro';
import Header from '@/components/layout/Header.astro';
import JsonLd from '@/components/seo/JsonLd.astro';
import Seo from '@/components/seo/Seo.astro';
import { site } from '@/data/site';
import { organizacion, sitioWeb } from '@/lib/schema';
import '@/styles/global.scss';

interface Props {
  titulo: string;
  descripcion: string;
  /** Ruta canónica de la página, p. ej. `/catalogo/malla`. */
  ruta: string;
  indexable?: boolean;
  /** JSON-LD propio de la página; Organization y WebSite se añaden siempre. */
  jsonLd?: readonly Thing[];
}

const { titulo, descripcion, ruta, indexable = true, jsonLd = [] } = Astro.props;

const datosGlobales = [
  organizacion({
    nombre: site.nombre,
    url: site.url,
    correo: site.contacto.correo,
    telefono: site.contacto.whatsapp,
    descripcion: site.lema,
  }),
  sitioWeb(site.nombre, site.url, site.mercado.locale),
];
---

<!doctype html>
<html lang={site.mercado.locale}>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <!--
      Marca que hay JS antes del primer pintado: el CSS colapsa el menú móvil desde el
      principio en vez de hacerlo el script al cargar, que movería toda la página (CLS).
    -->
    <script is:inline>
      document.documentElement.dataset.js = '';
    </script>
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <Font cssVariable="--fuente-archivo" preload={[{ weight: 700, style: 'normal' }]} />
    <Font cssVariable="--fuente-newsreader" />
    <Font cssVariable="--fuente-mono" />
    <Seo titulo={titulo} descripcion={descripcion} ruta={ruta} indexable={indexable} />
    <JsonLd datos={[...datosGlobales, ...jsonLd]} />
  </head>
  <body>
    <Header />
    <main id="contenido">
      <slot />
    </main>
    <Footer />
  </body>
</html>
```

- [ ] **Paso 5: Página provisional `src/pages/sillas-ergonomicas.astro`** (se sustituye en la fase 3)

```astro
---
// Página provisional de la fase 1: la landing real se arma en la fase 3.
import BaseLayout from '@/layouts/BaseLayout.astro';
---

<BaseLayout
  titulo="Sillas ergonómicas para home office"
  descripcion="Sillas ergonómicas calibradas a tu estatura, tu escritorio y tus horas sentado. Cotiza con un asesor por WhatsApp."
  ruta="/sillas-ergonomicas"
>
  <section id="inicio">
    <h1>Sillas ergonómicas para home office</h1>
  </section>
</BaseLayout>
```

- [ ] **Paso 6: `public/favicon.svg`** (provisional hasta tener el logo del cliente)

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="#111623"/><text x="16" y="22" font-family="Archivo, system-ui, sans-serif" font-size="17" font-weight="800" text-anchor="middle" fill="#EEF2FB">T</text></svg>
```

- [ ] **Paso 7: Build**

Run: `npm run build`
Expected: `astro check` con `0 errors`, luego `[build] 1 page(s) built` y `Complete!`. La primera vez descarga las fuentes (necesita red).

- [ ] **Paso 8: Revisar la salida**

Run: `grep -o '<html[^>]*>\|<link rel="canonical"[^>]*>\|<link rel="preload"[^>]*font[^>]*>' dist/sillas-ergonomicas.html`
Expected: `<html lang="es-MX">`, `<link rel="canonical" href="https://tessera.example/sillas-ergonomicas">` y un `preload` de `.woff2`.

Run: `grep -c ':root{--color-' dist/_astro/*.css`
Expected: `1` (los tokens se emiten una sola vez).

- [ ] **Paso 9: Revisión visual**

Run: `npm run preview` y abre `http://localhost:4321/sillas-ergonomicas` a 1280 px y a 375 px.
Expected: header como el del diseño (marca, nav centrada, «Empresas» y pill «Ver catálogo»); a 375 px, marca + «Ver catálogo» + «Menú», y el menú abre la nav y «Empresas». Footer oscuro con columnas «Decide» y «Tessera» y la barra legal.

- [ ] **Paso 10: Checkpoint**

```bash
git add astro.config.ts src/components/seo src/layouts src/pages/sillas-ergonomicas.astro public/favicon.svg
```
Mensaje propuesto: `feat: añade layout con SEO, JSON-LD y fuentes autoalojadas`

---

### Tarea 12: Componentes compartidos

**Files:**
- Create: `src/components/ui/EncabezadoSeccion.astro`, `src/components/ui/FranjaOscura.astro`, `src/components/ui/CtaWhatsApp.astro`, `src/components/ui/BloqueConversion.astro`

Patrones que se repiten en las tres pantallas: etiqueta mono + `h2` + intro; franja oscura hacia el comparador; CTA de WhatsApp (pill verde con «responde en 3 min»); bloque de conversión (bloque 06 y cierre del comparador).

- [ ] **Paso 1: `src/components/ui/EncabezadoSeccion.astro`**

```astro
---
interface Props {
  etiqueta: string;
  titulo: string;
  intro?: string;
  /** Ancho máximo del bloque de texto (el diseño usa 46–56ch según la sección). */
  ancho?: string;
  variante?: 'claro' | 'oscuro';
  /** Nivel del título: h2 en casi todas las secciones, h1 en la cabecera del comparador. */
  nivel?: 'h1' | 'h2';
}

const { etiqueta, titulo, intro, ancho = '52ch', variante = 'claro', nivel = 'h2' } = Astro.props;
const Titulo = nivel;
---

<div class:list={['encabezado', `encabezado--${variante}`]}>
  <div class="encabezado__texto" style={`max-width: ${ancho}`}>
    <span class="encabezado__etiqueta">{etiqueta}</span>
    <Titulo class="encabezado__titulo">{titulo}</Titulo>
    {intro !== undefined && <p class="encabezado__intro">{intro}</p>}
  </div>
  {Astro.slots.has('accion') && <slot name="accion" />}
</div>

<style lang="scss">
  .encabezado {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    justify-content: space-between;
    gap: 24px;
  }

  .encabezado__texto {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .encabezado__etiqueta {
    @include etiqueta-mono;

    color: color("cobalto");
  }

  .encabezado__titulo {
    @include h2;
  }

  .encabezado__intro {
    @include cuerpo;
  }

  .encabezado--oscuro {
    .encabezado__etiqueta {
      color: color("cobalto-claro");
    }

    .encabezado__titulo {
      @include h2-serif;

      color: color("hielo");
    }
  }
</style>
```

- [ ] **Paso 2: `src/components/ui/FranjaOscura.astro`**

```astro
---
interface Props {
  texto: string;
  enlace: { texto: string; href: string };
  id?: string;
}

const { texto, enlace, id } = Astro.props;
---

<div class="franja" id={id}>
  <p class="franja__texto">{texto}</p>
  <a class="franja__enlace" href={enlace.href}>{enlace.texto}</a>
</div>

<style lang="scss">
  .franja {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 18px;
    padding: 22px 26px;
    border-radius: radio("m");
    background: color("tinta");
  }

  .franja__texto {
    max-width: 34ch;
    margin: 0;
    font: 300 clamp(19px, 2.2vw, 26px) / 1.3 fuente("newsreader");
    color: color("hielo");
    text-wrap: pretty;
  }

  .franja__enlace {
    @include pill(color("hielo"), color("tinta"), color("cobalto-claro"));

    flex: none;
    padding: 13px 22px;
    font-size: 13px;
  }
</style>
```

- [ ] **Paso 3: `src/components/ui/CtaWhatsApp.astro`**

```astro
---
import { site } from '@/data/site';
import { urlWhatsApp, type ContextoWhatsApp } from '@/lib/contacto';

interface Props {
  contexto: ContextoWhatsApp;
  tamano?: 'normal' | 'grande';
}

const { contexto, tamano = 'normal' } = Astro.props;
const href = urlWhatsApp(site.contacto.whatsapp, site.mensajesWhatsApp[contexto]);
---

<a class:list={['cta-whatsapp', `cta-whatsapp--${tamano}`]} href={href} rel="noopener" target="_blank" data-whatsapp={contexto}>
  Cotizar por WhatsApp<span class="cta-whatsapp__nota">{site.notaWhatsApp}</span>
</a>

<style lang="scss">
  .cta-whatsapp {
    display: flex;
    flex: none;
    align-items: center;
    gap: 9px;
    padding: 11px 18px;
    border-radius: radio("pill");
    background: color("whatsapp");
    color: color("whatsapp-texto");
    font: 600 12.5px / 1 fuente("archivo");
    transition: background 0.2s ease;

    &:hover {
      background: color("whatsapp-hover");
      color: color("whatsapp-texto");
    }
  }

  .cta-whatsapp--grande {
    padding: 14px 22px;
    font-size: 13.5px;
  }

  .cta-whatsapp__nota {
    font: 400 10.5px / 1 fuente("mono");
    opacity: 0.8; // 0,75 en el diseño: por debajo de 4,5:1 (WCAG AA) sobre el verde
  }
</style>
```

- [ ] **Paso 4: `src/components/ui/BloqueConversion.astro`**

```astro
---
import type { ContextoWhatsApp } from '@/lib/contacto';
import CtaWhatsApp from './CtaWhatsApp.astro';

interface Props {
  titular: string;
  texto: string;
  contexto: ContextoWhatsApp;
  /** El bloque 06 empieza en hielo; el cierre del comparador, en blanco. */
  inicioGradiente?: 'hielo' | 'blanco';
}

const { titular, texto, contexto, inicioGradiente = 'hielo' } = Astro.props;
---

<div class:list={['conversion', `conversion--${inicioGradiente}`]}>
  <div class="conversion__texto">
    <strong class="conversion__titular">{titular}</strong>
    <span class="conversion__detalle">{texto}</span>
  </div>
  <CtaWhatsApp contexto={contexto} tamano="grande" />
</div>

<style lang="scss">
  .conversion {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
    padding: 26px 28px;
    border: 1px solid rgb(46 91 219 / 20%);
    border-radius: radio("m");
  }

  .conversion--hielo {
    background: linear-gradient(120deg, color("hielo") 0%, color("azul-palido") 100%);
  }

  .conversion--blanco {
    background: linear-gradient(120deg, color("blanco") 0%, color("azul-palido") 100%);
  }

  .conversion__texto {
    display: flex;
    flex-direction: column;
    gap: 7px;
    max-width: 52ch;
  }

  .conversion__titular {
    font: 600 18px / 1.25 fuente("archivo");
    letter-spacing: -0.02em;
    color: color("tinta");
  }

  .conversion__detalle {
    font: 400 13.5px / 1.6 fuente("archivo");
    color: color("gris-texto");
  }
</style>
```

- [ ] **Paso 5: Tipos y estilos**

Run: `npm run check && npm run lint:styles`
Expected: `0 errors` y Stylelint sin salida.

- [ ] **Paso 6: Checkpoint**

```bash
git add src/components/ui
```
Mensaje propuesto: `feat: añade encabezado de sección, franja oscura y CTAs de WhatsApp`

---

### Tarea 13: 404, robots.txt y redirección de `/`

**Files:**
- Create: `src/pages/404.astro`, `src/pages/robots.txt.ts`, `public/_redirects`

- [ ] **Paso 1: `src/pages/404.astro`**

```astro
---
import BaseLayout from '@/layouts/BaseLayout.astro';
---

<BaseLayout titulo="Página no encontrada" descripcion="La página que buscas no existe." ruta="/404" indexable={false}>
  <section class="no-encontrada">
    <span class="no-encontrada__codigo">404</span>
    <h1 class="no-encontrada__titulo">Esta página no existe</h1>
    <p class="no-encontrada__texto">Puede que el enlace esté mal escrito o que la página se haya movido.</p>
    <a class="no-encontrada__enlace" href="/sillas-ergonomicas">Volver al inicio</a>
  </section>
</BaseLayout>

<style lang="scss">
  .no-encontrada {
    @include seccion;
    @include contenedor("texto");

    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }

  .no-encontrada__codigo {
    @include etiqueta-mono;

    color: color("cobalto");
  }

  .no-encontrada__titulo {
    @include h1-pantalla;
  }

  .no-encontrada__texto {
    @include cuerpo;
  }

  .no-encontrada__enlace {
    @include pill;
  }
</style>
```

- [ ] **Paso 2: `src/pages/robots.txt.ts`**

```ts
import type { APIRoute } from 'astro';

export const GET: APIRoute = ({ site }) => {
  if (site === undefined) {
    throw new Error('Falta `site` en astro.config.ts: robots.txt necesita la URL del sitemap.');
  }
  const cuerpo = ['User-agent: *', 'Allow: /', '', `Sitemap: ${new URL('sitemap-index.xml', site).href}`, ''].join('\n');
  return new Response(cuerpo, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
```

- [ ] **Paso 3: `public/_redirects`**

Cloudflare aplica este archivo como 301 real. El `redirects` de Astro no sirve aquí: en modo estático genera una página con meta refresh.

```text
/ /sillas-ergonomicas 301
```

- [ ] **Paso 4: Build y salida**

Run: `npm run build && cat dist/robots.txt && cat dist/sitemap-0.xml`
Expected: `robots.txt` con `Sitemap: https://tessera.example/sitemap-index.xml`; el sitemap contiene `/sillas-ergonomicas` y **no** `/404`.

- [ ] **Paso 5: Checkpoint**

```bash
git add src/pages/404.astro src/pages/robots.txt.ts public/_redirects
```
Mensaje propuesto: `feat: añade 404, robots.txt y redirección 301 de la raíz`

---

### Tarea 14: Verificación de la fase

- [ ] **Paso 1: Todo en verde**

Run: `npm run verify && npm run build`
Expected: `astro check` `0 errors`; ESLint y Stylelint sin salida; `Test Files  6 passed (6)` y `Tests  29 passed (29)`; build `Complete!`.

- [ ] **Paso 2: Checkpoint final de fase**

```bash
git status --short
```
Expected: nada pendiente fuera de lo ya añadido. Mensaje propuesto para el usuario si prefiere un solo commit de fase: `feat: base del proyecto Tessera (fase 1)`
