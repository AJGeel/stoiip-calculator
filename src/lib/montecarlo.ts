import { PARAMS, type ParamDef, type Spreads, type Values } from './params';

export type Rng = () => number;

/** Small, fast seeded PRNG so simulations are reproducible in tests. */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Samples a triangular distribution with min a, mode c, max b. */
export function triangular(a: number, c: number, b: number, rng: Rng): number {
  if (b - a < 1e-12) return c;
  const u = rng();
  const f = (c - a) / (b - a);
  return u < f ? a + Math.sqrt(u * (b - a) * (c - a)) : b - Math.sqrt((1 - u) * (b - a) * (b - c));
}

/** Min/max for a parameter given its base value and ± spread percent, respecting physical limits. */
export function sampleBounds(p: ParamDef, base: number, spreadPct: number): [number, number] {
  const d = spreadPct / 100;
  let lo = base * (1 - d);
  let hi = base * (1 + d);
  if (p.pct) {
    lo = Math.max(0, lo);
    hi = Math.min(1, hi);
  }
  if (p.key === 'bo') lo = Math.max(1, lo);
  return [lo, Math.max(lo, hi)];
}

/** Value at cumulative probability q of an ascending-sorted array. */
export function quantile(sorted: ArrayLike<number>, q: number): number {
  const i = Math.min(sorted.length - 1, Math.max(0, Math.floor(q * sorted.length)));
  return sorted[i] ?? NaN;
}

export interface MonteCarloResult {
  /** Ascending STOIIP samples, Sm³. */
  sorted: Float64Array;
  /** Exceedance convention: P90 is exceeded with 90% probability (the low case). */
  p90: number;
  p50: number;
  p10: number;
  recP90: number;
  recP50: number;
  recP10: number;
  mean: number;
}

export function runMonteCarlo(values: Values, spreads: Spreads, n: number, rng: Rng): MonteCarloResult {
  const stoiip = new Float64Array(n);
  const rec = new Float64Array(n);
  const bounds = PARAMS.map(p => [p.key, ...sampleBounds(p, values[p.key], spreads[p.key])] as const);
  const s = { ...values };

  for (let i = 0; i < n; i++) {
    for (const [key, lo, hi] of bounds) s[key] = triangular(lo, values[key], hi, rng);
    const st = (s.len * s.wid * 1e6 * s.h * s.gf * s.ntg * s.phi * (1 - s.sw)) / s.bo;
    stoiip[i] = st;
    rec[i] = st * s.rf;
  }

  let sum = 0;
  for (const x of stoiip) sum += x;
  const sorted = stoiip.slice().sort();
  const sortedRec = rec.sort();
  return {
    sorted,
    p90: quantile(sorted, 0.1),
    p50: quantile(sorted, 0.5),
    p10: quantile(sorted, 0.9),
    recP90: quantile(sortedRec, 0.1),
    recP50: quantile(sortedRec, 0.5),
    recP10: quantile(sortedRec, 0.9),
    mean: n ? sum / n : NaN,
  };
}

export interface Histogram {
  lo: number;
  hi: number;
  binWidth: number;
  counts: number[];
}

/**
 * Bins already-transformed sample values between the 0.5th and 99.5th percentile,
 * so extreme tails don't squash the plot.
 */
export function buildHistogram(sortedValues: ArrayLike<number>, bins: number): Histogram {
  const lo = quantile(sortedValues, 0.005);
  const hi = quantile(sortedValues, 0.995);
  const binWidth = (hi - lo) / bins || 1;
  const counts = new Array<number>(bins).fill(0);
  for (let i = 0; i < sortedValues.length; i++) {
    const b = Math.floor((sortedValues[i]! - lo) / binWidth);
    if (b >= 0 && b < bins) counts[b]!++;
    else if (b === bins && sortedValues[i] === hi) counts[bins - 1]!++;
  }
  return { lo, hi, binWidth, counts };
}
