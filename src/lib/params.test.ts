import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SPREADS, PARAMS, PRESETS, clampParam, displayDecimals, displayFactor, displayUnit, fromSlider,
  parseDisplayValue, sliderRange, toSlider, type ParamDef,
} from './params';
import { KM_TO_MI } from './units';

const param = (key: string): ParamDef => PARAMS.find(p => p.key === key)!;

describe('param definitions', () => {
  it('has unique keys and sane ranges', () => {
    expect(new Set(PARAMS.map(p => p.key)).size).toBe(PARAMS.length);
    for (const p of PARAMS) {
      expect(p.min).toBeLessThan(p.max);
      if (p.pct) expect(p.max).toBeLessThanOrEqual(1);
    }
  });

  it('every preset sets every parameter within its range', () => {
    for (const preset of PRESETS) {
      for (const p of PARAMS) {
        const v = preset.values[p.key];
        expect(v, `${preset.name}.${p.key}`).toBeGreaterThanOrEqual(p.min);
        expect(v, `${preset.name}.${p.key}`).toBeLessThanOrEqual(p.max);
      }
    }
  });

  it('default spreads come from the param definitions', () => {
    for (const p of PARAMS) expect(DEFAULT_SPREADS[p.key]).toBe(p.spread);
  });
});

describe('display helpers', () => {
  it('shows fractions as percentages', () => {
    expect(displayFactor(param('phi'), 'field')).toBe(100);
    expect(displayUnit(param('phi'), 'metric')).toBe('%');
    expect(displayDecimals(param('phi'), 'metric')).toBe(1);
    expect(displayDecimals(param('sw'), 'metric')).toBe(0);
  });

  it('switches length units with the unit system', () => {
    expect(displayUnit(param('len'), 'metric')).toBe('km');
    expect(displayUnit(param('len'), 'field')).toBe('mi');
    expect(displayFactor(param('len'), 'field')).toBe(KM_TO_MI);
    expect(displayUnit(param('h'), 'field')).toBe('ft');
  });
});

describe('parseDisplayValue', () => {
  it('converts display units back to internal units', () => {
    expect(parseDisplayValue(param('phi'), 'field', '25')).toBeCloseTo(0.25);
    expect(parseDisplayValue(param('len'), 'field', '1')).toBeCloseTo(1 / KM_TO_MI);
    expect(parseDisplayValue(param('len'), 'metric', '12.5')).toBe(12.5);
  });

  it('accepts a decimal comma', () => {
    expect(parseDisplayValue(param('bo'), 'metric', '1,35')).toBeCloseTo(1.35);
  });

  it('clamps to the allowed range', () => {
    expect(parseDisplayValue(param('phi'), 'metric', '90')).toBe(param('phi').max);
    expect(parseDisplayValue(param('bo'), 'metric', '0.5')).toBe(1);
  });

  it('returns null for non-numbers', () => {
    expect(parseDisplayValue(param('h'), 'metric', 'abc')).toBeNull();
    expect(parseDisplayValue(param('h'), 'metric', '')).toBeNull();
  });
});

describe('clampParam', () => {
  it('limits values to [min, max]', () => {
    const p = param('sw');
    expect(clampParam(p, -1)).toBe(p.min);
    expect(clampParam(p, 2)).toBe(p.max);
    expect(clampParam(p, 0.3)).toBe(0.3);
  });
});

describe('slider mapping', () => {
  it('is the identity for linear params', () => {
    const p = param('h');
    expect(sliderRange(p)).toEqual({ min: p.min, max: p.max, step: p.step });
    expect(toSlider(p, 120)).toBe(120);
    expect(fromSlider(p, 120)).toBe(120);
  });

  it('maps log params onto 0…1000 and back', () => {
    const p = param('len');
    expect(sliderRange(p)).toEqual({ min: 0, max: 1000, step: 1 });
    expect(toSlider(p, p.min)).toBe(0);
    expect(toSlider(p, p.max)).toBe(1000);
    expect(fromSlider(p, 0)).toBeCloseTo(p.min);
    expect(fromSlider(p, 1000)).toBeCloseTo(p.max);
    // Geometric midpoint sits at the middle of the slider.
    expect(toSlider(p, Math.sqrt(p.min * p.max))).toBe(500);
  });

  it('round-trips log values to within one slider step', () => {
    const p = param('wid');
    for (const v of [0.3, 1, 4, 17, 39]) {
      expect(fromSlider(p, toSlider(p, v)) / v).toBeCloseTo(1, 1);
    }
  });
});
