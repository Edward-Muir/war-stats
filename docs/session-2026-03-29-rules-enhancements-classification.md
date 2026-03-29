# Session: Classify Army Rules, Detachment Rules & Enhancements

**Date:** 2026-03-29

## Overview

Classified all 795 army rules, detachment rules, and enhancements across 25 factions — the same treatment stratagems received in the previous session. Every item is now either mapped to simulation modifiers in a lookup table or identified as non-simulatable. Effects from these rules now appear as toggleable chips in the UI alongside stratagem effects.

### Results

- **18 army rule entries** (of 43 total) mapped to `StratagemModifier` objects
- **124 detachment rule entries** (of 164 total) mapped to `StratagemModifier` objects
- **173 enhancement entries** (of 588 total) mapped to `StratagemModifier` objects
- **315 total simulatable** entries across three new lookup tables
- **480 non-simulatable** items (movement, deployment, morale, army composition, etc.)

## Methodology

1. **Checklist generation** — Script read all `factions/rules/*.json` files to auto-generate `docs/rules-effects-checklist.md` listing every army rule, detachment rule, and enhancement by faction
2. **5 parallel classification agents** grouped by faction (same grouping as stratagem session):
   - (A) SM, GK, IA, IK
   - (B) Aeldari, Drukhari, T'au, LoV
   - (C) All Chaos factions
   - (D) SoB, Custodes, AdMech, AM
   - (E) Necrons, Orks, Tyranids, GSC
3. **Consolidation** — Results cross-checked and coded into lookup tables
4. **Engine wiring** — New modifier fields added and threaded through simulation
5. **UI integration** — Rule effects merged into available EffectChips via `deriveAvailableRuleEffects()`

## Files Created

| File | Description |
|------|-------------|
| `app/src/logic/modifier-templates.ts` | Extracted shared modifier constants (`PLUS_1_HIT`, `FNP_5`, etc.) and helpers (`merge()`, `conditional()`) used by all four table files |
| `app/src/logic/army-rule-effect-table.ts` | 18 entries keyed by `"Faction::RuleName"` — Oath of Moment, Dark Pacts, Doctrina Imperatives, Waaagh!, etc. |
| `app/src/logic/detachment-rule-effect-table.ts` | 124 entries keyed by `"Faction::Detachment::RuleName"` — Combat Drugs, Shadow Masters, Relentless Rage, Patient Hunter, etc. |
| `app/src/logic/enhancement-effect-table.ts` | 173 entries keyed by enhancement name — Artificer Armour, Adaptive Biology, Berzerker Glaive, etc. |
| `app/src/logic/rule-effects.ts` | Resolver with `deriveAvailableRuleEffects()` + faction name normalization map |
| `docs/rules-effects-checklist.md` | Full checklist of all 795 items by faction |

## Files Modified

| File | Change |
|------|--------|
| `app/src/logic/stratagem-effect-table.ts` | Imports templates from `modifier-templates.ts` instead of defining locally |
| `app/src/logic/stratagem-effects.ts` | Extended `StratagemModifier` with 3 new fields: `toughnessBonus`, `woundsBonus`, `saveOverride` |
| `app/src/logic/effect-keys.ts` | Added labels, conflict groups, and `NUMERIC_FIELDS`/`MIN_FIELDS` entries for new values (+2/+3 Attacks, +2/+3 Strength, 3+ FNP, 3++/6++ Invuln, Sv 2+/3+, +1/+2 Toughness, +1/+2/+4 Wounds, +2 AP, +2 Damage) |
| `app/src/types/simulation.ts` | Added `toughnessBonus`, `woundsBonus`, `saveOverride` to `ResolvedModifiers` |
| `app/src/engine/modifiers.ts` | Added new fields to `ModState`; extracted `applyDefenderStatOverrides()` to keep `applyDefenderMod()` under complexity limit; wired through `finalizeModifiers` |
| `app/src/engine/attack.ts` | `toughnessBonus` adjusts effective toughness in wound threshold; `saveOverride` adjusts save target in `resolveSave()` |
| `app/src/engine/simulation.ts` | `woundsBonus` adjusts model wound pool for damage allocation |
| `app/src/components/layout/AppShell.tsx` | Merges `deriveAvailableRuleEffects()` output into `attackerAvailableEffects` and `defenderAvailableEffects` |

## New StratagemModifier Fields

| Field | Type | Engine Effect |
|-------|------|---------------|
| `toughnessBonus` | `number` | Added to `defender.toughness` before computing wound threshold in `resolveWoundRoll()` |
| `woundsBonus` | `number` | Added to `defender.wounds` when building the model pool for damage allocation |
| `saveOverride` | `number` | Replaces `defender.save` (if better) in `resolveSave()` before armour save check |

## Key Decisions

1. **Reuse `StratagemModifier` type** — No new effect type created. Army rules, detachment rules, and enhancements all map to the same modifier structure, flowing through the same `computeModifiers()` → `resolveAttack()` pipeline.

2. **Composite keys for lookup tables** — Army rules use `"Faction::RuleName"`, detachment rules use `"Faction::Detachment::RuleName"`, enhancements use bare names (with composite fallback for collisions). This handles multi-option rules (e.g., Combat Drugs with 6 options = 6 separate entries).

3. **Faction name normalization** — Data files use `"Leagues Of Votann"`, `"Tau Empire"`, `"Emperors Children"` but the tables use canonical game names with proper casing/punctuation. A `FACTION_NAME_MAP` in `rule-effects.ts` bridges this.

4. **Effect key deduplication** — Rule effects merge into the same `EffectKey` pool as stratagems. If a detachment rule grants `+1 to Hit` and a stratagem also does, they share the same chip — the ±1 cap in `computeModifiers()` handles overlap automatically.

5. **No UI component changes** — The existing `EffectChips` component renders any `EffectKey[]`, so rule/enhancement effects appear automatically as toggleable chips once wired into `availableEffects`.

## Bug Fix: Faction Name Mismatch

Discovered that Leagues of Votann, T'au Empire, and Emperor's Children had mismatched names between data files and lookup tables. Added `FACTION_NAME_MAP` normalization in `rule-effects.ts` to fix. Without this, effect chips for those three factions wouldn't appear.

## Verification

- `npx tsc -b --noEmit` — Clean
- `npx vitest run` — 179/179 tests pass
- `npm run build` — Production build succeeds (961 KB JS, 60 KB CSS)
- No new lint errors introduced (pre-existing ModelGroup complexity warning remains)

## Unfinished Work / Next Steps

1. **Non-simulatable registry** — The plan called for a `non-sim-rules-data.json` registry (like `non-simulatable-data.json` for stratagems) with reason codes for each non-simulatable item. This was not created — the classification data exists in agent outputs but wasn't codified into a JSON registry. Could add for tooltip support ("This ability affects movement, which is not simulated").

2. **Anti-keyword abilities** — Several enhancements grant `[ANTI-VEHICLE 4+]`, `[ANTI-INFANTRY 2+]`, etc. These are not yet simulatable because the engine doesn't support granting new anti-keyword abilities via modifiers. Would need a new `antiKeyword` field and engine support.

3. **Weapon keyword grants** — `[ASSAULT]`, `[HEAVY]`, `[RAPID FIRE]` grants from rules/enhancements are not modeled. These affect whether shooting after advancing incurs a penalty, which is a movement/eligibility concern rather than direct attack math.

4. **Damage override** — Some enhancements set damage to 1 (Mantle of Ophelia, Enhanced Voidsheen Cloak vs PSYKER). Would need a `damageOverride` field.

5. **Conditional FNP** — Several abilities grant FNP only vs psychic attacks or mortal wounds. Currently modeled as blanket FNP which overstates the effect.

6. **Checklist not updated with final marks** — `docs/rules-effects-checklist.md` has summary counts updated but individual items still show `[ ]` markers rather than `[x]`/`[-]`.

7. **WS/BS improvement** — Some rules improve WS/BS by 1, which is mechanically identical to +1 to Hit for the appropriate combat type. These are mapped as `hitModifier: 1` with the appropriate combat type implied by context, but the tables don't enforce combat type filtering (all entries use `combatType: 'any'` in the synthetic effect).

## Architecture Context

The effect pipeline now has four sources that all merge into the same `EffectKey[]` pool:

```
Stratagems ──→ resolveStratagemEffect() ──→ decomposeModifiers() ──→ EffectKey[]
Army Rules ──→ ARMY_RULE_EFFECTS table ──→ decomposeEntry() ──→ EffectKey[]    } merged in AppShell
Det. Rules ──→ DETACHMENT_RULE_EFFECTS ──→ decomposeEntry() ──→ EffectKey[]    } via deriveAvailableRuleEffects()
Enhancements → ENHANCEMENT_EFFECTS ────→ decomposeEntry() ──→ EffectKey[]

All → user toggles → buildSyntheticEffect() → computeModifiers() → resolveAttack()
```

The user sees a single unified set of effect chips. Toggling any chip activates/deactivates that modifier regardless of its source.
