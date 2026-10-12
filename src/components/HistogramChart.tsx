import { useEffect, useMemo, useRef, useState } from 'react';
import { fmt, niceTicks } from '../lib/format';
import { buildHistogram } from '../lib/montecarlo';

interface Props {
  /** Ascending samples, already in display units. */
  samples: Float64Array;
  markers: { label: string; value: number }[];
  unit: string;
}

const H = 260;
const PAD = { l: 8, r: 8, t: 28, b: 28 };

function useWidth<T extends HTMLElement>(fallback: number) {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(fallback);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([entry]) => entry && setWidth(entry.contentRect.width || fallback));
    ro.observe(el);
    return () => ro.disconnect();
  }, [fallback]);
  return [ref, width] as const;
}

export function HistogramChart({ samples, markers, unit }: Props) {
  const [wrapRef, W] = useWidth<HTMLDivElement>(600);
  const [hover, setHover] = useState<number | null>(null);
  const bins = W < 500 ? 30 : 48;
  const hist = useMemo(() => buildHistogram(samples, bins), [samples, bins]);

  const { lo, hi, counts, binWidth } = hist;
  const maxC = Math.max(1, ...counts);
  const iw = W - PAD.l - PAD.r;
  const ih = H - PAD.t - PAD.b;
  const sx = (x: number) => PAD.l + ((x - lo) / (hi - lo || 1)) * iw;
  const colW = iw / bins;
  const gap = Math.min(2, colW * 0.25);
  const ticks = niceTicks(lo, hi, W < 500 ? 4 : 6).filter(t => sx(t) >= PAD.l - 1 && sx(t) <= W - PAD.r + 1);
  const barTop = (c: number) => PAD.t + ih - (c / maxC) * ih;

  return (
    <div className="hist-wrap" ref={wrapRef}>
      <svg className="hist" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Histogram of simulated STOIIP"
        onMouseLeave={() => setHover(null)}>
        {counts.map((c, i) => {
          if (!c) return null;
          const x = PAD.l + i * colW + gap / 2;
          const w = colW - gap;
          const y = barTop(c);
          const r = Math.min(4, w / 2, PAD.t + ih - y);
          return (
            <path key={i} className={`hbar${hover !== null && hover !== i ? ' dim' : ''}`}
              d={`M${x} ${PAD.t + ih} V${y + r} Q${x} ${y} ${x + r} ${y} H${x + w - r} Q${x + w} ${y} ${x + w} ${y + r} V${PAD.t + ih} Z`} />
          );
        })}
        <g className="axis">
          <line x1={PAD.l} x2={W - PAD.r} y1={PAD.t + ih + 0.5} y2={PAD.t + ih + 0.5} />
          {ticks.map(t => (
            <text key={t} x={sx(t)} y={H - 8} textAnchor="middle">{fmt(t, t % 1 ? 1 : 0)}</text>
          ))}
        </g>
        {markers.map(m => (
          <g key={m.label}>
            <line className="pline" x1={sx(m.value)} x2={sx(m.value)} y1={PAD.t - 6} y2={PAD.t + ih} />
            <text className="plabel" x={sx(m.value)} y={PAD.t - 12} textAnchor="middle">{m.label}</text>
          </g>
        ))}
        {counts.map((_, i) => (
          <rect key={i} className="hhit" x={PAD.l + i * colW} y={PAD.t} width={colW} height={ih}
            onMouseEnter={() => setHover(i)} />
        ))}
      </svg>
      {hover !== null && (
        <div className="tooltip" style={{
          left: `${Math.min(W - 90, Math.max(90, PAD.l + (hover + 0.5) * colW))}px`,
          top: `${barTop(counts[hover] ?? 0)}px`,
        }}>
          {fmt(lo + hover * binWidth)} – {fmt(lo + (hover + 1) * binWidth)} {unit}
          <br />
          <span className="t-sub">{(((counts[hover] ?? 0) / samples.length) * 100).toFixed(1)}% of trials</span>
        </div>
      )}
    </div>
  );
}
