# Tessera — Fase 2: datos y lógica

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Content Collections con esquemas estrictos y los datos del prototipo migrados; funciones puras de `src/lib/` (formato, catálogo, comparador, validación, JSON-LD) con tests; carga de contenido que valida la integridad y rompe el build ante cualquier referencia rota.

**Architecture:** Nueve colecciones en `src/content.config.ts` (`z.strictObject` en todas). `src/lib/validacion.ts` contiene las reglas de integridad sobre datos planos (probadas en Vitest); `src/lib/contenido.ts` carga las colecciones, aplica esas reglas y devuelve el contenido resuelto y ordenado. Los tipos de datos se derivan de los esquemas con `CollectionEntry<…>` e `import type`, así Vitest nunca carga `astro:content`.

**Tech Stack:** Astro 7 Content Layer (`glob()`, `file()`, `image()`, `reference()`) · Zod 4 (`astro/zod`) · Vitest 5.

**Prerrequisito:** fase 1 completa (`npm run verify` en verde).

**Hallazgos que justifican la validación propia:** en Astro 7, una referencia a una entrada inexistente solo registra `[ERROR] [content] Invalid content reference` y el build termina con código 0. Lo mismo con el loader `file()`: un JSON inválido (una coma final), una entrada sin `id` o un `id` repetido solo dejan un mensaje en el log, y con la caché de un build anterior se publica el contenido viejo. `obtenerContenido()` relee los JSON en crudo (`import.meta.glob(…, { query: '?raw' })`), aplica las reglas de `validacion.ts` y lanza `ErrorDeContenido`: el build falla con un mensaje claro. Además, `astro.config.ts` lleva `prerenderConflictBehavior: 'error'`.

**Datos de ejemplo:** todo el contenido de esta fase sale del prototipo (clase lógica de `Tessera Landing SEO.dc.html`). Las specs de las 9 sillas que no están en el comparador, los textos de cada categoría y los mensajes de las categorías son **de ejemplo** y se sustituyen por los catálogos reales del usuario.

**YAML:** en el frontmatter de los `.md`, un valor que contenga `: ` debe ir entre comillas (p. ej. `lumbar: "Doble ajuste: altura y profundidad"`); si no, falla el parseo.

---

### Tarea 1: Imágenes marcador

**Files:**
- Create: `src/assets/sillas/silla-coral.png`, `src/assets/sillas/silla-azul.png`, `src/assets/sillas/silla-roja.png`

- [ ] **Paso 1: Obtener las imágenes**

Opción A (preferida): descarga `assets/silla-coral.png`, `assets/silla-azul.png` y `assets/silla-roja.png` del proyecto de Claude Design y cópialas en `src/assets/sillas/`. Con `DesignSync get_file` llegan truncadas (límite de 256 KiB) y se ven cortadas: hay que bajarlas desde la interfaz.

Opción B (si no hay acceso): genéralas con ImageMagick:

```bash
mkdir -p src/assets/sillas
magick -size 1600x1600 "gradient:#F3F4F8-#E8836B" -gravity center -pointsize 96 -fill white -annotate 0 "marcador coral" src/assets/sillas/silla-coral.png
magick -size 1600x1600 "gradient:#F3F4F8-#3D5A99" -gravity center -pointsize 96 -fill white -annotate 0 "marcador azul" src/assets/sillas/silla-azul.png
magick -size 1600x1600 "gradient:#F3F4F8-#C0392B" -gravity center -pointsize 96 -fill white -annotate 0 "marcador roja" src/assets/sillas/silla-roja.png
```

- [ ] **Paso 2: Comprobar**

Run: `file src/assets/sillas/*.png`
Expected: tres `PNG image data` (1080 x 1080 si vienen del diseño, 1600 x 1600 si son generadas).

- [ ] **Paso 3: Checkpoint**

```bash
git add src/assets/sillas
```
Mensaje propuesto: `chore: añade imágenes marcador de las sillas`

---

### Tarea 2: Esquemas de las colecciones

**Files:**
- Create: `src/content.config.ts`

- [ ] **Paso 1: `src/content.config.ts`**

```ts
import { defineCollection, reference } from 'astro:content';
import { file, glob } from 'astro/loaders';
import { z } from 'astro/zod';

// Todos los esquemas son estrictos: una clave desconocida (p. ej. un `precio`) rompe el build.
// `reference()` solo valida la forma del id; que la entrada exista lo comprueba src/lib/contenido.ts.

const rango = z
  .strictObject({ min: z.number().positive(), max: z.number().positive() })
  .refine((r) => r.min <= r.max, { message: '`min` no puede ser mayor que `max`' });

const colorHex = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Color en formato #RRGGBB');
const slug = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Slug en minúsculas separadas por guiones');

const categorias = defineCollection({
  loader: file('src/content/categorias.json'),
  schema: z.strictObject({
    id: slug,
    slug,
    grupo: z.enum(['respaldo', 'resuelve', 'estatura']),
    orden: z.number().int(),
    /** Opción del aside de filtros: «Malla». */
    etiqueta: z.string(),
    /** Chips de la barra de categorías y footer: «Sillas de malla». */
    etiquetaLarga: z.string(),
    /** `<h1>` de la página de la categoría; `enfasis` va en Newsreader itálica. */
    titulo: z.strictObject({ texto: z.string(), enfasis: z.string().optional() }),
    intro: z.string(),
    seo: z.strictObject({ titulo: z.string(), descripcion: z.string().max(160) }),
    guia: z.strictObject({
      titulo: z.string(),
      parrafos: z.array(z.string()).min(1),
      apartados: z.array(z.strictObject({ titulo: z.string(), texto: z.string() })),
    }),
  }),
});

const sillas = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/sillas' }),
  schema: ({ image }) =>
    z.strictObject({
      nombre: z.string(),
      orden: z.number().int(),
      /** Línea corta de la portada, la marquesina y el comparador: «Malla · lumbar ajustable». */
      resumen: z.string(),
      /** Tarjeta del catálogo. */
      descripcion: z.string(),
      /** Tarjeta de la muestra de la landing; si falta se usa `descripcion`. */
      pitch: z.string().optional(),
      imagen: z.strictObject({ src: image(), alt: z.string().min(1) }),
      categorias: z.array(reference('categorias')).min(1),
      /** Metros. */
      estatura: rango,
      specs: z.strictObject({
        respaldo: z.string(),
        /** Centímetros. */
        alturaAsiento: rango,
        reposabrazos: z.string(),
        /** Grados. */
        reclinacionMax: z.number().int().min(90).max(180),
        lumbar: z.string(),
        garantiaAnios: z.number().int().positive(),
        entregaArmada: z.boolean(),
      }),
      /** Obligatorio para las sillas de la portada y la de anatomía. */
      tema: z.strictObject({ gradiente: z.tuple([colorHex, colorHex, colorHex]) }).optional(),
    }),
});

const destacados = defineCollection({
  loader: file('src/content/destacados.json'),
  schema: z.strictObject({
    id: z.literal('landing'),
    portada: z.array(reference('sillas')).min(1),
    muestra: z.array(reference('sillas')).min(1),
    comparador: z.tuple([reference('sillas'), reference('sillas'), reference('sillas')]),
    anatomia: reference('sillas'),
    barra: z.array(reference('categorias')).min(1),
  }),
});

const ajustes = defineCollection({
  loader: file('src/content/ajustes.json'),
  schema: z
    .strictObject({
      id: slug,
      orden: z.number().int(),
      titulo: z.string(),
      /** Texto del rango («6 vueltas»)… */
      rango: z.string().optional(),
      /** …o la spec de la silla de anatomía de la que se deriva (una sola fuente, spec §5.3). */
      spec: z.enum(['alturaAsiento', 'reposabrazos', 'lumbar', 'reclinacionMax']).optional(),
      porcentaje: z.number().int().min(0).max(100),
      descripcion: z.string(),
      /** Posición del punto sobre la foto de anatomía, en % (recalibrar con la foto real). */
      punto: z.strictObject({ x: z.number().min(0).max(100), y: z.number().min(0).max(100) }),
    })
    .refine((a) => (a.rango === undefined) !== (a.spec === undefined), {
      message: 'Indica `rango` o `spec` (uno de los dos)',
    }),
});

const testimonios = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/testimonios' }),
  schema: ({ image }) =>
    z
      .strictObject({
        orden: z.number().int(),
        /** Visibles de entrada (el resto aparece con «Leer más experiencias»). */
        destacado: z.boolean(),
        cita: z.string(),
        ampliacion: z.string().optional(),
        nombre: z.string(),
        meta: z.string(),
        silla: reference('sillas').optional(),
        /** Para testimonios sin silla concreta: «Pedido de empresa». */
        etiquetaSilla: z.string().optional(),
        antiguedad: z.string(),
        /** Objeción del bloque 02 que responde (spec: horas / estatura / clima). */
        objecion: z.enum(['horas', 'estatura', 'clima', 'otra']),
        imagen: z.strictObject({ src: image(), alt: z.string().min(1) }),
      })
      .refine((t) => (t.silla === undefined) !== (t.etiquetaSilla === undefined), {
        message: 'Indica `silla` o `etiquetaSilla` (uno de los dos)',
      }),
});

const faqs = defineCollection({
  loader: file('src/content/faqs.json'),
  schema: z.strictObject({ id: slug, orden: z.number().int(), pregunta: z.string(), respuesta: z.string() }),
});

const pasos = defineCollection({
  loader: file('src/content/pasos.json'),
  schema: z.strictObject({ id: slug, orden: z.number().int(), titulo: z.string(), descripcion: z.string() }),
});

const necesidades = defineCollection({
  loader: file('src/content/necesidades.json'),
  schema: z.strictObject({
    id: slug,
    orden: z.number().int(),
    etiqueta: z.string(),
    titulo: z.string(),
    descripcion: z.string(),
    cta: z.string(),
    categoria: reference('categorias'),
  }),
});

const veredictos = defineCollection({
  loader: file('src/content/veredictos.json'),
  schema: z.strictObject({
    id: slug,
    orden: z.number().int(),
    perfil: z.string(),
    silla: reference('sillas'),
    razon: z.string(),
  }),
});

export const collections = {
  categorias,
  sillas,
  destacados,
  ajustes,
  testimonios,
  faqs,
  pasos,
  necesidades,
  veredictos,
};
```

- [ ] **Paso 2: Checkpoint** (se valida en la Tarea 5, cuando existen los datos)

```bash
git add src/content.config.ts
```
Mensaje propuesto: `feat: define las colecciones de contenido con esquemas estrictos`

---

### Tarea 3: Categorías, destacados y listas

**Files:**
- Create: `src/content/categorias.json`, `src/content/destacados.json`, `src/content/ajustes.json`, `src/content/faqs.json`, `src/content/pasos.json`, `src/content/necesidades.json`, `src/content/veredictos.json`

Los `file()` sobre arrays JSON exigen un `id` único por entrada. En `categorias.json`, `id` es interno (lo usan las referencias) y `slug` es la URL: `intensivo` → `/catalogo/uso-intensivo`, `alta` → `/catalogo/altos`, `compacta` → `/catalogo/compactas` (handoff, tabla de filtros).

- [ ] **Paso 1: `src/content/categorias.json`** (textos de cada categoría: de ejemplo)

```json
[
  {
    "id": "malla",
    "slug": "malla",
    "grupo": "respaldo",
    "orden": 1,
    "etiqueta": "Malla",
    "etiquetaLarga": "Sillas de malla",
    "titulo": {
      "texto": "Sillas ergonómicas de",
      "enfasis": "malla"
    },
    "intro": "Respaldo y asiento de malla transpirable: la opción para trabajar con calor o sin aire acondicionado.",
    "seo": {
      "titulo": "Sillas ergonómicas de malla",
      "descripcion": "Sillas ergonómicas de malla transpirable para home office, calibradas a tu estatura y a tu escritorio. Cotiza con un asesor."
    },
    "guia": {
      "titulo": "Cuándo elegir una silla de malla",
      "parrafos": [
        "La malla deja pasar el aire entre la espalda y el respaldo, así que no acumula calor en jornadas largas."
      ],
      "apartados": [
        {
          "titulo": "Tensión",
          "texto": "Una malla bien tensada sostiene sin hundirse; por eso se calibra según tu peso antes de salir del taller."
        }
      ]
    }
  },
  {
    "id": "tapizada",
    "slug": "tapizada",
    "grupo": "respaldo",
    "orden": 2,
    "etiqueta": "Tapizada",
    "etiquetaLarga": "Sillas tapizadas",
    "titulo": {
      "texto": "Sillas ergonómicas",
      "enfasis": "tapizadas"
    },
    "intro": "Espuma moldeada y tapizado técnico para quien prefiere una sensación más firme.",
    "seo": {
      "titulo": "Sillas ergonómicas tapizadas",
      "descripcion": "Sillas ergonómicas tapizadas con espuma moldeada para home office. Te asesoramos por WhatsApp para elegir la tuya."
    },
    "guia": {
      "titulo": "Cuándo elegir una silla tapizada",
      "parrafos": [
        "El tapizado da una sensación más firme y aísla en climas fríos, pero acumula calor en jornadas largas."
      ],
      "apartados": [
        {
          "titulo": "Densidad",
          "texto": "La espuma de alta densidad conserva la forma con los años de uso diario."
        }
      ]
    }
  },
  {
    "id": "lumbar",
    "slug": "lumbar",
    "grupo": "resuelve",
    "orden": 1,
    "etiqueta": "Soporte lumbar",
    "etiquetaLarga": "Con soporte lumbar",
    "titulo": {
      "texto": "Sillas con soporte",
      "enfasis": "lumbar ajustable"
    },
    "intro": "Lumbar ajustable en altura y tensión para que el apoyo caiga en la curva de tu espalda.",
    "seo": {
      "titulo": "Sillas ergonómicas con soporte lumbar",
      "descripcion": "Sillas con soporte lumbar ajustable para dolor de espalda al trabajar en casa. Un asesor te ayuda a elegir y calibrar la tuya."
    },
    "guia": {
      "titulo": "Cómo debe ser un buen soporte lumbar",
      "parrafos": [
        "Un lumbar útil se mueve en vertical y cambia de presión; una almohadilla fija casi nunca cae en el lugar correcto."
      ],
      "apartados": [
        {
          "titulo": "Altura",
          "texto": "El apoyo debe quedar a la altura de la curva de tu espalda baja, justo por encima del cinturón."
        }
      ]
    }
  },
  {
    "id": "intensivo",
    "slug": "uso-intensivo",
    "grupo": "resuelve",
    "orden": 2,
    "etiqueta": "Uso intensivo",
    "etiquetaLarga": "Para uso intensivo",
    "titulo": {
      "texto": "Sillas para",
      "enfasis": "uso intensivo"
    },
    "intro": "Mecanismos para jornadas de ocho horas o más: reclinación con topes y asiento de espuma moldeada.",
    "seo": {
      "titulo": "Sillas ergonómicas para uso intensivo",
      "descripcion": "Sillas ergonómicas para jornadas largas: reclinación con topes, cabecera y espuma moldeada. Cotiza con un asesor."
    },
    "guia": {
      "titulo": "Qué necesita una silla para jornadas largas",
      "parrafos": [
        "Cambiar de postura sin levantarte es lo que más alivia en jornadas largas: por eso importan la reclinación con topes y la cabecera."
      ],
      "apartados": [
        {
          "titulo": "Mecanismo",
          "texto": "Un mecanismo sincronizado mueve asiento y respaldo a la vez para que no pierdas el apoyo al reclinar."
        }
      ]
    }
  },
  {
    "id": "alta",
    "slug": "altos",
    "grupo": "estatura",
    "orden": 1,
    "etiqueta": "1.85 m o más",
    "etiquetaLarga": "Para 1.85 m +",
    "titulo": {
      "texto": "Sillas ergonómicas para",
      "enfasis": "personas altas"
    },
    "intro": "Respaldos altos, cabecera y pistón largo para que el cuerpo no sobre por arriba.",
    "seo": {
      "titulo": "Sillas ergonómicas para personas altas",
      "descripcion": "Sillas ergonómicas para personas de 1.85 m o más: respaldo alto, cabecera y pistón largo. Te asesoramos por WhatsApp."
    },
    "guia": {
      "titulo": "Qué mirar si mides más de 1.85 m",
      "parrafos": [
        "Si el respaldo te queda corto, los hombros quedan sin apoyo; busca respaldo alto o cabecera regulable."
      ],
      "apartados": [
        {
          "titulo": "Pistón",
          "texto": "Un pistón largo deja las rodillas a 90° aunque el escritorio sea alto."
        }
      ]
    }
  },
  {
    "id": "compacta",
    "slug": "compactas",
    "grupo": "estatura",
    "orden": 2,
    "etiqueta": "Escritorio pequeño",
    "etiquetaLarga": "Para escritorios pequeños",
    "titulo": {
      "texto": "Sillas ergonómicas",
      "enfasis": "compactas"
    },
    "intro": "Pensadas para escritorios de menos de 1.20 m y espacios pequeños.",
    "seo": {
      "titulo": "Sillas ergonómicas compactas",
      "descripcion": "Sillas ergonómicas compactas para escritorios pequeños y departamentos. Cotiza la tuya con un asesor por WhatsApp."
    },
    "guia": {
      "titulo": "Cómo elegir una silla para un espacio pequeño",
      "parrafos": [
        "En un escritorio pequeño importan la base, el ancho de los reposabrazos y que la silla entre bajo la mesa."
      ],
      "apartados": [
        {
          "titulo": "Reposabrazos",
          "texto": "Unos reposabrazos que bajan lo suficiente dejan meter la silla bajo el escritorio al terminar."
        }
      ]
    }
  }
]
```

- [ ] **Paso 2: `src/content/destacados.json`** (qué sillas y categorías aparecen en cada lugar)

```json
[
  {
    "id": "landing",
    "portada": [
      "duna",
      "mora-pro",
      "ignea"
    ],
    "muestra": [
      "duna",
      "mora-pro",
      "ignea"
    ],
    "comparador": [
      "duna",
      "mora-pro",
      "ignea"
    ],
    "anatomia": "duna",
    "barra": [
      "malla",
      "lumbar",
      "intensivo",
      "alta"
    ]
  }
]
```

- [ ] **Paso 3: `src/content/ajustes.json`** (bloque 04; `punto` calibrado a la foto marcador, recalibrar con la real). Cada ajuste lleva `rango` (texto) **o** `spec`: la altura y los reposabrazos se derivan de las specs de la silla de anatomía, para que la landing no contradiga al comparador (el prototipo decía «4D» y «42 – 52 cm» de la Duna, que es 2D y 42 – 50 cm).

```json
[
  {
    "id": "tension",
    "orden": 1,
    "titulo": "Tensión del respaldo",
    "rango": "6 vueltas",
    "porcentaje": 55,
    "descripcion": "La malla se tensa según tu peso: firme para trabajar, suave al reclinar.",
    "punto": {
      "x": 47,
      "y": 24
    }
  },
  {
    "id": "lumbar",
    "orden": 2,
    "titulo": "Apoyo lumbar",
    "rango": "4 posiciones",
    "porcentaje": 70,
    "descripcion": "Se desplaza 60 mm en vertical para caer en la curva de tu espalda.",
    "punto": {
      "x": 33,
      "y": 48
    }
  },
  {
    "id": "reposabrazos",
    "orden": 3,
    "titulo": "Reposabrazos",
    "spec": "reposabrazos",
    "porcentaje": 80,
    "descripcion": "Se ajustan hasta dejar el antebrazo paralelo al escritorio.",
    "punto": {
      "x": 62,
      "y": 56
    }
  },
  {
    "id": "altura",
    "orden": 4,
    "titulo": "Altura de asiento",
    "spec": "alturaAsiento",
    "porcentaje": 65,
    "descripcion": "Pistón clase 4. Rodillas a 90° y pies planos.",
    "punto": {
      "x": 45,
      "y": 76
    }
  }
]
```

- [ ] **Paso 4: `src/content/faqs.json`** (copia literal del diseño; los compromisos de garantía y prueba los valida el cliente)

```json
[
  {
    "id": "estatura",
    "orden": 1,
    "pregunta": "¿Qué silla ergonómica me conviene según mi estatura?",
    "respuesta": "De 1.55 m a 1.75 m la Duna cubre bien con el pistón estándar. Arriba de 1.80 m conviene un respaldo alto con cabecera, como la Mora Pro o la Ígnea. El asesor lo confirma con la altura de tu escritorio."
  },
  {
    "id": "malla-o-tapizada",
    "orden": 2,
    "pregunta": "¿Malla o tapizada?",
    "respuesta": "La malla mantiene el respaldo ventilado y es la mejor opción en clima cálido o sin aire acondicionado. El tapizado da una sensación más firme y aísla en climas fríos, pero acumula calor en jornadas largas."
  },
  {
    "id": "llega-armada",
    "orden": 3,
    "pregunta": "¿La silla llega armada?",
    "respuesta": "Sí. Sale calibrada del taller y se entrega montada. En zona metropolitana un técnico la ajusta contigo sentado; en el resto del país llega armada con la guía de ajuste impresa."
  },
  {
    "id": "prueba",
    "orden": 4,
    "pregunta": "¿Puedo probarla antes de quedármela?",
    "respuesta": "Tienes 30 días para usarla en tu escritorio. Si no te acomoda, la recogemos sin costo y se devuelve el importe completo."
  },
  {
    "id": "garantia",
    "orden": 5,
    "pregunta": "¿Qué cubre la garantía?",
    "respuesta": "Cinco años sobre estructura, mecanismo y pistón, y dos años sobre malla y espumas. Las piezas se reemplazan a domicilio."
  }
]
```

- [ ] **Paso 5: `src/content/pasos.json`**

```json
[
  {
    "id": "cuentanos",
    "orden": 1,
    "titulo": "Nos cuentas cómo trabajas",
    "descripcion": "Estatura, altura del escritorio y cuántas horas te sientas. Tres datos por WhatsApp."
  },
  {
    "id": "calibramos",
    "orden": 2,
    "titulo": "Calibramos la silla",
    "descripcion": "Tensión de malla, altura del lumbar y pistón se dejan listos antes de salir del taller."
  },
  {
    "id": "llega-armada",
    "orden": 3,
    "titulo": "Llega armada en 48 h",
    "descripcion": "En zona metropolitana la instalamos y ajustamos contigo sentado. Sin cajas ni tornillos."
  }
]
```

- [ ] **Paso 6: `src/content/necesidades.json`**

```json
[
  {
    "id": "dolor-lumbar",
    "orden": 1,
    "etiqueta": "Dolor lumbar",
    "titulo": "Me duele la espalda al final del día",
    "descripcion": "Sillas con lumbar ajustable en altura y tensión, no una almohadilla fija.",
    "cta": "Ver sillas con soporte lumbar",
    "categoria": "lumbar"
  },
  {
    "id": "jornadas-largas",
    "orden": 2,
    "etiqueta": "Jornadas largas",
    "titulo": "Me siento diez horas al día",
    "descripcion": "Mecanismos para uso intensivo: reclinación con topes y asiento de espuma moldeada.",
    "cta": "Ver sillas para uso intensivo",
    "categoria": "intensivo"
  },
  {
    "id": "clima-calido",
    "orden": 3,
    "etiqueta": "Clima cálido",
    "titulo": "Trabajo con calor y sin aire",
    "descripcion": "Respaldo y asiento de malla transpirable, sin tapizados que guarden temperatura.",
    "cta": "Ver sillas de malla",
    "categoria": "malla"
  },
  {
    "id": "estatura",
    "orden": 4,
    "etiqueta": "Estatura",
    "titulo": "Mido más de 1.85 m",
    "descripcion": "Respaldos altos, cabecera y pistón largo para que el cuerpo no sobre por arriba.",
    "cta": "Ver sillas para 1.85 m +",
    "categoria": "alta"
  }
]
```

- [ ] **Paso 7: `src/content/veredictos.json`**

```json
[
  {
    "id": "primera-silla",
    "orden": 1,
    "perfil": "Si es tu primera silla buena",
    "silla": "duna",
    "razon": "Cubre lo esencial: malla, lumbar ajustable y un rango de altura que sirve a la mayoría de los escritorios."
  },
  {
    "id": "ocho-horas",
    "orden": 2,
    "perfil": "Si te sientas más de ocho horas",
    "silla": "mora-pro",
    "razon": "Reclinación hasta 135° y cabecera: puedes cambiar de postura sin levantarte de la silla."
  },
  {
    "id": "alto-o-calor",
    "orden": 3,
    "perfil": "Si mides más de 1.85 m o hace calor",
    "silla": "ignea",
    "razon": "Respaldo alto con soporte de hombros y malla que no guarda temperatura en turnos largos."
  }
]
```

- [ ] **Paso 8: Checkpoint**

```bash
git add src/content/*.json
```
Mensaje propuesto: `feat: migra categorías, destacados y listas del prototipo`

---

### Tarea 4: Las doce sillas

**Files:**
- Create: `src/content/sillas/{duna,mora-pro,ignea,llano,cauce,vega,sierra,brida,alba,oria,pena,nara}.md`

Un archivo por silla, solo frontmatter (no hay fichas). El nombre del archivo es el id y el slug del ancla en `/catalogo#<slug>`. Duna, Mora Pro e Ígnea llevan las specs del comparador del diseño, `pitch` y `tema` (están en la portada); las demás llevan specs **de ejemplo**.

- [ ] **Paso 1: `src/content/sillas/duna.md`**

```markdown
---
nombre: Tessera Duna
orden: 1
resumen: Malla · lumbar ajustable
descripcion: Malla firme y lumbar ajustable. La base del catálogo.
pitch: "Para quien empieza a trabajar en casa: malla, lumbar ajustable y reposabrazos 2D."
imagen:
  src: ../../assets/sillas/silla-coral.png
  alt: Tessera Duna, silla ergonómica de malla coral
categorias: [malla, lumbar]
estatura: { min: 1.55, max: 1.80 }
specs:
  respaldo: Malla media
  alturaAsiento: { min: 42, max: 50 }
  reposabrazos: 2D (altura y ancho)
  reclinacionMax: 118
  lumbar: Ajustable en altura
  garantiaAnios: 5
  entregaArmada: true
tema: { gradiente: ['#F3D9D3', '#FBE7E0', '#EEF2FB'] }
---
```

- [ ] **Paso 2: `src/content/sillas/mora-pro.md`**

```markdown
---
nombre: Tessera Mora Pro
orden: 2
resumen: Cabecera · reclina 135°
descripcion: Cabecera y reclinación hasta 135° para jornadas largas.
pitch: "Jornadas de diez horas y llamadas seguidas: cabecera ajustable y reclinación hasta 135°."
imagen:
  src: ../../assets/sillas/silla-azul.png
  alt: Tessera Mora Pro, respaldo de malla negra y asiento azul
categorias: [malla, intensivo, alta]
estatura: { min: 1.70, max: 1.95 }
specs:
  respaldo: Malla alta con cabecera
  alturaAsiento: { min: 44, max: 52 }
  reposabrazos: 4D
  reclinacionMax: 135
  lumbar: Ajustable en altura y presión
  garantiaAnios: 5
  entregaArmada: true
tema: { gradiente: ['#C8D4E8', '#DCE3F2', '#EEF2FB'] }
---
```

- [ ] **Paso 3: `src/content/sillas/ignea.md`**

```markdown
---
nombre: Tessera Ígnea
orden: 3
resumen: Gamer · respaldo alto
descripcion: Respaldo alto con soporte de hombros, malla ventilada.
pitch: "Calor y turnos largos: respaldo alto de malla firme con soporte de hombros."
imagen:
  src: ../../assets/sillas/silla-roja.png
  alt: Tessera Ígnea, silla gamer ergonómica roja
categorias: [malla, alta, intensivo]
estatura: { min: 1.75, max: 1.95 }
specs:
  respaldo: Malla alta con hombros
  alturaAsiento: { min: 44, max: 52 }
  reposabrazos: 4D
  reclinacionMax: 128
  lumbar: Fijo, integrado al respaldo
  garantiaAnios: 5
  entregaArmada: true
tema: { gradiente: ['#F0C9C6', '#F8DAD6', '#EEF2FB'] }
---
```

- [ ] **Paso 4: `src/content/sillas/llano.md`**

```markdown
---
nombre: Tessera Llano
orden: 4
resumen: Tapizada · espuma moldeada
descripcion: Asiento de espuma moldeada y respaldo tapizado medio.
imagen:
  src: ../../assets/sillas/silla-coral.png
  alt: Tessera Llano, silla ergonómica para home office
categorias: [tapizada, lumbar]
estatura: { min: 1.55, max: 1.78 }
specs:
  respaldo: Tapizado medio
  alturaAsiento: { min: 42, max: 50 }
  reposabrazos: 2D (altura y ancho)
  reclinacionMax: 115
  lumbar: Ajustable en altura
  garantiaAnios: 5
  entregaArmada: true
---
```

- [ ] **Paso 5: `src/content/sillas/cauce.md`**

```markdown
---
nombre: Tessera Cauce
orden: 5
resumen: Reposabrazos 4D · pistón largo
descripcion: Reposabrazos 4D y pistón largo para escritorios altos.
imagen:
  src: ../../assets/sillas/silla-azul.png
  alt: Tessera Cauce, silla ergonómica para home office
categorias: [malla, alta]
estatura: { min: 1.72, max: 1.92 }
specs:
  respaldo: Malla alta
  alturaAsiento: { min: 45, max: 54 }
  reposabrazos: 4D
  reclinacionMax: 125
  lumbar: Ajustable en altura
  garantiaAnios: 5
  entregaArmada: true
---
```

- [ ] **Paso 6: `src/content/sillas/vega.md`**

```markdown
---
nombre: Tessera Vega
orden: 6
resumen: Compacta · malla
descripcion: Compacta, pensada para escritorios de menos de 1.20 m.
imagen:
  src: ../../assets/sillas/silla-roja.png
  alt: Tessera Vega, silla ergonómica para home office
categorias: [malla, compacta]
estatura: { min: 1.50, max: 1.70 }
specs:
  respaldo: Malla media
  alturaAsiento: { min: 40, max: 48 }
  reposabrazos: Abatibles
  reclinacionMax: 112
  lumbar: Fijo, integrado al respaldo
  garantiaAnios: 5
  entregaArmada: true
---
```

- [ ] **Paso 7: `src/content/sillas/sierra.md`**

```markdown
---
nombre: Tessera Sierra
orden: 7
resumen: Lana técnica · sincronizado
descripcion: Tapizado de lana técnica, mecanismo sincronizado.
imagen:
  src: ../../assets/sillas/silla-coral.png
  alt: Tessera Sierra, silla ergonómica para home office
categorias: [tapizada, intensivo]
estatura: { min: 1.60, max: 1.85 }
specs:
  respaldo: Tapizado de lana técnica
  alturaAsiento: { min: 43, max: 51 }
  reposabrazos: 3D
  reclinacionMax: 125
  lumbar: Ajustable en altura
  garantiaAnios: 5
  entregaArmada: true
---
```

- [ ] **Paso 8: `src/content/sillas/brida.md`** (nota el valor entre comillas: contiene `: `)

```markdown
---
nombre: Tessera Brida
orden: 8
resumen: Lumbar de doble ajuste
descripcion: Lumbar de doble ajuste para dolor de espalda crónico.
imagen:
  src: ../../assets/sillas/silla-azul.png
  alt: Tessera Brida, silla ergonómica para home office
categorias: [malla, lumbar, intensivo]
estatura: { min: 1.58, max: 1.83 }
specs:
  respaldo: Malla media
  alturaAsiento: { min: 42, max: 51 }
  reposabrazos: 4D
  reclinacionMax: 122
  lumbar: "Doble ajuste: altura y profundidad"
  garantiaAnios: 5
  entregaArmada: true
---
```

- [ ] **Paso 9: `src/content/sillas/alba.md`**

```markdown
---
nombre: Tessera Alba
orden: 9
resumen: Malla clara · ligera
descripcion: Malla clara y estructura ligera, para espacios pequeños.
imagen:
  src: ../../assets/sillas/silla-roja.png
  alt: Tessera Alba, silla ergonómica para home office
categorias: [malla, compacta]
estatura: { min: 1.52, max: 1.75 }
specs:
  respaldo: Malla clara
  alturaAsiento: { min: 40, max: 48 }
  reposabrazos: 2D (altura y ancho)
  reclinacionMax: 112
  lumbar: Ajustable en altura
  garantiaAnios: 5
  entregaArmada: true
---
```

- [ ] **Paso 10: `src/content/sillas/oria.md`**

```markdown
---
nombre: Tessera Oria
orden: 10
resumen: Tapizada · asiento profundo
descripcion: Tapizada con apoyo de cadera ancho y asiento profundo.
imagen:
  src: ../../assets/sillas/silla-coral.png
  alt: Tessera Oria, silla ergonómica para home office
categorias: [tapizada, lumbar]
estatura: { min: 1.65, max: 1.88 }
specs:
  respaldo: Tapizado alto
  alturaAsiento: { min: 44, max: 52 }
  reposabrazos: 3D
  reclinacionMax: 120
  lumbar: Ajustable en altura y presión
  garantiaAnios: 5
  entregaArmada: true
---
```

- [ ] **Paso 11: `src/content/sillas/pena.md`**

```markdown
---
nombre: Tessera Peña
orden: 11
resumen: Respaldo extra alto
descripcion: Respaldo extra alto con cabecera regulable en ángulo.
imagen:
  src: ../../assets/sillas/silla-azul.png
  alt: Tessera Peña, silla ergonómica para home office
categorias: [malla, alta]
estatura: { min: 1.80, max: 1.98 }
specs:
  respaldo: Malla extra alta con cabecera
  alturaAsiento: { min: 46, max: 55 }
  reposabrazos: 4D
  reclinacionMax: 135
  lumbar: Ajustable en altura y presión
  garantiaAnios: 5
  entregaArmada: true
---
```

- [ ] **Paso 12: `src/content/sillas/nara.md`**

```markdown
---
nombre: Tessera Nara
orden: 12
resumen: Tapizada · alta densidad
descripcion: Tapizada de uso intensivo con espuma de alta densidad.
imagen:
  src: ../../assets/sillas/silla-roja.png
  alt: Tessera Nara, silla ergonómica para home office
categorias: [tapizada, intensivo]
estatura: { min: 1.62, max: 1.86 }
specs:
  respaldo: Tapizado alto
  alturaAsiento: { min: 43, max: 52 }
  reposabrazos: 4D
  reclinacionMax: 128
  lumbar: Ajustable en altura
  garantiaAnios: 5
  entregaArmada: true
---
```

- [ ] **Paso 13: Checkpoint**

```bash
git add src/content/sillas
```
Mensaje propuesto: `feat: migra las doce sillas del prototipo`

---

### Tarea 5: Testimonios y validación de esquemas

**Files:**
- Create: `src/content/testimonios/{mariana-r,julian-o,paulina-c,diego-m,sofia-l,andres-v}.md`

Los tres primeros (`destacado: true`) se ven de entrada; los otros tres aparecen con «Leer más experiencias». Cada uno lleva `silla` o `etiquetaSilla`, nunca ambos. Los testimonios son de ejemplo: los reales requieren permiso de quien aparece (spec §14.2).

- [ ] **Paso 1: `src/content/testimonios/mariana-r.md`**

```markdown
---
orden: 1
destacado: true
cita: "Trabajo diez horas al día frente a dos monitores. Antes acababa estirando la espalda cada rato; ahora me levanto porque tengo hambre, no porque me duela."
ampliacion: "Lo que no esperaba era la diferencia del lumbar ajustable. Lo subí dos posiciones respecto a como venía de fábrica y ahí encontró la curva. Las primeras dos semanas lo moví casi a diario hasta dar con el punto."
nombre: Mariana R.
meta: Diseñadora · CDMX
silla: duna
antiguedad: 2 años con ella
objecion: horas
imagen:
  src: ../../assets/sillas/silla-coral.png
  alt: Tessera Duna en su escritorio
---
```

- [ ] **Paso 2: `src/content/testimonios/julian-o.md`**

```markdown
---
orden: 2
destacado: true
cita: "Mido 1.90 m y siempre me sobraba el cuerpo en las sillas de oficina. El respaldo me llega a los hombros y la cabecera la uso en cada llamada larga."
ampliacion: "Pedí que la dejaran en el tope del pistón y así llegó. El detalle que me convenció fue la reclinación con topes: puedo echarme atrás en una junta sin sentir que la silla se me va."
nombre: Julián O.
meta: Desarrollador · Monterrey
silla: mora-pro
antiguedad: 1 año con ella
objecion: estatura
imagen:
  src: ../../assets/sillas/silla-azul.png
  alt: Tessera Mora Pro en su escritorio
---
```

- [ ] **Paso 3: `src/content/testimonios/paulina-c.md`**

```markdown
---
orden: 3
destacado: true
cita: "Vivo en Mérida y trabajo con ventilador. La malla no guarda calor: es la primera silla con la que no termino con la camisa pegada."
ampliacion: "Probé una tapizada antes y en abril era insostenible. Aquí el respaldo y el asiento son malla, y se nota sobre todo pasadas las cuatro de la tarde, que es cuando pega el calor de verdad."
nombre: Paulina C.
meta: Traductora · Mérida
silla: ignea
antiguedad: 10 meses con ella
objecion: clima
imagen:
  src: ../../assets/sillas/silla-roja.png
  alt: Tessera Ígnea en su escritorio
---
```

- [ ] **Paso 4: `src/content/testimonios/diego-m.md`**

```markdown
---
orden: 4
destacado: false
cita: "Cambié de casa y el escritorio nuevo es más alto. Llamé pensando en comprar otra silla y lo que hicieron fue recalibrarme el pistón y los reposabrazos."
ampliacion: "Vino el mismo técnico que me la instaló. Media hora y quedó a la altura del escritorio nuevo, sin costo. No esperaba ese seguimiento un año después de la compra."
nombre: Diego M.
meta: Arquitecto · Guadalajara
silla: cauce
antiguedad: 1 año y medio con ella
objecion: otra
imagen:
  src: ../../assets/sillas/silla-azul.png
  alt: Tessera Cauce en un escritorio alto
---
```

- [ ] **Paso 5: `src/content/testimonios/sofia-l.md`**

```markdown
---
orden: 5
destacado: false
cita: "Tengo una hernia lumbar y llevaba tres sillas probadas. El asesor me preguntó primero por el diagnóstico, no por el presupuesto."
ampliacion: "Acabé con la Brida, que tiene el lumbar de doble ajuste. Lo importante fue que me explicaron qué posición buscar y por qué; el fisioterapeuta la aprobó en la siguiente consulta."
nombre: Sofía L.
meta: Contadora · Puebla
silla: brida
antiguedad: 8 meses con ella
objecion: otra
imagen:
  src: ../../assets/sillas/silla-coral.png
  alt: Tessera Brida vista de lado
---
```

- [ ] **Paso 6: `src/content/testimonios/andres-v.md`**

```markdown
---
orden: 6
destacado: false
cita: "Compramos once para el equipo. Cada persona contestó las tres preguntas y llegaron once sillas distintas, cada una con el nombre de quien la iba a usar."
ampliacion: "Esperaba once cajas iguales. Llegaron armadas, etiquetadas y ajustadas: la de la persona de 1.55 m y la del que mide 1.93 m no tenían nada que ver entre sí. Nadie tuvo que pedir cambio."
nombre: Andrés V.
meta: Operaciones · CDMX
etiquetaSilla: Pedido de empresa
antiguedad: 11 sillas, 2025
objecion: otra
imagen:
  src: ../../assets/sillas/silla-roja.png
  alt: Sillas Tessera en una oficina
---
```

- [ ] **Paso 7: Sincronizar**

Run: `npx astro sync`
Expected: `[content] Synced content` y `[types] Generated`, sin errores.

- [ ] **Paso 8: Comprobar que el esquema es estricto (debe fallar)**

Añade temporalmente la línea `precio: 4990` debajo de `nombre:` en `src/content/sillas/duna.md`.

Run: `npx astro sync`
Expected: código de salida 1 con `[InvalidContentEntryDataError] sillas → duna data does not match collection schema.` y `Unrecognized key: "precio"`.

- [ ] **Paso 9: Revertir**

Quita la línea `precio: 4990`.

Run: `npx astro sync`
Expected: `Synced content`.

- [ ] **Paso 10: Checkpoint**

```bash
git add src/content/testimonios
```
Mensaje propuesto: `feat: migra los testimonios del prototipo`

---

### Tarea 6: Formato de rangos y números

**Files:**
- Create: `src/lib/formato.ts`
- Test: `tests/unit/formato.test.ts`

Los rangos usan el separador decimal del mercado: `1.55 – 1.80 m` en `es-MX`, `1,55 – 1,80 m` en `es-CO` (spec §12 #1). `numeroEnLetras` produce el «doce» de «Tres de las doce sillas Tessera» a partir del tamaño real de la colección.

- [ ] **Paso 1: Test que falla**

```ts
import { describe, expect, it } from 'vitest';
import { capitalizar, formatearAnios, formatearRango, numeroEnLetras } from '@/lib/formato';

describe('formatearRango', () => {
  it('metros con dos decimales y punto en es-MX', () => {
    expect(formatearRango({ min: 1.55, max: 1.8 }, 'm', 'es-MX')).toBe('1.55 – 1.80 m');
  });

  it('metros con coma decimal en es-CO', () => {
    expect(formatearRango({ min: 1.55, max: 1.8 }, 'm', 'es-CO')).toBe('1,55 – 1,80 m');
  });

  it('centímetros sin decimales', () => {
    expect(formatearRango({ min: 42, max: 50 }, 'cm', 'es-MX')).toBe('42 – 50 cm');
  });
});

describe('formatearAnios', () => {
  it('singular y plural', () => {
    expect(formatearAnios(1)).toBe('1 año');
    expect(formatearAnios(5)).toBe('5 años');
  });
});

describe('numeroEnLetras', () => {
  it.each([
    [1, 'uno'],
    [3, 'tres'],
    [12, 'doce'],
    [16, 'dieciséis'],
    [21, 'veintiuno'],
    [30, 'treinta'],
    [45, 'cuarenta y cinco'],
    [99, 'noventa y nueve'],
  ])('%i → %s', (n, esperado) => {
    expect(numeroEnLetras(n)).toBe(esperado);
  });

  it('femenino para «sillas»', () => {
    expect(numeroEnLetras(1, 'femenino')).toBe('una');
    expect(numeroEnLetras(21, 'femenino')).toBe('veintiuna');
    expect(numeroEnLetras(31, 'femenino')).toBe('treinta y una');
    expect(numeroEnLetras(12, 'femenino')).toBe('doce');
  });

  it('antepuesto a un sustantivo masculino («un modelo», «veintiún ajustes»)', () => {
    expect(numeroEnLetras(1, 'antepuesto')).toBe('un');
    expect(numeroEnLetras(21, 'antepuesto')).toBe('veintiún');
    expect(numeroEnLetras(31, 'antepuesto')).toBe('treinta y un');
    expect(numeroEnLetras(12, 'antepuesto')).toBe('doce');
  });

  it('rechaza valores fuera de 1–99', () => {
    expect(() => numeroEnLetras(0)).toThrow();
    expect(() => numeroEnLetras(100)).toThrow();
    expect(() => numeroEnLetras(2.5)).toThrow();
  });
});

describe('capitalizar', () => {
  it('sube la primera letra', () => {
    expect(capitalizar('tres')).toBe('Tres');
  });
});
```

- [ ] **Paso 2: Ejecutarlo**

Run: `npx vitest run tests/unit/formato.test.ts`
Expected: FAIL con `Error: Cannot find package '@/lib/formato'`.

- [ ] **Paso 3: Implementación**

```ts
import type { CollectionEntry } from 'astro:content';

export type Rango = CollectionEntry<'sillas'>['data']['estatura'];

const GUION = '–';

/** «1.55 – 1.80 m» / «42 – 50 cm», con el separador decimal del mercado. */
export function formatearRango(rango: Rango, unidad: 'm' | 'cm', locale: string): string {
  const decimales = unidad === 'm' ? 2 : 0;
  const formato = new Intl.NumberFormat(locale, { minimumFractionDigits: decimales, maximumFractionDigits: decimales });
  return `${formato.format(rango.min)} ${GUION} ${formato.format(rango.max)} ${unidad}`;
}

export function formatearAnios(anios: number): string {
  return anios === 1 ? '1 año' : `${String(anios)} años`;
}

const UNIDADES = ['', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve'] as const;
const DIEZ_A_VEINTINUEVE = [
  'diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve',
  'veinte', 'veintiuno', 'veintidós', 'veintitrés', 'veinticuatro', 'veinticinco', 'veintiséis', 'veintisiete',
  'veintiocho', 'veintinueve',
] as const;
const DECENAS = ['', '', '', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'] as const;

/**
 * 1–99 en letras: «Tres de las doce sillas». `femenino` da «una», «veintiuna»; `antepuesto`
 * es el masculino delante del sustantivo: «un modelo», «veintiún ajustes».
 */
export function numeroEnLetras(n: number, genero: 'masculino' | 'femenino' | 'antepuesto' = 'masculino'): string {
  if (!Number.isInteger(n) || n < 1 || n > 99) {
    throw new Error(`numeroEnLetras solo admite enteros de 1 a 99: ${String(n)}`);
  }
  const palabra =
    n < 10 ? UNIDADES[n] : n < 30 ? DIEZ_A_VEINTINUEVE[n - 10] : componerDecena(Math.floor(n / 10), n % 10);
  if (palabra === undefined) {
    throw new Error(`Sin palabra para ${String(n)}`);
  }
  if (genero === 'femenino') return palabra.replace(/uno$/, 'una');
  if (genero === 'antepuesto') return palabra.replace(/^veintiuno$/, 'veintiún').replace(/uno$/, 'un');
  return palabra;
}

function componerDecena(decena: number, unidad: number): string | undefined {
  const base = DECENAS[decena];
  if (base === undefined) return undefined;
  return unidad === 0 ? base : `${base} y ${UNIDADES[unidad] ?? ''}`;
}

export function capitalizar(texto: string): string {
  return texto.charAt(0).toLocaleUpperCase('es') + texto.slice(1);
}
```

- [ ] **Paso 4: Verde**

Run: `npx vitest run tests/unit/formato.test.ts`
Expected: `Tests  16 passed (16)`.

- [ ] **Paso 5: Checkpoint**

```bash
git add src/lib/formato.ts tests/unit/formato.test.ts
```
Mensaje propuesto: `feat: formatea rangos por mercado y números en letras`

---

### Tarea 7: Lógica del catálogo

**Files:**
- Create: `src/lib/catalogo.ts`
- Test: `tests/unit/catalogo.test.ts`

Compartida por el build (recuentos, páginas de categoría) y por el filtro en cliente de la fase 4. Trabaja con ids de categoría planos; `leerExtras`/`escribirExtras` manejan los slugs de `?y=`.

- [ ] **Paso 1: Test que falla**

```ts
import { describe, expect, it } from 'vitest';
import {
  contar,
  cumpleFiltros,
  escribirExtras,
  etiquetaChip,
  filtrar,
  leerExtras,
  rutaCategoria,
  textoFranjaComparador,
  textoIntroCatalogo,
  valorComun,
} from '@/lib/catalogo';

const sillas = [
  { id: 'duna', categorias: ['malla', 'lumbar'] },
  { id: 'mora', categorias: ['malla', 'intensivo', 'alta'] },
  { id: 'llano', categorias: ['tapizada', 'lumbar'] },
];

describe('cumpleFiltros', () => {
  it('sin filtros cumple todo', () => {
    expect(cumpleFiltros(['malla'], [])).toBe(true);
  });

  it('es AND entre filtros', () => {
    expect(cumpleFiltros(['malla', 'lumbar'], ['malla', 'lumbar'])).toBe(true);
    expect(cumpleFiltros(['malla'], ['malla', 'lumbar'])).toBe(false);
  });
});

describe('filtrar', () => {
  it('devuelve las que cumplen', () => {
    expect(filtrar(sillas, ['lumbar']).map((s) => s.id)).toEqual(['duna', 'llano']);
    expect(filtrar(sillas, ['malla', 'lumbar']).map((s) => s.id)).toEqual(['duna']);
  });
});

describe('contar', () => {
  it('cuenta como si se añadiera la categoría', () => {
    expect(contar(sillas, 'lumbar', ['malla'])).toBe(1);
    expect(contar(sillas, 'malla', [])).toBe(2);
  });

  it('no duplica una categoría ya activa', () => {
    expect(contar(sillas, 'malla', ['malla'])).toBe(2);
  });
});

describe('rutaCategoria', () => {
  it('usa el slug', () => {
    expect(rutaCategoria('uso-intensivo')).toBe('/catalogo/uso-intensivo');
  });
});

describe('leerExtras / escribirExtras', () => {
  const validos = new Set(['lumbar', 'altos', 'uso-intensivo']);

  it('lee solo slugs válidos y sin duplicados', () => {
    expect(leerExtras('?y=lumbar,xx,altos,lumbar', validos)).toEqual(['lumbar', 'altos']);
  });

  it('sin parámetro devuelve vacío', () => {
    expect(leerExtras('', validos)).toEqual([]);
  });

  it('escribe la query o nada', () => {
    expect(escribirExtras(['lumbar', 'altos'])).toBe('?y=lumbar,altos');
    expect(escribirExtras([])).toBe('');
  });
});

describe('valorComun', () => {
  it('devuelve el valor si todos lo comparten', () => {
    expect(valorComun([5, 5, 5])).toBe(5);
  });

  it('undefined si difieren o no hay valores', () => {
    expect(valorComun([5, 3])).toBeUndefined();
    expect(valorComun<number>([])).toBeUndefined();
  });
});

describe('textoIntroCatalogo', () => {
  it('con garantía común', () => {
    expect(textoIntroCatalogo(12, 5)).toBe(
      'Doce modelos, todos con respaldo ajustable y garantía de cinco años. Cada ficha indica para qué estatura y qué tipo de jornada está pensada.',
    );
  });

  it('sin garantía común omite la frase y concuerda en singular', () => {
    expect(textoIntroCatalogo(21, undefined)).toBe(
      'Veintiún modelos, todos con respaldo ajustable. Cada ficha indica para qué estatura y qué tipo de jornada está pensada.',
    );
    expect(textoIntroCatalogo(1, 1)).toBe(
      'Un modelo, con respaldo ajustable y garantía de un año. Cada ficha indica para qué estatura y qué tipo de jornada está pensada.',
    );
  });
});

describe('textoFranjaComparador', () => {
  const categorias = [
    { id: 'malla', grupo: 'respaldo', etiqueta: 'Malla' },
    { id: 'lumbar', grupo: 'resuelve', etiqueta: 'Soporte lumbar' },
  ] as const;

  it('nombra el respaldo que comparten las comparadas', () => {
    const comparadas = [{ categorias: ['malla', 'lumbar'] }, { categorias: ['malla'] }, { categorias: ['malla', 'alta'] }];
    expect(textoFranjaComparador(comparadas, categorias)).toBe('Compara las tres de malla lado a lado.');
  });

  it('sin respaldo común solo da el número', () => {
    const comparadas = [{ categorias: ['malla'] }, { categorias: ['tapizada'] }, { categorias: ['malla'] }];
    expect(textoFranjaComparador(comparadas, categorias)).toBe('Compara las tres lado a lado.');
  });
});

describe('etiquetaChip', () => {
  it('en minúsculas con la cruz', () => {
    expect(etiquetaChip('Soporte lumbar')).toBe('soporte lumbar ×');
  });
});
```

- [ ] **Paso 2: Ejecutarlo**

Run: `npx vitest run tests/unit/catalogo.test.ts`
Expected: FAIL con `Error: Cannot find package '@/lib/catalogo'`.

- [ ] **Paso 3: Implementación**

```ts
import type { CollectionEntry } from 'astro:content';
import { capitalizar, numeroEnLetras } from './formato';

export type Grupo = CollectionEntry<'categorias'>['data']['grupo'];

export const GRUPOS: readonly Grupo[] = ['respaldo', 'resuelve', 'estatura'];

export const ETIQUETAS_GRUPO: Readonly<Record<Grupo, string>> = {
  respaldo: 'Tipo de respaldo',
  resuelve: 'Qué resuelve',
  estatura: 'Estatura y espacio',
};

/** Filtro AND: la silla debe tener todas las categorías activas. */
export function cumpleFiltros(categoriasSilla: readonly string[], activas: readonly string[]): boolean {
  return activas.every((id) => categoriasSilla.includes(id));
}

export function filtrar<T extends { readonly categorias: readonly string[] }>(sillas: readonly T[], activas: readonly string[]): T[] {
  return sillas.filter((silla) => cumpleFiltros(silla.categorias, activas));
}

/** Cuántas sillas quedarían si se añade `categoria` a las activas (recuento del aside). */
export function contar(
  sillas: readonly { readonly categorias: readonly string[] }[],
  categoria: string,
  activas: readonly string[],
): number {
  const combinadas = activas.includes(categoria) ? activas : [...activas, categoria];
  return filtrar(sillas, combinadas).length;
}

export function rutaCategoria(slug: string): string {
  return `/catalogo/${slug}`;
}

/** Slugs extra de `?y=a,b`: solo los válidos, sin duplicados, en el orden en que aparecen. */
export function leerExtras(search: string, validos: ReadonlySet<string>): string[] {
  const valor = new URLSearchParams(search).get('y');
  if (valor === null) return [];
  const vistos = new Set<string>();
  for (const slug of valor.split(',')) {
    const limpio = slug.trim();
    if (validos.has(limpio)) vistos.add(limpio);
  }
  return [...vistos];
}

export function escribirExtras(slugs: readonly string[]): string {
  return slugs.length === 0 ? '' : `?y=${slugs.join(',')}`;
}

/** El valor si todos los elementos lo comparten; si difieren (o no hay ninguno), undefined. */
export function valorComun<T>(valores: readonly T[]): T | undefined {
  const [primero, ...resto] = valores;
  return primero !== undefined && resto.every((valor) => valor === primero) ? primero : undefined;
}

/** Intro de /catalogo (diseño, C1) con el total y la garantía sacados de los datos. */
export function textoIntroCatalogo(total: number, garantiaComun: number | undefined): string {
  const modelos = `${capitalizar(numeroEnLetras(total, 'antepuesto'))} ${total === 1 ? 'modelo, con' : 'modelos, todos con'}`;
  const garantia =
    garantiaComun === undefined ? '' : ` y garantía de ${numeroEnLetras(garantiaComun, 'antepuesto')} ${garantiaComun === 1 ? 'año' : 'años'}`;
  return `${modelos} respaldo ajustable${garantia}. Cada ficha indica para qué estatura y qué tipo de jornada está pensada.`;
}

export interface CategoriaPlana {
  readonly id: string;
  readonly grupo: Grupo;
  readonly etiqueta: string;
}

/** «Compara las tres de malla lado a lado.»: el número y el respaldo común salen de los datos. */
export function textoFranjaComparador(
  comparadas: readonly { readonly categorias: readonly string[] }[],
  categorias: readonly CategoriaPlana[],
): string {
  const respaldo = categorias.find((c) => c.grupo === 'respaldo' && comparadas.every((s) => s.categorias.includes(c.id)));
  const deRespaldo = respaldo === undefined ? '' : ` de ${respaldo.etiqueta.toLocaleLowerCase('es')}`;
  return `Compara las ${numeroEnLetras(comparadas.length, 'femenino')}${deRespaldo} lado a lado.`;
}

/** Texto visible de un chip de filtro activo: «malla ×». */
export function etiquetaChip(etiqueta: string): string {
  return `${etiqueta.toLocaleLowerCase('es')} ×`;
}
```

- [ ] **Paso 4: Verde**

Run: `npx vitest run tests/unit/catalogo.test.ts`
Expected: `Tests  16 passed (16)`.

- [ ] **Paso 5: Checkpoint**

```bash
git add src/lib/catalogo.ts tests/unit/catalogo.test.ts
```
Mensaje propuesto: `feat: añade filtros AND, recuentos y query de extras del catálogo`

---

### Tarea 8: Filas del comparador

**Files:**
- Create: `src/lib/comparador.ts`
- Test: `tests/unit/comparador.test.ts`

Las ocho filas del diseño se derivan de las specs de cada silla; la marca «igual» (`diferencia: false`) se calcula, no se escribe.

- [ ] **Paso 1: Test que falla**

```ts
import { describe, expect, it } from 'vitest';
import { definirFilas, derivarFilas, rangoAjuste, type DatosComparables } from '@/lib/comparador';

function silla(parcial: { respaldo: string; reclinacionMax: number; min?: number }): DatosComparables {
  return {
    estatura: { min: parcial.min ?? 1.55, max: 1.8 },
    specs: {
      respaldo: parcial.respaldo,
      alturaAsiento: { min: 42, max: 50 },
      reposabrazos: '4D',
      reclinacionMax: parcial.reclinacionMax,
      lumbar: 'Ajustable en altura',
      garantiaAnios: 5,
      entregaArmada: true,
    },
  };
}

describe('derivarFilas', () => {
  const filas = derivarFilas(
    [silla({ respaldo: 'Malla media', reclinacionMax: 118 }), silla({ respaldo: 'Malla alta', reclinacionMax: 135, min: 1.7 })],
    definirFilas('es-MX', 48),
  );

  it('genera las ocho filas del diseño en orden', () => {
    expect(filas.map((f) => f.etiqueta)).toEqual([
      'Respaldo',
      'Altura de asiento',
      'Reposabrazos',
      'Reclinación',
      'Lumbar',
      'Estatura sugerida',
      'Garantía',
      'Entrega armada',
    ]);
  });

  it('formatea los valores', () => {
    expect(filas.find((f) => f.etiqueta === 'Reclinación')?.valores).toEqual(['Hasta 118°', 'Hasta 135°']);
    expect(filas.find((f) => f.etiqueta === 'Estatura sugerida')?.valores).toEqual(['1.55 – 1.80 m', '1.70 – 1.80 m']);
    expect(filas.find((f) => f.etiqueta === 'Entrega armada')?.valores).toEqual(['Sí, 48 h', 'Sí, 48 h']);
    expect(filas.find((f) => f.etiqueta === 'Garantía')?.valores).toEqual(['5 años', '5 años']);
  });

  it('calcula la diferencia en vez de declararla', () => {
    expect(filas.find((f) => f.etiqueta === 'Respaldo')?.diferencia).toBe(true);
    expect(filas.find((f) => f.etiqueta === 'Reposabrazos')?.diferencia).toBe(false);
  });
});

describe('rangoAjuste', () => {
  const duna = silla({ respaldo: 'Malla media', reclinacionMax: 118 });

  it('usa el texto propio del ajuste', () => {
    expect(rangoAjuste({ rango: '6 vueltas' }, duna, 'es-MX')).toBe('6 vueltas');
  });

  it('deriva el valor de las specs de la silla (una sola fuente)', () => {
    expect(rangoAjuste({ spec: 'alturaAsiento' }, duna, 'es-MX')).toBe('42 – 50 cm');
    expect(rangoAjuste({ spec: 'reposabrazos' }, duna, 'es-MX')).toBe('4D');
    expect(rangoAjuste({ spec: 'reclinacionMax' }, duna, 'es-MX')).toBe('Hasta 118°');
  });
});
```

- [ ] **Paso 2: Ejecutarlo**

Run: `npx vitest run tests/unit/comparador.test.ts`
Expected: FAIL con `Error: Cannot find package '@/lib/comparador'`.

- [ ] **Paso 3: Implementación**

```ts
import type { CollectionEntry } from 'astro:content';
import { formatearAnios, formatearRango } from './formato';

export type DatosComparables = Pick<CollectionEntry<'sillas'>['data'], 'estatura' | 'specs'>;

export type RangoDeAjuste = Pick<CollectionEntry<'ajustes'>['data'], 'rango' | 'spec'>;

export interface DefinicionFila {
  readonly etiqueta: string;
  readonly valor: (silla: DatosComparables) => string;
}

export interface FilaComparador {
  readonly etiqueta: string;
  readonly valores: readonly string[];
  /** false si todas las sillas comparadas tienen el mismo valor («igual» en el diseño). */
  readonly diferencia: boolean;
}

/** Las ocho filas del diseño, derivadas de las specs de cada silla (una sola fuente). */
export function definirFilas(locale: string, entregaHoras: number): readonly DefinicionFila[] {
  return [
    { etiqueta: 'Respaldo', valor: (s) => s.specs.respaldo },
    { etiqueta: 'Altura de asiento', valor: (s) => formatearRango(s.specs.alturaAsiento, 'cm', locale) },
    { etiqueta: 'Reposabrazos', valor: (s) => s.specs.reposabrazos },
    { etiqueta: 'Reclinación', valor: (s) => `Hasta ${String(s.specs.reclinacionMax)}°` },
    { etiqueta: 'Lumbar', valor: (s) => s.specs.lumbar },
    { etiqueta: 'Estatura sugerida', valor: (s) => formatearRango(s.estatura, 'm', locale) },
    { etiqueta: 'Garantía', valor: (s) => formatearAnios(s.specs.garantiaAnios) },
    { etiqueta: 'Entrega armada', valor: (s) => (s.specs.entregaArmada ? `Sí, ${String(entregaHoras)} h` : 'No') },
  ];
}

export function derivarFilas(sillas: readonly DatosComparables[], definiciones: readonly DefinicionFila[]): FilaComparador[] {
  return definiciones.map((definicion) => {
    const valores = sillas.map((silla) => definicion.valor(silla));
    return { etiqueta: definicion.etiqueta, valores, diferencia: new Set(valores).size > 1 };
  });
}

/** Rango que muestra la anatomía: su texto propio o el valor de la spec de la silla. */
export function rangoAjuste(ajuste: RangoDeAjuste, silla: DatosComparables, locale: string): string {
  switch (ajuste.spec) {
    case 'alturaAsiento':
      return formatearRango(silla.specs.alturaAsiento, 'cm', locale);
    case 'reposabrazos':
      return silla.specs.reposabrazos;
    case 'lumbar':
      return silla.specs.lumbar;
    case 'reclinacionMax':
      return `Hasta ${String(silla.specs.reclinacionMax)}°`;
    case undefined:
      if (ajuste.rango === undefined) throw new Error('El ajuste necesita `rango` o `spec`.');
      return ajuste.rango;
  }
}
```

- [ ] **Paso 4: Verde**

Run: `npx vitest run tests/unit/comparador.test.ts`
Expected: `Tests  5 passed (5)`.

- [ ] **Paso 5: Checkpoint**

```bash
git add src/lib/comparador.ts tests/unit/comparador.test.ts
```
Mensaje propuesto: `feat: deriva las filas del comparador desde las specs`

---

### Tarea 9: Reglas de integridad

**Files:**
- Create: `src/lib/validacion.ts`
- Test: `tests/unit/validacion.test.ts`

- [ ] **Paso 1: Test que falla**

```ts
import { describe, expect, it } from 'vitest';
import {
  categoriasVacias,
  duplicados,
  entradasDesincronizadas,
  ErrorDeContenido,
  minimoDeEntradas,
  problemasArchivoJson,
  referenciasRotas,
  sinTema,
} from '@/lib/validacion';

describe('referenciasRotas', () => {
  const existentes = new Map([
    ['categorias', new Set(['malla', 'lumbar'])],
    ['sillas', new Set(['duna'])],
  ]);

  it('no reporta referencias válidas', () => {
    expect(referenciasRotas(existentes, [{ origen: 'sillas/duna → categorias[0]', coleccion: 'categorias', id: 'malla' }])).toEqual([]);
  });

  it('reporta cada referencia inexistente con su origen', () => {
    expect(
      referenciasRotas(existentes, [
        { origen: 'sillas/duna → categorias[1]', coleccion: 'categorias', id: 'gamer' },
        { origen: 'destacados/landing → portada[0]', coleccion: 'sillas', id: 'zafiro' },
      ]),
    ).toEqual([
      'sillas/duna → categorias[1]: «gamer» no existe en la colección «categorias».',
      'destacados/landing → portada[0]: «zafiro» no existe en la colección «sillas».',
    ]);
  });
});

describe('categoriasVacias', () => {
  it('detecta categorías sin sillas', () => {
    expect(categoriasVacias(['malla', 'compacta'], [{ id: 'duna', categorias: ['malla'] }])).toEqual([
      'categorias/compacta: ninguna silla la usa; generaría una página indexable vacía.',
    ]);
  });
});

describe('sinTema', () => {
  it('exige gradiente a las sillas de la portada', () => {
    expect(sinTema([{ origen: 'destacados/landing → portada[1]', silla: 'vega' }], new Set(['duna']))).toEqual([
      'destacados/landing → portada[1]: la silla «vega» necesita `tema.gradiente`.',
    ]);
  });
});

describe('duplicados', () => {
  it('detecta slugs repetidos', () => {
    expect(duplicados('categorias.slug', ['malla', 'altos', 'malla'])).toEqual(['categorias.slug: «malla» está repetido.']);
  });
});

describe('ErrorDeContenido', () => {
  it('lista todos los problemas', () => {
    const error = new ErrorDeContenido(['uno', 'dos']);
    expect(error.message).toBe('El contenido tiene 2 problema(s):\n- uno\n- dos');
    expect(error.problemas).toEqual(['uno', 'dos']);
  });
});

describe('problemasArchivoJson', () => {
  it('acepta un array de entradas con id slug únicos', () => {
    expect(problemasArchivoJson('faqs.json', '[{"id":"garantia"},{"id":"llega-armada"}]')).toEqual({
      problemas: [],
      ids: ['garantia', 'llega-armada'],
    });
  });

  it('JSON inválido (p. ej. coma final)', () => {
    const { problemas } = problemasArchivoJson('faqs.json', '[{"id":"a"},]');
    expect(problemas).toHaveLength(1);
    expect(problemas[0]).toMatch(/^faqs\.json: JSON inválido/);
  });

  it('no es un array', () => {
    expect(problemasArchivoJson('pasos.json', '{"id":"a"}').problemas).toEqual(['pasos.json: debe ser un array de entradas.']);
  });

  it('entradas sin id, con id que no es slug o repetido', () => {
    expect(problemasArchivoJson('necesidades.json', '[{"titulo":"x"},{"id":"uso intensivo"},{"id":"a"},{"id":"a"}]').problemas).toEqual([
      'necesidades.json[0]: falta `id` o no es un slug (minúsculas, números y guiones).',
      'necesidades.json[1]: falta `id` o no es un slug (minúsculas, números y guiones).',
      'necesidades.json → id: «a» está repetido.',
    ]);
  });
});

describe('entradasDesincronizadas', () => {
  it('sin diferencias no reporta nada', () => {
    expect(entradasDesincronizadas('faqs.json', ['a', 'b'], ['b', 'a'])).toEqual([]);
  });

  it('reporta lo que Astro no cargó y lo que sobra (caché vieja)', () => {
    expect(entradasDesincronizadas('faqs.json', ['a', 'b'], ['a', 'c'])).toEqual([
      'faqs.json: «b» está en el archivo pero Astro no lo cargó (revisa el log del build).',
      'faqs.json: «c» se cargó pero ya no está en el archivo (caché desactualizada: borra node_modules/.astro).',
    ]);
  });
});

describe('minimoDeEntradas', () => {
  it('exige un mínimo por colección', () => {
    expect(minimoDeEntradas('testimonios destacados', 0, 1)).toEqual(['testimonios destacados: hace falta al menos 1 (hay 0).']);
    expect(minimoDeEntradas('faqs', 5, 1)).toEqual([]);
  });
});
```

- [ ] **Paso 2: Ejecutarlo**

Run: `npx vitest run tests/unit/validacion.test.ts`
Expected: FAIL con `Error: Cannot find package '@/lib/validacion'`.

- [ ] **Paso 3: Implementación**

`ErrorDeContenido` declara `problemas` como campo normal: con `erasableSyntaxOnly` no se permiten parameter properties (`constructor(readonly problemas…)`).

```ts
// Reglas de integridad del contenido sobre datos planos (sin astro:content) para poder
// probarlas en Vitest. src/lib/contenido.ts las aplica en el build y lanza si hay problemas.

export interface Referencia {
  /** Dónde está declarada, para el mensaje: «sillas/duna → categorias[0]». */
  readonly origen: string;
  readonly coleccion: string;
  readonly id: string;
}

export type IdsPorColeccion = ReadonlyMap<string, ReadonlySet<string>>;

export function referenciasRotas(existentes: IdsPorColeccion, referencias: readonly Referencia[]): string[] {
  return referencias
    .filter((ref) => existentes.get(ref.coleccion)?.has(ref.id) !== true)
    .map((ref) => `${ref.origen}: «${ref.id}» no existe en la colección «${ref.coleccion}».`);
}

export function categoriasVacias(
  categorias: readonly string[],
  sillas: readonly { readonly id: string; readonly categorias: readonly string[] }[],
): string[] {
  return categorias
    .filter((categoria) => !sillas.some((silla) => silla.categorias.includes(categoria)))
    .map((categoria) => `categorias/${categoria}: ninguna silla la usa; generaría una página indexable vacía.`);
}

export function sinTema(
  usos: readonly { readonly origen: string; readonly silla: string }[],
  conTema: ReadonlySet<string>,
): string[] {
  return usos
    .filter((uso) => !conTema.has(uso.silla))
    .map((uso) => `${uso.origen}: la silla «${uso.silla}» necesita \`tema.gradiente\`.`);
}

export function duplicados(origen: string, valores: readonly string[]): string[] {
  const vistos = new Set<string>();
  const repetidos = new Set<string>();
  for (const valor of valores) {
    if (vistos.has(valor)) repetidos.add(valor);
    vistos.add(valor);
  }
  return [...repetidos].map((valor) => `${origen}: «${valor}» está repetido.`);
}

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function idDe(entrada: unknown): unknown {
  return typeof entrada === 'object' && entrada !== null && 'id' in entrada ? entrada.id : undefined;
}

/**
 * Un archivo de una colección `file()` tal como está en disco. El loader de Astro 7 solo
 * registra en el log un JSON inválido, una entrada sin `id` o un `id` repetido, y el build
 * termina en verde: esta regla hace que fallen.
 */
export function problemasArchivoJson(nombre: string, texto: string): { problemas: string[]; ids: string[] } {
  let datos: unknown;
  try {
    datos = JSON.parse(texto);
  } catch (error) {
    const detalle = error instanceof Error ? error.message : String(error);
    return { problemas: [`${nombre}: JSON inválido (${detalle}).`], ids: [] };
  }
  if (!Array.isArray(datos)) {
    return { problemas: [`${nombre}: debe ser un array de entradas.`], ids: [] };
  }
  const entradas: readonly unknown[] = datos;
  const problemas: string[] = [];
  const ids: string[] = [];
  entradas.forEach((entrada, i) => {
    const id = idDe(entrada);
    if (typeof id === 'string' && SLUG.test(id)) {
      ids.push(id);
    } else {
      problemas.push(`${nombre}[${String(i)}]: falta \`id\` o no es un slug (minúsculas, números y guiones).`);
    }
  });
  return { problemas: [...problemas, ...duplicados(`${nombre} → id`, ids)], ids };
}

/** Lo que hay en el archivo frente a lo que Astro cargó (detecta también una caché vieja). */
export function entradasDesincronizadas(nombre: string, idsArchivo: readonly string[], idsColeccion: readonly string[]): string[] {
  const enColeccion = new Set(idsColeccion);
  const enArchivo = new Set(idsArchivo);
  return [
    ...idsArchivo
      .filter((id) => !enColeccion.has(id))
      .map((id) => `${nombre}: «${id}» está en el archivo pero Astro no lo cargó (revisa el log del build).`),
    ...idsColeccion
      .filter((id) => !enArchivo.has(id))
      .map((id) => `${nombre}: «${id}» se cargó pero ya no está en el archivo (caché desactualizada: borra node_modules/.astro).`),
  ];
}

export function minimoDeEntradas(nombre: string, cantidad: number, minimo: number): string[] {
  return cantidad >= minimo ? [] : [`${nombre}: hace falta al menos ${String(minimo)} (hay ${String(cantidad)}).`];
}

export class ErrorDeContenido extends Error {
  readonly problemas: readonly string[];

  constructor(problemas: readonly string[]) {
    super(`El contenido tiene ${String(problemas.length)} problema(s):\n- ${problemas.join('\n- ')}`);
    this.name = 'ErrorDeContenido';
    this.problemas = problemas;
  }
}
```

- [ ] **Paso 4: Verde**

Run: `npx vitest run tests/unit/validacion.test.ts`
Expected: `Tests  13 passed (13)`.

- [ ] **Paso 5: Checkpoint**

```bash
git add src/lib/validacion.ts tests/unit/validacion.test.ts
```
Mensaje propuesto: `feat: añade reglas de integridad del contenido`

---

### Tarea 10: JSON-LD de migas y FAQ

**Files:**
- Modify: `src/lib/schema.ts` (import y dos funciones nuevas al final)
- Modify: `tests/unit/schema.test.ts` (import y dos `describe` nuevos al final)

- [ ] **Paso 1: Tests que fallan**

En `tests/unit/schema.test.ts`, cambia el import por:

```ts
import { migaDePan, organizacion, preguntasFrecuentes, serializarJsonLd, sitioWeb } from '@/lib/schema';
```

y añade al final:

```ts
describe('migaDePan', () => {
  it('numera las posiciones desde 1', () => {
    expect(
      migaDePan([
        { nombre: 'Inicio', url: 'https://tessera.co/sillas-ergonomicas' },
        { nombre: 'Sillas', url: 'https://tessera.co/catalogo' },
      ]),
    ).toMatchObject({
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Inicio' },
        { '@type': 'ListItem', position: 2, name: 'Sillas', item: 'https://tessera.co/catalogo' },
      ],
    });
  });
});

describe('preguntasFrecuentes', () => {
  it('convierte cada FAQ en Question con su Answer', () => {
    expect(preguntasFrecuentes([{ pregunta: '¿Llega armada?', respuesta: 'Sí.' }])).toMatchObject({
      '@type': 'FAQPage',
      mainEntity: [{ '@type': 'Question', name: '¿Llega armada?', acceptedAnswer: { '@type': 'Answer', text: 'Sí.' } }],
    });
  });
});
```

- [ ] **Paso 2: Ejecutarlos**

Run: `npx vitest run tests/unit/schema.test.ts`
Expected: `Tests  2 failed | 3 passed (5)` con `TypeError: migaDePan is not a function` y `TypeError: preguntasFrecuentes is not a function`.

- [ ] **Paso 3: Implementación**

En `src/lib/schema.ts`, cambia el import por:

```ts
import type { BreadcrumbList, FAQPage, Organization, Thing, WebSite, WithContext } from 'schema-dts';
```

y añade al final:

```ts
export interface Miga {
  readonly nombre: string;
  /** URL absoluta. */
  readonly url: string;
}

export function migaDePan(migas: readonly Miga[]): WithContext<BreadcrumbList> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: migas.map((miga, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: miga.nombre,
      item: miga.url,
    })),
  };
}

export function preguntasFrecuentes(faqs: readonly { readonly pregunta: string; readonly respuesta: string }[]): WithContext<FAQPage> {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.pregunta,
      acceptedAnswer: { '@type': 'Answer', text: faq.respuesta },
    })),
  };
}
```

- [ ] **Paso 4: Verde**

Run: `npx vitest run tests/unit/schema.test.ts`
Expected: `Tests  5 passed (5)`.

- [ ] **Paso 5: Checkpoint**

```bash
git add src/lib/schema.ts tests/unit/schema.test.ts
```
Mensaje propuesto: `feat: genera JSON-LD de BreadcrumbList y FAQPage`

---

### Tarea 11: Carga y validación del contenido

**Files:**
- Create: `src/lib/contenido.ts`
- Modify: `src/components/layout/Footer.astro` (columna «Sillas» desde el contenido)

`obtenerContenido()` reúne todas las referencias declaradas, aplica las reglas de `validacion.ts` y lanza `ErrorDeContenido` con **todos** los problemas a la vez; después resuelve las referencias y ordena por `orden`. Como el footer está en todas las páginas, cualquier problema de contenido rompe el build de cualquier página.

- [ ] **Paso 1: `src/lib/contenido.ts`**

```ts
import { getCollection, type CollectionEntry } from 'astro:content';
import type { Enlace } from '../data/site';
import { ETIQUETAS_GRUPO, filtrar, GRUPOS, rutaCategoria, textoFranjaComparador, textoIntroCatalogo, valorComun } from './catalogo';
import {
  categoriasVacias,
  duplicados,
  entradasDesincronizadas,
  ErrorDeContenido,
  minimoDeEntradas,
  problemasArchivoJson,
  referenciasRotas,
  sinTema,
  type Referencia,
} from './validacion';

// Los JSON tal como están en disco: el loader file() de Astro solo avisa en el log de un
// JSON inválido, una entrada sin `id` o un `id` repetido (ver problemasArchivoJson).
const archivosJson = import.meta.glob<string>('../content/*.json', { eager: true, query: '?raw', import: 'default' });

function problemasDeArchivos(colecciones: Readonly<Record<string, readonly { readonly id: string }[]>>): string[] {
  return Object.entries(colecciones).flatMap(([nombre, entradas]) => {
    const texto = archivosJson[`../content/${nombre}`];
    if (texto === undefined) return [`${nombre}: no se encontró el archivo.`];
    const { problemas, ids } = problemasArchivoJson(nombre, texto);
    return problemas.length > 0
      ? problemas
      : entradasDesincronizadas(
          nombre,
          ids,
          entradas.map((entrada) => entrada.id),
        );
  });
}

export type Silla = CollectionEntry<'sillas'>;
export type Categoria = CollectionEntry<'categorias'>;
export type Ajuste = CollectionEntry<'ajustes'>;
export type Testimonio = CollectionEntry<'testimonios'>;
export type Faq = CollectionEntry<'faqs'>;
export type Paso = CollectionEntry<'pasos'>;
export type Necesidad = CollectionEntry<'necesidades'>;
export type Veredicto = CollectionEntry<'veredictos'>;

export interface TestimonioResuelto {
  readonly entrada: Testimonio;
  readonly silla: Silla | undefined;
  /** Nombre de la silla o `etiquetaSilla` («Pedido de empresa»). */
  readonly etiquetaSilla: string;
}

export interface NecesidadResuelta {
  readonly entrada: Necesidad;
  readonly categoria: Categoria;
}

export interface VeredictoResuelto {
  readonly entrada: Veredicto;
  readonly silla: Silla;
}

export interface Contenido {
  readonly sillas: readonly Silla[];
  readonly categorias: readonly Categoria[];
  readonly portada: readonly Silla[];
  readonly muestra: readonly Silla[];
  readonly comparador: readonly [Silla, Silla, Silla];
  readonly anatomia: Silla;
  readonly barra: readonly Categoria[];
  readonly ajustes: readonly Ajuste[];
  readonly testimonios: readonly TestimonioResuelto[];
  readonly faqs: readonly Faq[];
  readonly pasos: readonly Paso[];
  readonly necesidades: readonly NecesidadResuelta[];
  readonly veredictos: readonly VeredictoResuelto[];
}

export function idsCategorias(silla: Silla): string[] {
  return silla.data.categorias.map((ref) => ref.id);
}

/** Fondo de la portada y de la anatomía. La validación garantiza `tema` en esas sillas. */
export function gradienteTema(silla: Silla): string {
  const colores = silla.data.tema?.gradiente;
  if (colores === undefined) {
    throw new ErrorDeContenido([`sillas/${silla.id}: necesita \`tema.gradiente\`.`]);
  }
  return `linear-gradient(165deg, ${colores[0]} 0%, ${colores[1]} 45%, ${colores[2]} 100%)`;
}

export function enlacesDeCategorias(categorias: readonly Categoria[]): Enlace[] {
  return categorias.map((categoria) => ({ texto: categoria.data.etiquetaLarga, href: rutaCategoria(categoria.data.slug) }));
}

export function introCatalogo(contenido: Contenido): string {
  return textoIntroCatalogo(contenido.sillas.length, valorComun(contenido.sillas.map((silla) => silla.data.specs.garantiaAnios)));
}

export function franjaComparador(contenido: Contenido): string {
  return textoFranjaComparador(
    contenido.comparador.map((silla) => ({ categorias: idsCategorias(silla) })),
    contenido.categorias.map((categoria) => ({ id: categoria.id, grupo: categoria.data.grupo, etiqueta: categoria.data.etiqueta })),
  );
}

export interface EstadoFiltros {
  /** Sillas que se ven al cargar: las de la base, o todas en /catalogo. */
  readonly visibles: readonly Silla[];
  readonly activas: readonly string[];
  readonly grupos: readonly { readonly titulo: string; readonly opciones: readonly Categoria[] }[];
  /** Categorías que pueden ser filtro extra (todas menos la base). */
  readonly otras: readonly Categoria[];
  /** Para `contar()`: las categorías de cada silla. */
  readonly datos: readonly { readonly categorias: readonly string[] }[];
}

export function estadoFiltros(contenido: Contenido, base: Categoria | undefined): EstadoFiltros {
  const datos = contenido.sillas.map((silla) => ({ silla, categorias: idsCategorias(silla) }));
  const activas = base === undefined ? [] : [base.id];
  return {
    visibles: filtrar(datos, activas).map((dato) => dato.silla),
    activas,
    grupos: GRUPOS.map((grupo) => ({
      titulo: ETIQUETAS_GRUPO[grupo],
      opciones: contenido.categorias.filter((categoria) => categoria.data.grupo === grupo),
    })).filter((grupo) => grupo.opciones.length > 0),
    otras: contenido.categorias.filter((categoria) => categoria.id !== base?.id),
    datos,
  };
}

function porOrden<T extends { readonly data: { readonly orden: number } }>(entradas: readonly T[]): T[] {
  return [...entradas].sort((a, b) => a.data.orden - b.data.orden);
}

function indexar<T extends { readonly id: string }>(entradas: readonly T[]): ReadonlyMap<string, T> {
  return new Map(entradas.map((entrada) => [entrada.id, entrada]));
}

function resolver<T>(mapa: ReadonlyMap<string, T>, id: string, origen: string): T {
  const entrada = mapa.get(id);
  if (entrada === undefined) {
    throw new ErrorDeContenido([`${origen}: «${id}» no existe.`]);
  }
  return entrada;
}

/**
 * Carga todas las colecciones, valida la integridad (referencias, categorías vacías,
 * temas obligatorios, slugs únicos) y devuelve el contenido resuelto y ordenado.
 * Lanza ErrorDeContenido con TODOS los problemas: así el build falla con un solo mensaje.
 */
export async function obtenerContenido(): Promise<Contenido> {
  const [sillas, categorias, destacadosTodos, ajustes, testimonios, faqs, pasos, necesidades, veredictos] = await Promise.all([
    getCollection('sillas'),
    getCollection('categorias'),
    getCollection('destacados'),
    getCollection('ajustes'),
    getCollection('testimonios'),
    getCollection('faqs'),
    getCollection('pasos'),
    getCollection('necesidades'),
    getCollection('veredictos'),
  ]);

  const problemasArchivos = problemasDeArchivos({
    'categorias.json': categorias,
    'destacados.json': destacadosTodos,
    'ajustes.json': ajustes,
    'faqs.json': faqs,
    'pasos.json': pasos,
    'necesidades.json': necesidades,
    'veredictos.json': veredictos,
  });
  if (problemasArchivos.length > 0) {
    throw new ErrorDeContenido(problemasArchivos);
  }

  const destacados = destacadosTodos.find((entrada) => entrada.id === 'landing');
  if (destacados === undefined) {
    throw new ErrorDeContenido(['destacados.json: falta la entrada con id «landing».']);
  }
  const d = destacados.data;

  const referencias: Referencia[] = [
    ...sillas.flatMap((silla) =>
      silla.data.categorias.map((ref, i) => ({ origen: `sillas/${silla.id} → categorias[${String(i)}]`, coleccion: 'categorias', id: ref.id })),
    ),
    ...testimonios.flatMap((t) =>
      t.data.silla === undefined ? [] : [{ origen: `testimonios/${t.id} → silla`, coleccion: 'sillas', id: t.data.silla.id }],
    ),
    ...necesidades.map((n) => ({ origen: `necesidades/${n.id} → categoria`, coleccion: 'categorias', id: n.data.categoria.id })),
    ...veredictos.map((v) => ({ origen: `veredictos/${v.id} → silla`, coleccion: 'sillas', id: v.data.silla.id })),
    ...(['portada', 'muestra', 'comparador'] as const).flatMap((campo) =>
      d[campo].map((ref, i) => ({ origen: `destacados/landing → ${campo}[${String(i)}]`, coleccion: 'sillas', id: ref.id })),
    ),
    { origen: 'destacados/landing → anatomia', coleccion: 'sillas', id: d.anatomia.id },
    ...d.barra.map((ref, i) => ({ origen: `destacados/landing → barra[${String(i)}]`, coleccion: 'categorias', id: ref.id })),
  ];

  const existentes = new Map([
    ['sillas', new Set(sillas.map((s) => s.id))],
    ['categorias', new Set(categorias.map((c) => c.id))],
  ]);
  const conTema = new Set(sillas.filter((s) => s.data.tema !== undefined).map((s) => s.id));

  const problemas = [
    ...referenciasRotas(existentes, referencias),
    ...categoriasVacias(
      categorias.map((c) => c.id),
      sillas.map((s) => ({ id: s.id, categorias: idsCategorias(s) })),
    ),
    ...sinTema(
      [
        ...d.portada.map((ref, i) => ({ origen: `destacados/landing → portada[${String(i)}]`, silla: ref.id })),
        { origen: 'destacados/landing → anatomia', silla: d.anatomia.id },
      ],
      conTema,
    ),
    ...duplicados(
      'categorias → slug',
      categorias.map((c) => c.data.slug),
    ),
    ...minimoDeEntradas('faqs.json', faqs.length, 1),
    ...minimoDeEntradas('pasos.json', pasos.length, 1),
    ...minimoDeEntradas('necesidades.json', necesidades.length, 1),
    ...minimoDeEntradas('veredictos.json', veredictos.length, 1),
    ...minimoDeEntradas('ajustes.json', ajustes.length, 1),
    ...minimoDeEntradas('testimonios con `destacado: true`', testimonios.filter((t) => t.data.destacado).length, 1),
  ];
  if (problemas.length > 0) {
    throw new ErrorDeContenido(problemas);
  }

  const sillasPorId = indexar(sillas);
  const categoriasPorId = indexar(categorias);
  const silla = (id: string, origen: string): Silla => resolver(sillasPorId, id, origen);
  const categoria = (id: string, origen: string): Categoria => resolver(categoriasPorId, id, origen);
  const [c1, c2, c3] = d.comparador;

  return {
    sillas: porOrden(sillas),
    categorias: [...categorias].sort(
      (a, b) => GRUPOS.indexOf(a.data.grupo) - GRUPOS.indexOf(b.data.grupo) || a.data.orden - b.data.orden,
    ),
    portada: d.portada.map((ref) => silla(ref.id, 'destacados → portada')),
    muestra: d.muestra.map((ref) => silla(ref.id, 'destacados → muestra')),
    comparador: [silla(c1.id, 'destacados → comparador'), silla(c2.id, 'destacados → comparador'), silla(c3.id, 'destacados → comparador')],
    anatomia: silla(d.anatomia.id, 'destacados → anatomia'),
    barra: d.barra.map((ref) => categoria(ref.id, 'destacados → barra')),
    ajustes: porOrden(ajustes),
    testimonios: porOrden(testimonios).map((t) => {
      const suSilla = t.data.silla === undefined ? undefined : silla(t.data.silla.id, `testimonios/${t.id}`);
      return { entrada: t, silla: suSilla, etiquetaSilla: suSilla?.data.nombre ?? t.data.etiquetaSilla ?? '' };
    }),
    faqs: porOrden(faqs),
    pasos: porOrden(pasos),
    necesidades: porOrden(necesidades).map((n) => ({ entrada: n, categoria: categoria(n.data.categoria.id, `necesidades/${n.id}`) })),
    veredictos: porOrden(veredictos).map((v) => ({ entrada: v, silla: silla(v.data.silla.id, `veredictos/${v.id}`) })),
  };
}
```

- [ ] **Paso 2: Footer conectado al contenido** (reemplaza el archivo completo)

```astro
---
import { site, type ColumnaFooter } from '@/data/site';
import { enlacesDeCategorias, obtenerContenido } from '@/lib/contenido';

const { barra, sillas } = await obtenerContenido();
const columnaSillas: ColumnaFooter = {
  titulo: 'Sillas',
  enlaces: [...enlacesDeCategorias(barra), { texto: `Ver las ${String(sillas.length)} sillas`, href: '/catalogo' }],
};
const columnas = [columnaSillas, ...site.footer];
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

- [ ] **Paso 3: Build**

Run: `npm run build`
Expected: `0 errors` y `Complete!`.

Run: `grep -o 'Ver las [0-9]* sillas\|href="/catalogo/[a-z-]*"' dist/sillas-ergonomicas.html | sort -u`
Expected:
```text
Ver las 12 sillas
href="/catalogo/altos"
href="/catalogo/lumbar"
href="/catalogo/malla"
href="/catalogo/uso-intensivo"
```

- [ ] **Paso 4: Una referencia rota debe romper el build**

En `src/content/sillas/vega.md` cambia `categorias: [malla, compacta]` por `categorias: [malla, gamer]`.

Run: `npm run build; echo "exit=$?"`
Expected: `exit=1` y el mensaje
```text
ErrorDeContenido: El contenido tiene 1 problema(s):
- sillas/vega → categorias[1]: «gamer» no existe en la colección «categorias».
```

- [ ] **Paso 5: Revertir**

Vuelve a `categorias: [malla, compacta]`.

- [ ] **Paso 5b: Un JSON mal editado también debe romper el build**

En `src/content/faqs.json` añade una coma después de la última entrada (`},` antes del `]`).

Run: `npm run build; echo "exit=$?"`
Expected: `exit=1` y
```text
El contenido tiene 1 problema(s):
- faqs.json: JSON inválido (Unexpected token ']', …).
```
Revierte la coma. Con la misma regla fallan una entrada sin `id` («falta `id` o no es un slug»), un `id` con espacios y un `id` repetido.

Run: `npm run build`
Expected: `Complete!`.

- [ ] **Paso 6: Checkpoint**

```bash
git add src/lib/contenido.ts src/components/layout/Footer.astro
```
Mensaje propuesto: `feat: valida la integridad del contenido y conecta el footer`

---

### Tarea 12: Verificación de la fase

- [ ] **Paso 1: Todo en verde**

Run: `npm run verify && npm run build`
Expected: `0 errors`; ESLint y Stylelint sin salida; `Test Files  10 passed (10)` y `Tests  81 passed (81)`; build `Complete!`.

- [ ] **Paso 2: Checkpoint final de fase**

Run: `git status --short`
Expected: nada pendiente fuera de lo ya añadido. Mensaje propuesto si el usuario prefiere un solo commit de fase: `feat: colecciones de contenido y lógica de dominio (fase 2)`

## API que dejan disponible las fases 1 y 2 (para las fases 3–5)

| Módulo | Exporta |
|---|---|
| `@/data/site` | `site` (nombre, url, lema, mercado.locale, contacto, entregaHoras, textoEnvios, autoplayPortada, notaWhatsApp, mensajesWhatsApp, nav, enlaceEmpresas, footer), tipos `Enlace`, `ColumnaFooter`, `Locale` |
| `@/lib/contacto` | `urlWhatsApp(numero, mensaje)`, `urlCorreo(correo, asunto?)`, tipo `ContextoWhatsApp` (`'barra' \| 'entrega' \| 'comparador'`) |
| `@/lib/seo` | `urlCanonica(origen, ruta)`, `tituloPagina(titulo, marca)`, `localeOpenGraph(locale)` |
| `@/lib/schema` | `organizacion`, `sitioWeb`, `migaDePan(migas)`, `preguntasFrecuentes(faqs)`, `serializarJsonLd`, tipo `Miga` |
| `@/lib/dom` | `consulta(raiz, selector, Tipo)`, `consultaTodos`, `leerDato(el, nombre)`, `definirElemento(nombre, clase)`, `prefiereMovimientoReducido()` |
| `@/lib/formato` | `formatearRango(rango, 'm' \| 'cm', locale)`, `formatearAnios(n)`, `numeroEnLetras(n, genero?)`, `capitalizar(texto)`, tipo `Rango` |
| `@/lib/catalogo` | `GRUPOS`, `ETIQUETAS_GRUPO`, `cumpleFiltros`, `filtrar`, `contar`, `rutaCategoria(slug)`, `leerExtras(search, validos)`, `escribirExtras(slugs)`, tipo `Grupo` |
| `@/lib/comparador` | `definirFilas(locale, entregaHoras)`, `derivarFilas(sillas, definiciones)`, tipos `DatosComparables`, `DefinicionFila`, `FilaComparador` |
| `@/lib/contenido` | `obtenerContenido()` → `Contenido` (sillas, categorias, portada, muestra, comparador `[S,S,S]`, anatomia, barra, ajustes, testimonios resueltos, faqs, pasos, necesidades resueltas, veredictos resueltos), `idsCategorias(silla)`, tipos `Silla`, `Categoria`, … |
| Componentes | `BaseLayout` (`titulo`, `descripcion`, `ruta`, `indexable?`, `jsonLd?`), `EncabezadoSeccion` (`etiqueta`, `titulo`, `intro?`, `ancho?`, `variante?`, `nivel?`, slot `accion`), `FranjaOscura` (`texto`, `enlace`, `id?`), `CtaWhatsApp` (`contexto`, `tamano?`), `BloqueConversion` (`titular`, `texto`, `contexto`, `inicioGradiente?`) |
| SCSS (inyectado) | funciones `color()`, `radio()`, `sombra()`, `fuente()`, `ancho()`, `tinta($alfa)`, `hielo($alfa)`; mixins `h1`, `h1-pantalla`, `h2`, `h2-serif`, `enfasis-serif`, `etiqueta-mono($tamano)`, `cuerpo($tamano, $alto)`, `seccion`, `seccion-compacta`, `contenedor($nombre)`, `movil`, `movimiento-reducido`, `pill(...)`, `foco-visible`, `area-tactil($minimo)`, `solo-lectores`; variables `$padding-lateral`, `$movil` |
