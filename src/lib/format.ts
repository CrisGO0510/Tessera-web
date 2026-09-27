import type { CollectionEntry } from 'astro:content';

export type Range = CollectionEntry<'chairs'>['data']['userHeight'];

const EN_DASH = '–';

/** «1.55 – 1.80 m» / «42 – 50 cm», con el separador decimal del mercado. */
export function formatRange(range: Range, unit: 'm' | 'cm', locale: string): string {
  const decimals = unit === 'm' ? 2 : 0;
  const formatter = new Intl.NumberFormat(locale, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  return `${formatter.format(range.min)} ${EN_DASH} ${formatter.format(range.max)} ${unit}`;
}

export function formatYears(years: number): string {
  return years === 1 ? '1 año' : `${String(years)} años`;
}

// Las palabras son texto de la página (español): solo los nombres del código van en inglés.
const UNITS = ['', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve'] as const;
const TEN_TO_TWENTY_NINE = [
  'diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve',
  'veinte', 'veintiuno', 'veintidós', 'veintitrés', 'veinticuatro', 'veinticinco', 'veintiséis', 'veintisiete',
  'veintiocho', 'veintinueve',
] as const;
const TENS = ['', '', '', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'] as const;

/**
 * 1–99 en letras: «Tres de las doce sillas». `feminine` da «una», «veintiuna»; `apocopated`
 * es el masculino delante del sustantivo: «un modelo», «veintiún ajustes».
 */
export function numberToWords(n: number, gender: 'masculine' | 'feminine' | 'apocopated' = 'masculine'): string {
  if (!Number.isInteger(n) || n < 1 || n > 99) {
    throw new Error(`numberToWords solo admite enteros de 1 a 99: ${String(n)}`);
  }
  const word = n < 10 ? UNITS[n] : n < 30 ? TEN_TO_TWENTY_NINE[n - 10] : composeTens(Math.floor(n / 10), n % 10);
  if (word === undefined) {
    throw new Error(`Sin palabra para ${String(n)}`);
  }
  if (gender === 'feminine') return word.replace(/uno$/, 'una');
  if (gender === 'apocopated') return word.replace(/^veintiuno$/, 'veintiún').replace(/uno$/, 'un');
  return word;
}

function composeTens(tens: number, unit: number): string | undefined {
  const base = TENS[tens];
  if (base === undefined) return undefined;
  return unit === 0 ? base : `${base} y ${UNITS[unit] ?? ''}`;
}

export function capitalize(text: string): string {
  return text.charAt(0).toLocaleUpperCase('es') + text.slice(1);
}
