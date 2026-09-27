import { prefersReducedMotion } from '@/lib/dom';

/** Media query en la que la landing va por pantallas completas (espejo de `full-screen` en _mixins.scss). */
export const FULL_SCREEN_QUERY = '(width >= 900px) and (height >= 640px)';

/** Duración de un salto entre bloques. */
export const JUMP_DURATION = 420;

/** Sin eventos de rueda durante este tiempo, el siguiente abre un gesto nuevo. */
export const GESTURE_GAP = 150;

/**
 * Lo que llega en los primeros ms de un salto es el mismo gesto que lo provocó (las muescas
 * de un golpe de rueda, la subida de un deslizamiento de trackpad): no encadena otro salto.
 */
export const SAME_GESTURE_WINDOW = 200;

/** Un delta este factor mayor que la media reciente es un deslizamiento nuevo, no inercia. */
const ACCELERATION_FACTOR = 1.4;

/** Delta a partir del cual un evento suelto es una muesca de rueda de ratón. */
const WHEEL_NOTCH = 50;

/** Margen para redondeos subpíxel del scroll. */
const TOLERANCE = 2;

/** Posición de un bloque en coordenadas del documento. */
export interface Section {
  readonly top: number;
  readonly bottom: number;
}

export interface Viewport {
  readonly scrollY: number;
  readonly height: number;
  /** Lo que tapa el header sticky (el `scroll-padding-top`). */
  readonly headerHeight: number;
  /** `scrollY` máximo: el final de la página. */
  readonly maxScroll: number;
}

export interface WheelSample {
  /** `performance.now()` del evento. */
  readonly time: number;
  readonly delta: number;
}

/**
 * ¿Este evento de rueda es intención nueva o la cola de un gesto ya atendido?
 * - Tras una pausa ({@link GESTURE_GAP}), siempre es un gesto nuevo.
 * - La inercia de un trackpad llega cada ~16 ms con deltas que decaen: no es intención.
 * - Un delta que vuelve a crecer sobre la media reciente es un deslizamiento nuevo.
 * - Una rueda de ratón que sigue girando manda muescas iguales: cada una es intención.
 */
export function isNewImpulse(sample: WheelSample, history: readonly WheelSample[]): boolean {
  const previous = history.at(-1);
  if (previous === undefined || sample.time - previous.time > GESTURE_GAP) return true;
  const magnitude = Math.abs(sample.delta);
  const recent = history.slice(-4);
  const average = recent.reduce((sum, item) => sum + Math.abs(item.delta), 0) / recent.length;
  if (magnitude > average * ACCELERATION_FACTOR) return true;
  return magnitude >= WHEEL_NOTCH && magnitude >= Math.abs(previous.delta);
}

/** easeOutCubic: arranca rápido para que el salto se note desde el primer frame. */
export function easeOutCubic(progress: number): number {
  return 1 - (1 - progress) ** 3;
}

/** Bloque que ocupa ahora la parte de arriba de la zona visible (bajo el header). */
export function currentSection(sections: readonly Section[], viewport: Viewport): number {
  // En el fondo, la pantalla es la del último bloque aunque empiece más abajo que el header
  // (el footer se ancla por abajo): si no, subir sería scroll libre dentro del anterior.
  if (viewport.scrollY >= viewport.maxScroll - TOLERANCE) return sections.length - 1;
  const line = viewport.scrollY + viewport.headerHeight + TOLERANCE;
  let current = 0;
  sections.forEach((section, i) => {
    if (section.top <= line) current = i;
  });
  return current;
}

/**
 * A qué bloque saltar con un gesto de rueda en `direction` (1 abajo, -1 arriba), o `null`
 * si la rueda debe hacer scroll normal: el bloque actual mide más que la pantalla y aún
 * queda contenido suyo por ver en esa dirección, o no hay bloque más allá.
 */
export function wheelTarget(sections: readonly Section[], viewport: Viewport, direction: 1 | -1): number | null {
  const index = currentSection(sections, viewport);
  const current = sections[index];
  if (current === undefined) return null;
  const visibleTop = viewport.scrollY + viewport.headerHeight;
  const visibleBottom = viewport.scrollY + viewport.height;

  if (direction === 1 && current.bottom > visibleBottom + TOLERANCE) return null;
  if (direction === -1 && current.top < visibleTop - TOLERANCE) return null;

  const target = index + direction;
  return target >= 0 && target < sections.length ? target : null;
}

/** ¿Hay un elemento con scroll vertical propio entre el destino del evento y la página? */
function insideOwnScroller(target: EventTarget | null, direction: 1 | -1): boolean {
  for (let el = target instanceof Element ? target : null; el !== null && el !== document.documentElement; el = el.parentElement) {
    const { overflowY } = getComputedStyle(el);
    if ((overflowY === 'auto' || overflowY === 'scroll') && el.scrollHeight > el.clientHeight) {
      const atEdge = direction === 1 ? el.scrollTop + el.clientHeight >= el.scrollHeight - 1 : el.scrollTop <= 0;
      if (!atEdge) return true;
    }
  }
  return false;
}

/**
 * Rueda por pantallas en la landing. Con `scroll-snap-type: y mandatory`, Chromium devuelve
 * al inicio del bloque un paso de rueda corto (≈100 px): el scroll parece atascado. Aquí cada
 * gesto de rueda salta al bloque siguiente o anterior entero:
 * - La inercia del trackpad se descarta ({@link isNewImpulse}); un gesto nuevo durante un salto
 *   se encola y se encadena al terminar, así que girar rápido avanza varios bloques seguidos.
 * - El salto es una animación propia (easeOutCubic, {@link JUMP_DURATION}) con el snap
 *   desactivado mientras dura: el scroll suave nativo arranca lento y no deja encadenar.
 * Teclado, táctil y barra de scroll siguen en manos del navegador y cancelan el salto.
 */
export function initSnapSections(): () => void {
  const query = window.matchMedia(FULL_SCREEN_QUERY);
  const root = document.documentElement;
  const history: WheelSample[] = [];
  let frame: number | undefined;
  let lastJumpAt = -Infinity;
  let queued: 1 | -1 | null = null;

  const sectionElements = (): HTMLElement[] =>
    Array.from(document.querySelectorAll<HTMLElement>('main > section, body > footer'));

  const measure = (): { sections: Section[]; viewport: Viewport } => {
    const y = window.scrollY;
    const sections = sectionElements().map((el) => {
      const box = el.getBoundingClientRect();
      return { top: box.top + y, bottom: box.bottom + y };
    });
    const headerHeight = parseFloat(getComputedStyle(root).scrollPaddingTop) || 0;
    return { sections, viewport: { scrollY: y, height: window.innerHeight, headerHeight, maxScroll: root.scrollHeight - window.innerHeight } };
  };

  /** Fin (o corte) de un salto: el snap vuelve y ancla en el bloque donde se quedó. */
  const release = (): void => {
    if (frame !== undefined) cancelAnimationFrame(frame);
    frame = undefined;
    root.style.removeProperty('scroll-snap-type');
  };

  const cancel = (): void => {
    if (frame === undefined) return;
    queued = null;
    release();
  };

  const jump = (direction: 1 | -1): void => {
    const { sections, viewport } = measure();
    const target = wheelTarget(sections, viewport, direction);
    const section = target === null ? undefined : sections[target];
    if (target === null || section === undefined) return;
    // El footer se ancla por abajo (ver global.scss): se baja hasta el final de la página.
    const to = target === sections.length - 1 ? viewport.maxScroll : section.top - viewport.headerHeight;
    const from = viewport.scrollY;
    lastJumpAt = performance.now();

    if (prefersReducedMotion()) {
      window.scrollTo({ top: to, behavior: 'instant' });
      return;
    }
    // Sin snap mientras dura: con `mandatory`, cada paso intermedio volvería al bloque de origen.
    root.style.setProperty('scroll-snap-type', 'none');
    const step = (now: number): void => {
      const progress = Math.min(1, (now - lastJumpAt) / JUMP_DURATION);
      // `instant`: el `scroll-behavior: smooth` del html convertiría cada paso en otra animación.
      window.scrollTo({ top: from + (to - from) * easeOutCubic(progress), behavior: 'instant' });
      if (progress < 1) {
        frame = requestAnimationFrame(step);
        return;
      }
      release();
      const next = queued;
      queued = null;
      if (next !== null) jump(next);
    };
    frame = requestAnimationFrame(step);
  };

  const onWheel = (event: WheelEvent): void => {
    if (!query.matches || event.ctrlKey || event.deltaY === 0) return;
    if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
    const direction = event.deltaY > 0 ? 1 : -1;
    if (insideOwnScroller(event.target, direction)) return;

    const sample = { time: performance.now(), delta: event.deltaY };
    const impulse = isNewImpulse(sample, history);
    history.push(sample);
    if (history.length > 8) history.shift();

    const sinceJump = sample.time - lastJumpAt;
    if (frame !== undefined || sinceJump < SAME_GESTURE_WINDOW) {
      event.preventDefault();
      // Un gesto nuevo a mitad de salto se encadena al terminar (girar rápido = varios bloques).
      if (impulse && sinceJump >= SAME_GESTURE_WINDOW) queued = direction;
      return;
    }

    const { sections, viewport } = measure();
    // Bloque más alto que la pantalla con contenido por ver, o un extremo: scroll nativo.
    if (wheelTarget(sections, viewport, direction) === null) return;
    event.preventDefault();
    // La cola de inercia de un gesto ya atendido no mueve nada.
    if (impulse) jump(direction);
  };

  const cancelEvents = ['keydown', 'pointerdown', 'touchstart'] as const;
  window.addEventListener('wheel', onWheel, { passive: false });
  for (const type of cancelEvents) window.addEventListener(type, cancel, { passive: true });
  return () => {
    cancel();
    window.removeEventListener('wheel', onWheel);
    for (const type of cancelEvents) window.removeEventListener(type, cancel);
  };
}
