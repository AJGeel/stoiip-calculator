// Unit conversions. Internally all lengths are km/m, volumes m³, fractions 0–1.

export type UnitSystem = 'field' | 'metric';
export type VolumeKind = 'reservoir' | 'stockTank';

export const M3_TO_BBL = 6.28981;
export const KM2_TO_ACRE = 247.105;
export const M_TO_FT = 3.28084;
export const KM_TO_MI = 0.621371;
export const ACRE_FT_TO_M3 = 1233.48;
/** Barrels per acre-foot — the constant in the field-unit STOIIP formula. */
export const BBL_PER_ACRE_FT = 7758;

/** Converts m³ to the display system, scaled to millions (MMbbl or 10⁶ m³). */
export function toDisplayVolume(m3: number, units: UnitSystem): number {
  return (units === 'field' ? m3 * M3_TO_BBL : m3) / 1e6;
}

export function volumeUnit(kind: VolumeKind, units: UnitSystem): string {
  if (units === 'field') return kind === 'stockTank' ? 'MMSTB' : 'MMrb';
  return kind === 'stockTank' ? '10⁶ Sm³' : '10⁶ rm³';
}
