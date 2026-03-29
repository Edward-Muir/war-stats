# Session: Decomposed Effect Chips — Per-Modifier Labels + Deduplication

**Date:** 2026-03-29

## Overview

Replaced source-name chip labels ("Oath of Moment", "Pan-spectral Scanning") with decomposed per-modifier chips that show what each effect actually does ("Reroll Hits", "+1 Wound", "Reroll 1s (Hit)"). Multi-modifier entries are split into individual toggleable chips, and duplicates across sources are deduplicated by label.

This follows the scoped effect system session from earlier the same day, which introduced `UnitEffect` objects but used source names as chip labels.

## Problem

The scoped effect system showed ability/rule/stratagem **names** on chips, which were opaque to users — "Oath of Moment (Full)" tells you nothing about what it does. Multi-modifier entries appeared as single chips, preventing independent toggling of individual effects. The user wanted:

1. Chips showing **what the effect does**: "+1 Hit", "Reroll Hits", "+2 Attacks (bolt)"
2. Multi-modifier entries decomposed into **independent per-modifier toggles**
3. Duplicates across sources **deduplicated** (set union)
4. Oathbound Speculator's missing +1 wound upgrade added

## Design Process

Extensive planning discussion explored and rejected several approaches before landing on the simplest solution:

1. **Exclusion groups** — rejected as overengineered (37 groups, new types, store logic, ongoing maintenance burden) for a damage calculator where users can self-select correctly
2. **Delta decomposition** — rejected because it creates implicit dependencies between entries (delta only makes sense if base is also active)
3. **Superset entries with label reform only** — almost accepted, but user wanted each modifier as its own toggle
4. **Per-modifier decomposition + dedup** — final approach: each modifier field becomes its own chip, duplicates removed by label

Key principle: **each table entry stays self-contained** (carries its complete effect), decomposition happens in the derive layer, deduplication happens in the hook.

## Solution

### Per-Modifier Decomposition

Each table entry's `StratagemModifier` is split into individual single-field `UnitEffect` objects at the derive layer. Example:

```
Oath of Moment (Full): { rerollHits: 'all', woundModifier: 1 }
  → UnitEffect { modifiers: { rerollHits: 'all' }, label: "Reroll Hits" }
  → UnitEffect { modifiers: { woundModifier: 1 }, label: "+1 Wound" }
```

### Deduplication

After merging all sources (abilities → rules → stratagems), chips with identical labels are deduplicated. First occurrence wins. This naturally handles overlapping entries like Oath of Moment base and full — both produce "Reroll Hits", only one chip shown.

### Conditional Entry Handling

Entries with `conditionals` (game-state-gated effects like "if stationary") are NOT decomposed — kept as single chips. Label uses the conditional's modifier summary if the base modifiers are empty.

### Scope Qualifiers

`formatEffectLabel()` appends weapon scope to labels: `+2 Attacks (bolt)`, `Sustained 1 (assault)`. This prevents incorrect deduplication between scoped and unscoped effects.

## Files Modified

### New Helper
- **`app/src/types/effects.ts`** — Added `formatEffectLabel(mods, scope?)` that generates chip labels from a single modifier + optional weapon scope qualifier

### Derive Function Changes
- **`app/src/logic/rule-effects.ts`** — Added `decomposeModifiers()` and `emitConditionalEffect()` helpers. `deriveRuleUnitEffects()` now decomposes army rules, detachment rules, and enhancements into per-modifier `UnitEffect` chips. Conditional entries kept as single chips.
- **`app/src/logic/ability-effects.ts`** — `deriveAbilityUnitEffects()` decomposes ability modifiers into per-modifier chips, preserving `weaponScope` on each. Conditional entries kept whole.
- **`app/src/logic/stratagem-effects.ts`** — `deriveStratagemUnitEffects()` decomposes stratagem modifiers into per-modifier chips. Conditional entries kept whole.

### Deduplication
- **`app/src/hooks/useAvailableEffects.ts`** — After merging all effect sources, deduplicates by `label` using a `Map`. First occurrence wins (ability → rule → stratagem priority).

### Data
- **`app/src/logic/enhancement-effect-table.ts`** — Added `'Oathbound Speculator (+1 Wound)': PLUS_1_WOUND` entry for the optional upgrade.

### Test Fix
- **`app/src/__tests__/scoped-effects.test.ts`** — Updated ID assertion from `ability::Astartes shield` to `ability::Astartes shield::invulnerableSave` (decomposed ID format).

## Key Decisions

| Decision | Rationale |
|----------|-----------|
| No exclusion groups | Overengineered for a calculator; users self-select correctly; engine clamps modifiers |
| No delta entries | Creates implicit dependencies between entries; each entry should be self-contained |
| Decompose in derive layer | Table entries stay as complete modifier sets; decomposition is a display concern |
| Dedup by label in hook | Natural dedup key; scope qualifier prevents incorrect merging of scoped effects |
| Don't decompose conditional entries | Conditionals are game-state-gated; decomposing would lose the condition association |
| Mobile-first: no tooltips | `title` attributes don't work on touch; `source` field preserved for future long-press |

## Results

- Build: passes (tsc + Vite)
- Tests: 186 pass (1 test updated for new ID format)
- Bundle: ~993 KB (unchanged)

## UX Examples

### Before → After

| Unit | Before | After |
|------|--------|-------|
| Intercessors (SM) | `[Oath of Moment] [Oath of Moment (Full)] [Target Elimination]` | `[Reroll Hits] [+1 Wound] [+2 Attacks (bolt)]` |
| Hearthkyn Warriors (LoV) | `[Pan-spectral Scanning] [Hostile Acquisition] [Oathbound Speculator] [VOID HARDENED]` | `[Reroll 1s (Hit)] [+1 Hit] [Reroll 1s (Wound)] [+1 Wound] [5+ FNP]` |
| CSM (Dark Pacts) | `[Dark Pacts (Lethal)] [Dark Pacts (Sustained)]` | `[Lethal Hits] [Sustained 1]` |

## Next Steps / Future Work

1. **Long-press detail** — `UnitEffect.source` carries the source name but isn't displayed. Could add a long-press interaction to show "Army Rule: Oath of Moment" on mobile.
2. **Conditional labels** — Entries with empty base and game-state conditionals show the conditional's modifier summary, but don't indicate the condition. Could add "(if stationary)" suffix.
3. **combatType on detachment rules** — Some entries like "Rain of Cruelty (Ranged)" / "(Melee)" lack `combatType` restriction. Needs a richer entry type or derive-layer override.
4. **More weapon scopes** — Only Target Elimination has `weaponScope`. Many abilities could benefit (Micromelta Round → melta weapons, Pyromaniaks → burna weapons, etc.).
5. **Delete `effect-keys.ts`** — Still contains only a comment; can be fully removed.
