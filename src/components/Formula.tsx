import { fmt } from '../lib/format';
import type { Values } from '../lib/params';
import { areaKm2, type VolumeBreakdown } from '../lib/stoiip';
import { KM2_TO_ACRE, KM_TO_MI, M3_TO_BBL, M_TO_FT, type UnitSystem } from '../lib/units';

interface Props {
  values: Values;
  volumes: VolumeBreakdown;
  units: UnitSystem;
}

const INDENT = ' '.repeat(6);

export function Formula({ values: v, volumes, units }: Props) {
  const field = units === 'field';
  const area = field ? areaKm2(v) * KM2_TO_ACRE : areaKm2(v) * 1e6;
  const h = field ? v.h * M_TO_FT : v.h;
  const lf = field ? KM_TO_MI : 1;
  const lu = field ? 'mi' : 'km';
  const au = field ? 'ac' : 'm²';
  const pre = field ? '7,758 × ' : '';
  const result = field ? `${fmt((volumes.stoiip * M3_TO_BBL) / 1e6)} MMSTB` : `${fmt(volumes.stoiip / 1e6)} × 10⁶ Sm³`;

  return (
    <div className="panel">
      <div className="panel-head">
        <h2>Equation</h2>
      </div>
      <div className="formula" data-testid="formula">
        <div className="f-line">
          A = L · W = <b>{(v.len * lf).toFixed(2)}</b> {lu} · <b>{(v.wid * lf).toFixed(2)}</b> {lu} ={' '}
          <span className="res">{fmt(area, 0)} {au}</span>
        </div>
        <div className="f-line">
          STOIIP = {pre}A · h · GF · N/G · φ · (1 − S<sub>w</sub>) / B<sub>o</sub>
        </div>
        <div className="f-line">
          {INDENT} = {pre}<b>{fmt(area, 0)}</b> {au} · <b>{fmt(h, 0)}</b> {field ? 'ft' : 'm'} · <b>{v.gf.toFixed(2)}</b> ·{' '}
          <b>{v.ntg.toFixed(2)}</b> · <b>{v.phi.toFixed(3)}</b> · (1 − <b>{v.sw.toFixed(2)}</b>) / <b>{v.bo.toFixed(2)}</b>
        </div>
        <div className="f-line">
          {INDENT} = <span className="res" data-testid="formula-result">{result}</span>
        </div>
      </div>
    </div>
  );
}
