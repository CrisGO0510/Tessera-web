/** Cómo llena una foto su marco cuando las proporciones no coinciden. */
export type Fit = 'contain' | 'cover';

export interface Focus {
  /** % desde la izquierda. */
  readonly x: number;
  /** % desde arriba. */
  readonly y: number;
}

export interface Framing {
  readonly fit: Fit;
  readonly focus: Focus;
}

/**
 * Estilo del <img> dentro de un marco de proporción fija. Las fotos se generan con su
 * proporción original (nunca se recortan en el build): el marco lo pone el CSS y `fit`
 * decide si se ve la foto entera (`contain`) o llena el marco (`cover`) con el punto de
 * `focus` siempre a la vista.
 */
export function framingStyle({ fit, focus }: Framing): string {
  return `object-fit: ${fit}; object-position: ${String(focus.x)}% ${String(focus.y)}%`;
}
