import type { UnitSystem } from '../lib/units';

const OPTIONS: { id: UnitSystem; label: string }[] = [
  { id: 'field', label: 'Field' },
  { id: 'metric', label: 'Metric' },
];

interface Props {
  units: UnitSystem;
  onChange: (units: UnitSystem) => void;
}

export function UnitToggle({ units, onChange }: Props) {
  const index = OPTIONS.findIndex(o => o.id === units);
  return (
    <div className="units" role="radiogroup" aria-label="Unit system">
      {OPTIONS.map(o => (
        <button
          key={o.id}
          className={`unit-btn${units === o.id ? ' active' : ''}`}
          role="radio"
          aria-checked={units === o.id}
          onClick={() => onChange(o.id)}
        >
          {o.label}
        </button>
      ))}
      <span className="unit-thumb" style={{ transform: `translateX(${index * 100}%)` }} />
    </div>
  );
}
