import { describe, expect, it } from 'vitest';
import { PRESETS, type Values } from './params';
import { areaKm2, computeVolumes } from './stoiip';
import { BBL_PER_ACRE_FT, KM2_TO_ACRE, M3_TO_BBL, M_TO_FT } from './units';

const base: Values = { len: 5, wid: 2, h: 50, gf: 0.8, ntg: 0.6, phi: 0.2, sw: 0.3, bo: 1.2, rf: 0.4 };

describe('areaKm2', () => {
  it('multiplies length by width', () => {
    expect(areaKm2({ len: 7.5, wid: 4 })).toBe(30);
  });
});

describe('computeVolumes', () => {
  it('computes every step of the volumetric chain', () => {
    const r = computeVolumes(base);
    expect(r.grv).toBeCloseTo(10e6 * 50); // 10 km² × 50 m
    expect(r.bulk).toBeCloseTo(r.grv * 0.8);
    expect(r.net).toBeCloseTo(r.bulk * 0.6);
    expect(r.pv).toBeCloseTo(r.net * 0.2);
    expect(r.hcpv).toBeCloseTo(r.pv * 0.7);
    expect(r.stoiip).toBeCloseTo(r.hcpv / 1.2);
    expect(r.recoverable).toBeCloseTo(r.stoiip * 0.4);
  });

  it('matches a hand calculation', () => {
    // 1e7 m² × 50 m × 0.8 × 0.6 × 0.2 × 0.7 / 1.2 = 28,000,000 Sm³
    expect(computeVolumes(base).stoiip).toBeCloseTo(28e6, 0);
  });

  it('agrees with the field-unit formula 7758 · A · h · … / Bo', () => {
    for (const { values: v } of PRESETS) {
      const acres = areaKm2(v) * KM2_TO_ACRE;
      const ft = v.h * M_TO_FT;
      const fieldStb = (BBL_PER_ACRE_FT * acres * ft * v.gf * v.ntg * v.phi * (1 - v.sw)) / v.bo;
      const ours = computeVolumes(v).stoiip * M3_TO_BBL;
      expect(Math.abs(ours - fieldStb) / fieldStb).toBeLessThan(1e-3);
    }
  });

  it('scales linearly with each dimension and inversely with Bo', () => {
    const r = computeVolumes(base).stoiip;
    expect(computeVolumes({ ...base, len: base.len * 2 }).stoiip).toBeCloseTo(r * 2);
    expect(computeVolumes({ ...base, h: base.h * 3 }).stoiip).toBeCloseTo(r * 3);
    expect(computeVolumes({ ...base, bo: base.bo * 2 }).stoiip).toBeCloseTo(r / 2);
  });

  it('gives zero oil at full water saturation', () => {
    expect(computeVolumes({ ...base, sw: 1 }).stoiip).toBe(0);
  });

  it('keeps the North Sea preset at roughly 1 billion STB', () => {
    const stb = computeVolumes(PRESETS[0]!.values).stoiip * M3_TO_BBL;
    expect(stb / 1e6).toBeCloseTo(1024, 0);
  });
});
