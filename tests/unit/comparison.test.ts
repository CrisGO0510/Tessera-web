import { describe, expect, it } from 'vitest';
import { adjustmentRange, defineRows, deriveRows, type ComparableData } from '@/lib/comparison';

function chair(partial: { backrest: string; maxRecline: number; min?: number }): ComparableData {
  return {
    userHeight: { min: partial.min ?? 1.55, max: 1.8 },
    specs: {
      backrest: partial.backrest,
      seatHeight: { min: 42, max: 50 },
      armrests: '4D',
      maxRecline: partial.maxRecline,
      lumbar: 'Ajustable en altura',
      warrantyYears: 5,
      deliveredAssembled: true,
    },
  };
}

describe('deriveRows', () => {
  const rows = deriveRows(
    [chair({ backrest: 'Malla media', maxRecline: 118 }), chair({ backrest: 'Malla alta', maxRecline: 135, min: 1.7 })],
    defineRows('es-MX', 48),
  );

  it('genera las ocho filas del diseño en orden', () => {
    expect(rows.map((r) => r.label)).toEqual([
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
    expect(rows.find((r) => r.label === 'Reclinación')?.values).toEqual(['Hasta 118°', 'Hasta 135°']);
    expect(rows.find((r) => r.label === 'Estatura sugerida')?.values).toEqual(['1.55 – 1.80 m', '1.70 – 1.80 m']);
    expect(rows.find((r) => r.label === 'Entrega armada')?.values).toEqual(['Sí, 48 h', 'Sí, 48 h']);
    expect(rows.find((r) => r.label === 'Garantía')?.values).toEqual(['5 años', '5 años']);
  });

  it('calcula la diferencia en vez de declararla', () => {
    expect(rows.find((r) => r.label === 'Respaldo')?.differs).toBe(true);
    expect(rows.find((r) => r.label === 'Reposabrazos')?.differs).toBe(false);
  });
});

describe('adjustmentRange', () => {
  const duna = chair({ backrest: 'Malla media', maxRecline: 118 });

  it('usa el texto propio del ajuste', () => {
    expect(adjustmentRange({ range: '6 vueltas' }, duna, 'es-MX')).toBe('6 vueltas');
  });

  it('deriva el valor de las specs de la silla (una sola fuente)', () => {
    expect(adjustmentRange({ spec: 'seatHeight' }, duna, 'es-MX')).toBe('42 – 50 cm');
    expect(adjustmentRange({ spec: 'armrests' }, duna, 'es-MX')).toBe('4D');
    expect(adjustmentRange({ spec: 'maxRecline' }, duna, 'es-MX')).toBe('Hasta 118°');
  });
});
