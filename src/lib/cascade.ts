import type { Values } from './params';
import type { VolumeBreakdown } from './stoiip';
import { fmt } from './format';
import type { VolumeKind } from './units';

export interface CascadeStep {
  name: string;
  sub: string;
  /** Volume in m³. */
  value: number;
  /** Share of gross rock volume, 0–100. */
  pctOfGrv: number;
  /** Description of the operation that produced this step from the previous one. */
  op?: string;
  kind: VolumeKind;
  final?: boolean;
}

export function buildCascade(r: VolumeBreakdown, v: Values): CascadeStep[] {
  const steps: Omit<CascadeStep, 'pctOfGrv'>[] = [
    { name: 'Gross rock volume', sub: 'GRV = L × W × h', value: r.grv, kind: 'reservoir' },
    { name: 'Trap volume', sub: '× GF', value: r.bulk, op: `× ${fmt(v.gf * 100, 0)}% geometry`, kind: 'reservoir' },
    { name: 'Net rock volume', sub: '× N/G', value: r.net, op: `× ${fmt(v.ntg * 100, 0)}% net sand`, kind: 'reservoir' },
    { name: 'Pore volume', sub: '× φ', value: r.pv, op: `× ${fmt(v.phi * 100, 1)}% porosity`, kind: 'reservoir' },
    { name: 'Hydrocarbon pore vol.', sub: '× (1 − Sw)', value: r.hcpv, op: `× ${fmt((1 - v.sw) * 100, 0)}% oil saturation`, kind: 'reservoir' },
    { name: 'STOIIP', sub: '÷ Bo', value: r.stoiip, op: `÷ ${fmt(v.bo, 2)} shrinkage to surface`, kind: 'stockTank', final: true },
  ];
  return steps.map(s => ({ ...s, pctOfGrv: r.grv > 0 ? (s.value / r.grv) * 100 : 0 }));
}
