# STOIIP Calculator

Volumetric stock tank oil initially in place, with Monte Carlo uncertainty.

```
STOIIP = L · W · h · GF · N/G · φ · (1 − Sw) / Bo
```

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm test` | Run unit + component tests once (`npm run test:watch` to watch) |
| `npm run typecheck` | Type-check with `tsc` |
| `npm run build` | Type-check and build to `dist/` |

## Structure

All calculation logic lives in `src/lib/` as pure functions with no React, so it can be tested in isolation. Components in `src/components/` only render.

| File | Responsibility |
|---|---|
| `lib/stoiip.ts` | The volumetric equation (`computeVolumes`) |
| `lib/params.ts` | Input definitions, ranges, presets, unit display and slider mapping |
| `lib/units.ts` | Unit constants and volume formatting per unit system |
| `lib/montecarlo.ts` | Seeded RNG, triangular sampling, P90/P50/P10, histogram binning |
| `lib/cascade.ts` | Rows for the rock-to-stock-tank volume cascade |
| `lib/section.ts` | Geometry of the schematic trap cross-section |
| `App.tsx` | State (values, units, spreads) and layout |

Internally values are always stored in metric (km, m, fractions 0–1); unit conversion happens only for display and input parsing.

P-values use the industry exceedance convention: **P90** is the low case (90% chance of exceeding it), **P10** the high case.

## Adding a parameter

1. Add its key to `ParamKey` and a definition to `PARAMS` in `lib/params.ts`.
2. Add a value for it to each entry in `PRESETS` (a test enforces this).
3. Use it in `computeVolumes` and in the sampling loop in `runMonteCarlo`.
