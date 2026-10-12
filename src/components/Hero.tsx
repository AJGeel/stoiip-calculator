import { fmt } from '../lib/format';
import type { VolumeBreakdown } from '../lib/stoiip';
import { ACRE_FT_TO_M3, M3_TO_BBL, toDisplayVolume, volumeUnit, type UnitSystem } from '../lib/units';
import { AnimatedNumber } from './AnimatedNumber';

interface Props {
  volumes: VolumeBreakdown;
  oilSaturation: number;
  units: UnitSystem;
}

export function Hero({ volumes: r, oilSaturation, units }: Props) {
  const unit = volumeUnit('stockTank', units);
  const sub =
    units === 'field'
      ? `≈ ${fmt(r.stoiip / 1e6)} × 10⁶ Sm³ · GRV ${fmt(r.grv / ACRE_FT_TO_M3 / 1e3, 0)}k acre-ft`
      : `≈ ${fmt((r.stoiip * M3_TO_BBL) / 1e6)} MMSTB · GRV ${fmt(r.grv / 1e9, 2)} km³`;

  return (
    <div className="panel hero">
      <div className="hero-main">
        <span className="eyebrow">Oil in place</span>
        <div className="hero-num">
          <AnimatedNumber id="heroVal" value={toDisplayVolume(r.stoiip, units)} format={n => fmt(n)} />
          <span className="hero-unit">{unit}</span>
        </div>
        <div className="hero-sub">{sub}</div>
      </div>
      <div className="hero-side">
        <div className="mini">
          <span className="eyebrow">Recoverable</span>
          <div className="mini-num">
            <AnimatedNumber value={toDisplayVolume(r.recoverable, units)} format={n => fmt(n)} /> <small>{unit}</small>
          </div>
        </div>
        <div className="mini">
          <span className="eyebrow">Oil saturation</span>
          <div className="mini-num">
            <AnimatedNumber value={oilSaturation * 100} format={n => n.toFixed(0)} />
            <small>%</small>
          </div>
        </div>
      </div>
    </div>
  );
}
