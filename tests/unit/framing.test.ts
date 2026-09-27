import { describe, expect, it } from 'vitest';
import { framingStyle } from '@/lib/framing';

describe('framingStyle', () => {
  it('contain muestra la foto entera centrada en su foco', () => {
    expect(framingStyle({ fit: 'contain', focus: { x: 50, y: 50 } })).toBe('object-fit: contain; object-position: 50% 50%');
  });

  it('cover llena el marco sin perder el foco', () => {
    expect(framingStyle({ fit: 'cover', focus: { x: 40, y: 20 } })).toBe('object-fit: cover; object-position: 40% 20%');
  });
});
