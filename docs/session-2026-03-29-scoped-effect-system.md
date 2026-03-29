# Session: Scoped Effect System — Per-Weapon Ability Modifiers

**Date:** 2026-03-29

## Overview

Replaced the flat `EffectKey` decompose/recompose pipeline with structured `UnitEffect` objects that carry source identity, display label, and optional weapon scope through the entire effect system. This fixes the architectural shortcoming where abilities like **Target Elimination** (+2 attacks to bolt rifles only) incorrectly applied to ALL weapons, and adds advance weapon filtering (non-Assault weapons excluded when Advanced).

## Problem

The old pipeline:
```
Sources → decomposeModifiers() → EffectKey[] → merge/dedup → buildSyntheticEffect() → blanket effect → engine
```

Decomposing effects into flat strings like `bonusAttacks:2` erased:
1. **Source identity** — couldn't tell which ability/stratagem an effect came from
2. **Weapon scope** — no way to restrict effects to specific weapons
3. **Advance filtering** — non-Assault weapons still fired when Advanced=true

## Solution

New pipeline:
```
Sources → UnitEffect[] (with scope) → UI chips → active UnitEffect[] → engine (filters by scope per weapon)
```

### New Core Type

```typescript
interface UnitEffect {
  id: string;              // "ability::Target Elimination"
  label: string;           // Chip display text
  source: string;          // Tooltip with modifier summary
  side: 'attacker' | 'defender';
  activation: 'always' | 'toggle';
  combatType: CombatType;
  modifiers: StratagemModifier;
  conditionals: ConditionalModifier[];
  weaponScope?: WeaponScope;  // { weaponNameIncludes?, weaponHasKeyword? }
}
```

## Files Modified

### New Files
- **`app/src/types/effects.ts`** — `UnitEffect`, `WeaponScope` interfaces, `summarizeModifiers()` helper
- **`app/src/__tests__/scoped-effects.test.ts`** — 7 tests covering weapon scope filtering, keyword matching, combat type filtering, full simulation scoped vs unscoped damage, and always-on effect derivation

### Core Architecture Changes
- **`app/src/engine/modifiers.ts`** — Added `matchesWeaponScope()`, changed `foldAttackerEffects`/`foldDefenderEffects` to accept `UnitEffect[]` and check weapon scope before applying each effect. `computeModifiers` signature updated.
- **`app/src/types/simulation.ts`** — `SimulationInput.attackerEffects`/`defenderEffects` changed from `ParsedStratagemEffect[]` to `UnitEffect[]`
- **`app/src/store/slices/simulation.ts`** — `buildSimulationInput` filters `availableEffects` by `activeEffectIds` (replaces `buildSyntheticEffect`). Added advance weapon filtering: excludes non-Assault/non-Pistol weapons when `advanced === true`.

### Effect Source Builders
- **`app/src/logic/ability-effects.ts`** — Added `weaponScope` to `AbilityEffectEntry`, new `deriveAbilityUnitEffects()` builder returning `UnitEffect[]`
- **`app/src/logic/stratagem-effects.ts`** — New `deriveStratagemUnitEffects()` builder
- **`app/src/logic/rule-effects.ts`** — Rewritten with `deriveRuleUnitEffects()` builder (replaces `deriveAvailableRuleEffects`)

### Store
- **`app/src/store/slices/attacker.ts`** — `activeEffects: string[]` + `autoEffects: string[]` → `activeEffectIds: string[]` + `availableEffects: UnitEffect[]`. Added `setAttackerAvailableEffects()`. Toggle checks `activation === 'always'` instead of `autoEffects` array. Removed `getConflicting` import.
- **`app/src/store/slices/defender.ts`** — Same changes as attacker slice.

### UI
- **`app/src/hooks/useAvailableEffects.ts`** — Returns `UnitEffect[]` instead of `{ available: EffectKey[], abilityAutoApply: EffectKey[] }`
- **`app/src/components/game-state/EffectChips.tsx`** — Props changed to `availableEffects: UnitEffect[]`, `activeEffectIds: string[]`. Renders `effect.label`, uses `effect.source` as tooltip, derives locked state from `effect.activation === 'always'`.
- **`app/src/components/layout/AppShell.tsx`** — Wires new hook return type, adds `useEffect` to push available effects into store, updated EffectChips props.

### Data Tables
- **`app/src/logic/ability-effect-tables/imperium.ts`** — Target Elimination entry now includes `weaponScope: { weaponNameIncludes: 'bolt' }`

### Cleanup
- **`app/src/logic/effect-keys.ts`** — Gutted. All exports removed (`EffectKey`, `EFFECT_LABELS`, `CONFLICT_GROUPS`, `decomposeModifiers`, `recomposeModifiers`, `buildSyntheticEffect`, `deriveAvailableEffects`). File contains only a comment pointing to `types/effects.ts`.

### Test Updates
- **`app/src/__tests__/ability-effects.test.ts`** — `makeEffect` helper updated from `ParsedStratagemEffect` to `UnitEffect`
- **`app/src/__tests__/stratagem-parser.test.ts`** — Added `makeEffect` helper, replaced all inline old-format effect objects

## Key Decisions

| Decision | Rationale |
|----------|-----------|
| Source-based IDs (`ability::Name`) | Each effect is distinct; no collisions between same-modifier-different-source |
| No conflict groups | Engine accumulator + clamp already handles overlapping modifiers correctly |
| `availableEffects` in Zustand store | Needed by `buildSimulationInput` which runs outside React; synced via `useEffect` |
| `StratagemModifier` type unchanged | 31 modifier fields are correct and well-tested |
| Existing lookup tables unchanged | Only `AbilityEffectEntry` gains optional `weaponScope`; tables stable |
| Chip label = source name | More transparent than decomposed modifier labels; tooltip shows modifier summary |

## Results

- Build: passes (tsc + Vite)
- Tests: 186 pass (179 existing + 7 new)
- Lint: no new errors (3 pre-existing)
- Bundle: ~992 KB (unchanged)

## Next Steps / Future Work

1. **Add `weaponScope` to more abilities** — Only Target Elimination has been scoped so far. Audit the 332 ability entries across imperium/chaos/xenos tables for other weapon-scoped abilities.
2. **Per-model scoping** — The `WeaponScope` type is extensible. A future `modelName?: string` field could scope effects to specific models within a unit (needed for leader abilities once attached-unit mechanic is implemented).
3. **Leader ability support** — ~600 abilities classified as non-simulatable become viable once attached-unit mechanic lands.
4. **Rule side classification** — Army/detachment/enhancement rule effects currently show in both attacker and defender panels. Could classify them by offensive/defensive to reduce UI clutter.
5. **Delete `effect-keys.ts` file** — Currently contains only a comment; can be fully removed.
6. **Remove `ActiveEffectKey` type** — Unused type alias in `types/config.ts` line 125.
