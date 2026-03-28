# Session: Full Stratagem Classification & Engine Extensions

**Date:** 2026-03-28

## Overview

Processed all 934 unique stratagems (1,044 including detachment duplicates) across 25 factions to achieve **100% classification**. Every stratagem is now either mapped to simulation modifiers, auto-parsed by regex, or explicitly marked as non-simulatable with a reason code.

### Before
- 292 stratagems in manual effect table
- 30 caught by auto-parser
- ~612 unclassified (unknown whether simulatable or not)

### After
- **351 manual table entries** (+59 new)
- **3 auto-parsed** (many former auto-parsed promoted to manual)
- **638 non-simulatable** with reason codes (new registry)
- **0 gaps** remaining

## Files Modified

### Engine Extensions
- **`app/src/logic/stratagem-effects.ts`** — Added 5 new `StratagemModifier` fields: `grantsStealth`, `grantsBenefitOfCover`, `ignoreHitPenalties`, `ignoreWoundPenalties`, `rerollSaves`
- **`app/src/types/simulation.ts`** — Added `rerollSaves: RerollPolicy` to `ResolvedModifiers`
- **`app/src/engine/modifiers.ts`** — Wired new modifier types into `computeModifiers()`: stealth grants -1 hit for ranged, cover grants benefit of cover, ignore-penalties clamps modifiers to >= 0. Added fields to `ModState`.
- **`app/src/engine/attack.ts`** — Added save reroll logic in `resolveSave()` with proper nat-1 handling

### Parser Improvements
- **`app/src/logic/stratagem-parser.ts`** — Added 9 new regex patterns: characteristic improvements (Strength/Attacks/Damage via "improve...characteristic...by N"), alternate crit threshold phrasing, save reroll detection, Stealth/Cover ability grants

### Manual Table Expansion
- **`app/src/logic/stratagem-effect-table.ts`** — Added 51 new entries across categories:
  - Strength + AP combos (7): STRIKE FROM THE SHADOWS, CLOSE-QUARTERS BARRAGE, etc.
  - Stat bonuses (5): EYE OF THE GODS, GNAWING HUNGER, IRON ARM, etc.
  - Grants Stealth (4): SHINING VEIL, FESTERING MIASMA, SHROUD OF CHAOS, PSYCHIC ABOMINATIONS
  - Grants Stealth + Cover (5): SMOKESCREEN, DISPERSED FORMATION, STORM OF DARKNESS, etc.
  - Ignore hit penalties (5): AGGRESSIVE ANTICIPATION, LIGHT OF THE EMPEROR, etc.
  - Ignore all penalties (4): MACHINE FOCUS, MALEVOLENT ANIMUS, etc.
  - Reroll saves (2): DAEMONIC INVULNERABILITY, FATE SYPHONING
  - New reusable templates: `GRANTS_STEALTH`, `GRANTS_COVER`, `IGNORE_HIT_PENALTIES`, `IGNORE_ALL_PENALTIES`, `REROLL_SAVES_ONES`

### New Files
- **`app/src/logic/non-simulatable-registry.ts`** — 638-entry registry mapping stratagem names to `NonSimReason` codes (movement, charge, deployment, morale, objective_control, targeting, heal, fight_order, cp, overwatch, heroic_intervention, other). Enables future UI tooltips.

### Documentation
- **`docs/stratagem-effects-checklist.md`** — Regenerated with full classification: `[x]` manual, `[~]` auto-parsed, `[-]` non-sim with reason, `[ ]` gap. Shows per-faction breakdown.

## Key Decisions

1. **Unicode normalization** — Ork stratagems use curly apostrophes (`\u2019`) in data files. The manual table uses straight quotes. The existing `normalizeName()` function in `stratagem-effects.ts` handles runtime lookups, but the non-simulatable registry needed entries with both variants for some names.

2. **Grants Stealth/Cover as modifier fields** — Rather than modifying the defender game state directly, these are applied during `computeModifiers()` to avoid mutating shared state. Stealth applies -1 hit for ranged (same as `stealthAll`), Cover forces `benefitOfCover: true` via a spread copy.

3. **Ignore penalties as post-processing** — `ignoreHitPenalties`/`ignoreWoundPenalties` are applied after all modifiers are accumulated but before the +-1 cap, clamping negative values to 0.

4. **Save rerolls** — Implemented by extracting a `passes()` helper inside `resolveSave()` that checks both armour and invuln. Reroll is attempted if the first roll fails, following the same ones/all pattern as hit/wound rerolls.

5. **Choose-one stratagems** (e.g., HARDENED KILLERS) — Mapped to the most common/impactful option. Full choice UI would require a different approach.

6. **Set-characteristic stratagems** (e.g., INFERNAL FUSILLADE sets S to 5) — Classified as non-simulatable (`other`) since the engine uses bonuses (+N) not absolute overrides.

## Methodology

- **5 parallel research agents** classified all unmapped stratagems by reading effect text from faction rules JSON files
- Agents grouped by faction: (A) SM/GK/IA/IK, (B) Aeldari/Drukhari/Tau/LoV, (C) all Chaos, (D) SoB/Custodes/AdMech/AM, (E) Necrons/Orks/Tyranids/GSC
- Results consolidated, cross-checked against actual effect text, and corrected (IMPERIOUS ADVANCE was movement not attacks, INFERNAL FUSILLADE sets S not +S)

## Non-Simulatable Breakdown

| Reason | Count | Examples |
|--------|-------|---------|
| movement | 189 | Fall back, advance, deep strike, pile in |
| other | 142 | Miracle dice, army-specific rules, mortal wound reflection |
| deployment | 73 | Strategic reserves, reinforcements |
| charge | 49 | Charge roll mods, charge eligibility |
| heal | 31 | Regain wounds, return models |
| fight_order | 31 | Fights first/last, counter-offensive |
| morale | 27 | Battle-shock, leadership tests |
| objective_control | 27 | OC modifications, sticky objectives |
| targeting | 26 | Bodyguard, precision, look out sir |
| overwatch | 14 | Fire overwatch |
| heroic_intervention | 4 | Heroic intervention |
| cp | 2 | Command point refund |

## Unfinished Work / Next Steps

1. **Flaky Monte Carlo test** — `stratagem-parser.test.ts` "damage bonus increases per-wound damage" occasionally fails due to comparing means of random distributions (52.064 vs 52.071). Pre-existing, not caused by this session. Should increase iteration count or widen tolerance.

2. **UI integration of non-simulatable registry** — The `NON_SIMULATABLE` table exists but isn't wired into the UI yet. Could show tooltips like "This stratagem affects movement, which is not simulated."

3. **Set-characteristic stratagems** — INFERNAL FUSILLADE (set S to 5) and similar could be handled with a new `strengthOverride` modifier field if desired.

4. **THIN THEIR RANKS** — Grants [RAPID FIRE 1] ability. Would need a new `grantRapidFire` modifier field to handle properly.

5. **Conditional accuracy** — ~50 manual table entries have conditional language that's mapped as unconditional (e.g., "+1 wound if below half strength"). Could be upgraded to use `conditional()` if `belowHalfStrength` condition is implemented.

6. **Auto-parser could catch more** — Adding patterns for "weapons gain [TWIN-LINKED]" or "weapons gain [ASSAULT]" could auto-parse a few more stratagems.

## Verification

- `npx tsc -b --noEmit` — Clean (no type errors)
- `npx vitest run` — 117/117 tests pass (flaky MC test passes on re-run)
- `npm run build` — Production build succeeds (938 KB JS, 57 KB CSS)
