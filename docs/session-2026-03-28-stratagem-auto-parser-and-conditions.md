# Session: Stratagem Auto-Parser, Conditions, and New Modifier Types

**Date:** 2026-03-28

## Overview

Extended the stratagem effects system with three major capabilities:

1. **Auto-parser** — regex-based parser that reads standardized `.effect` text from stratagem data and extracts simulation modifiers, eliminating the need to manually map every stratagem
2. **Condition system** — stratagems can now have game-state-dependent effects (e.g., "sustained hits 1 always, but crit 5+ only if remained stationary")
3. **New modifier types** — `bonusAttacks`, `strengthBonus`, `damageBonus` added to `StratagemModifier` and wired through the engine

Previously 300 of ~1,044 stratagems were manually mapped. The auto-parser and new entries increase coverage to ~340-350 (~37%). An audit of all ~745 unmapped stratagems revealed ~570 are game-state-only (movement, morale, OC) and fundamentally unsimulatable.

## Files Modified

| File | Change |
|------|--------|
| `app/src/logic/stratagem-effects.ts` | Added `bonusAttacks`, `strengthBonus`, `damageBonus` to `StratagemModifier`. Added condition system types (`ConditionType`, `StratagemCondition`, `ConditionalModifier`, `StratagemEffectEntry`). Updated `ParsedStratagemEffect` with `conditionals[]` and `confidence`. Updated `resolveStratagemEffect()` with parser fallback + Unicode normalization. Converted BATTLE DRILL RECALL and BLITZING FUSILLADE to conditional entries. Moved ONSLAUGHT OF FIRE and CRUCIBLE OF BATTLE to conditional (closestTarget). Added ~15 new manual entries for bonus attacks/strength/damage. |
| `app/src/logic/stratagem-parser.ts` | **New file.** Regex-based auto-parser with 23 pattern rules covering hit/wound modifiers, rerolls, AP, weapon abilities ([LETHAL HITS], [SUSTAINED HITS N], etc.), crit thresholds, defensive abilities, and characteristic bonuses. Detects conditional language ("if...below half", "instead", etc.) and rejects those for manual mapping. |
| `app/src/types/simulation.ts` | Added `strengthBonus: number` to `ResolvedModifiers` interface |
| `app/src/engine/modifiers.ts` | Major refactor: extracted `ModState` accumulator interface, `applyRollMods()`, `applyAbilityMods()`, `applyAttackerMod()`, `applyDefenderMod()`, `foldAttackerEffects()`, `foldDefenderEffects()` as top-level functions. Added `evaluateCondition()` switch for game-state-dependent effects. Wired `bonusAttacks` into `attacksBonus`, `strengthBonus` as new accumulator, `damageBonus` into existing accumulator. Reduced `computeModifiers` complexity from 38 to ~7. |
| `app/src/engine/weapon-resolver.ts` | Apply `modifiers.strengthBonus` when passing strength to `resolveAttack()` (line 50) |
| `app/src/logic/game-state-relevance.ts` | Updated `anyStratagemGrantsLance()` to also scan `effect.conditionals` array, not just base modifiers |
| `app/src/components/game-state/StratagemChips.tsx` | Three visual states based on `confidence`: manual (solid border), auto-parsed (dotted border), unparsed (dashed border + 50% opacity) |
| `app/src/__tests__/stratagem-parser.test.ts` | **New file.** 36 tests covering: parser regex patterns for all modifier types, confidence scoring, conditional language rejection, manual table priority, Unicode normalization, unparseable effects, conditional stratagem structure (BATTLE DRILL RECALL, BLITZING FUSILLADE, ONSLAUGHT OF FIRE, CRUCIBLE OF BATTLE), and engine integration tests for `strengthBonus`, `bonusAttacks`, `damageBonus` including conditional modifier evaluation with `closestTarget` and `weaponHasKeyword`. |

## Key Decisions

### 1. Dual entry format for STRATAGEM_EFFECTS

The mapping table supports two entry types via the `StratagemEffectEntry` union:
- **Simple**: `StratagemModifier` object (existing pattern, ~95% of entries)
- **Conditional**: `{ base: StratagemModifier, conditionals: ConditionalModifier[] }` for game-state-dependent effects

The `isConditionalEntry()` type guard distinguishes them. The `conditional()` helper function creates conditional entries ergonomically.

### 2. Parser rejects conditional text

The auto-parser detects conditional language patterns (`/\bif\b.*below half/`, `/\binstead\b/`, etc.) and returns `null` — forcing those stratagems to be manually mapped with proper condition definitions. This prevents incorrect unconditional application of modifiers that should be gated.

### 3. Condition evaluation in computeModifiers

`evaluateCondition()` was placed in `modifiers.ts` because `computeModifiers()` already receives all necessary context: `weapon.keywords` for `weaponHasKeyword`, `attackerState` for `remainedStationary`/`charged`/`advanced`, `defenderState` for `closestTarget`, and `weapon.targetInHalfRange`.

### 4. ModState accumulator pattern

The original `computeModifiers` had ESLint complexity 38. Refactored to use a mutable `ModState` interface with extracted helper functions (`applyRollMods`, `applyAbilityMods`, `foldAttackerEffects`, `foldDefenderEffects`) as top-level functions. This brought the function down to complexity ~7 while keeping the same behavior.

### 5. Parser inline vs separate file

Initially implemented the parser inline in `stratagem-effects.ts`, but extracted to `stratagem-parser.ts` to address the max-lines warning (480 > 450 limit). The remaining warning is on the data table file itself, which can't be meaningfully split.

### 6. strengthBonus applied at weapon-resolver call site

Rather than changing `resolveAttack()`'s signature, `strengthBonus` is applied at the call site in `resolveWeaponGroup()` as `weapon.strength + modifiers.strengthBonus`. This keeps the strength bonus visible where attacks are resolved while leaving `resolveAttack` unchanged.

## Condition System Architecture

Eight condition types defined, five fully functional:

| Condition | Evaluates Against | Status |
|-----------|-------------------|--------|
| `remainedStationary` | `attackerState.remainedStationary` | Working |
| `charged` | `attackerState.charged` | Working |
| `advanced` | `attackerState.advanced` | Working |
| `closestTarget` | `defenderState.closestTarget` | Working |
| `targetInHalfRange` | `weapon.targetInHalfRange` | Working |
| `weaponHasKeyword` | `weapon.keywords[X]` | Working |
| `belowHalfStrength` | — | Stubbed (returns false) |
| `battleShocked` | — | Stubbed (returns false) |

## Unfinished Work / Next Steps

### Need new game state toggles

1. **`belowHalfStrength`** — needed for 5 stratagems with tiered effects (AVENGE THE FALLEN tier 2, HEROES OF THE CHAPTER tier 2, THE SPOOR OF FRAILTY tier 2, PERSISTENT ASSAILANTS tier 2, EMISSARIES OF YNNEAD reroll upgrade). Requires a new toggle on `AttackerGameState` or `DefenderGameState`, plus UI in `GameState.tsx` and relevance computation in `game-state-relevance.ts`.

2. **`battleShocked`** — needed for 3 stratagems (PSY-CHAFF VOLLEY, PURGATION SWEEP tier 2, DISDAIN FOR THE WEAK). Same integration pattern.

### Faction-specific mechanics (not yet designed)

- **Space Marines Doctrine system** (3 stratagems): HONOUR THE CHAPTER, STORM OF FIRE, ADAPTIVE STRATEGY — need a doctrine selector
- **Space Marines Auspex Scanned** (2 stratagems): CODEX DISCIPLINE, GUIDED DISRUPTION — need an "auspex scanned" toggle
- **Space Marines Psychic Discipline** (4 stratagems): IRON ARM, FIERY SHIELD, ASSAIL, SENSORY ASSAULT — need a discipline selector
- **Drukhari Pain tokens** (1 stratagem): INSTINCTIVE SPITE
- **Target keyword matching** (2 stratagems): MERCY IS WEAKNESS, LIGHT OF VENGEANCE — effect varies by target type

### 9 already-mapped stratagems still applied unconditionally

BATTLE DRILL RECALL and BLITZING FUSILLADE were fixed. Seven remain that need faction-specific condition types before they can be corrected: HEROES OF THE CHAPTER, HONOUR THE CHAPTER, STORM OF FIRE, MERCY IS WEAKNESS, LIGHT OF VENGEANCE, PRESCIENT PRECISION, CODEX DISCIPLINE.

### Game state relevance scanning for conditions

`game-state-relevance.ts` currently only scans available stratagems for `lance` to decide if the "Charged" toggle should appear. With the condition system, it should also scan for conditions like `remainedStationary`, `closestTarget`, etc. to dynamically surface relevant toggles when a conditional stratagem is available.

## Context for Future Sessions

- The condition system is in `logic/stratagem-effects.ts` — add new condition types to `ConditionType` union and handle them in `evaluateCondition()` in `engine/modifiers.ts`
- To add a new conditional stratagem, use the `conditional()` helper: `conditional(baseModifiers, { condition: { type: '...' }, modifiers: { ... } })`
- The auto-parser lives in `logic/stratagem-parser.ts` — add new regex rules to `PARSER_RULES` array, and new conditional markers to `CONDITIONAL_MARKERS` if needed
- `ParsedStratagemEffect.confidence` has three levels: `'manual'` (from STRATAGEM_EFFECTS table), `'high'` (auto-parsed, no conditional language), `'low'` (not parsed)
- The `ModState` accumulator pattern in `engine/modifiers.ts` makes it straightforward to add new modifier fields — just add to the interface and the relevant `apply*Mod` function
- Pre-existing lint errors exist in `ModelGroup.tsx` (complexity 26) and `UnitConfigurator.tsx` (complexity 23) — not introduced by this session
