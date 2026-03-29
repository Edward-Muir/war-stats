# Session: Unit Ability Classification & Engine Integration

**Date:** 2026-03-29

## Overview

Classified unit abilities across all 25 factions and wired them into the existing effect pipeline. Every unit datasheet has an `abilities.other` array of named abilities with descriptions — these were previously displayed in the UI but not processed by the simulation engine. This session adds infrastructure to auto-apply always-on ability effects as locked chips and expose conditional abilities as toggleable chips, using the same `StratagemModifier` system that stratagems, army rules, detachment rules, and enhancements already use.

### Results

- **332 simulatable ability entries** across three lookup tables (134 Imperium, 64 Chaos, 134 Xenos)
- **~1,680 non-simulatable** abilities classified by reason (leader, aura, movement, once_per_battle, morale, targeting, transport, spawning, other)
- **2,012 total ability instances** examined across 25 factions (1,468 unique names)

## Methodology

1. **Infrastructure first** — Created the `AbilityEffectEntry` type, three-tier resolver, `deriveAbilityEffects()`, wired into `useAvailableEffects` hook, added `autoEffects` to store slices, locked chip rendering
2. **5 parallel classification agents** grouped by faction:
   - (A) Space Marines, Grey Knights, Imperial Agents, Imperial Knights, Titanicus
   - (B) Aeldari, Drukhari, T'au, Leagues of Votann
   - (C) All Chaos factions (CSM, DG, TS, WE, EC, CK, Daemons)
   - (D) Adepta Sororitas, Custodes, Adeptus Mechanicus, Astra Militarum, Unaligned
   - (E) Necrons, Orks, Tyranids, Genestealer Cults
3. **Consolidation** — Agent outputs cross-checked, deduplicated, and coded into lookup tables

## Files Created

| File | Description |
|------|-------------|
| `app/src/logic/ability-effects.ts` | `AbilityEffectEntry` type, `AbilitySide`, `AbilityActivation`, `resolveAbilityEffect()` (three-tier key lookup: bare name → faction::name → faction::unit::name), `deriveAbilityEffects()` returning available + auto-apply effect keys |
| `app/src/logic/ability-effect-tables/index.ts` | Merges and re-exports all faction group tables into single `ABILITY_EFFECTS` record |
| `app/src/logic/ability-effect-tables/imperium.ts` | 134 entries — SM, GK, IA, IK, Custodes, Sororitas, Mechanicus, Militarum, Unaligned |
| `app/src/logic/ability-effect-tables/chaos.ts` | 64 entries — CSM, DG, TS, WE, EC, CK, Daemons |
| `app/src/logic/ability-effect-tables/xenos.ts` | 134 entries — Aeldari, Drukhari, T'au, LoV, Necrons, Orks, Tyranids, GSC |

## Files Modified

| File | Change |
|------|--------|
| `app/src/hooks/useAvailableEffects.ts` | Added `datasheet`, `factionSlug`, `side` params; calls `deriveAbilityEffects()` and merges ability keys into available set; returns `{ available, abilityAutoApply }` instead of flat array |
| `app/src/store/slices/attacker.ts` | Added `autoEffects: string[]` to slice state; `setAttackerUnit()` calls `deriveAbilityEffects()` and seeds `activeEffects` with auto-apply keys; `toggleAttackerEffect()` blocks toggle on locked effects; `setAttackerDetachment()` preserves auto-effects on detachment change |
| `app/src/store/slices/defender.ts` | Same changes as attacker slice for defender side |
| `app/src/components/game-state/EffectChips.tsx` | Added `lockedEffects?: EffectKey[]` prop; locked chips render disabled with `ring-1 ring-inset` styling |
| `app/src/components/layout/AppShell.tsx` | Added `useMemo` import; derives attacker/defender datasheets from loaded faction data (with chapter-matching for SM sub-chapters); passes datasheet/factionSlug/side to `useAvailableEffects`; passes `autoEffects` to `EffectChips` as `lockedEffects` |

## Key Types

```typescript
type AbilitySide = 'offensive' | 'defensive';
type AbilityActivation = 'always' | 'conditional';

interface AbilityEffectEntry {
  side: AbilitySide;
  activation: AbilityActivation;
  modifiers: StratagemModifier;  // Reuses existing 31-field type
  conditionals?: ConditionalModifier[];
  combatType?: CombatType;  // 'ranged' | 'melee' | 'any'
}
```

## Key Decisions

1. **Reuse `StratagemModifier` type** — No new modifier fields. Abilities flow through the same `computeModifiers()` → `resolveAttack()` pipeline as stratagems, army rules, detachment rules, and enhancements.

2. **Two activation modes** — `'always'` abilities auto-apply as locked (non-toggleable) chips on unit selection. `'conditional'` abilities appear as regular toggleable chips. This matches user expectation that intrinsic passive abilities "just work."

3. **Three-tier key lookup** — Bare name first (covers 93% of abilities), then `faction::name`, then `faction::unit::name` for collision resolution. Matches the enhancement table pattern.

4. **Leader abilities classified as non-simulatable** — Abilities with "while this model is leading a unit" are excluded because the attached-unit mechanic isn't implemented. These are common (~30% of all abilities) and will become simulatable when leader attachment is added.

5. **Aura abilities excluded** — Cross-unit spatial effects ("friendly units within 6\"") require tracking multiple units, which is out of scope for the single attacker-defender pair architecture.

## Architecture Context

The effect pipeline now has five sources that all merge into the same `EffectKey[]` pool:

```
Stratagems ──→ resolveStratagemEffect() ──→ decomposeModifiers() ──→ EffectKey[]
Army Rules ──→ ARMY_RULE_EFFECTS table ──→ decomposeEntry() ──→ EffectKey[]
Det. Rules ──→ DETACHMENT_RULE_EFFECTS ──→ decomposeEntry() ──→ EffectKey[]
Enhancements → ENHANCEMENT_EFFECTS ────→ decomposeEntry() ──→ EffectKey[]
Abilities  ──→ ABILITY_EFFECTS table ───→ deriveAbilityEffects() ─→ EffectKey[]  ← NEW

All → user toggles → buildSyntheticEffect() → computeModifiers() → resolveAttack()
```

Always-on ability effects bypass user toggles — they're auto-seeded into `activeEffects` and rendered as locked chips.

## Known Gaps Identified

### Pre-existing architectural limitations (not caused by this session)

1. **Per-weapon modifier scoping** — The effect system applies modifiers uniformly to all weapon groups in a unit. Abilities like "Target Elimination" (+2 attacks to bolt rifles only) apply the bonus to ALL weapons including grenade launchers. There's no mechanism to scope a modifier to a specific weapon within the unit.

2. **Weapon eligibility on advance** — When the Advanced toggle is active, non-Assault weapons should be excluded from the shooting sequence entirely, but they still fire. The `advanced` game state is only used as a condition for stratagem evaluation, not for weapon eligibility filtering.

### Classification gaps

3. **"Halve damage" abilities** — e.g., "Formidably Resilient" (Chaos Lord in Terminator Armour). `damageReduction` is a flat number, not a halving. Would need a `halveDamage: boolean` modifier field.

4. **"Re-roll ONE hit/wound roll" abilities** — e.g., "Ascended Daemon". Not the same as `rerollHits: 'ones'` (which re-rolls all 1s). These are single re-rolls per activation, which the modifier system doesn't support.

5. **Cross-boundary debuffs** — e.g., "Death Hex" (+1 AP on enemy unit), "Nurgle's Rot" (-1 Toughness on enemy). These modify the target from the attacker's side, crossing the attacker/defender effect boundary.

6. **Anti-keyword conditional abilities** — Many abilities grant bonuses "against MONSTER or VEHICLE" targets. These are classified as `conditional` since the engine doesn't have a `targetHasKeyword` condition type, but modeled as unconditional toggles.

## Verification

- `npx tsc -b --noEmit` — Clean
- `npx vitest run` — 179/179 tests pass
- `npm run build` — Production build succeeds (997 KB JS, 60 KB CSS)
- Bundle size increase: ~34 KB from ability lookup tables (963 → 997 KB)

## Next Steps

1. **Remove or reclassify `Target Elimination`** — Currently classified as `bonusAttacks: 2` but applies to all weapons, not just bolt rifles. Should be removed until per-weapon scoping is implemented.
2. **Weapon eligibility filtering on advance** — Non-Assault weapons should be excluded from the shooting sequence when Advanced is toggled.
3. **Leader ability support** — When attached-unit mechanic is implemented, ~600 leader-conditional abilities can be reclassified as simulatable.
4. **Non-simulatable registry** — Classification data for non-sim abilities exists in agent outputs but wasn't codified into a JSON registry (same gap as the rules session).
