import { describe, expect, it } from 'vitest';
import { buildCascade } from './cascade';
import { fmt, niceTicks } from './format';
import { PRESETS } from './params';
import { SECTION, bandPath, owcY, topY } from './section';
import { computeVolumes } from './stoiip';
import { M3_TO_BBL, toDisplayVolume, volumeUnit } from './units';

describe('units', () => {
  it('converts m³ to millions of barrels or cubic metres', () => {
    expect(toDisplayVolume(1e6, 'metric')).toBe(1);
    expect(toDisplayVolume(1e6, 'field')).toBeCloseTo(M3_TO_BBL);
  });

  it('labels reservoir and stock-tank volumes', () => {
    expect(volumeUnit('stockTank', 'field')).toBe('MMSTB');
    expect(volumeUnit('reservoir', 'field')).toBe('MMrb');
    expect(volumeUnit('stockTank', 'metric')).toBe('10⁶ Sm³');
  });
});

describe('fmt', () => {
  it('chooses decimals by magnitude', () => {
    expect(fmt(1234.56)).toBe('1,235');
    expect(fmt(123.456)).toBe('123.5');
    expect(fmt(1.2345)).toBe('1.23');
  });

  it('respects explicit decimals and handles non-finite numbers', () => {
    expect(fmt(3.14159, 3)).toBe('3.142');
    expect(fmt(NaN)).toBe('—');
    expect(fmt(Infinity)).toBe('—');
  });
});

describe('niceTicks', () => {
  it('returns round steps inside the range', () => {
    expect(niceTicks(0, 100, 5)).toEqual([0, 20, 40, 60, 80, 100]);
    expect(niceTicks(812, 1230, 6)).toEqual([900, 1000, 1100, 1200]);
  });

  it('never exceeds the requested count by much', () => {
    for (const [lo, hi] of [[0, 1], [3, 97], [800, 1250], [0.01, 0.07]] as const) {
      const ticks = niceTicks(lo, hi, 5);
      expect(ticks.length).toBeGreaterThan(0);
      expect(ticks.length).toBeLessThanOrEqual(6);
      for (const t of ticks) {
        expect(t).toBeGreaterThanOrEqual(lo);
        expect(t).toBeLessThanOrEqual(hi + 1e-9);
      }
    }
  });

  it('returns nothing for an empty range', () => {
    expect(niceTicks(5, 5, 5)).toEqual([]);
  });
});

describe('buildCascade', () => {
  const v = PRESETS[0]!.values;
  const steps = buildCascade(computeVolumes(v), v);

  it('runs from GRV (100%) down to STOIIP', () => {
    expect(steps[0]!.pctOfGrv).toBe(100);
    expect(steps.at(-1)!.name).toBe('STOIIP');
    expect(steps.at(-1)!.final).toBe(true);
    expect(steps.at(-1)!.kind).toBe('stockTank');
  });

  it('never increases from one step to the next', () => {
    for (let i = 1; i < steps.length; i++) expect(steps[i]!.value).toBeLessThanOrEqual(steps[i - 1]!.value);
  });

  it('describes each operation with the current inputs', () => {
    expect(steps[3]!.op).toBe('× 24.0% porosity');
    expect(steps[5]!.op).toBe('÷ 1.30 shrinkage to surface');
  });
});

describe('section geometry', () => {
  it('peaks at the crest and falls toward the flanks', () => {
    expect(topY(SECTION.crestX)).toBeCloseTo(SECTION.crestY);
    expect(topY(0)).toBeGreaterThan(topY(200));
    expect(topY(0)).toBeCloseTo(topY(SECTION.crestX * 2));
  });

  it('moves the OWC deeper as oil saturation rises, clamped to [0, 1]', () => {
    expect(owcY(0.8)).toBeGreaterThan(owcY(0.4));
    expect(owcY(-1)).toBe(owcY(0));
    expect(owcY(2)).toBe(owcY(1));
    expect(owcY(1)).toBeLessThan(SECTION.flankY);
  });

  it('builds a closed SVG path', () => {
    const d = bandPath(0, 42);
    expect(d.startsWith('M')).toBe(true);
    expect(d.endsWith('Z')).toBe(true);
  });
});
