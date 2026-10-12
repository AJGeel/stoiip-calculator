/** Formats a number with thousands separators; picks sensible decimals when dp is omitted. */
export function fmt(n: number, dp?: number): string {
  if (!Number.isFinite(n)) return '—';
  const abs = Math.abs(n);
  const digits = dp ?? (abs >= 1000 ? 0 : abs >= 10 ? 1 : 2);
  return n.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

/** Round tick values (1, 2, 2.5, 5 × 10ⁿ) covering [lo, hi] with at most ~n ticks. */
export function niceTicks(lo: number, hi: number, n: number): number[] {
  const span = hi - lo;
  if (!(span > 0) || n < 1) return [];
  const mag = Math.pow(10, Math.floor(Math.log10(span / n)));
  const step = [1, 2, 2.5, 5, 10].map(s => s * mag).find(s => span / s <= n) ?? mag * 10;
  const out: number[] = [];
  for (let t = Math.ceil(lo / step) * step; t <= hi + 1e-9; t += step) out.push(+t.toFixed(10));
  return out;
}
