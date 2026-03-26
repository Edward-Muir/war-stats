# Session Summary: Mobile-First Redesign

**Date:** 2026-03-22

## Overview

Converted the WH40K Damage Calculator app from a desktop-first 3-panel layout to a mobile-first portrait scroll layout. Key changes: weapons auto-equip on unit selection, simulation auto-runs (no button), all toggles are tappable chips instead of checkboxes, and CSS meets mobile touch target / typography standards from the game-feel skill.

## Files Modified

### Store Layer

| File | Change |
|------|--------|
| `app/src/store/slices/attacker.ts` | Import `getAvailableWeapons`; in `setAttackerUnit`, pre-populate `selectedWeapons` with all available weapons (max firing models, half-range off) instead of `[]` |
| `app/src/store/slices/simulation.ts` | Removed `setIterations` from interface/implementation. Added `initAutoRun(store)` — subscribes to attacker/defender state changes, debounces 300ms, terminates in-flight workers before starting new ones. Hardcoded 10,000 iterations. |
| `app/src/store/store.ts` | Imported `initAutoRun`, called it after store creation to wire up auto-run subscription |

### Components

| File | Change |
|------|--------|
| `app/src/components/layout/AppShell.tsx` | Reordered panels: Attacker → Defender → Results (was Attacker → Results → Defender). Removed `SimulationControls` usage, `setIterations`, `runSim` from `ResultsPanel`. Simplified to show `SimulationStatus` + results. |
| `app/src/components/simulation/SimulationControls.tsx` | Replaced entirely with `SimulationStatus` component — shows pulsing "Simulating…" when running, nothing otherwise. Removed iterations input and Run button. |
| `app/src/components/unit-config/WeaponSelector.tsx` | Removed checkbox inputs. Entire `.weapon-row` is now tappable (`onClick`, `role="switch"`, `aria-checked`, keyboard Enter/Space support). Half-range converted from checkbox to chip `<button>`. `weapon-config` area stops click propagation. |
| `app/src/components/game-state/AttackerState.tsx` | Replaced checkbox labels with `<button className="chip">` elements in a `.chip-group` flex container |
| `app/src/components/game-state/DefenderState.tsx` | Same chip treatment as AttackerState |

### Styling

| File | Change |
|------|--------|
| `app/src/index.css` | Background → `#121212`, text → `#E4E4E4`, base font-size 16px, line-height 1.5 |
| `app/src/App.css` | Complete mobile-first restyle: single-column flex layout (3-column grid restored at 1024px+ via `order` properties), 44px min touch targets on all interactive elements, 8-point grid spacing, 14px+ labels, 16px inputs (prevents iOS zoom), new `.chip` / `.chip--active` styles (red for attacker, blue for defender), `.simulation-status` pulse animation, responsive results grid (1 col → 3 col at 480px+), dark mode colors (#121212 bg, #1E1E1E surfaces, #2E2E2E borders) |

## Key Decisions

1. **Auto-run via `store.subscribe` not `useEffect`** — Keeps simulation trigger logic out of the React component tree entirely. Debounced at 300ms to avoid thrashing during rapid selection changes.

2. **Worker abort on re-run** — `runSimulation()` now terminates any in-flight worker before starting a new one, so rapid config changes don't queue up stale simulations.

3. **Desktop layout preserved** — `@media (min-width: 1024px)` restores the 3-panel grid with CSS `order` to put results back in the center column. Mobile scrolls naturally without panel overflow constraints.

4. **Chips over checkboxes** — All boolean toggles (game state, half-range) use tappable pill-style buttons with `role="switch"` semantics. Attacker chips highlight red, defender chips highlight blue.

5. **All inputs 16px font-size** — Prevents iOS Safari auto-zoom on focus.

## Game-Feel Constraints Applied

- Touch targets: 44x44px minimum on all interactive elements
- Interactive element spacing: 8px minimum
- Typography: body 16px, labels 14px, stat abbreviations 12px
- Spacing: 8-point grid throughout
- Dark mode: `#121212` not pure black, `#E4E4E4` not pure white
- Animations: GPU-accelerated only (opacity for pulse)

## Unfinished Work / Next Steps

- **Manual mobile testing** — Verify on real device or Chrome DevTools mobile viewports (375x667 iPhone SE, 390x844 iPhone 14). Check for horizontal overflow at 320px.
- **Scroll-to-results indicator** — Consider adding a subtle "Results ready" toast or scroll indicator after auto-run completes on mobile, so users know to scroll down.
- **Stratagem cards** — Currently tappable but could also benefit from chip-style treatment for consistency.
- **Wargear selects** — The wargear dropdown selects got the 44px/16px treatment in CSS but weren't restructured as components.
- **Desktop panel order** — Uses CSS `order` property. If the DOM order (Attacker → Defender → Results) causes accessibility/tab-order issues on desktop, may need to revisit.

## Context for Future Sessions

The app now auto-runs simulation whenever both attacker (with weapons) and defender are configured. The iteration count is fixed at 10,000 — there's no UI to change it. The `SimulationControls` component was renamed to `SimulationStatus` (same file path) and only shows a loading indicator. The `setIterations` method was removed from the store entirely.

The auto-run subscription lives in `simulation.ts` as `initAutoRun()` and is initialized in `store.ts` at module level — it's not tied to any React component lifecycle.
