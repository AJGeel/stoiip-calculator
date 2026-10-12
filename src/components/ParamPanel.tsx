import { fmt } from '../lib/format';
import { PARAMS, PRESETS, type ParamKey, type Values } from '../lib/params';
import { areaKm2 } from '../lib/stoiip';
import { KM2_TO_ACRE, type UnitSystem } from '../lib/units';
import { ParamInput } from './ParamInput';

interface Props {
  values: Values;
  units: UnitSystem;
  activePreset: string | null;
  onChange: (key: ParamKey, value: number) => void;
  onPreset: (name: string) => void;
}

export function ParamPanel({ values, units, activePreset, onChange, onPreset }: Props) {
  const area = areaKm2(values);
  const areaText = units === 'field' ? `${fmt(area * KM2_TO_ACRE, 0)} acres` : `${fmt(area, area < 10 ? 2 : 1)} km²`;

  return (
    <section className="panel inputs">
      <div className="panel-head">
        <h2>Reservoir parameters</h2>
      </div>
      <div className="presets">
        {PRESETS.map(pr => (
          <button
            key={pr.name}
            className={`chip${activePreset === pr.name ? ' active' : ''}`}
            aria-pressed={activePreset === pr.name}
            onClick={() => onPreset(pr.name)}
          >
            {pr.name}
          </button>
        ))}
      </div>
      {PARAMS.map(p => (
        <ParamInput key={p.key} param={p} value={values[p.key]} units={units} onChange={v => onChange(p.key, v)}>
          {p.key === 'wid' && (
            <div className="derived">
              Area <span className="sym">A = L × W</span>
              <span className="area-out" data-testid="area">{areaText}</span>
            </div>
          )}
        </ParamInput>
      ))}
    </section>
  );
}
