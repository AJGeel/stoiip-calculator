import { useMemo, useState } from 'react';
import { Cascade } from './components/Cascade';
import { Formula } from './components/Formula';
import { Hero } from './components/Hero';
import { MonteCarloPanel } from './components/MonteCarloPanel';
import { ParamPanel } from './components/ParamPanel';
import { TrapSection } from './components/TrapSection';
import { UnitToggle } from './components/UnitToggle';
import { mulberry32, runMonteCarlo } from './lib/montecarlo';
import { DEFAULT_SPREADS, PRESETS, type ParamKey, type Spreads, type Values } from './lib/params';
import { computeVolumes } from './lib/stoiip';
import type { UnitSystem } from './lib/units';

export const MC_TRIALS = 20_000;
const DEFAULT_PRESET = PRESETS[0]!;

interface Props {
  /** Seed for the first Monte Carlo run; fixed in tests for reproducibility. */
  seed?: number;
}

export function App({ seed: seedProp }: Props) {
  const [seed] = useState(() => seedProp ?? Date.now());
  const [units, setUnits] = useState<UnitSystem>('field');
  const [values, setValues] = useState<Values>(DEFAULT_PRESET.values);
  const [spreads, setSpreads] = useState<Spreads>(DEFAULT_SPREADS);
  const [activePreset, setActivePreset] = useState<string | null>(DEFAULT_PRESET.name);
  const [run, setRun] = useState(0);

  const volumes = useMemo(() => computeVolumes(values), [values]);
  const mc = useMemo(
    () => runMonteCarlo(values, spreads, MC_TRIALS, mulberry32(seed + run)),
    [values, spreads, seed, run],
  );

  const setParam = (key: ParamKey, value: number) => {
    setValues(v => ({ ...v, [key]: value }));
    setActivePreset(null);
  };
  const applyPreset = (name: string) => {
    const preset = PRESETS.find(p => p.name === name);
    if (!preset) return;
    setValues(preset.values);
    setActivePreset(name);
  };

  return (
    <>
      <div className="bg" aria-hidden="true">
        <div className="blob b1" />
        <div className="blob b2" />
        <div className="grain" />
      </div>

      <header className="top">
        <div className="brand">
          <svg className="drop" viewBox="0 0 24 32" aria-hidden="true">
            <path d="M12 1C12 1 2 13.5 2 20.5a10 10 0 0 0 20 0C22 13.5 12 1 12 1Z" />
          </svg>
          <div>
            <h1>STOIIP</h1>
            <p>Stock tank oil initially in place</p>
          </div>
        </div>
        <UnitToggle units={units} onChange={setUnits} />
      </header>

      <main className="layout">
        <ParamPanel values={values} units={units} activePreset={activePreset} onChange={setParam} onPreset={applyPreset} />
        <section className="results">
          <Hero volumes={volumes} oilSaturation={1 - values.sw} units={units} />
          <TrapSection oilSaturation={1 - values.sw} porosity={values.phi} />
          <Cascade volumes={volumes} values={values} units={units} />
          <Formula values={values} volumes={volumes} units={units} />
          <MonteCarloPanel
            result={mc}
            trials={MC_TRIALS}
            spreads={spreads}
            units={units}
            onSpreadChange={(key, pct) => setSpreads(s => ({ ...s, [key]: pct }))}
            onRerun={() => setRun(r => r + 1)}
          />
        </section>
      </main>

      <footer className="foot">
        STOIIP = L · W · h · GF · N/G · φ · (1 − S<sub>w</sub>) / B<sub>o</sub> &nbsp;·&nbsp; 1 acre-ft = 7,758 bbl &nbsp;·&nbsp; 1 m³ = 6.2898 bbl
      </footer>
    </>
  );
}
