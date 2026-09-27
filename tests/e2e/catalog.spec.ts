import { expect, test } from '@playwright/test';
import { site } from '../../src/data/site';
import { CONTENT, jsonLd, types } from './helpers';

test.describe('catálogo', () => {
  test('muestra todas las sillas y la miga en JSON-LD', async ({ page }) => {
    await page.goto('/catalogo');
    await expect(page.locator('article[data-chair]')).toHaveCount(CONTENT.chairs);
    expect(types(await jsonLd(page))).toContain('BreadcrumbList');
  });

  test('cada tarjeta es destino de /catalogo#<id>', async ({ page }) => {
    await page.goto('/catalogo#duna');
    await expect(page.locator('article#duna')).toBeVisible();
  });

  test('en /catalogo una opción navega a su página de categoría', async ({ page, isMobile }) => {
    await page.goto('/catalogo');
    if (isMobile) await page.locator('[data-filters-panel] summary').click();
    await page.locator('a[data-option="malla"]').click();
    await expect(page).toHaveURL(/\/catalogo\/malla$/);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${site.url}/catalogo/malla`);
  });

  test('en una faceta, un filtro extra estrecha en cliente sin cambiar la canonical', async ({ page, isMobile }) => {
    await page.goto('/catalogo/malla');
    const total = await page.locator('article[data-chair]:visible').count();
    if (isMobile) await page.locator('[data-filters-panel] summary').click();
    await page.locator('a[data-option="lumbar"]').click();
    await expect(page).toHaveURL(/\/catalogo\/malla\?y=lumbar$/);
    const visibleCount = await page.locator('article[data-chair]:visible').count();
    expect(visibleCount).toBeLessThan(total);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${site.url}/catalogo/malla`);
  });

  test('lee los extras de la query al cargar', async ({ page }) => {
    await page.goto('/catalogo/malla?y=lumbar');
    await expect(page.locator('a[data-option="lumbar"]')).toHaveAttribute('aria-current', 'true');
    await expect(page.locator('button[data-chip="lumbar"]')).toBeVisible();
  });
});
