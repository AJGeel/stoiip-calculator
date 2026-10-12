import { KM_TO_MI, M_TO_FT, type UnitSystem } from './units';

export type ParamKey = 'len' | 'wid' | 'h' | 'gf' | 'ntg' | 'phi' | 'sw' | 'bo' | 'rf';
export type Values = Record<ParamKey, number>;
export type Spreads = Record<ParamKey, number>;

interface DisplayUnit {
  /** Unit label. */
  u: string;
  /** Multiply the internal value by this to get the display value. */
  f: number;
  /** Decimal places shown in the input. */
  dp: number;
}

export interface ParamDef {
  key: ParamKey;
  label: string;
  /** Shorter label for compact UI (spread chips). */
  short?: string;
  sym: string;
  min: number;
  max: number;
  step?: number;
  /** Logarithmic slider. */
  log?: boolean;
  /** Fraction shown as a percentage. */
  pct?: boolean;
  /** Default Monte Carlo spread, ± percent. */
  spread: number;
  units?: Record<UnitSystem, DisplayUnit>;
}

const lengthUnits: Record<UnitSystem, DisplayUnit> = {
  metric: { u: 'km', f: 1, dp: 2 },
  field: { u: 'mi', f: KM_TO_MI, dp: 2 },
};

export const PARAMS: readonly ParamDef[] = [
  { key: 'len', label: 'Length', sym: 'L', log: true, min: 0.3, max: 80, spread: 10, units: lengthUnits },
  { key: 'wid', label: 'Width', sym: 'W', log: true, min: 0.2, max: 40, spread: 10, units: lengthUnits },
  { key: 'h', label: 'Gross thickness', sym: 'h', min: 2, max: 400, step: 1, spread: 15,
    units: { metric: { u: 'm', f: 1, dp: 0 }, field: { u: 'ft', f: M_TO_FT, dp: 0 } } },
  { key: 'gf', label: 'Geometry factor', sym: 'GF', pct: true, min: 0.2, max: 1, step: 0.01, spread: 10 },
  { key: 'ntg', label: 'Net-to-gross', short: 'Net sand', sym: 'N/G', pct: true, min: 0.05, max: 1, step: 0.01, spread: 15 },
  { key: 'phi', label: 'Porosity', sym: 'φ', pct: true, min: 0.02, max: 0.4, step: 0.005, spread: 12 },
  { key: 'sw', label: 'Water saturation', sym: 'Sw', pct: true, min: 0.05, max: 0.9, step: 0.01, spread: 15 },
  { key: 'bo', label: 'Oil formation volume factor', short: 'Oil', sym: 'Bo', min: 1, max: 2.5, step: 0.01, spread: 5,
    units: { metric: { u: 'rm³/sm³', f: 1, dp: 2 }, field: { u: 'rb/stb', f: 1, dp: 2 } } },
  { key: 'rf', label: 'Recovery factor', sym: 'RF', pct: true, min: 0.05, max: 0.7, step: 0.01, spread: 20 },
];

export interface Preset {
  name: string;
  values: Values;
}

export const PRESETS: readonly Preset[] = [
  { name: 'North Sea sandstone', values: { len: 7.5, wid: 4, h: 80, gf: 0.7, ntg: 0.7, phi: 0.24, sw: 0.25, bo: 1.3, rf: 0.45 } },
  { name: 'Giant carbonate', values: { len: 40, wid: 15, h: 150, gf: 0.6, ntg: 0.85, phi: 0.18, sw: 0.2, bo: 1.4, rf: 0.4 } },
  { name: 'Deepwater turbidite', values: { len: 8, wid: 5, h: 100, gf: 0.7, ntg: 0.75, phi: 0.27, sw: 0.2, bo: 1.5, rf: 0.4 } },
  { name: 'Small onshore', values: { len: 2.5, wid: 1.6, h: 20, gf: 0.8, ntg: 0.6, phi: 0.2, sw: 0.35, bo: 1.1, rf: 0.3 } },
];

export const DEFAULT_SPREADS: Spreads = Object.fromEntries(PARAMS.map(p => [p.key, p.spread])) as Spreads;

// ---------- Display helpers ----------

export function displayFactor(p: ParamDef, units: UnitSystem): number {
  if (p.pct) return 100;
  return p.units ? p.units[units].f : 1;
}

export function displayUnit(p: ParamDef, units: UnitSystem): string {
  if (p.pct) return '%';
  return p.units ? p.units[units].u : '';
}

export function displayDecimals(p: ParamDef, units: UnitSystem): number {
  if (p.pct) return p.key === 'phi' ? 1 : 0;
  return p.units ? p.units[units].dp : 2;
}

export function clampParam(p: ParamDef, value: number): number {
  return Math.min(p.max, Math.max(p.min, value));
}

/** Parses a display-unit string from an input; returns null when it isn't a number. */
export function parseDisplayValue(p: ParamDef, units: UnitSystem, text: string): number | null {
  const n = parseFloat(text.replace(',', '.'));
  if (!Number.isFinite(n)) return null;
  return clampParam(p, n / displayFactor(p, units));
}

// ---------- Slider mapping ----------

export const LOG_SLIDER_STEPS = 1000;

export function sliderRange(p: ParamDef): { min: number; max: number; step: number } {
  return p.log ? { min: 0, max: LOG_SLIDER_STEPS, step: 1 } : { min: p.min, max: p.max, step: p.step ?? 0.01 };
}

export function toSlider(p: ParamDef, value: number): number {
  if (!p.log) return value;
  return Math.round((Math.log(value / p.min) / Math.log(p.max / p.min)) * LOG_SLIDER_STEPS);
}

export function fromSlider(p: ParamDef, position: number): number {
  if (!p.log) return position;
  return p.min * Math.pow(p.max / p.min, position / LOG_SLIDER_STEPS);
}
