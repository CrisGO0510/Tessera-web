import { describe, expect, it } from 'vitest';
import { capitalize, formatRange, formatYears, numberToWords } from '@/lib/format';

describe('formatRange', () => {
  it('metros con dos decimales y punto en es-MX', () => {
    expect(formatRange({ min: 1.55, max: 1.8 }, 'm', 'es-MX')).toBe('1.55 – 1.80 m');
  });

  it('metros con coma decimal en es-CO', () => {
    expect(formatRange({ min: 1.55, max: 1.8 }, 'm', 'es-CO')).toBe('1,55 – 1,80 m');
  });

  it('centímetros sin decimales', () => {
    expect(formatRange({ min: 42, max: 50 }, 'cm', 'es-MX')).toBe('42 – 50 cm');
  });
});

describe('formatYears', () => {
  it('singular y plural', () => {
    expect(formatYears(1)).toBe('1 año');
    expect(formatYears(5)).toBe('5 años');
  });
});

describe('numberToWords', () => {
  it.each([
    [1, 'uno'],
    [3, 'tres'],
    [12, 'doce'],
    [16, 'dieciséis'],
    [21, 'veintiuno'],
    [30, 'treinta'],
    [45, 'cuarenta y cinco'],
    [99, 'noventa y nueve'],
  ])('%i → %s', (n, expected) => {
    expect(numberToWords(n)).toBe(expected);
  });

  it('femenino para «sillas»', () => {
    expect(numberToWords(1, 'feminine')).toBe('una');
    expect(numberToWords(21, 'feminine')).toBe('veintiuna');
    expect(numberToWords(31, 'feminine')).toBe('treinta y una');
    expect(numberToWords(12, 'feminine')).toBe('doce');
  });

  it('antepuesto a un sustantivo masculino («un modelo», «veintiún ajustes»)', () => {
    expect(numberToWords(1, 'apocopated')).toBe('un');
    expect(numberToWords(21, 'apocopated')).toBe('veintiún');
    expect(numberToWords(31, 'apocopated')).toBe('treinta y un');
    expect(numberToWords(12, 'apocopated')).toBe('doce');
  });

  it('rechaza valores fuera de 1–99', () => {
    expect(() => numberToWords(0)).toThrow();
    expect(() => numberToWords(100)).toThrow();
    expect(() => numberToWords(2.5)).toThrow();
  });
});

describe('capitalize', () => {
  it('sube la primera letra', () => {
    expect(capitalize('tres')).toBe('Tres');
  });
});
