import { useMemo } from 'react';
import { SECTION, bandPath, owcY } from '../lib/section';

interface Props {
  oilSaturation: number;
  porosity: number;
}

const T = SECTION.thickness;
const STRATA: [number, number, string, string?][] = [
  [-200, -60, '#1c1612'],
  [-60, -30, '#241c16'],
  [-30, 0, 'url(#shale)', '#2a221b'], // cap rock
  [T, T + 22, '#1f1813'],
  [T + 22, T + 60, '#17120e'],
  [T + 60, 400, '#120e0b'],
];
const WAVE = 'M0 0 Q 20 -3 40 0' + Array.from({ length: 17 }, (_, i) => ` T ${80 + i * 40} 0`).join('');

export function TrapSection({ oilSaturation, porosity }: Props) {
  const reservoir = useMemo(() => bandPath(0, T), []);
  const strata = useMemo(() => STRATA.map(([a, b, fill, base]) => ({ d: bandPath(a, b), fill, base })), []);
  const owc = { transform: `translateY(${owcY(oilSaturation)}px)` };

  return (
    <div className="panel">
      <div className="panel-head">
        <h2>Trap cross-section</h2>
        <span className="hint">Schematic · OWC moves with S<sub>o</sub></span>
      </div>
      <svg id="section" viewBox={`0 0 ${SECTION.width} ${SECTION.height}`} role="img"
        aria-label="Schematic anticline trap with oil above water">
        <defs>
          <linearGradient id="oilGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffcf6b" />
            <stop offset=".45" stopColor="#e58a1f" />
            <stop offset="1" stopColor="#7a3a0c" />
          </linearGradient>
          <linearGradient id="waterGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#2d6f8f" />
            <stop offset="1" stopColor="#0d2633" />
          </linearGradient>
          <linearGradient id="sheen" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#fff" stopOpacity="0" />
            <stop offset=".5" stopColor="#fff" stopOpacity=".35" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <pattern id="grains" width="9" height="9" patternUnits="userSpaceOnUse">
            <circle cx="2.5" cy="2.5" r="1.6" fill="#000" fillOpacity=".35" />
            <circle cx="7" cy="6.5" r="1.3" fill="#000" fillOpacity=".3" />
          </pattern>
          <pattern id="shale" width="14" height="6" patternUnits="userSpaceOnUse">
            <path d="M0 3h9" stroke="var(--line-strong)" strokeWidth="1" />
          </pattern>
          <clipPath id="resClip"><path d={reservoir} /></clipPath>
        </defs>

        <g>
          {strata.map((s, i) => (
            <g key={i}>
              {s.base && <path d={s.d} fill={s.base} />}
              <path d={s.d} fill={s.fill} />
            </g>
          ))}
        </g>
        <g clipPath="url(#resClip)">
          <rect x="0" y="0" width={SECTION.width} height={SECTION.height} fill="url(#oilGrad)" />
          <rect className="sheen" x="-200" y="0" width="200" height={SECTION.height} fill="url(#sheen)" />
          <g className="water-g" style={owc}>
            <rect x="0" y="0" width={SECTION.width} height="300" fill="url(#waterGrad)" />
            <path className="owc-wave" d={WAVE} fill="none" stroke="#bfe6ff" strokeOpacity=".5" strokeWidth="1.5" />
          </g>
          <rect className="grain-rect" x="0" y="0" width={SECTION.width} height={SECTION.height} fill="url(#grains)"
            style={{ opacity: Math.min(1, 0.25 + porosity * 2.4) }} />
        </g>
        <path d={reservoir} fill="none" stroke="var(--ink-2)" strokeWidth="1.5" />
        <g className="water-g" style={owc}>
          <line x1="470" x2="600" y1="0" y2="0" stroke="var(--ink-2)" strokeDasharray="4 4" />
          <text x="604" y="4" className="svg-label">OWC</text>
        </g>
        <text x="20" y="30" className="svg-label">Cap rock (seal)</text>
        <text x="20" y="232" className="svg-label">Aquifer</text>
        <text x={SECTION.crestX} y={SECTION.crestY - 36} textAnchor="middle" className="svg-label">Crest</text>
      </svg>
    </div>
  );
}
