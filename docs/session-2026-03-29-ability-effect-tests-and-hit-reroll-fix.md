# Session: Ability Effect Tests & Hit Reroll Bug Fix

**Date:** 2026-03-29

## Overview

Investigated a bug where toggling abilities like "Reroll 1s (Hit)" and "Sustained Hits" in the WH40K damage calculator appeared to have no effect on simulation results. Discovered that hit rerolls were never implemented in the simulation engine, created comprehensive tests for all 30 ability categories, and fixed two bugs.

## Bugs Fixed

### 1. Hit Rerolls Not Implemented (Critical)

**File:** `app/src/engine/attack.ts` — `resolveHitRoll()`

The `modifiers.rerollHits` field was computed and passed through the entire pipeline (store → effects → modifiers → engine) but was **never applied** in the hit roll function. The wound reroll (`resolveWoundRoll`) was correctly implemented — the hit reroll was simply missing.

**Fix:** Added hit reroll logic mirroring the wound reroll pattern:
- `rerollHits: 'ones'` — rerolls natural 1s
- `rerollHits: 'all'` — rerolls any miss that isn't already a crit hit

Rerolls happen before modifiers per 10th Edition rules.

### 2. Wound Reroll-All Incorrectly Rerolling Anti-X Crit Wounds (Edge Case)

**File:** `app/src/engine/attack.ts` — `resolveWoundRoll()`

The reroll-all condition (`unmodifiedWound < woundThreshold`) didn't account for Anti-X crit wound thresholds. Example: Anti-Vehicle 4+ with S3 vs T10 — a roll of 4 is a crit wound (auto-wound), but the reroll-all check saw `4 < 6` (normal wound threshold) and rerolled it, potentially losing a guaranteed success.

**Fix:** Added `&& unmodifiedWound < modifiers.critWoundOn` to the reroll-all condition.

## Files Modified

| File | Change |
|------|--------|
| `app/src/engine/attack.ts` | Added hit reroll logic to `resolveHitRoll()`; fixed wound reroll-all to not reroll Anti-X crit wounds |
| `app/src/__tests__/ability-effects.test.ts` | **New file** — 62 tests across 30 ability categories |

## New Test File: `ability-effects.test.ts`

Comprehensive Monte Carlo tests (5000 iterations each) verifying every ability produces a statistically measurable effect on damage output. Each ability has 2+ weapon/unit configurations.

### Test Categories

**Attacker effects (17 categories):**
- Reroll hits (ones, all, ones-vs-all comparison)
- Reroll wounds (ones, all, ones-vs-all comparison)
- Hit modifier (+1, -1)
- Wound modifier (+1, -1)
- Lethal hits (hard-to-wound and easy-to-wound targets)
- Sustained hits (ranged and melee)
- Devastating wounds (with Anti-X and standard crit wound)
- Critical hit threshold (paired with lethal hits and sustained hits)
- AP improvement
- Bonus attacks (fixed and variable attack counts)
- Bonus damage
- Strength bonus
- Ignores cover

**Defender effects (6 categories):**
- Benefit of cover
- Stealth
- Feel no pain (5+ and 4+, with ratio checks)
- Damage reduction (including D1 minimum floor)
- Reroll saves (ones, all, comparison)

**Weapon keyword abilities (7 categories):**
- Heavy + remained stationary
- Lance + charged
- Rapid Fire + half range
- Melta + half range
- Twin-Linked
- TORRENT (deterministic 100% hit rate checks)
- Blast (vs 10 and 20 model units)

**Edge cases (1 category):**
- Wound reroll + Anti-X crit wound interaction

## Key Decisions

1. **Separate test file** — Created `ability-effects.test.ts` instead of adding to existing `simulation.test.ts` to keep concerns clean (engine scenarios vs. ability validation).

2. **Statistical assertions** — Used relative comparisons (`greaterThan`/`lessThan`) rather than exact numeric ranges to avoid flaky Monte Carlo tests. A few tests (FNP, TORRENT) use tighter bounds where the math is deterministic or well-bounded.

3. **CritHitOn test design** — Lowering the crit threshold alone doesn't increase damage for BS3+ (crits that would have hit anyway). Tests pair `critHitOn: 5` with lethal/sustained hits to verify the amplification effect.

4. **Hit reroll "all" condition** — Uses `unmodifiedHit < skill && unmodifiedHit < modifiers.critHitOn` to avoid rerolling crit hits, matching the wound reroll pattern.

## Investigation: Sustained Hits

Sustained hits was reported as potentially broken but the full trace confirmed it works correctly at every level:
- Engine: crit hits set `sustainedExtraHits`, weapon-resolver queues extra auto-hit attacks
- Effects: `recomposeModifiers` correctly parses `'sustainedHits:1'` → `{ sustainedHits: 1 }`
- Modifiers: `applyAbilityMods` correctly adds effect sustained hits to weapon keyword sustained hits

The perceived issue was likely caused by the broken hit rerolls masking other effects, and sustained hits' inherently small signal (only triggers on nat 6, ~16.7% per attack).

## Test Results

- All 179 tests pass (62 new + 117 existing)
- Build succeeds (`tsc -b` + Vite)
- Lint clean on modified files (pre-existing lint errors in other files unchanged)

## Context for Future Sessions

- The ability effect tests provide a regression safety net — any future engine changes that break ability behavior will be caught.
- The `makeEffect()` helper creates `ParsedStratagemEffect` objects for use in tests, making it easy to add new ability tests.
- The wound reroll + Anti-X interaction fix is a subtle edge case — if adding new reroll mechanics, ensure crit thresholds are respected.
