# Warhammer 40K Damage Statistics Calculator — Architecture & MVP Plan

> **Goal:** A TypeScript React app that lets users configure an attacking unit and a defending unit from any 10th Edition faction, then runs Monte Carlo simulations of the full attack sequence to show damage distributions (damage dealt, models killed, wounds remaining).

---

## 1. Data Foundation

We have pre-scraped, structured JSON for the entire game:

| Asset | Count | Source |
|-------|-------|--------|
| Datasheets | 1,632 units across 27 factions | `factions/datasheets/*.json` |
| Detachments | 164 | `factions/rules/*.json` |
| Stratagems | 1,044 | `factions/rules/*.json` |
| Enhancements | 588 | `factions/rules/*.json` |
| Faction index | 9 KB | `factions/index.json` |

All JSON is served **statically** from `public/data/factions/` — no API server needed. Factions are lazy-loaded on selection (~50–370 KB each).

---

## 2. User Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        ATTACKER                                  │
│                                                                  │
│  1. Pick faction ──→ loads datasheets + rules                   │
│  2. Pick detachment ──→ filters available stratagems            │
│  3. Pick unit ──→ shows stat line, weapons, abilities           │
│  4. Configure unit:                                              │
│     • Set model count (per model type, within min/max)          │
│     • Choose wargear options (replace/add per scope rules)      │
│     • Select which weapons fire + how many models fire each     │
│  5. Set game state: stationary / advanced / charged             │
│  6. Add stratagems (filtered by detachment + unit keywords)     │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│                        DEFENDER                                  │
│                                                                  │
│  1. Pick faction ──→ loads datasheets                           │
│  2. Pick unit                                                    │
│  3. Configure unit: model count + wargear                       │
│  4. Set game state: in cover / benefit of cover                 │
│  5. Add defensive stratagems (filtered by keywords)             │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│                       SIMULATE                                   │
│                                                                  │
│  Run N iterations (default 10,000) ──→ damage distribution      │
│  • Histogram of total damage dealt                               │
│  • Mean / median / percentiles for damage & models killed       │
│  • Mortal wounds breakdown                                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Attack Sequence (10th Edition Rules)

Each individual attack follows a strict 5-step sequence. The simulation engine implements every step faithfully.

### Step 1: Hit Roll
- Roll D6 ≥ BS (ranged) or WS (melee)
- **Nat 1** always fails, **nat 6** (Critical Hit) always succeeds
- Modifier capped at **±1** total
- **TORRENT**: auto-hit (skip roll entirely)
- **HEAVY** + remained stationary: +1 to hit
- **STEALTH** (all defender models): −1 to hit (ranged only)
- **INDIRECT FIRE** (target not visible): −1 to hit

### Step 2: Wound Roll
- Compare Strength vs Toughness:

| Condition | Required |
|-----------|----------|
| S ≥ 2×T | 2+ |
| S > T | 3+ |
| S = T | 4+ |
| S < T | 5+ |
| S ≤ T/2 | 6+ |

- **Nat 1** always fails, **nat 6** (Critical Wound) always succeeds
- Modifier capped at **±1** total
- **LETHAL HITS** on Critical Hit: auto-wound (skip wound roll)
- **TWIN-LINKED**: re-roll the wound roll
- **LANCE** + charged this turn: +1 to wound
- **ANTI-X Y+**: Critical Wound threshold lowered to Y+ against targets with keyword X

### Step 3: Allocate Attack
- Defender allocates to already-wounded model first
- In attached units: use bodyguard Toughness, can't allocate to Character until bodyguard dead
- **PRECISION**: can allocate to Character in attached unit

### Step 4: Saving Throw
- Roll D6 + AP modifier ≥ Save characteristic
- Or use **invulnerable save** (unaffected by AP)
- Defender chooses whichever is better
- **Nat 1** always fails
- **Benefit of Cover**: +1 to armour save (not invuln), restricted for Sv 3+ at AP 0
- **IGNORES COVER**: negates cover bonus
- Save improvement capped at **+1** total

### Step 5: Inflict Damage
- Failed save → model loses wounds equal to Damage characteristic
- Excess damage from a single attack **does NOT carry over** to next model
- **Feel No Pain X+**: roll D6 per wound lost; on X+, wound is ignored
- **DEVASTATING WOUNDS** on Critical Wound: inflict mortal wounds = Damage, skip save entirely
- **Mortal wounds DO carry over** between models
- Mortal wounds applied **after** all normal damage

### Weapon Abilities Implemented

| Ability | Effect |
|---------|--------|
| **SUSTAINED HITS X** | Critical Hit generates X extra hits (need wound rolls) |
| **LETHAL HITS** | Critical Hit auto-wounds (skip wound roll) |
| **DEVASTATING WOUNDS** | Critical Wound → mortal wounds = D, skip save |
| **ANTI-X Y+** | Lowers Critical Wound threshold to Y+ vs keyword X |
| **RAPID FIRE X** | +X attacks at half range |
| **BLAST** | +1 attack per 5 models in target unit |
| **MELTA X** | +X damage at half range |
| **TORRENT** | Auto-hit |
| **HEAVY** | +1 to hit if stationary |
| **LANCE** | +1 to wound if charged |
| **TWIN-LINKED** | Re-roll wound roll |
| **IGNORES COVER** | Target loses Benefit of Cover |
| **INDIRECT FIRE** | −1 to hit + cover if not visible |
| **HAZARDOUS** | Post-attack test: on 1, model destroyed / 3MW |
| **PRECISION** | Allocate to Character in attached unit |
| **EXTRA ATTACKS** | Attacks added on top of other weapons |
| **PISTOL** | Can fire in engagement range |
| **ASSAULT** | Can fire after advancing |

---

## 4. App Architecture

### Project Structure

```
app/                                    # Vite + React + TypeScript
├── public/data/factions/               # Symlink → ../../factions (static JSON)
└── src/
    ├── types/                          # TypeScript type definitions
    │   ├── data.ts                     # JSON data shapes (mirrors Pydantic models)
    │   ├── config.ts                   # Unit configuration & game state
    │   └── simulation.ts              # Simulation I/O types
    │
    ├── engine/                         # Pure simulation engine (zero React deps)
    │   ├── dice.ts                     # DiceExpr parser + roller
    │   ├── keywords.ts                 # Weapon keyword string → typed struct
    │   ├── modifiers.ts                # Compute hit/wound/save modifiers
    │   ├── attack.ts                   # Single attack 5-step sequence
    │   ├── weapon-resolver.ts          # All attacks from one weapon group
    │   ├── allocation.ts               # Damage allocation to defender models
    │   ├── simulation.ts               # Monte Carlo runner
    │   └── simulation.worker.ts        # Web Worker wrapper
    │
    ├── data/                           # Data loading + caching
    │   ├── loader.ts                   # Fetch faction index + data
    │   └── hooks.ts                    # React hooks for data access
    │
    ├── logic/                          # Business logic
    │   ├── wargear.ts                  # Wargear option validation + application
    │   ├── stratagems.ts               # Stratagem keyword filtering
    │   └── unit-config.ts              # Build configured unit for simulation
    │
    ├── store/                          # Zustand state management
    │   ├── store.ts
    │   └── slices/
    │       ├── attacker.ts
    │       ├── defender.ts
    │       └── simulation.ts
    │
    └── components/                     # React UI
        ├── layout/AppShell.tsx         # 3-panel layout
        ├── faction/                    # FactionPicker, DetachmentPicker, UnitPicker
        ├── unit-config/                # ModelCount, Wargear, WeaponSelector
        ├── game-state/                 # AttackerState, DefenderState, StratagemPicker
        ├── simulation/                 # Controls, ResultsSummary, ResultsChart
        └── shared/                     # StatLine, WeaponProfile, KeywordBadge
```

### Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Zustand** over React Context | Deeply nested config state → Context causes cascading re-renders. Zustand selectors give surgical updates. |
| **Pure engine in Web Worker** | 10K iterations × multiple weapons × dice rolls = millions of operations. Worker keeps UI responsive. Engine is independently unit-testable. |
| **Types mirror JSON exactly** | No runtime parsing at data boundary. Dice expressions parsed on-demand in engine layer. |
| **Static JSON from `public/`** | No API server. Lazy-load per-faction, cache in memory (~5 MB worst case all 25). |
| **Separated `logic/` layer** | Wargear validation, stratagem filtering, and unit configuration are complex business rules that don't belong in components or the engine. |

### Data Loading Strategy

1. **App mount**: Fetch `index.json` (9 KB) — populates faction picker
2. **Faction selected**: Parallel fetch `datasheets/{slug}.json` + `rules/{slug}.json` (50–470 KB combined)
3. **Caching**: Loaded factions stay in Zustand store for session duration

### Simulation Engine Flow

```
For each of N iterations:
  ├── For each weapon group (weapon profile × firing models):
  │   ├── Roll number of attacks (DiceExpr + rapid fire + blast)
  │   ├── For each attack:
  │   │   ├── Step 1: Hit Roll (or auto-hit)
  │   │   │   └── On crit hit: queue sustained hits extras, mark lethal
  │   │   ├── Step 2: Wound Roll (or auto-wound if lethal)
  │   │   │   └── On crit wound + devastating: mortal wounds = D, skip save
  │   │   ├── Step 4: Save Roll (armor w/ AP, or invuln)
  │   │   └── Step 5: Roll damage (if variable)
  │   └── Collect: damage values[] + mortal wounds total
  │
  ├── Allocate all normal damage to defender model pool
  │   └── Excess per attack is LOST (no carry-over)
  ├── Apply mortal wounds (DO carry over between models)
  ├── Apply FNP to each wound lost
  └── Record: { totalDamage, modelsKilled, mortalWounds, hits, wounds, unsavedWounds }

Aggregate N results → { mean, median, stddev, percentiles, histogram }
```

### Wargear Configuration

The data has 5 wargear option scopes:

| Scope | Meaning | Example |
|-------|---------|---------|
| `this_model` | Any single model can swap | "Any model can replace its boltgun with..." |
| `all_models` | Every model swaps | "All models' boltguns can be replaced with..." |
| `named_model` | Specific model type | "The Sergeant's pistol can be replaced with..." |
| `specific_count` | N models total | "Up to 2 models can each take a special weapon" |
| `per_n_models` | 1 per N models | "For every 5 models, 1 can take a heavy weapon" |

The `logic/wargear.ts` module validates choices against these rules. The UI renders appropriate controls per scope (dropdown for named_model, counter for specific_count, etc.).

### Stratagem Filtering

Stratagems have `target_keywords` arrays like `["ADEPTUS ASTARTES INFANTRY"]`. Compound keywords are decomposed: each word must exist in the unit's `keywords` + `faction_keywords` arrays. This matches the Python `applies_to()` logic.

Filtering chain: **Faction → Detachment → Keyword match against selected unit**

---

## 5. MVP Limitations & Known Gaps

### Stratagem Effects (Biggest Gap)

**Problem:** Stratagem effects are free-text descriptions (e.g., *"Until the end of the phase, each time a model in your unit makes a ranged attack, improve the Armour Penetration characteristic of that attack by 1"*). There is no structured effect data.

**MVP approach:**
- Stratagems are **filterable and displayable** — users see which ones apply to their unit
- Only a **curated set of common effects** actually feed into the simulation engine:
  - +1/−1 to hit or wound rolls
  - Re-roll hits/wounds (all or ones)
  - AP improvement
  - Feel No Pain grants
  - Damage reduction
- Unrecognized stratagems show a **"not simulated"** badge
- Users can still select them for reference, they just won't affect the math

**Future:** Parse effect text with heuristics or LLM to extract structured modifiers.

### Enhancement Effects

Same limitation as stratagems — enhancements have free-text descriptions. MVP shows applicable enhancements (filtered by `keyword_restrictions`) but doesn't simulate their effects.

### Army Rules / Detachment Rules

Faction-level army rules (e.g., Oath of Moment) and detachment passive rules (e.g., Combat Doctrines) are **displayed but not simulated**. These often have complex conditional logic that requires manual mapping.

### Attached Units (Leader + Bodyguard)

The MVP does **not** model attached unit composition:
- No leader attachment configuration
- No bodyguard Toughness override
- No "can't allocate to Character" allocation rule
- PRECISION keyword is parsed but the allocation logic is simplified

**Future:** Add leader selection that modifies the defending unit's profile.

### Multi-Profile Units

Some units have **multiple stat lines** (e.g., different Toughness for different model types). The MVP uses a **single stat line** per unit. Mixed-Toughness units use the majority profile.

### Damaged Profiles

Units with `damaged` ability text (typically vehicles at half wounds) get degraded stats. The MVP does **not** apply mid-simulation stat degradation — the unit uses its undamaged profile throughout.

### Defender Weapon Choice (Fight Phase)

The defender's weapons are not relevant in the MVP — we only simulate the attacker shooting/fighting into the defender. Counter-attacks are not modeled.

### Overwatch / Fire Overwatch

Not simulated. Overwatch changes the hit roll to require an unmodified 6 — this could be added as a game state toggle.

### Battle-shock

Battle-shocked units can't use stratagems and have reduced OC. Not relevant to damage calculation, so not modeled.

### Hazardous Self-Damage

HAZARDOUS weapons require a post-attack test (D6 per hazardous weapon, 1 = model destroyed or 3 MW to Character/Monster/Vehicle). The MVP **parses and displays** the HAZARDOUS keyword but does **not** simulate self-damage to the attacking unit.

### Indirect Fire Visibility

INDIRECT FIRE imposes −1 to hit and grants cover when **no models are visible**. The MVP treats this as a binary toggle in the game state UI rather than modeling line-of-sight.

### Range

The MVP uses a binary **"half range" toggle** rather than exact distance. This correctly handles RAPID FIRE, MELTA, and BLAST. Exact range is not needed for damage calculation since we assume the target is in range.

### No Saved State / Sharing

No URL-based state encoding, local storage, or share links in MVP. Configuration is session-only.

---

## 6. Implementation Phases

### Phase 1: Foundation
- Vite + React + TS project setup
- All TypeScript type definitions
- Data loader + hooks
- FactionPicker + UnitPicker (verify data loads correctly)

### Phase 2: Simulation Engine
- `dice.ts`, `keywords.ts`, `modifiers.ts`
- `attack.ts` (5-step sequence)
- `weapon-resolver.ts`, `allocation.ts`
- `simulation.ts` + Web Worker
- Unit tests against analytically calculable scenarios

### Phase 3: Unit Configuration
- `logic/wargear.ts` + `logic/unit-config.ts`
- ModelCountSelector, WargearConfigurator, WeaponSelector
- Zustand store wiring

### Phase 4: Full Pipeline
- Wire simulation engine to store
- SimulationControls, ResultsSummary, ResultsChart (histogram)
- End-to-end: pick units → configure → simulate → see results

### Phase 5: Stratagems & Polish
- DetachmentPicker, StratagemPicker
- Curated stratagem effect parsing
- UI polish, responsive layout

---

## 7. Verification Scenarios

| Scenario | Expected | Tests |
|----------|----------|-------|
| 10 bolters (S4 AP0 D1) vs 10 Guardsmen (T3 Sv5+ W1) | ~4.44 kills avg | Hit 3+ (67%) × Wound 3+ (67%) × Failed save (67%) = ~2.96 per model × 10 models ÷ ... |
| Lascannon (S12 AP−3 D6+1) vs Rhino (T9 Sv3+ W10) | Calculable analytically | Wound on 3+, save on 6+, avg damage 4.5 |
| Torrent weapon (auto-hit) | 100% hit rate | No hit roll, proceed to wound |
| Sustained Hits 2 on crit | 3 total hits from one attack | 1 original + 2 sustained |
| Devastating Wounds on crit wound | Mortal wounds = D, no save | Skip step 4, apply MW |
| Anti-Vehicle 4+ vs VEHICLE | Crit wound on 4+ | Lower threshold from 6 to 4 |
| Melta 2 at half range | D + 2 damage | Damage bonus applied |
| Cover + AP 0 + Sv 3+ | No cover benefit | Restricted by rules |
| FNP 5+ | ~33% wounds ignored | Roll per wound lost |