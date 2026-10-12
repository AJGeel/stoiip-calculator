import { describe, expect, it } from 'vitest';
import { buildHistogram, mulberry32, quantile, runMonteCarlo, sampleBounds, triangular } from './montecarlo';
import { DEFAULT_SPREADS, PARAMS, PRESETS, type Spreads } from './params';
import { computeVolumes } from './stoiip';

const param = (key: string) => PARAMS.find(p => p.key === key)!;
const values = PRESETS[0]!.values;
const zeroSpreads = Object.fromEntries(PARAMS.map(p => [p.key, 0])) as Spreads;

describe('mulberry32', () => {
  it('is deterministic for a given seed', () => {
    const a = mulberry32(42), b = mulberry32(42);
    for (let i = 0; i < 5; i++) expect(a()).toBe(b());
  });

  it('produces values in [0, 1)', () => {
    const rng = mulberry32(1);
    for (let i = 0; i < 10_000; i++) {
      const x = rng();
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });
});

describe('triangular', () => {
  it('stays within bounds and averages (a + b + c) / 3', () => {
    const rng = mulberry32(7);
    let sum = 0;
    const n = 50_000;
    for (let i = 0; i < n; i++) {
      const x = triangular(2, 3, 10, rng);
      expect(x).toBeGreaterThanOrEqual(2);
      expect(x).toBeLessThanOrEqual(10);
      sum += x;
    }
    expect(sum / n).toBeCloseTo(5, 1);
  });

  it('returns the mode for a degenerate distribution', () => {
    expect(triangular(4, 4, 4, mulberry32(1))).toBe(4);
  });

  it('maps u = 0 and u → 1 to the ends', () => {
    expect(triangular(0, 1, 2, () => 0)).toBe(0);
    expect(triangular(0, 1, 2, () => 1 - 1e-12)).toBeCloseTo(2, 4);
  });
});

describe('sampleBounds', () => {
  it('applies a symmetric ± percent spread', () => {
    const [lo, hi] = sampleBounds(param('h'), 100, 10);
    expect(lo).toBeCloseTo(90);
    expect(hi).toBeCloseTo(110);
  });

  it('keeps fractions inside [0, 1]', () => {
    const [lo, hi] = sampleBounds(param('ntg'), 0.95, 20);
    expect(lo).toBeCloseTo(0.76);
    expect(hi).toBe(1);
  });

  it('never lets Bo drop below 1', () => {
    expect(sampleBounds(param('bo'), 1.05, 20)[0]).toBe(1);
  });
});

describe('quantile', () => {
  it('picks values from a sorted array', () => {
    const a = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    expect(quantile(a, 0)).toBe(1);
    expect(quantile(a, 0.5)).toBe(6);
    expect(quantile(a, 1)).toBe(10);
  });

  it('returns NaN for an empty array', () => {
    expect(quantile([], 0.5)).toBeNaN();
  });
});

describe('runMonteCarlo', () => {
  it('collapses to the deterministic answer with zero spread', () => {
    const r = runMonteCarlo(values, zeroSpreads, 100, mulberry32(1));
    const exact = computeVolumes(values);
    expect(r.p90).toBeCloseTo(exact.stoiip, -2);
    expect(r.p50).toBeCloseTo(exact.stoiip, -2);
    expect(r.p10).toBeCloseTo(exact.stoiip, -2);
    expect(r.recP50).toBeCloseTo(exact.recoverable, -2);
  });

  it('orders P90 ≤ P50 ≤ P10 (exceedance convention)', () => {
    const r = runMonteCarlo(values, DEFAULT_SPREADS, 5000, mulberry32(3));
    expect(r.p90).toBeLessThan(r.p50);
    expect(r.p50).toBeLessThan(r.p10);
    expect(r.recP90).toBeLessThan(r.recP10);
  });

  it('centres the P50 near the deterministic value for symmetric spreads', () => {
    const r = runMonteCarlo(values, DEFAULT_SPREADS, 20_000, mulberry32(5));
    const exact = computeVolumes(values).stoiip;
    expect(Math.abs(r.p50 - exact) / exact).toBeLessThan(0.05);
  });

  it('is reproducible with the same seed', () => {
    const a = runMonteCarlo(values, DEFAULT_SPREADS, 1000, mulberry32(9));
    const b = runMonteCarlo(values, DEFAULT_SPREADS, 1000, mulberry32(9));
    expect(a.p50).toBe(b.p50);
  });

  it('returns sorted samples of the requested size', () => {
    const r = runMonteCarlo(values, DEFAULT_SPREADS, 500, mulberry32(2));
    expect(r.sorted).toHaveLength(500);
    for (let i = 1; i < r.sorted.length; i++) expect(r.sorted[i]!).toBeGreaterThanOrEqual(r.sorted[i - 1]!);
  });

  it('widens the P90–P10 range as spread grows', () => {
    const half = Object.fromEntries(PARAMS.map(p => [p.key, p.spread / 2])) as Spreads;
    const narrow = runMonteCarlo(values, half, 5000, mulberry32(4));
    const wide = runMonteCarlo(values, DEFAULT_SPREADS, 5000, mulberry32(4));
    expect(wide.p10 - wide.p90).toBeGreaterThan(narrow.p10 - narrow.p90);
  });
});

describe('buildHistogram', () => {
  it('bins samples and keeps (almost) all of them', () => {
    const samples = Float64Array.from({ length: 1000 }, (_, i) => i);
    const h = buildHistogram(samples, 10);
    expect(h.counts).toHaveLength(10);
    const total = h.counts.reduce((a, b) => a + b, 0);
    // Only the outer 0.5% tails are trimmed.
    expect(total).toBeGreaterThanOrEqual(985);
    expect(h.lo).toBe(5);
    expect(h.hi).toBe(995);
  });

  it('handles identical samples without dividing by zero', () => {
    const h = buildHistogram(new Float64Array(50).fill(3), 8);
    expect(h.binWidth).toBe(1);
    expect(h.counts.reduce((a, b) => a + b, 0)).toBe(50);
  });
});
