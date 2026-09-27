import { expect, test, type Page } from '@playwright/test';
import { hasMinimumTouchTarget, jsonLd, types } from './helpers';

test.describe('landing', () => {
  test('bloques en el orden del diseño', async ({ page }) => {
    await page.goto('/sillas-ergonomicas');
    const ids = await page.locator('main section[id]').evaluateAll((sections) => sections.map((s) => s.id));
    expect(ids).toEqual(['inicio', 'necesidades', 'sillas', 'anatomia', 'experiencias', 'entrega', 'faq']);
  });

  test('WhatsApp aparece exactamente dos veces', async ({ page }) => {
    await page.goto('/sillas-ergonomicas');
    await expect(page.locator('a[href^="https://wa.me/"]')).toHaveCount(2);
    await expect(page.locator('[data-whatsapp="categoryBar"]')).toHaveCount(1);
    await expect(page.locator('[data-whatsapp="delivery"]')).toHaveCount(1);
  });

  test('FAQPage con las cinco preguntas', async ({ page }) => {
    await page.goto('/sillas-ergonomicas');
    expect(types(await jsonLd(page))).toContain('FAQPage');
  });

  test('chips y necesidades enlazan a páginas de categoría', async ({ page }) => {
    await page.goto('/sillas-ergonomicas');
    for (const href of await page.locator('nav[aria-label="Categorías"] a, [data-need]').evaluateAll((as) => as.map((a) => a.getAttribute('href')))) {
      expect(href).toMatch(/^\/catalogo\/[a-z-]+$/);
    }
  });

  test('la portada rota cada 5 s y el primer clic la detiene', async ({ page }) => {
    await page.clock.install();
    await page.goto('/sillas-ergonomicas');
    const dots = page.locator('[data-hero-dot]');
    await expect(dots.nth(0)).toHaveAttribute('aria-pressed', 'true');
    await page.clock.runFor(5000);
    await expect(dots.nth(1)).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-hero-link]')).toHaveAttribute('href', /^\/catalogo#/);
    await dots.nth(2).click();
    await page.clock.runFor(20000);
    await expect(dots.nth(2)).toHaveAttribute('aria-pressed', 'true');
  });

  test('áreas táctiles de al menos 44 px', async ({ page }) => {
    await page.goto('/sillas-ergonomicas');
    // Los indicadores están a 33 px entre centros (26 px + 7 px de separación del diseño):
    // en horizontal cada área ocupa su tramo del paso (±15 px con margen subpíxel frente al
    // vecino); los 44 px en horizontal exigirían separarlos más.
    expect(await hasMinimumTouchTarget(page, '[data-hero-dot]', { horizontal: 15, vertical: 21 })).toEqual([true, true, true]);
    expect(await hasMinimumTouchTarget(page, '[data-adjustment-point]')).toEqual([true, true, true, true]);
  });

  test('anatomía: punto y fila comparten estado', async ({ page }) => {
    await page.goto('/sillas-ergonomicas');
    await page.locator('[data-adjustment-point="2"]').click();
    await expect(page.locator('[data-adjustment-row="2"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-adjustment-panel="2"]')).toBeVisible();
    await expect(page.locator('[data-adjustment-panel="0"]')).toBeHidden();
  });

  test('experiencias: «Leer más» amplía y pagina', async ({ page }) => {
    await page.goto('/sillas-ergonomicas');
    await expect(page.locator('[data-testimonials-position]')).toHaveText('3 experiencias');
    await page.locator('[data-testimonials-more]').click();
    await expect(page.locator('[data-testimonials-position]')).toHaveText('Experiencias 1–3 de 6');
    await page.locator('[data-testimonials-next]').click();
    await expect(page.locator('[data-testimonials-position]')).toHaveText('Experiencias 2–4 de 6');
  });

  test('header sticky y anclas compensadas con su alto exacto', async ({ page }) => {
    await page.goto('/sillas-ergonomicas');
    const header = page.locator('header.header');
    expect(await header.evaluate((el) => getComputedStyle(el).position)).toBe('sticky');
    // Por pantallas, cada bloque queda justo bajo el header: sin franja del bloque anterior.
    const height = await header.evaluate((el) => el.getBoundingClientRect().height);
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollPaddingTop)).toBe(`${String(height)}px`);
  });

  test('vista previa al compartir con imagen grande', async ({ page }) => {
    await page.goto('/sillas-ergonomicas');
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /^https?:\/\/.+\.jpg$/);
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image');
  });

  test('la marquesina llena todo el ancho', async ({ page }) => {
    await page.goto('/sillas-ergonomicas');
    const { right, width } = await page.evaluate(() => ({
      right: Math.max(...Array.from(document.querySelectorAll('.marquee__card'), (card) => card.getBoundingClientRect().right)),
      width: document.documentElement.clientWidth,
    }));
    expect(right).toBeGreaterThanOrEqual(width);
  });

  test('«ERGONÓMICAS» es decoración: no se lee', async ({ page }) => {
    await page.goto('/sillas-ergonomicas');
    await expect(page.locator('.hero__word')).toHaveAttribute('aria-hidden', 'true');
  });

  test('marquesina: la copia no se lee ni se tabula', async ({ page }) => {
    await page.goto('/sillas-ergonomicas');
    const copy = page.locator('.marquee__group').nth(1);
    await expect(copy).toHaveAttribute('aria-hidden', 'true');
    await expect(copy).toHaveAttribute('inert', '');
  });
});

test.describe('scroll por pantallas (escritorio)', () => {
  test.skip(({ isMobile }) => isMobile, 'En móvil el anclaje es proximity: el scroll es libre.');

  // Inicio (scrollY) de cada bloque de la landing, ya descontado el header.
  async function sectionStarts(page: Page): Promise<number[]> {
    return page.evaluate(() => {
      const headerHeight = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop);
      return Array.from(document.querySelectorAll('main > section'), (section) =>
        Math.round(section.getBoundingClientRect().top + scrollY - headerHeight),
      );
    });
  }

  async function sectionOnScreen(page: Page): Promise<number> {
    const starts = await sectionStarts(page);
    const y = await page.evaluate(() => Math.round(scrollY));
    return starts.findLastIndex((start) => start <= y + 2);
  }

  /**
   * Reproduce un ritmo de rueda exacto: [ms desde el evento anterior, deltaY]. Se despacha
   * dentro de la página porque `mouse.wheel` espera a cada evento y deforma el ritmo.
   */
  async function wheel(page: Page, plan: readonly (readonly [number, number])[]): Promise<void> {
    await page.evaluate(async (steps) => {
      const target = document.elementFromPoint(400, 400) ?? document.body;
      let time = performance.now();
      for (const [delay, deltaY] of steps) {
        time += delay;
        await new Promise((resolve) => {
          setTimeout(resolve, Math.max(0, time - performance.now()));
        });
        target.dispatchEvent(new WheelEvent('wheel', { deltaY, bubbles: true, cancelable: true }));
      }
    }, plan);
  }

  const wheelBurst = (notches: number, every: number, firstDelay = 0): [number, number][] =>
    Array.from({ length: notches }, (_, i) => [i === 0 ? firstDelay : every, 100]);

  // Deltas que decaen durante ~1 s, como la inercia de un trackpad tras un deslizamiento.
  const trackpadSwipe = (firstDelay = 0): [number, number][] =>
    Array.from({ length: 60 }, (_, i) => [i === 0 ? firstDelay : 16, Math.max(1, Math.round(60 * Math.exp(-i / 15)))]);

  test('cada gesto de rueda salta un bloque entero', async ({ page }) => {
    await page.goto('/sillas-ergonomicas');
    for (const start of (await sectionStarts(page)).slice(1, 4)) {
      await page.mouse.move(400, 400);
      await page.mouse.wheel(0, 120);
      await expect.poll(() => page.evaluate(() => Math.round(scrollY)), { timeout: 3000 }).toBe(start);
      // La inercia de un trackpad no debe encadenar un segundo salto.
      await page.waitForTimeout(400);
    }
  });

  test('rueda girada rápido: cada ráfaga avanza, la página no se queda bloqueada', async ({ page }) => {
    await page.goto('/sillas-ergonomicas');
    await wheel(page, [...wheelBurst(8, 30), ...wheelBurst(8, 30, 250), ...wheelBurst(8, 30, 250)]);
    await page.waitForTimeout(1500);
    expect(await sectionOnScreen(page)).toBeGreaterThanOrEqual(3);
  });

  test('trackpad: dos deslizamientos con inercia avanzan exactamente dos bloques', async ({ page }) => {
    await page.goto('/sillas-ergonomicas');
    await wheel(page, [...trackpadSwipe(), ...trackpadSwipe(200)]);
    await page.waitForTimeout(1200);
    expect(await sectionOnScreen(page)).toBe(2);
  });

  test('un golpe corto de rueda (tres muescas seguidas) avanza un solo bloque', async ({ page }) => {
    await page.goto('/sillas-ergonomicas');
    await wheel(page, wheelBurst(3, 20));
    await page.waitForTimeout(1200);
    expect(await sectionOnScreen(page)).toBe(1);
  });

  test('desde el final de la página, un gesto hacia arriba sube un bloque entero', async ({ page }) => {
    await page.goto('/sillas-ergonomicas');
    await page.evaluate(() => {
      scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' });
    });
    await page.waitForTimeout(300);
    await wheel(page, [[0, -100]]);
    const lastStart = (await sectionStarts(page)).at(-1);
    await expect.poll(() => page.evaluate(() => Math.round(scrollY)), { timeout: 2000 }).toBe(lastStart);
  });

  test('el salto responde al instante: se mueve en el primer décimo de segundo', async ({ page }) => {
    await page.goto('/sillas-ergonomicas');
    await page.mouse.move(400, 400);
    await page.mouse.wheel(0, 100);
    await page.waitForTimeout(100);
    expect(await page.evaluate(() => scrollY)).toBeGreaterThan(200);
  });

  test('un bloque ocupa la pantalla: no asoma el siguiente', async ({ page }) => {
    await page.goto('/sillas-ergonomicas#necesidades');
    // El ancla llega con scroll suave: se espera a que el bloque se asiente.
    await expect
      .poll(() => page.evaluate(() => Math.round(innerHeight - (document.getElementById('necesidades')?.getBoundingClientRect().bottom ?? 0))))
      .toBe(0);
  });
});

test.describe('movimiento reducido', () => {
  test.use({ reducedMotion: 'reduce' });

  test('marquesina y flecha quietas, sin autoplay', async ({ page }) => {
    await page.clock.install();
    await page.goto('/sillas-ergonomicas');
    const animations = await page
      .locator('.marquee__track, .hero__next')
      .evaluateAll((elements) => elements.map((el) => getComputedStyle(el).animationName));
    expect(animations).toEqual(['none', 'none']);
    await page.clock.runFor(15000);
    await expect(page.locator('[data-hero-dot]').nth(0)).toHaveAttribute('aria-pressed', 'true');
  });
});
