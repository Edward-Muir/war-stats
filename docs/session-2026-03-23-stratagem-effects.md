# Session Summary: Stratagem Display & Effect Parsing

**Date:** 2026-03-23
**Scope:** Show applicable stratagems in the main UI and wire their effects into the simulation engine

---

## Overview

Added a horizontally scrollable stratagem chip row below the attacker and defender bars in the main AppShell, and built a curated name-to-effect mapping table (~280 entries) so that toggling a stratagem actually modifies the Monte Carlo simulation. Stratagems not in the mapping table display with a dashed border / reduced opacity ("not simulated").

The session was interrupted while debugging a pre-existing React 19 + Zustand infinite loop issue in `ConfigOverlay` (not caused by this work, but surfaced during testing).

---

## Files Created

| File | Description |
|------|-------------|
| `app/src/logic/stratagem-effects.ts` | Core types (`StratagemModifier`, `ParsedStratagemEffect`, `CombatType`), reusable effect templates (e.g., `REROLL_HITS`, `AP_IMPROVE_1`, `FNP_5`), a curated mapping table of ~280 stratagem names to their simulation effects, `classifyCombatType()` function, and `resolveStratagemEffect()` lookup function |
| `app/src/components/game-state/StratagemChips.tsx` | Compact horizontally scrollable chip row component. Filters stratagems by combat type (ranged/melee/any), shows name + CP cost, toggles active state on click, marks unparsed stratagems visually |

## Files Modified

| File | Changes |
|------|---------|
| `app/src/types/simulation.ts` | Added `damageReduction`, `feelNoPainOverride`, `invulnOverride` to `ResolvedModifiers`. Replaced `stratagems: ActiveStratagem[]` with `attackerEffects: ParsedStratagemEffect[]` / `defenderEffects: ParsedStratagemEffect[]` in `SimulationInput`. Updated import from `config` to `stratagem-effects` |
| `app/src/engine/modifiers.ts` | Extended `computeModifiers()` with two new params (`attackerEffects`, `defenderEffects`). Folds in stratagem modifiers: hit/wound mods, AP improvement/worsening, rerolls, crit thresholds, lethal/sustained/devastating, ignores cover, lance, FNP, damage reduction, invuln saves. Added `upgradeReroll()` helper |
| `app/src/engine/attack.ts` | `resolveSave()` now uses `invulnOverride` from modifiers (best of defender base + stratagem). Damage calculation applies `damageReduction` (min 1) |
| `app/src/engine/simulation.ts` | `runSingleIteration()` threads `attackerEffects`/`defenderEffects` to `computeModifiers()`. Applies `feelNoPainOverride` (best of defender base + stratagem) before allocation |
| `app/src/store/slices/simulation.ts` | `buildSimulationInput()` now resolves active stratagems via `resolveStratagemEffect()`, filters to parsed-only, and passes as `attackerEffects`/`defenderEffects` |
| `app/src/components/layout/AppShell.tsx` | Added `StratagemChips` below attacker and defender nav-rows. Added `useMemo`-based stratagem resolution using `filterAttackerStratagems`/`filterDefenderStratagems`. Uses granular store selectors (`attackerFactionData`/`defenderFactionData`) to avoid reference instability |
| `app/src/App.css` | Added `.chip--unparsed` style (dashed border, opacity 0.5) |
| `app/src/__tests__/simulation.test.ts` | Updated `SimulationInput` construction to use `attackerEffects`/`defenderEffects` instead of old `stratagems` field |

---

## Key Decisions

| Decision | Rationale |
|----------|-----------|
| **Curated name-to-effect mapping table** (no regex) | User preference for reliability over breadth. Regex would have broader coverage but risk false positives on conditional effects. The mapping table can be incrementally expanded |
| **Reusable effect templates** | ~280 stratagems map to combinations of ~20 templates (e.g., `REROLL_HITS`, `AP_IMPROVE_1`). Keeps the table concise and DRY |
| **Combat type classification** from `when`/`effect` text | Simple string checks ("ranged attack", "Shooting phase") determine if a stratagem applies to ranged, melee, or both. Used for filtering chips by current attack mode |
| **Effects folded into `computeModifiers()`** | Keeps all modifier logic in one place. Stratagem effects stack with weapon keywords before ±1 capping applies |
| **Defender effects on `ResolvedModifiers`** | Added `damageReduction`, `feelNoPainOverride`, `invulnOverride` to `ResolvedModifiers` rather than mutating `DefenderProfile`. Keeps the modifier pipeline clean |

---

## Bug Fix: React 19 Infinite Loop (ConfigOverlay)

**Status:** Fixed.

The error `"The result of getSnapshot should be cached to avoid an infinite loop"` originated in `ConfigOverlay.tsx`. The root cause was a Zustand selector returning a new `[]` literal on every snapshot check:

```typescript
// BUG: creates a new [] on every call when isAttacker is false:
const weaponSelections = useAppStore((s) => isAttacker ? s.attacker.weaponSelections : []);

// FIX: stable module-level constant
const EMPTY_WEAPON_SELECTIONS: ModelWeaponSelection[] = [];
// ...
const weaponSelections = useAppStore((s) => isAttacker ? s.attacker.weaponSelections : EMPTY_WEAPON_SELECTIONS);
```

React 19's stricter `useSyncExternalStore` detected the unstable reference and entered an infinite re-render loop. Fixed by replacing the inline `[]` with a stable module-level constant.

**File modified:** `app/src/components/overlays/ConfigOverlay.tsx`

---

## Unfinished Work / Next Steps

1. **Visually test the stratagem chips** — Verify chips appear, filter by combat type, and toggle correctly
3. **Verify simulation integration** — Test with ARMOUR OF CONTEMPT (defender, AP worsen) and STORM OF FIRE (attacker, AP improve + ignores cover) to confirm damage changes
4. **Expand the mapping table** — Currently ~280 of 934 unique stratagem names are mapped. The most impactful combat stratagems are covered, but faction-specific ones can be added incrementally
5. **Handle same-name stratagems with different effects** — Some stratagem names appear across factions with different effects. Currently the first mapping wins. Could use a `"FACTION::NAME"` key pattern if needed

---

## Data Analysis Results

- **Total stratagems:** 1,044 (across all detachments)
- **Unique names:** 934
- **Combat-relevant (parseable effects):** 287 unique names
- **Mapped in table:** ~280 entries
- **Stratagems per detachment:** exactly 6

**Most common effect patterns:**
- Reroll hits: 47 | Reroll wounds: 39 | AP improve: 31 | -1 to hit: 29
- FNP: 26 | Sustained hits: 24 | +1 wound: 23 | Lethal hits: 21
- Ignores cover: 19 | Crit hit threshold: 19 | Invuln save: 17 | AP worsen: 15

---

## How to Continue

The build passes (`npm run build` — zero TS errors). The ConfigOverlay infinite loop has been fixed. To continue:

1. `npm run dev` and test the stratagem UI end-to-end
2. The engine integration is complete — simulation will automatically pick up active parsed stratagems
3. Watch for similar unstable-reference Zustand selectors in other components (any selector returning a new `[]` or `{}` literal in a ternary)
