import { expect, test } from '@playwright/test';

test.describe('comparador', () => {
  test('es una tabla real con cabeceras de columna y fila', async ({ page }) => {
    await page.goto('/comparar');
    await expect(page.locator('table th[scope="col"][data-chair-column]')).toHaveCount(3);
    await expect(page.locator('table tbody th[scope="row"]')).toHaveCount(8);
  });

  test('«Solo lo que cambia» es un switch que oculta las filas iguales', async ({ page }) => {
    await page.goto('/comparar');
    const toggle = page.locator('[data-comparison-switch]');
    await expect(toggle).toHaveAttribute('role', 'switch');
    await expect(toggle).toHaveAttribute('aria-checked', 'false');
    const rows = await page.locator('tr[data-row]').count();
    const sameRows = await page.locator('tr[data-same-row]').count();
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-checked', 'true');
    for (const row of await page.locator('tr[data-same-row]').all()) await expect(row).toBeHidden();
    await expect(page.locator('tr[data-row]:visible')).toHaveCount(rows - sameRows);
  });

  test('«Ver ficha» lleva a la tarjeta del catálogo', async ({ page }) => {
    await page.goto('/comparar');
    for (const href of await page.locator('a[data-chair-link]').evaluateAll((as) => as.map((a) => a.getAttribute('href')))) {
      expect(href).toMatch(/^\/catalogo#[a-z-]+$/);
    }
  });
});
