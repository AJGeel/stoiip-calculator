import { useEffect, useRef, useState } from 'react';

interface Props {
  value: number;
  format: (n: number) => string;
  durationMs?: number;
  className?: string;
  id?: string;
}

const reducedMotion = () =>
  typeof window === 'undefined' ||
  typeof window.requestAnimationFrame !== 'function' ||
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Counts from the previous value to the new one; the final value is always exposed via aria-label. */
export function AnimatedNumber({ value, format, durationMs = 550, className, id }: Props) {
  const [shown, setShown] = useState(value);
  const current = useRef(value);

  useEffect(() => {
    if (reducedMotion()) {
      current.current = value;
      setShown(value);
      return;
    }
    const from = current.current;
    const start = performance.now();
    let frame = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      current.current = from + (value - from) * eased;
      setShown(current.current);
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [value, durationMs]);

  return (
    <span id={id} className={className} aria-label={format(value)}>
      {format(shown)}
    </span>
  );
}
