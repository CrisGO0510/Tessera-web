import type { CollectionEntry } from 'astro:content';
import { formatRange, formatYears } from './format';

export type ComparableData = Pick<CollectionEntry<'chairs'>['data'], 'userHeight' | 'specs'>;
export type AdjustmentRange = Pick<CollectionEntry<'adjustments'>['data'], 'range' | 'spec'>;

export interface RowDefinition {
  readonly label: string;
  readonly value: (chair: ComparableData) => string;
}

export interface ComparisonRow {
  readonly label: string;
  readonly values: readonly string[];
  /** false si todas las sillas comparadas tienen el mismo valor («igual» en el diseño). */
  readonly differs: boolean;
}

/** Las ocho filas del diseño, derivadas de las specs de cada silla (una sola fuente). */
export function defineRows(locale: string, deliveryHours: number): readonly RowDefinition[] {
  return [
    { label: 'Respaldo', value: (c) => c.specs.backrest },
    { label: 'Altura de asiento', value: (c) => formatRange(c.specs.seatHeight, 'cm', locale) },
    { label: 'Reposabrazos', value: (c) => c.specs.armrests },
    { label: 'Reclinación', value: (c) => `Hasta ${String(c.specs.maxRecline)}°` },
    { label: 'Lumbar', value: (c) => c.specs.lumbar },
    { label: 'Estatura sugerida', value: (c) => formatRange(c.userHeight, 'm', locale) },
    { label: 'Garantía', value: (c) => formatYears(c.specs.warrantyYears) },
    { label: 'Entrega armada', value: (c) => (c.specs.deliveredAssembled ? `Sí, ${String(deliveryHours)} h` : 'No') },
  ];
}

export function deriveRows(chairs: readonly ComparableData[], definitions: readonly RowDefinition[]): ComparisonRow[] {
  return definitions.map((definition) => {
    const values = chairs.map((chair) => definition.value(chair));
    return { label: definition.label, values, differs: new Set(values).size > 1 };
  });
}

/** Rango que muestra la anatomía: su texto propio o el valor de la spec de la silla. */
export function adjustmentRange(adjustment: AdjustmentRange, chair: ComparableData, locale: string): string {
  switch (adjustment.spec) {
    case 'seatHeight':
      return formatRange(chair.specs.seatHeight, 'cm', locale);
    case 'armrests':
      return chair.specs.armrests;
    case 'lumbar':
      return chair.specs.lumbar;
    case 'maxRecline':
      return `Hasta ${String(chair.specs.maxRecline)}°`;
    case undefined:
      if (adjustment.range === undefined) throw new Error('El ajuste necesita `range` o `spec`.');
      return adjustment.range;
  }
}
