// Geometry for the schematic anticline cross-section (SVG user units, 640 × 250).

export const SECTION = { width: 640, height: 250, crestX: 320, crestY: 72, flankY: 206, sigma: 170, thickness: 42 } as const;

/** Depth (y) of the reservoir top at horizontal position x — a Gaussian dome. */
export function topY(x: number): number {
  const { flankY, crestY, crestX, sigma } = SECTION;
  return flankY - (flankY - crestY) * Math.exp(-(((x - crestX) / sigma) ** 2));
}

function curve(offset: number): [number, number][] {
  const pts: [number, number][] = [];
  for (let x = -10; x <= SECTION.width + 10; x += 10) pts.push([x, topY(x) + offset]);
  return pts;
}

/** Closed SVG path for the band between two offsets below the reservoir top. */
export function bandPath(topOffset: number, bottomOffset: number): string {
  const p = ([x, y]: [number, number]) => `${x.toFixed(1)} ${y.toFixed(1)}`;
  const top = curve(topOffset).map((pt, i) => `${i ? 'L' : 'M'}${p(pt)}`);
  const bottom = curve(bottomOffset).reverse().map(pt => `L${p(pt)}`);
  return [...top, ...bottom, 'Z'].join(' ');
}

/**
 * Schematic oil-water contact depth: maps oil saturation (0–1) between just below the
 * crest and just above the spill point. Visual only — not a physical relationship.
 */
export function owcY(oilSaturation: number): number {
  const so = Math.min(1, Math.max(0, oilSaturation));
  const { crestY, flankY } = SECTION;
  return crestY + 8 + so * (flankY - 20 - crestY);
}
