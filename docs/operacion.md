# Operación de Tessera

Documento de operación y traspaso (contrato, cláusulas 4 y 10). Mantenerlo al día: es la
lista de comprobación para entregar las cuentas al cliente y la guía del mantenimiento anual.

## Inventario de servicios

Todo en planes gratuitos que permiten uso comercial. Cualquier plan de pago lo aprueba y lo
paga el cliente (cláusulas 2 y 6).

| Servicio | Para qué | Titular | Plan | Costo |
|---|---|---|---|---|
| GitHub (organización del proyecto) | Código, Dependabot | Desarrollador → cliente al traspaso | Free | 0 |
| Cloudflare Workers (archivos estáticos) | Hosting estático, SSL, previews por rama | Cuenta del proyecto | Free | 0 |
| Cloudflare DNS | DNS del dominio | Cuenta del proyecto | Free | 0 |
| Registrador del dominio | Dominio | **Cliente** | — | Renovación anual, la paga el cliente |
| Google Workspace | Correo del dominio | **Cliente** | Según licencias | Lo paga el cliente |
| Monitor de disponibilidad | Alerta si el sitio cae | Cuenta del proyecto | Gratuito con uso comercial (verificar términos) | 0 |

Completar con: nombre de la organización de GitHub, correo de la cuenta de Cloudflare,
registrador, servicio de monitoreo y quién tiene acceso a cada uno.

## Despliegue

- **Cloudflare Workers** (archivos estáticos, configurado en `wrangler.jsonc`) conectado al repositorio: build `pnpm build:pages`, deploy `npx wrangler deploy`, preview de ramas `npx wrangler versions upload`. Versión de Node desde `.node-version`.
- Variable de build `PNPM_VERSION` (*Settings → Build → Variables and secrets*) = la de `packageManager` en `package.json` (hoy `11.28.2`). La imagen de build v3 de Cloudflare no lee `packageManager` ni Corepack: sin la variable usa su pnpm por defecto.
- No hay CI en GitHub Actions: el build de Cloudflare es la puerta de calidad. `build:pages` ejecuta `verify` (tipos, lint, estilos, tests), `build` y `links`; si algo falla no se despliega, tampoco el preview. E2E, Lighthouse y `audit` necesitan navegador o red y se ejecutan en local (`pnpm verify:full`).
- Cada rama y cada PR generan una URL de preview: es la que revisa el delegado del cliente en cada hito.
- `main` despliega a producción.
- `public/_redirects` hace la 301 de `/` a `/sillas-ergonomicas`. Comprobar tras cada cambio de hosting: `curl -I https://<dominio>/` debe devolver `301` con `location: /sillas-ergonomicas`.

### Revertir

Cloudflare → *Workers & Pages* → `tessera` → *Deployments* → versión anterior → *Rollback*. Después, revertir el commit en `main` para que el siguiente despliegue no lo reintroduzca.

## Registros DNS

| Tipo | Nombre | Valor | Para qué |
|---|---|---|---|
| (automático) | `@` / `www` | Lo crea Cloudflare al añadir el dominio en `tessera` → *Settings → Domains & Routes → Custom domain* | Sitio |
| MX | `@` | `smtp.google.com`, prioridad 1 | Google Workspace |
| TXT | `@` | `v=spf1 include:_spf.google.com ~all` | SPF |
| TXT | `google._domainkey` | Clave que genera la consola de Workspace (*Aplicaciones → Gmail → Autenticar correo*) | DKIM |
| TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:<correo-de-informes>` | DMARC (recomendado) |
| TXT | `@` | `google-site-verification=…` | Search Console (verificación por DNS) |

Comprobar: `dig MX <dominio> +short`, `dig TXT <dominio> +short`, `dig TXT google._domainkey.<dominio> +short` y enviar un correo de prueba a una cuenta de Gmail: en *Mostrar original*, SPF y DKIM deben salir `PASS`.

## Mantenimiento anual (cláusula 4)

Incluye infraestructura, DNS, SSL, monitoreo, actualizaciones de seguridad y bugs. **No incluye** cambios de diseño ni edición de contenido.

- **Semanal (lunes):** revisar los PR de Dependabot. Si su preview de Cloudflare se construyó, fusionar los de parches y menores; los de versión mayor se prueban en local (`pnpm verify:full`).
- **Mensual:** `pnpm run audit` en local; revisar alertas del monitor y el panel de Cloudflare.
- **Ante una alerta de caída:** estado de Cloudflare Workers, último despliegue, DNS. Revertir si el fallo viene del último despliegue.

## Cambios de contenido (trabajo aparte del mantenimiento)

El código, los nombres de archivo y las claves de los datos están en inglés; los textos de la página (y sus URLs) siguen en español.

- **Añadir una silla:** crear `src/content/chairs/<slug>.md` (copiar una existente), su foto en `src/assets/sillas/`, y referenciar categorías existentes. Si va en la portada o en anatomía necesita `theme.gradient`. `pnpm build` falla con un mensaje claro si falta algo o una referencia no existe.
- **Fotos de cualquier proporción:** la foto puede ser vertical, horizontal o cuadrada; no se recorta en el build. Cada bloque la pinta en su marco con `image.fit`: `contain` (por defecto en sillas: se ve entera, ideal con PNG de fondo transparente) o `cover` (por defecto en testimonios: llena el marco). Con `cover`, `image.focus: { x, y }` (en %) es el punto que el recorte nunca deja fuera. La anatomía muestra siempre la foto entera y sus puntos (`adjustments.json → point`) se miden en % de la foto.
- **Añadir una categoría:** entrada nueva en `src/content/categories.json` con `slug`, textos y `guide`; genera su página `/catalogo/<slug>` y aparece en el sitemap. Debe tener al menos una silla o el build falla.
- **Cambiar qué se destaca:** `src/content/featured.json` (`hero`, `showcase`, `comparison` —exactamente 3—, `anatomy` y `categoryBar`).
- Tras cualquier cambio: `pnpm build:pages`.

## Traspaso (cláusula 10, ≤ 10 días hábiles)

- [ ] Transferir la organización de GitHub (o el repositorio) al cliente y quitar el acceso del desarrollador si así se acuerda.
- [ ] Cambiar el propietario de la cuenta de Cloudflare al correo del cliente.
- [ ] Confirmar que el dominio y Google Workspace están a nombre del cliente (deberían estarlo desde el inicio).
- [ ] Traspasar el monitor de disponibilidad.
- [ ] Entregar este documento actualizado y la lista de accesos.

## Puesta en marcha (hito H3)

- [ ] `src/data/site.ts`: `url` con el dominio real, `contact.whatsapp`, `contact.email`, `market` (`es-CO` o `es-MX`), `shippingText` y `whatsAppNote` confirmados por el cliente. Mientras haya datos de relleno, el build lo avisa (`[tessera:real-data]`).
- [ ] Cloudflare → `tessera` → *Settings → Build → Variables and secrets* (variables de **build**, no las de runtime del Worker): `REQUIRE_REAL_DATA=1`. Con ella, un build con datos de relleno falla en vez de publicarse. Workers Builds no separa variables por rama, así que aplica también a los previews: activarla cuando los datos reales ya estén en `main`.
- [ ] Contenido real: sillas, categorías (con su copy SEO), testimonios con permiso, FAQ, garantía y devoluciones validados por el cliente (cláusula 8).
- [ ] Fotos reales en `src/assets/` y puntos de anatomía recalibrados (`src/content/adjustments.json`).
- [ ] Favicon y logo definitivos.
- [ ] `pnpm verify:full` en verde.
- [ ] DNS, SSL y correo comprobados (sección «Registros DNS»).
- [ ] `curl -I` de la redirección de `/`.
- [ ] Search Console: propiedad verificada, sitemap `https://<dominio>/sitemap-index.xml` enviado.
- [ ] Rich Results Test sobre `/sillas-ergonomicas` (FAQPage) y `/catalogo` (BreadcrumbList).
- [ ] Monitor de disponibilidad activo con una alerta de prueba.
