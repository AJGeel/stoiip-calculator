import { Fragment } from 'react';
import { buildCascade } from '../lib/cascade';
import { fmt } from '../lib/format';
import type { Values } from '../lib/params';
import type { VolumeBreakdown } from '../lib/stoiip';
import { toDisplayVolume, volumeUnit, type UnitSystem } from '../lib/units';

interface Props {
  volumes: VolumeBreakdown;
  values: Values;
  units: UnitSystem;
}

export function Cascade({ volumes, values, units }: Props) {
  const steps = buildCascade(volumes, values);
  return (
    <div className="panel">
      <div className="panel-head">
        <h2>Volume cascade</h2>
        <span className="hint">From rock to stock tank</span>
      </div>
      <div className="cascade">
        {steps.map(s => (
          <Fragment key={s.name}>
            {s.op && <div className="c-op">{s.op}</div>}
            <div className={`c-row${s.final ? ' final' : ''}`}>
              <div className="c-name">
                {s.name}
                <small>{s.sub}</small>
              </div>
              <div className="c-track">
                <div className="c-bar" style={{ width: `${Math.max(0.4, s.pctOfGrv)}%` }} />
              </div>
              <div className="c-val">
                <span>{fmt(toDisplayVolume(s.value, units))}</span>
                <small>
                  {volumeUnit(s.kind, units)} · {s.pctOfGrv < 1 ? s.pctOfGrv.toFixed(2) : s.pctOfGrv.toFixed(1)}%
                </small>
              </div>
            </div>
          </Fragment>
        ))}
      </div>
    </div>
  );
}
