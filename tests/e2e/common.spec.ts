import { expect, test } from '@playwright/test';
import { site } from '../../src/data/site';
import { CONTENT, jsonLd, ROUTES, expectNoAxeViolations, types } from './helpers';

for (const route of ROUTES) {
  test.describe(route, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(route);
    });

    test('tiene un solo h1 y canonical propia', async ({ page }) => {
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${site.url}${route}`);
    });

    test('vista previa al compartir con imagen', async ({ page }) => {
      await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', new RegExp(`^${site.url}/`));
    });

    test('enlace para saltar al contenido', async ({ page }) => {
      await page.keyboard.press('Tab');
      await expect(page.locator('a.skip-link')).toBeFocused();
      await expect(page.locator('a.skip-link')).toHaveAttribute('href', '#contenido');
    });

    test('JSON-LD válido con Organization y WebSite', async ({ page }) => {
      const nodes = types(await jsonLd(page));
      expect(nodes).toContain('Organization');
      expect(nodes).toContain('WebSite');
    });

    test('ofrece contacto por correo', async ({ page }) => {
      await expect(page.locator(`footer a[href="mailto:${site.contact.email}"]`)).toHaveCount(1);
    });

    test('no muestra precios', async ({ page }) => {
      // textContent, no innerText: incluye las FAQ cerradas y el texto que oculta el JS.
      const text = (await page.locator('main').textContent()) ?? '';
      // Importes, no la palabra: la guía del diseño habla del precio en general.
      expect(text).not.toMatch(/\$\s?\d|\d\s?(COP|MXN)\b|(COP|MXN)\s?\$?\s?\d/);
    });

    test('sin violaciones de accesibilidad (axe, WCAG 2.1 AA)', async ({ page }) => {
      await expectNoAxeViolations(page);
    });

    test('no desborda en horizontal', async ({ page }) => {
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow).toBeLessThanOrEqual(0);
    });
  });
}

test.describe('sin JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('la landing sirve todo el texto en el HTML', async ({ page }) => {
    await page.goto('/sillas-ergonomicas');
    await expect(page.locator('details[data-faq]')).toHaveCount(CONTENT.faqs);
    await expect(page.locator('[data-testimonial]')).toHaveCount(CONTENT.testimonials);
    await expect(page.locator('[data-extended]').first()).toBeVisible();
    await expect(page.locator('[data-adjustment-panel]')).toHaveCount(CONTENT.adjustments);
  });

  test('la guía del catálogo está en el HTML', async ({ page }) => {
    await page.goto('/catalogo');
    await expect(page.locator('#cat-guia h2')).toBeVisible();
  });
});

test('la 404 no declara canonical', async ({ page }) => {
  await page.goto('/404');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, follow');
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
});
