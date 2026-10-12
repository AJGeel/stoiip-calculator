import { useMemo } from 'react';
import { fmt } from '../lib/format';
import type { MonteCarloResult } from '../lib/montecarlo';
import { PARAMS, type ParamKey, type Spreads } from '../lib/params';
import { toDisplayVolume, volumeUnit, type UnitSystem } from '../lib/units';
import { HistogramChart } from './HistogramChart';

interface Props {
  result: MonteCarloResult;
  trials: number;
  spreads: Spreads;
  units: UnitSystem;
  onSpreadChange: (key: ParamKey, pct: number) => void;
  onRerun: () => void;
}

export function MonteCarloPanel({ result: m, trials, spreads, units, onSpreadChange, onRerun }: Props) {
  const unit = volumeUnit('stockTank', units);
  const d = (x: number) => toDisplayVolume(x, units);
  const samples = useMemo(() => m.sorted.map(x => toDisplayVolume(x, units)), [m, units]);

  const cards = [
    { label: 'P90 · low', v: m.p90, rec: m.recP90 },
    { label: 'P50 · best', v: m.p50, rec: m.recP50, mid: true },
    { label: 'P10 · high', v: m.p10, rec: m.recP10 },
  ];

  return (
    <div className="panel">
      <div className="panel-head">
        <h2>Uncertainty · Monte Carlo</h2>
        <button className="ghost-btn" onClick={onRerun}>Re-run</button>
      </div>
      <p className="hint block">
        Each parameter is sampled from a triangular distribution around its base value (±spread).{' '}
        {trials.toLocaleString('en-US')} trials.
      </p>
      <div className="spreads">
        {PARAMS.map(p => (
          <label key={p.key} className="spread">
            <span>
              {p.short ?? p.label.split(' ')[0]} <span className="sym">{p.sym}</span>
            </span>
            <span>
              ±
              <input
                type="number"
                min={0}
                max={80}
                step={1}
                defaultValue={spreads[p.key]}
                key={spreads[p.key]}
                aria-label={`${p.label} spread percent`}
                onBlur={e => onSpreadChange(p.key, Math.min(80, Math.max(0, parseFloat(e.target.value) || 0)))}
                onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()}
              />
              %
            </span>
          </label>
        ))}
      </div>
      <div className="pcards">
        {cards.map(c => (
          <div key={c.label} className={`pcard${c.mid ? ' mid' : ''}`}>
            <span className="eyebrow">{c.label}</span>
            <div className="pv">
              {fmt(d(c.v))}
              <small>{unit}</small>
            </div>
            <div className="pr">Recoverable {fmt(d(c.rec))}</div>
          </div>
        ))}
      </div>
      <HistogramChart
        samples={samples}
        unit={unit}
        markers={[
          { label: 'P90', value: d(m.p90) },
          { label: 'P50', value: d(m.p50) },
          { label: 'P10', value: d(m.p10) },
        ]}
      />
    </div>
  );
}
