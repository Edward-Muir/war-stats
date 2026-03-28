# Session: Dynamic Game State Toggle Relevance

**Date:** 2026-03-28
**Commit:** `11333ed` — `feat: Dynamic game state toggle relevance`

## Overview

Implemented dynamic visibility for game state toggles (Stationary, Advanced, Half Range, Charged, Cover, Stealth, Engagement Range). Previously all toggles were shown unconditionally (only filtered by ranged/melee mode). Now each toggle only appears when it's actually relevant to the selected weapons, unit abilities, and available stratagems.

This was a planned extension point documented in `docs/architecture-master.md` section 10 ("Dynamic Game State Population").

## Files Modified

| File | Change |
|------|--------|
| `app/src/types/config.ts` | Added `GameStateRelevance` interface with `'locked'` sentinel for inherent abilities |
| `app/src/logic/game-state-relevance.ts` | **New file.** Pure function `computeGameStateRelevance()` that scans weapon keywords + stratagem effects to determine toggle relevance |
| `app/src/components/layout/AppShell.tsx` | Added `useGameStateRelevance` hook, extracted `StatsPreview` component and `useFilteredStratagems` hook (also fixed pre-existing complexity lint error from 16 → under 15) |
| `app/src/components/game-state/GameState.tsx` | Accepts `relevance` prop, conditionally renders each `GameChip`, handles stealth `'locked'` state with "(always)" label |
| `app/src/store/slices/attacker.ts` | Added `clearIrrelevantToggles()` helper called on unit change to auto-deactivate stale game state |
| `app/src/store/slices/defender.ts` | Auto-enables `stealthAll: true` in `setDefenderUnit` when the unit has Stealth as a core ability |

## Key Decisions

### 1. Relevance as derived selector, not stored state
Computed via `useMemo` in AppShell rather than storing in Zustand. The computation is trivially cheap (iterates 1-5 weapons) and avoids cross-slice synchronization issues (relevance depends on both attacker weapons and defender abilities).

### 2. Stealth `'locked'` sentinel
When a defender unit inherently has Stealth (from `abilities.core`), the toggle appears as permanently pressed and disabled with "(always)" label. This is modeled as `stealthAll: boolean | 'locked'` in the relevance type, avoiding a separate boolean flag.

### 3. Available stratagems, not just active ones
The relevance scan checks all **available** stratagems from the selected detachment (not just those the user has toggled on). For example, if a detachment has a stratagem that grants `lance`, the "Charged" toggle appears even before the stratagem is activated.

### 4. AppShell complexity fix
The original `AppShell` was already at ESLint complexity 16 (limit 15) but was never caught because lint-staged only checks staged files. Extracted `StatsPreview` component and `useFilteredStratagems` hook to bring it under the limit.

## Keyword-to-Toggle Mapping

| Weapon Keyword | Toggle | Effect |
|---|---|---|
| `heavy` | Stationary | +1 hit if stationary |
| `assault` | Advanced | Can shoot after advancing |
| `rapid fire X` | Half Range | +X attacks at half range |
| `melta X` | Half Range | +X damage at half range |
| `lance` | Charged | +1 wound if charged |
| `pistol` | Engagement Range | Can shoot in engagement (non-MONSTER/VEHICLE) |

**Always relevant:** Cover (ranged), Stealth (ranged), Closest Unit (always)

**Stratagem-derived:** `lance` effect from stratagems makes Charged relevant

## Unfinished Work / Next Steps

1. **Stratagem-granted stealth**: Currently only checks `abilities.core` for inherent Stealth. Defender stratagems that grant stealth-like effects (-1 to hit) are not yet scanned for toggle relevance.

2. **Free-text ability parsing**: Some unit abilities grant keywords conditionally (e.g., "this weapon has the Heavy keyword when..."). These are encoded as free-text in `abilities.other[].description` and cannot be reliably parsed. The current implementation only handles `abilities.core` (standardized strings) and explicit weapon keywords.

3. **Stratagem effect on other toggles**: Currently only scans for `lance` in stratagem effects. Other stratagem effects (e.g., granting Heavy-like bonuses) could also drive toggle visibility but are not yet implemented.

4. **Indirect Fire visibility toggle**: The `indirect fire` weapon keyword implies a need for a "target visible" toggle that doesn't exist in the current game state. This is a separate feature request.

## Context for Future Sessions

- The relevance computation lives in `logic/game-state-relevance.ts` as a pure function — easy to extend with new rules
- `parseWeaponKeywords()` from `engine/keywords.ts` is the canonical keyword parser (regex-based, handles parameterized keywords)
- `resolveStratagemEffect()` from `logic/stratagem-effects.ts` maps stratagem names to `StratagemModifier` objects — used for stratagem-driven relevance
- The `GameStateRelevance` type in `types/config.ts` is the contract between the computation and the UI
