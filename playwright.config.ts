import { defineConfig, devices } from '@playwright/test';

const enCi = process.env.CI !== undefined;
// Puerto propio: en el 4321 suele estar `astro dev`, y reutilizarlo probaría el servidor de
// desarrollo (con su barra de herramientas, que añade <h1>) en vez del build.
const PORT = 4322;

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: enCi,
  retries: enCi ? 1 : 0,
  reporter: enCi ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${String(PORT)}`,
    trace: 'on-first-retry',
  },
  // Sirve el build ya generado (npm run build antes). `astro preview` no aplica
  // public/_redirects: la 301 de «/» se comprueba a mano contra el hosting.
  webServer: {
    command: `npx astro preview --port ${String(PORT)} --ignore-lock`,
    url: `http://localhost:${String(PORT)}/sillas-ergonomicas`,
    reuseExistingServer: !enCi,
  },
  projects: [
    { name: 'escritorio', use: { ...devices['Desktop Chrome'] } },
    // Pixel 7 a 375 px: el ancho de referencia de la spec (§8.1, §15).
    { name: 'movil', use: { ...devices['Pixel 7'], viewport: { width: 375, height: 812 } } },
  ],
});
