# Warhammer 40,000 10th Edition — Attack Sequence Rules Reference

> **Purpose:** This document is a comprehensive technical reference for implementing a statistics/simulation app that resolves attacks from attacking units into defending units. All rules are sourced exclusively from the official Warhammer 40,000 Core Rules (September 2024 edition).

---

## 1. Overview: The Attack Sequence

Attacks are made using ranged or melee weapons. Each individual attack follows a strict 5-step sequence:

```
STEP 1: Hit Roll
    ↓ (success)
STEP 2: Wound Roll
    ↓ (success)
STEP 3: Allocate Attack
    ↓
STEP 4: Saving Throw
    ↓ (failed save)
STEP 5: Inflict Damage
```

If any step fails (hit roll misses, wound roll fails, or saving throw succeeds), the attack sequence ends and no damage is dealt by that attack.

---

## 2. Datasheet Characteristics (Inputs)

### Model Profile Characteristics
| Stat | Name | Description |
|------|------|-------------|
| M | Move | Speed in inches |
| T | Toughness | Resilience against physical harm |
| Sv | Save | Armour saving throw value |
| W | Wounds | Damage a model can sustain before being destroyed |
| Ld | Leadership | Used for Battle-shock tests (2D6, roll >= Ld to pass) |
| OC | Objective Control | Control over objectives |

### Weapon Characteristics
| Stat | Name | Description |
|------|------|-------------|
| Range | Range | How far the weapon can shoot. "Melee" = melee only. |
| A | Attacks | Number of attacks made each time the weapon is used |
| WS | Weapon Skill | To-hit threshold for melee attacks |
| BS | Ballistic Skill | To-hit threshold for ranged attacks |
| S | Strength | How likely the weapon is to wound a foe |
| AP | Armour Penetration | Ability to cut through target's defences (expressed as negative number, e.g., -1, -2) |
| D | Damage | Amount of damage inflicted by a successful wound |

**Random Characteristics:** Some stats are expressed as dice values (e.g., D6, 2D6, D3, D6+2). Roll to determine the value on a per-weapon, per-model, or per-attack basis each time that characteristic is required.

---

## 3. Step 1 — Hit Roll

When a model makes an attack, roll one D6.

### Ranged Attacks
- A hit is scored if the D6 result **equals or exceeds** the attack's **Ballistic Skill (BS)**.

### Melee Attacks
- A hit is scored if the D6 result **equals or exceeds** the attack's **Weapon Skill (WS)**.

### Critical Hits
- An **unmodified** Hit roll of **6** is a **Critical Hit** and is **always successful**, regardless of modifiers.

### Automatic Failure
- An **unmodified** Hit roll of **1 always fails**, regardless of modifiers.

### Hit Roll Modifier Caps
- A Hit roll can **never be modified by more than -1 or +1** total.

### Number of Attacks
- A model shooting a ranged weapon makes a number of attacks equal to that weapon's **Attacks (A)** characteristic.
- A model fighting with a melee weapon makes a number of attacks equal to that weapon's **Attacks (A)** characteristic.

---

## 4. Step 2 — Wound Roll

Each time an attack scores a hit, make a Wound roll by rolling one D6. The required result depends on comparing the attack's **Strength (S)** to the target's **Toughness (T)**.

### Wound Roll Table

| Strength vs Toughness | D6 Required |
|-----------------------|-------------|
| S is **TWICE** (or more than twice) T | **2+** |
| S is **GREATER** than T | **3+** |
| S is **EQUAL** to T | **4+** |
| S is **LESS** than T | **5+** |
| S is **HALF** (or less than half) T | **6+** |

### Critical Wounds
- An **unmodified** Wound roll of **6** is a **Critical Wound** and is **always successful**.

### Automatic Failure
- An **unmodified** Wound roll of **1 always fails**.

### Wound Roll Modifier Caps
- A Wound roll can **never be modified by more than -1 or +1** total.

---

## 5. Step 3 — Allocate Attack

If an attack successfully wounds the target unit, the **defending player** allocates that attack to one model in the target unit:

### Allocation Rules
1. If a model in the target unit has **already lost one or more wounds**, OR **has already had attacks allocated to it this phase**, that model **must** receive the attack.
2. Otherwise, the defending player may allocate the attack to **any model** in the target unit (visibility/range to the attacking model does not matter for allocation).

### Attached Units (Leader Rule)
- When a target is an Attached unit (Leader + Bodyguard), you must use the **Toughness characteristic of the Bodyguard models** for Wound rolls, even if the Leader has a different Toughness.
- Attacks **cannot be allocated to Character models** in an Attached unit while Bodyguard models remain.
- Once the last Bodyguard model is destroyed, remaining attacks can then be allocated to Character models.

---

## 6. Step 4 — Saving Throw

The defending player rolls one D6 for the model the attack was allocated to.

### Armour Save
1. Roll one D6.
2. **Modify** the result by the attack's **Armour Penetration (AP)**. For example, if AP is -1, subtract 1 from the dice result.
3. If the modified result **equals or exceeds** the model's **Save (Sv)** characteristic, the save is **successful** and the attack sequence ends (no damage).
4. If the modified result is **less than** the model's Save, the saving throw **fails** and the model suffers damage.

### Invulnerable Saves
- Some models have an **invulnerable save** on their datasheet.
- Each time an attack is allocated to a model with an invulnerable save, the controlling player **chooses** to use either the model's normal Save (modified by AP) **or** the invulnerable save — **not both**.
- Invulnerable saves are **never modified** by Armour Penetration.
- If a model has more than one invulnerable save, it can only use one of them — choose which.
- Invulnerable saves otherwise follow the normal saving throw rules.

### Save Modifiers
- An **unmodified** saving throw of **1 always fails**.
- A saving throw can **never be improved by more than +1** total.

### Benefit of Cover (Affects Saving Throws)
- When a ranged attack is allocated to a model that has the Benefit of Cover, **add 1** to the saving throw for that attack (excluding invulnerable saving throws).
- **Restriction:** Models with a Save characteristic of **3+ or better** cannot have the Benefit of Cover against attacks with an AP of **0**.
- Multiple instances of the Benefit of Cover are **not cumulative**.

---

## 7. Step 5 — Inflict Damage

If the saving throw fails:

1. The model suffers damage equal to the attack's **Damage (D)** characteristic.
2. Each point of damage causes the model to **lose one wound**.
3. If a model's Wounds are reduced to **0 or less**, it is **destroyed** and removed from play.
4. If a model loses several wounds from an attack and is destroyed, any **excess damage from that attack is lost** (does not carry over to other models).

### Feel No Pain (Applied During This Step)
Some models have **"Feel No Pain x+"** in their abilities.

- Each time a model with this ability **would lose a wound** (including from mortal wounds), roll one D6.
- If the result **equals or exceeds 'x'**, that wound is **ignored and not lost**.
- If a model has more than one Feel No Pain ability, you can only use **one** of them each time the model would lose a wound.

### Mortal Wounds
- Some effects inflict **mortal wounds** on a target unit.
- Each mortal wound inflicts **one point of damage** on the target unit.
- Mortal wounds are applied **one at a time**.
- **No Wound roll** or **saving throw** (including invulnerable saves) can be made against mortal wounds.
- Allocate mortal wound damage just like normal damage. Unlike normal attacks, **excess damage from mortal wounds is NOT lost** — it carries over to the next model in the unit.
- When a unit is selected to shoot or fight and its attacks inflict mortal wounds on the target, resolve any **normal damage first**, then apply any mortal wounds on that target, **even if the normal damage was saved**.

---

## 8. Weapon Abilities

These are keyword abilities found in a weapon's profile. They modify how the attack sequence works.

### ASSAULT
**[ASSAULT]**
- The bearer's unit can shoot with Assault weapons even if it **Advanced** this turn.
- When a unit that Advanced shoots, it can **only** resolve attacks with Assault weapons it is equipped with.

### HEAVY
**[HEAVY]**
- Each time an attack is made with a Heavy weapon, if the attacking model's unit **Remained Stationary** this turn, **add 1 to that attack's Hit roll**.

### RAPID FIRE
**[RAPID FIRE X]**
- Each time a Rapid Fire weapon targets a unit within **half** that weapon's range, the weapon's **Attacks characteristic is increased by 'x'**.
- Example: A weapon with A1 and [RAPID FIRE 1] targeting within half range makes 2 attacks.

### PISTOL
**[PISTOL]**
- A unit with Pistol-equipped models is eligible to shoot even while within **Engagement Range** of enemy units.
- When such a unit shoots, it can **only** resolve attacks using its Pistols, and can **only target** enemy units it is within Engagement Range of.
- A Pistol can target an enemy unit even if other friendly units are within Engagement Range of that enemy.
- A model equipped with Pistols (unless it is a Monster or Vehicle) must choose: shoot with Pistols **or** all other ranged weapons — **not both**.
- **Simulation Implementation:** The pistol OR/XOR restriction is enforced. Non-Monster/Vehicle units with both pistols and other ranged weapons default to firing non-pistol weapons. Users can toggle to pistols-only mode via the UI control.

### TORRENT
**[TORRENT]**
- Each time an attack is made with a Torrent weapon, that attack **automatically hits** the target. (No Hit roll is made.)

### IGNORES COVER
**[IGNORES COVER]**
- Each time an attack is made with an Ignores Cover weapon, the target **cannot have the Benefit of Cover** against that attack.

### TWIN-LINKED
**[TWIN-LINKED]**
- Each time an attack is made with a Twin-linked weapon, you can **re-roll that attack's Wound roll**.

### LETHAL HITS
**[LETHAL HITS]**
- Each time an attack is made with a Lethal Hits weapon, a **Critical Hit** (unmodified hit roll of 6) means the attack **automatically wounds the target**. (Skip the Wound roll entirely for that attack.)

### SUSTAINED HITS
**[SUSTAINED HITS X]**
- Each time an attack is made with a Sustained Hits weapon, if a **Critical Hit** is rolled (unmodified 6), that attack scores **'x' additional hits** on the target.
- The additional hits do NOT need their own Hit rolls but DO still need Wound rolls, saves, etc.
- Example: A melee weapon with [SUSTAINED HITS 2] rolls an unmodified 6 to hit. That scores a total of 3 hits on the target (1 from the successful Hit roll + 2 from Sustained Hits).

### DEVASTATING WOUNDS
**[DEVASTATING WOUNDS]**
- Each time an attack is made with a Devastating Wounds weapon, a **Critical Wound** (unmodified wound roll of 6) inflicts a number of **mortal wounds** on the target equal to the weapon's **Damage characteristic**, and the **attack sequence ends** (no saving throw is made against that attack).
- Example: A Devastating Wounds weapon with Damage 2 scores a Critical Wound. Instead of normal allocation and saves, the target suffers 2 mortal wounds.

### ANTI-KEYWORD X+
**[ANTI-KEYWORD X+]**
- Each time an attack is made with an Anti weapon against a target with the **matching keyword**, an unmodified Wound roll of **'x'+** scores a **Critical Wound**.
- This effectively lowers the threshold for Critical Wounds against specific target types.
- Example: [ANTI-VEHICLE 4+] means an unmodified Wound roll of 4, 5, or 6 is a Critical Wound when targeting a VEHICLE unit. [ANTI-PSYKER 2+] means an unmodified Wound roll of 2+ is a Critical Wound against PSYKER units.
- **Important interaction:** If a weapon has both ANTI-X and DEVASTATING WOUNDS, a Critical Wound (triggered at the lowered threshold) will inflict mortal wounds equal to the Damage characteristic.

### LANCE
**[LANCE]**
- Each time an attack is made with a Lance weapon, if the bearer made a **Charge move** this turn, **add 1 to that attack's Wound roll**.

### MELTA
**[MELTA X]**
- Each time an attack is made with a Melta weapon, if the target is within **half** the weapon's range, that attack's **Damage characteristic is increased by 'x'**.
- Example: A weapon with D6 damage and [MELTA 2] targeting within half range deals D6+2 damage.

### BLAST
**[BLAST]**
- Blast weapons make a random number of attacks. When determining how many attacks are made, **add 1** to the result for every **five models** in the target unit (rounding down).
- Blast weapons can **never** be used against a target that is within Engagement Range of any units from the attacking model's army (including its own unit).

### INDIRECT FIRE
**[INDIRECT FIRE]**
- Attacks can be made against targets that are **not visible** to the attacking unit.
- If **no models** in the target unit are visible when the target is selected, then each time an attack is made with an Indirect Fire weapon:
  - **Subtract 1** from that attack's Hit roll.
  - The target has the **Benefit of Cover** against that attack.
- If models ARE visible, the weapon fires normally with no penalty.

### PRECISION
**[PRECISION]**
- When targeting an **Attached unit**, if a Precision weapon successfully wounds, and a **Character model** in that unit is **visible** to the attacking model, the attacker can choose to allocate that attack to the Character model **instead of following normal allocation rules**.
- This bypasses the normal rule preventing attacks from being allocated to Characters in Attached units.

### HAZARDOUS
**[HAZARDOUS]**
- After a unit finishes shooting or fighting with Hazardous weapons, take one **Hazardous test** (roll one D6) for each Hazardous weapon used.
- On a roll of **1**, one model in the unit equipped with a Hazardous weapon (selected by the controlling player) is **destroyed**.
  - Exception: If the model is a **Character, Monster, or Vehicle**, it suffers **3 mortal wounds** instead of being destroyed.
- Note: If a Character model in an Attached unit is selected, the mortal wounds must be allocated to that Character first.

### EXTRA ATTACKS
**[EXTRA ATTACKS]**
- The bearer can attack with this weapon **in addition** to any other weapon it chooses to fight with.
- The number of attacks made with an Extra Attacks weapon **cannot be modified** by other rules.

### SUSTAINED HITS + LETHAL HITS Interaction
If a weapon has both Sustained Hits and Lethal Hits and scores a Critical Hit:
- The Lethal Hits ability causes that attack to **automatically wound** (skip Wound roll).
- The Sustained Hits ability generates **additional hits** that must proceed through the attack sequence normally (they need their own Wound rolls).

---

## 9. Unit Abilities Affecting Combat

### STEALTH
- If **every model** in a unit has this ability, each time a **ranged attack** is made against it, **subtract 1** from that attack's Hit roll.

### LONE OPERATIVE
- Unless part of an Attached unit, this unit can only be selected as the target of a ranged attack if the attacking model is **within 12"**.

### FEEL NO PAIN X+
- See Step 5 above. Each time the model would lose a wound, roll D6; on x+, the wound is not lost.

### DEADLY DEMISE X
- When this model is destroyed, roll one D6 before removing it. On a **6**, each unit within 6" suffers **'x' mortal wounds** (if 'x' is random, roll separately for each unit).

### FIGHTS FIRST
- Units with this ability (provided every model has it) fight in the **Fights First** step of the Fight phase, before other units.
- Units that made a **Charge move** this turn also have the Fights First ability (via the Charge Bonus).

---

## 10. Modifiers & Re-rolls Summary

### Re-rolls
- A dice can **never be re-rolled more than once**.
- Re-rolls happen **before modifiers** are applied.
- Rules referencing **"unmodified"** dice rolls refer to the result after re-rolls but **before** any modifiers.
- If a rule allows re-rolling a multi-dice roll (e.g., 2D6), you must re-roll **all** dice unless stated otherwise.

### Modifier Caps Summary
| Roll Type | Maximum Modifier |
|-----------|-----------------|
| Hit Roll | -1 to +1 |
| Wound Roll | -1 to +1 |
| Saving Throw | Cannot be improved by more than +1 |

### Unmodified Rolls of 1 and 6
| Roll | Unmodified 1 | Unmodified 6 |
|------|-------------|-------------|
| Hit Roll | Always fails | Always succeeds (Critical Hit) |
| Wound Roll | Always fails | Always succeeds (Critical Wound) |
| Saving Throw | Always fails | N/A (just a high roll) |

---

## 11. Big Guns Never Tire (Monster/Vehicle Shooting in Engagement)

**Monster** and **Vehicle** units have special shooting rules:
- They are eligible to shoot even while within **Engagement Range** of enemy units.
- Their ranged weapons can target enemy units they are within Engagement Range of (even if other friendly units are also in Engagement Range of that enemy).
- Each time a ranged attack is made **by or against** a Monster or Vehicle unit that is within Engagement Range, **subtract 1** from that attack's Hit roll (unless shooting with a Pistol).

---

## 12. Benefit of Cover — Detailed Rules

### General Rule
- Add **1** to armour saving throws against **ranged attacks** (not invulnerable saves).
- Does **not apply** to models with Save **3+ or better** against attacks with AP **0**.
- **Not cumulative** — a model either has it or doesn't.

### When Models Get Cover
Cover is conferred by terrain features. The general conditions vary by terrain type, but typically involve the model being within/behind terrain and not being fully visible to all models in the attacking unit.

---

## 13. Shooting Phase Flow (For Simulation Context)

```
FOR EACH eligible unit in your army:
  1. SELECT ELIGIBLE UNIT (not Advanced, not Fell Back)
  2. SELECT TARGETS for all ranged weapons
     - At least one model in target must be visible + in range
     - Cannot split attacks from same weapon across multiple targets
     - Declare all weapon-to-target assignments before rolling
  3. MAKE RANGED ATTACKS
     - Resolve all attacks against one target before moving to next
     - Resolve all attacks with same weapon profile before different profiles
     FOR EACH attack:
       Step 1: Hit Roll (D6 >= BS, modified by abilities)
       Step 2: Wound Roll (compare S vs T, see table)
       Step 3: Defender allocates to a model
       Step 4: Saving Throw (D6 + AP modifier >= Sv, or use Invuln)
       Step 5: Inflict Damage (reduce wounds, apply FNP)
```

---

## 14. Fight Phase Flow (For Simulation Context)

```
FIGHT PHASE has two steps:
  Step 1: FIGHTS FIRST (chargers + units with Fights First ability)
  Step 2: REMAINING COMBATS (all other eligible units)

Players alternate selecting units in each step.

FOR EACH fighting unit:
  1. PILE IN (move up to 3" closer to nearest enemy)
  2. MAKE MELEE ATTACKS
     - Determine which models can fight (in Engagement Range or
       in base-to-base with a model that is in base-to-base with enemy)
     - Each model selects ONE melee weapon
     - Declare targets before rolling
     FOR EACH attack:
       Step 1: Hit Roll (D6 >= WS, modified by abilities)
       Step 2: Wound Roll (compare S vs T, see table)
       Step 3: Defender allocates to a model
       Step 4: Saving Throw (D6 + AP modifier >= Sv, or use Invuln)
       Step 5: Inflict Damage (reduce wounds, apply FNP)
  3. CONSOLIDATE (move up to 3" closer to nearest enemy)
```

---

## 15. Fast Dice Rolling (Optimization Note)

The rules allow "fast dice rolling" when all attacks share the same profile:
- Same BS/WS
- Same Strength
- Same AP
- Same Damage
- Same abilities
- Directed at the same target unit

In this case, roll all Hit rolls together, then all Wound rolls together, then the defender makes saves.

**Exception:** If attacks inflict random damage (e.g., D3), you cannot use fast dice rolling because the order of damage matters for model destruction. Roll those attacks one at a time.

---

## 16. Keyword Interactions Quick Reference (For Code Logic)

### Critical Hit Triggers (Unmodified Hit Roll of 6)
| Ability | Effect on Critical Hit |
|---------|----------------------|
| Sustained Hits X | Generate X additional hits (need wound rolls) |
| Lethal Hits | Attack auto-wounds (skip wound roll) |

### Critical Wound Triggers (Unmodified Wound Roll of 6, or lower with Anti-X)
| Ability | Effect on Critical Wound |
|---------|------------------------|
| Devastating Wounds | Inflict mortal wounds = Damage characteristic, attack sequence ends |
| Anti-Keyword X+ | Lowers Critical Wound threshold to X+ against matching keyword |

### Hit Roll Modifiers
| Source | Modifier |
|--------|----------|
| Heavy weapon + Remained Stationary | +1 to Hit |
| Stealth (all models in target have it) | -1 to Hit (ranged only) |
| Indirect Fire (no visible models) | -1 to Hit |
| Big Guns Never Tire (in Engagement Range, non-Pistol) | -1 to Hit |

### Wound Roll Modifiers
| Source | Modifier |
|--------|----------|
| Lance + made Charge move this turn | +1 to Wound |

### Save Modifiers
| Source | Modifier |
|--------|----------|
| Weapon AP (e.g., AP -2) | Subtract from save roll |
| Benefit of Cover (ranged attacks only) | +1 to armour save (not invuln) |

### Damage Modifiers
| Source | Modifier |
|--------|----------|
| Melta X (within half range) | +X to Damage |

### Attacks Characteristic Modifiers
| Source | Modifier |
|--------|----------|
| Rapid Fire X (within half range) | +X Attacks |
| Blast (per 5 models in target) | +1 Attack per 5 models |

### Auto-Hit / Skip Steps
| Ability | Effect |
|---------|--------|
| Torrent | Auto-hit (skip Hit roll entirely) |
| Lethal Hits (on Critical Hit) | Auto-wound (skip Wound roll) |

### Re-roll Grants
| Ability | Re-roll |
|---------|---------|
| Twin-linked | Re-roll the Wound roll |
| Command Re-roll (1CP Stratagem) | Re-roll one Hit roll, Wound roll, Damage roll, or saving throw |

---

## 17. Go To Ground Stratagem (Relevant to Simulation)

**Go To Ground** (1CP, opponent's Shooting phase):
- Target: One INFANTRY unit that was selected as a target.
- Effect: Until end of phase, all models in that unit have a **6+ invulnerable save** and the **Benefit of Cover**.

---

## 18. Fire Overwatch Stratagem (Relevant to Simulation)

**Fire Overwatch** (1CP, opponent's Movement or Charge phase):
- One unit within 24" of an enemy that just moved can shoot as if it were the Shooting phase.
- **Restriction:** Each time a model makes a ranged attack during Overwatch, an unmodified Hit roll of **6 is required** to score a hit (regardless of BS or modifiers). Only usable once per turn.

---

## 19. Damage Overflow & Model Destruction Summary

For code implementation, the critical rules around damage resolution:

1. **Normal attacks:** Excess damage from a single attack that destroys a model is **lost** (does not carry to next model).
2. **Mortal wounds:** Excess damage from mortal wounds **does** carry over to the next model in the unit.
3. **Mortal wounds from attacks:** When a unit's attacks inflict both normal damage and mortal wounds on the same target, resolve all normal damage **first**, then apply mortal wounds — even if the normal damage was saved.
4. **Feel No Pain:** Applied per wound lost, including mortal wounds. Roll D6 for each wound; on X+, it is ignored.
5. **Allocation priority:** Once a model has lost wounds or had attacks allocated to it this phase, all further attacks **must** go to that model until it is destroyed.

---

## 20. Simulation Input/Output Summary

### Required Attacker Inputs
- Number of models attacking
- Weapon profile per model: A, BS/WS, S, AP, D
- Weapon abilities: [SUSTAINED HITS X], [LETHAL HITS], [DEVASTATING WOUNDS], [ANTI-KEYWORD X+], [TORRENT], [BLAST], [TWIN-LINKED], [RAPID FIRE X], [MELTA X], [LANCE], [HEAVY], [ASSAULT], [INDIRECT FIRE], [IGNORES COVER], [PISTOL], [HAZARDOUS], [PRECISION], [EXTRA ATTACKS]
- Whether unit Remained Stationary / Advanced / Charged this turn

### Required Defender Inputs
- Number of models in unit
- Model profile: T, Sv, W (per model type if mixed)
- Invulnerable save (if any)
- Feel No Pain value (if any)
- Whether unit has Benefit of Cover
- Whether unit has Stealth
- Keywords (for Anti-X matching): INFANTRY, VEHICLE, MONSTER, PSYKER, etc.
- Whether unit is an Attached unit (with Character + Bodyguard composition)

### Simulation Output
- Number of hits scored
- Number of wounds scored (successful wound rolls)
- Number of unsaved wounds (failed saves)
- Total damage inflicted
- Total mortal wounds inflicted
- Number of models destroyed
- Remaining wounds on damaged models
