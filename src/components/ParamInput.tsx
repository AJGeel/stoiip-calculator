import { useState, type CSSProperties, type ReactNode } from 'react';
import {
  displayDecimals, displayFactor, displayUnit, fromSlider, parseDisplayValue, sliderRange, toSlider,
  type ParamDef,
} from '../lib/params';
import type { UnitSystem } from '../lib/units';

interface Props {
  param: ParamDef;
  value: number;
  units: UnitSystem;
  onChange: (value: number) => void;
  children?: ReactNode;
}

export function ParamInput({ param: p, value, units, onChange, children }: Props) {
  // Draft text while the user is typing; committed on blur or Enter.
  const [draft, setDraft] = useState<string | null>(null);
  const formatted = (value * displayFactor(p, units)).toFixed(displayDecimals(p, units));
  const range = sliderRange(p);
  const position = toSlider(p, value);
  const fill = ((position - range.min) / (range.max - range.min)) * 100;

  const commit = () => {
    if (draft === null) return;
    const parsed = parseDisplayValue(p, units, draft);
    if (parsed !== null) onChange(parsed);
    setDraft(null);
  };

  const id = `param-${p.key}`;
  return (
    <div className="param">
      <div className="param-top">
        <label className="param-label" htmlFor={id}>
          {p.label} <span className="sym">{p.sym}</span>
        </label>
        <div className="field-wrap">
          <input
            id={id}
            type="text"
            inputMode="decimal"
            value={draft ?? formatted}
            onChange={e => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={e => {
              if (e.key === 'Enter') commit();
              if (e.key === 'Escape') setDraft(null);
            }}
          />
          <span className="u">{displayUnit(p, units)}</span>
        </div>
      </div>
      <input
        type="range"
        aria-label={`${p.label} slider`}
        min={range.min}
        max={range.max}
        step={range.step}
        value={position}
        style={{ '--p': `${fill}%` } as CSSProperties}
        onChange={e => onChange(fromSlider(p, +e.target.value))}
      />
      {children}
    </div>
  );
}
