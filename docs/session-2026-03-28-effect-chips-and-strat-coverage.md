# Session: Effect-Based Chips, Full Stratagem Coverage & Keyword Fix

**Date:** 2026-03-28

## Overview

Three major bodies of work in this session:

1. **Full stratagem classification** — Processed all 934 unique stratagems (1,044 including detachment duplicates) to 100% classification. Added 51 new manual effect table entries, 5 new engine modifier types, improved the auto-parser, and created a 638-entry non-simulatable registry.

2. **Keyword matching bug fix** — Found and fixed a fundamental bug in `matchesCompoundKeyword()` that prevented ANY stratagem from matching for Space Marines (and other factions with compound faction keywords like "ADEPTUS ASTARTES"). The function decomposed target keywords into individual words but didn't decompose the unit's keywords, so "ADEPTUS" was never found in a set containing only "ADEPTUS ASTARTES".

3. **Effect-based chip UI** — Replaced stratagem name chips ("STORM OF FIRE 1CP") with decomposed individual effect toggles ("+1 AP", "Ignores Cover"). Players see the mechanical effects rather than stratagem names, and each effect is independently toggleable.

## Files Created

| File | Description |
|------|-------------|
| `app/src/logic/effect-keys.ts` | Core module: EffectKey type, labels, decompose/recompose modifiers, derive available effects from stratagems, build synthetic effects for simulation, conflict groups |
| `app/src/components/game-state/EffectChips.tsx` | New chip component showing effect labels as toggleable pills |
| `app/src/logic/non-simulatable-registry.ts` | Type definitions + JSON import for non-simulatable stratagem registry |
| `app/src/logic/non-simulatable-data.json` | 638-entry data table mapping stratagem names to reason codes |
| `docs/stratagem-effects-checklist.md` | Full classification checklist (1,044/1,044 classified) |

## Files Modified

| File | Changes |
|------|---------|
| `app/src/utils/keyword-match.ts` | **Bug fix:** `matchesCompoundKeyword()` now decomposes multi-word unit keywords into individual words when building the lookup set. "ADEPTUS ASTARTES" now adds "ADEPTUS", "ASTARTES", and "ADEPTUS ASTARTES" to the set. Same fix applied to `matchesAllKeywordRestrictions()`. |
| `app/src/logic/stratagem-effects.ts` | Added 5 new `StratagemModifier` fields: `grantsStealth`, `grantsBenefitOfCover`, `ignoreHitPenalties`, `ignoreWoundPenalties`, `rerollSaves` |
| `app/src/logic/stratagem-effect-table.ts` | Added 51 new entries with new templates: `GRANTS_STEALTH`, `GRANTS_COVER`, `IGNORE_HIT_PENALTIES`, `IGNORE_ALL_PENALTIES`, `REROLL_SAVES_ONES` |
| `app/src/logic/stratagem-parser.ts` | Added 9 new regex patterns: characteristic improvements, alternate crit phrasing, save rerolls, stealth/cover grants |
| `app/src/engine/modifiers.ts` | Wired new modifier types into `computeModifiers()`. Extracted `finalizeModifiers()` helper to reduce cyclomatic complexity below lint limit. |
| `app/src/engine/attack.ts` | Added save reroll logic in `resolveSave()` with proper nat-1 handling |
| `app/src/types/simulation.ts` | Added `rerollSaves: RerollPolicy` to `ResolvedModifiers` |
| `app/src/types/config.ts` | Removed `ActiveStratagem` interface, added `ActiveEffectKey` type |
| `app/src/store/slices/attacker.ts` | Replaced `activeStratagems: ActiveStratagem[]` with `activeEffects: string[]`. Replaced `toggleAttackerStratagem` with `toggleAttackerEffect` (includes conflict group enforcement). |
| `app/src/store/slices/defender.ts` | Same changes as attacker slice |
| `app/src/store/slices/simulation.ts` | Uses `buildSyntheticEffect()` from effect-keys module instead of mapping `resolveStratagemEffect()` per stratagem |
| `app/src/components/layout/AppShell.tsx` | Wires `EffectChips` with `deriveAvailableEffects()`, replaces old `StratagemChips`. Added `useMemo`-based `attackerAvailableEffects`/`defenderAvailableEffects`. |
| `app/src/components/overlays/ConfigOverlay.tsx` | Removed `StratagemPicker` (effects are now on main screen) |
| `app/tsconfig.app.json` | Added `resolveJsonModule: true` for JSON import support |

## Files Removed

| File | Reason |
|------|--------|
| `app/src/components/game-state/StratagemChips.tsx` | Replaced by `EffectChips.tsx` |
| `app/src/components/game-state/StratagemPicker.tsx` | No longer needed (effects are on main screen) |

## Key Decisions

1. **Keyword matching fix**: Rather than checking for exact whole-string matches first, we decompose ALL multi-word keywords into their constituent words when building the lookup set. This correctly handles both `"ADEPTUS ASTARTES"` (simple faction keyword) and `"ADEPTUS ASTARTES INFANTRY"` (compound target keyword requiring unit to have all three words as keywords).

2. **Effect-based UI over stratagem names**: Players know effects (+1 AP, Ignores Cover) better than stratagem names (STORM OF FIRE). Effects are independently toggleable — toggling "+1 AP" doesn't force "Ignores Cover" on. This gives more granular control.

3. **Conflict groups**: Mutually exclusive effects auto-resolve when toggled. E.g., enabling "Reroll Hits" automatically disables "Reroll 1s (Hit)". Groups defined in `CONFLICT_GROUPS` array.

4. **Data-driven decompose/recompose**: Refactored from 25+ if-statements to data-driven loops over field arrays (`SIGNED_FIELDS`, `NUMERIC_FIELDS`, `ENUM_FIELDS`, `BOOL_FIELDS`) to stay under ESLint's complexity limit of 15.

5. **Non-simulatable registry split**: Moved 638-entry data table to a JSON file to stay under ESLint's 450-line limit, keeping only type definitions in the TS module.

6. **Conditionals simplified**: In the old system, conditional stratagem effects ("+1 AP if Charged") were evaluated at simulation time. In the new system, each effect is an independent toggle. The user decides whether to enable it. This is more flexible — users can apply effects whose conditions the simulator can't track.

## Stratagem Coverage Summary

| Category | Count |
|----------|-------|
| Manual table entries | 351 |
| Auto-parsed by regex | 3 |
| Non-simulatable (with reason codes) | 638 |
| **Total classified** | **1,044/1,044 (100%)** |

## Unfinished Work / Next Steps

1. **Pre-existing lint errors**: `ModelGroup` (complexity 26), `UnitConfigurator` (complexity 23), and `wargear-slots.ts` (469 lines) have pre-existing lint violations unrelated to this session's work.

2. **Flaky Monte Carlo test**: `stratagem-parser.test.ts` "damage bonus increases per-wound damage" occasionally fails due to comparing means of random distributions. Pre-existing.

3. **Set-characteristic stratagems**: INFERNAL FUSILLADE (set Strength to 5) can't be handled with the current +N bonus system. Would need a `strengthOverride` field.

4. **UI polish for effect chips**: Could add tooltips showing which stratagem(s) provide each effect, or group offensive/defensive effects visually.

5. **Default detachment**: The store initializes `detachmentName: null` with no auto-default. Users must manually select a detachment in the ConfigOverlay before effects appear. Consider auto-selecting the first detachment.

## Verification

- `npx tsc -b --noEmit` — Clean
- `npx vitest run` — 117/117 pass
- `npm run build` — Success (939 KB JS)
- `npx eslint` on all changed files — Clean (pre-existing errors only in untouched files)
