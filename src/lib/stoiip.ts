import type { Values } from './params';

export interface VolumeBreakdown {
  /** Gross rock volume, m³. */
  grv: number;
  /** GRV × geometry factor, m³. */
  bulk: number;
  /** Net rock volume, m³. */
  net: number;
  /** Pore volume, m³. */
  pv: number;
  /** Hydrocarbon pore volume, reservoir m³. */
  hcpv: number;
  /** Stock tank oil initially in place, Sm³. */
  stoiip: number;
  /** Recoverable oil, Sm³. */
  recoverable: number;
}

export const areaKm2 = (v: Pick<Values, 'len' | 'wid'>): number => v.len * v.wid;

/** Volumetric STOIIP = L·W·h · GF · N/G · φ · (1 − Sw) / Bo. */
export function computeVolumes(v: Values): VolumeBreakdown {
  const grv = areaKm2(v) * 1e6 * v.h;
  const bulk = grv * v.gf;
  const net = bulk * v.ntg;
  const pv = net * v.phi;
  const hcpv = pv * (1 - v.sw);
  const stoiip = hcpv / v.bo;
  return { grv, bulk, net, pv, hcpv, stoiip, recoverable: stoiip * v.rf };
}
