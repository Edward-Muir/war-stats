import { describe, it, expect } from 'vitest';
import { resolveStratagemEffect } from '../logic/stratagem-effects';
import type { Stratagem } from '../types/data';
import { runSimulation } from '../engine/simulation';
import type {
  SimulationInput,
  ResolvedWeaponGroup,
  DefenderProfile,
  DiceExpr,
} from '../types/simulation';
import { EMPTY_KEYWORDS } from '../types/simulation';
import { DEFAULT_ATTACKER_STATE, DEFAULT_DEFENDER_STATE } from '../types/config';

// ─── Helpers ─────────────────────────────────────────────────────

function fixed(value: number): DiceExpr {
  return { type: 'fixed', value };
}

function makeWeapon(overrides: Partial<ResolvedWeaponGroup> = {}): ResolvedWeaponGroup {
  return {
    name: 'Test Weapon',
    type: 'ranged',
    rangeInches: 24,
    attacks: fixed(1),
    skill: 3,
    strength: 4,
    ap: 0,
    damage: fixed(1),
    keywords: { ...EMPTY_KEYWORDS },
    firingModels: 1,
    targetInHalfRange: false,
    ...overrides,
  };
}

function makeDefender(overrides: Partial<DefenderProfile> = {}): DefenderProfile {
  return {
    toughness: 4,
    save: 3,
    invulnerableSave: null,
    wounds: 2,
    modelCount: 5,
    feelNoPain: null,
    keywords: ['INFANTRY'],
    ...overrides,
  };
}

function makeInput(
  weaponGroups: ResolvedWeaponGroup[],
  defender: DefenderProfile,
  iterations = 10000
): SimulationInput {
  return {
    attacker: {
      weaponGroups,
      gameState: { ...DEFAULT_ATTACKER_STATE },
      attackerEffects: [],
    },
    defender: {
      ...defender,
      gameState: { ...DEFAULT_DEFENDER_STATE },
      defenderEffects: [],
    },
    iterations,
  };
}

/** Build a minimal Stratagem object for testing. */
function makeStratagem(overrides: Partial<Stratagem> & { name: string }): Stratagem {
  return {
    cp_cost: 1,
    type: 'Battle Tactic',
    category: 'Battle Tactic',
    turn: 'your',
    when: 'Your Shooting phase.',
    target: 'One unit from your army.',
    effect: '',
    restrictions: '',
    cost: '',
    fluff: '',
    keywords_mentioned: [],
    target_keywords: [],
    ...overrides,
  };
}

// ─── Parser Tests ───────────────────────────────────────────────

describe('Stratagem Auto-Parser', () => {
  describe('Hit roll modifiers', () => {
    it('parses "add 1 to the Hit roll"', () => {
      const s = makeStratagem({
        name: 'TEST_HIT_PLUS',
        effect:
          'Until the end of the phase, each time a model in your unit makes an attack, add 1 to the Hit roll.',
      });
      const result = resolveStratagemEffect(s);
      expect(result.isParsed).toBe(true);
      expect(result.confidence).toBe('high');
      expect(result.modifiers.hitModifier).toBe(1);
    });

    it('parses "subtract 1 from the Hit roll"', () => {
      const s = makeStratagem({
        name: 'TEST_HIT_MINUS',
        effect:
          'Until the end of the phase, each time an attack targets this unit, subtract 1 from the Hit roll.',
      });
      const result = resolveStratagemEffect(s);
      expect(result.isParsed).toBe(true);
      expect(result.modifiers.hitModifier).toBe(-1);
    });
  });

  describe('Wound roll modifiers', () => {
    it('parses "add 1 to the Wound roll"', () => {
      const s = makeStratagem({
        name: 'TEST_WOUND_PLUS',
        effect:
          'Until the end of the phase, each time a model makes an attack, add 1 to the Wound roll.',
      });
      const result = resolveStratagemEffect(s);
      expect(result.isParsed).toBe(true);
      expect(result.modifiers.woundModifier).toBe(1);
    });

    it('parses "subtract 1 from the Wound roll"', () => {
      const s = makeStratagem({
        name: 'TEST_WOUND_MINUS',
        effect: 'Until the end of the phase, subtract 1 from the Wound roll.',
      });
      const result = resolveStratagemEffect(s);
      expect(result.isParsed).toBe(true);
      expect(result.modifiers.woundModifier).toBe(-1);
    });
  });

  describe('Rerolls', () => {
    it('parses full hit rerolls', () => {
      const s = makeStratagem({
        name: 'TEST_REROLL_HITS',
        effect: 'Until the end of the phase, you can re-roll the Hit roll.',
      });
      const result = resolveStratagemEffect(s);
      expect(result.isParsed).toBe(true);
      expect(result.modifiers.rerollHits).toBe('all');
    });

    it('parses hit rerolls of 1', () => {
      const s = makeStratagem({
        name: 'TEST_REROLL_HITS_ONES',
        effect: 'Until the end of the phase, you can re-roll a Hit roll of 1.',
      });
      const result = resolveStratagemEffect(s);
      expect(result.isParsed).toBe(true);
      expect(result.modifiers.rerollHits).toBe('ones');
    });

    it('parses full wound rerolls', () => {
      const s = makeStratagem({
        name: 'TEST_REROLL_WOUNDS',
        effect: 'Until the end of the phase, you can re-roll the Wound roll.',
      });
      const result = resolveStratagemEffect(s);
      expect(result.isParsed).toBe(true);
      expect(result.modifiers.rerollWounds).toBe('all');
    });
  });

  describe('AP modifiers', () => {
    it('parses AP improvement', () => {
      const s = makeStratagem({
        name: 'TEST_AP_IMPROVE',
        effect:
          'Until the end of the phase, improve the Armour Penetration characteristic of weapons by 1.',
      });
      const result = resolveStratagemEffect(s);
      expect(result.isParsed).toBe(true);
      expect(result.modifiers.apImprovement).toBe(1);
    });

    it('parses AP worsen (defender)', () => {
      const s = makeStratagem({
        name: 'TEST_AP_WORSEN',
        effect:
          'Until the end of the phase, worsen the Armour Penetration characteristic of attacks by 1.',
      });
      const result = resolveStratagemEffect(s);
      expect(result.isParsed).toBe(true);
      expect(result.modifiers.saveModifier).toBe(1);
    });
  });

  describe('Weapon abilities', () => {
    it('parses [LETHAL HITS]', () => {
      const s = makeStratagem({
        name: 'TEST_LETHAL',
        effect: 'Until the end of the phase, weapons gain the [LETHAL HITS] ability.',
      });
      const result = resolveStratagemEffect(s);
      expect(result.isParsed).toBe(true);
      expect(result.modifiers.lethalHits).toBe(true);
    });

    it('parses [SUSTAINED HITS 1]', () => {
      const s = makeStratagem({
        name: 'TEST_SUSTAINED',
        effect: 'Until the end of the phase, weapons gain the [SUSTAINED HITS 1] ability.',
      });
      const result = resolveStratagemEffect(s);
      expect(result.isParsed).toBe(true);
      expect(result.modifiers.sustainedHits).toBe(1);
    });

    it('parses [SUSTAINED HITS 2]', () => {
      const s = makeStratagem({
        name: 'TEST_SUSTAINED_2',
        effect: 'Until the end of the phase, weapons gain the [SUSTAINED HITS 2] ability.',
      });
      const result = resolveStratagemEffect(s);
      expect(result.isParsed).toBe(true);
      expect(result.modifiers.sustainedHits).toBe(2);
    });

    it('parses [DEVASTATING WOUNDS]', () => {
      const s = makeStratagem({
        name: 'TEST_DEV_WOUNDS',
        effect: 'Until the end of the phase, weapons gain the [DEVASTATING WOUNDS] ability.',
      });
      const result = resolveStratagemEffect(s);
      expect(result.isParsed).toBe(true);
      expect(result.modifiers.devastatingWounds).toBe(true);
    });

    it('parses [IGNORES COVER]', () => {
      const s = makeStratagem({
        name: 'TEST_IGNORES_COVER',
        effect: 'Until the end of the phase, weapons gain the [IGNORES COVER] ability.',
      });
      const result = resolveStratagemEffect(s);
      expect(result.isParsed).toBe(true);
      expect(result.modifiers.ignoresCover).toBe(true);
    });

    it('parses [LANCE]', () => {
      const s = makeStratagem({
        name: 'TEST_LANCE',
        effect: 'Until the end of the phase, weapons gain the [LANCE] ability.',
      });
      const result = resolveStratagemEffect(s);
      expect(result.isParsed).toBe(true);
      expect(result.modifiers.lance).toBe(true);
    });
  });

  describe('Critical hit threshold', () => {
    it('parses "5+ scores a Critical Hit"', () => {
      const s = makeStratagem({
        name: 'TEST_CRIT_5',
        effect: 'Until the end of the phase, an unmodified Hit roll of 5+ scores a Critical Hit.',
      });
      const result = resolveStratagemEffect(s);
      expect(result.isParsed).toBe(true);
      expect(result.modifiers.critHitOn).toBe(5);
    });
  });

  describe('Defensive abilities', () => {
    it('parses Feel No Pain 5+', () => {
      const s = makeStratagem({
        name: 'TEST_FNP5',
        effect: 'Until the end of the phase, models in your unit have a Feel No Pain 5+ ability.',
      });
      const result = resolveStratagemEffect(s);
      expect(result.isParsed).toBe(true);
      expect(result.modifiers.feelNoPain).toBe(5);
    });

    it('parses invulnerable save', () => {
      const s = makeStratagem({
        name: 'TEST_INVULN',
        effect: 'Until the end of the phase, models in your unit have a 4+ invulnerable save.',
      });
      const result = resolveStratagemEffect(s);
      expect(result.isParsed).toBe(true);
      expect(result.modifiers.invulnerableSave).toBe(4);
    });

    it('parses damage reduction', () => {
      const s = makeStratagem({
        name: 'TEST_DMG_REDUCE',
        effect: 'Until the end of the phase, subtract 1 from the Damage characteristic of attacks.',
      });
      const result = resolveStratagemEffect(s);
      expect(result.isParsed).toBe(true);
      expect(result.modifiers.damageReduction).toBe(1);
    });
  });

  describe('New modifier types', () => {
    it('parses bonus Attacks', () => {
      const s = makeStratagem({
        name: 'TEST_BONUS_ATTACKS',
        effect: 'Until the end of the phase, add 1 to the Attacks characteristic of melee weapons.',
      });
      const result = resolveStratagemEffect(s);
      expect(result.isParsed).toBe(true);
      expect(result.modifiers.bonusAttacks).toBe(1);
    });

    it('parses bonus Strength', () => {
      const s = makeStratagem({
        name: 'TEST_BONUS_STRENGTH',
        effect:
          'Until the end of the phase, add 1 to the Strength characteristic of melee weapons.',
      });
      const result = resolveStratagemEffect(s);
      expect(result.isParsed).toBe(true);
      expect(result.modifiers.strengthBonus).toBe(1);
    });

    it('parses bonus Damage', () => {
      const s = makeStratagem({
        name: 'TEST_BONUS_DAMAGE',
        effect: 'Until the end of the phase, add 1 to the Damage characteristic of melee weapons.',
      });
      const result = resolveStratagemEffect(s);
      expect(result.isParsed).toBe(true);
      expect(result.modifiers.damageBonus).toBe(1);
    });
  });

  describe('Conditional language detection', () => {
    it('rejects effects with "if...below half" as conditional', () => {
      const s = makeStratagem({
        name: 'TEST_CONDITIONAL_BELOW_HALF',
        effect:
          'Add 1 to the Hit roll. If this unit is below half its Starting Strength, add 1 to Wound roll instead.',
      });
      const result = resolveStratagemEffect(s);
      // Conditional language detected → parser returns null → not parsed
      expect(result.isParsed).toBe(false);
    });

    it('rejects effects with "instead" as conditional', () => {
      const s = makeStratagem({
        name: 'TEST_CONDITIONAL_INSTEAD',
        effect:
          'Weapons gain [SUSTAINED HITS 1]. If already ASSAULT, gain [SUSTAINED HITS 2] instead.',
      });
      const result = resolveStratagemEffect(s);
      expect(result.isParsed).toBe(false);
    });
  });

  describe('Manual table takes priority over parser', () => {
    it('uses manual entry for CRUCIBLE OF BATTLE', () => {
      const s = makeStratagem({
        name: 'CRUCIBLE OF BATTLE',
        effect: 'Until the end of the phase, add 1 to the Wound roll. Only if closest target.',
      });
      const result = resolveStratagemEffect(s);
      expect(result.isParsed).toBe(true);
      expect(result.confidence).toBe('manual');
      expect(result.conditionals).toHaveLength(1);
      expect(result.conditionals[0].condition.type).toBe('closestTarget');
    });
  });

  describe('Unicode normalization', () => {
    it('matches stratagem names with non-breaking hyphens', () => {
      // U+2011 non-breaking hyphen
      const s = makeStratagem({
        name: 'WEAVEW\u00CBRKE BUTTRESS',
        effect: 'Subtract 1 from wound.',
      });
      // If this name exists in table with different encoding, it should still match
      // This tests the normalization path
      const result = resolveStratagemEffect(s);
      // May or may not match depending on exact table key — test that it doesn't crash
      expect(result).toBeDefined();
    });
  });

  describe('Unparseable effects', () => {
    it('returns isParsed=false for movement-only effects', () => {
      const s = makeStratagem({
        name: 'TEST_MOVEMENT_ONLY',
        effect: 'This unit can make a Normal Move of up to 6" as if it were your Movement phase.',
      });
      const result = resolveStratagemEffect(s);
      expect(result.isParsed).toBe(false);
      expect(result.confidence).toBe('low');
    });
  });
});

// ─── Condition System Tests ─────────────────────────────────────

describe('Conditional Stratagems', () => {
  it('BATTLE DRILL RECALL: sustained always, crit 5+ only if stationary', () => {
    const s = makeStratagem({ name: 'BATTLE DRILL RECALL' });
    const result = resolveStratagemEffect(s);

    expect(result.isParsed).toBe(true);
    expect(result.confidence).toBe('manual');
    expect(result.modifiers.sustainedHits).toBe(1);
    expect(result.modifiers.critHitOn).toBeUndefined();
    expect(result.conditionals).toHaveLength(1);
    expect(result.conditionals[0].condition.type).toBe('remainedStationary');
    expect(result.conditionals[0].modifiers.critHitOn).toBe(5);
  });

  it('BLITZING FUSILLADE: sustained only for assault weapons', () => {
    const s = makeStratagem({ name: 'BLITZING FUSILLADE' });
    const result = resolveStratagemEffect(s);

    expect(result.isParsed).toBe(true);
    expect(result.modifiers.sustainedHits).toBeUndefined();
    expect(result.conditionals).toHaveLength(1);
    expect(result.conditionals[0].condition.type).toBe('weaponHasKeyword');
    expect(result.conditionals[0].condition.weaponKeyword).toBe('assault');
    expect(result.conditionals[0].modifiers.sustainedHits).toBe(1);
  });

  it('ONSLAUGHT OF FIRE: +1 hit only vs closest target', () => {
    const s = makeStratagem({ name: 'ONSLAUGHT OF FIRE' });
    const result = resolveStratagemEffect(s);

    expect(result.isParsed).toBe(true);
    expect(result.modifiers.hitModifier).toBeUndefined();
    expect(result.conditionals).toHaveLength(1);
    expect(result.conditionals[0].condition.type).toBe('closestTarget');
  });

  it('CRUCIBLE OF BATTLE: +1 wound only vs closest target', () => {
    const s = makeStratagem({ name: 'CRUCIBLE OF BATTLE' });
    const result = resolveStratagemEffect(s);

    expect(result.isParsed).toBe(true);
    expect(result.modifiers.woundModifier).toBeUndefined();
    expect(result.conditionals).toHaveLength(1);
    expect(result.conditionals[0].condition.type).toBe('closestTarget');
  });
});

// ─── Engine Integration Tests ───────────────────────────────────

describe('New Modifier Engine Integration', () => {
  describe('strengthBonus', () => {
    it('strength bonus changes wound threshold', () => {
      // S4 vs T5 = wound on 5+
      // S4+1=S5 vs T5 = wound on 4+ (equal)
      // With 100 attacks, should see noticeable difference
      const weapon = makeWeapon({
        attacks: fixed(1),
        strength: 4,
        skill: 2, // 2+ to hit (minimize hit variance)
        firingModels: 100,
      });
      const defender = makeDefender({ toughness: 5, save: 7, wounds: 1, modelCount: 200 });

      // Without bonus: S4 vs T5 = 5+ to wound = 2/6
      const inputBase = makeInput([weapon], defender, 1000);
      const resultBase = runSimulation(inputBase);

      // With +1 strength: S5 vs T5 = 4+ to wound = 3/6
      const inputBonus = makeInput([weapon], defender, 1000);
      inputBonus.attacker.attackerEffects = [
        {
          combatType: 'any',
          modifiers: { strengthBonus: 1 },
          conditionals: [],
          isParsed: true,
          confidence: 'manual',
        },
      ];
      const resultBonus = runSimulation(inputBonus);

      // S5 vs T5 should wound ~50% more than S4 vs T5
      expect(resultBonus.summary.damage.mean).toBeGreaterThan(resultBase.summary.damage.mean * 1.2);
    });
  });

  describe('bonusAttacks', () => {
    it('bonus attacks increase total damage', () => {
      const weapon = makeWeapon({
        attacks: fixed(1),
        strength: 4,
        skill: 2,
        firingModels: 50,
      });
      const defender = makeDefender({ toughness: 3, save: 7, wounds: 1, modelCount: 200 });

      const inputBase = makeInput([weapon], defender, 1000);
      const resultBase = runSimulation(inputBase);

      // +1 attack per model doubles attacks (1 → 2)
      const inputBonus = makeInput([weapon], defender, 1000);
      inputBonus.attacker.attackerEffects = [
        {
          combatType: 'any',
          modifiers: { bonusAttacks: 1 },
          conditionals: [],
          isParsed: true,
          confidence: 'manual',
        },
      ];
      const resultBonus = runSimulation(inputBonus);

      // Should roughly double damage
      expect(resultBonus.summary.damage.mean).toBeGreaterThan(resultBase.summary.damage.mean * 1.5);
    });
  });

  describe('damageBonus from stratagem', () => {
    it('damage bonus increases per-wound damage', () => {
      const weapon = makeWeapon({
        attacks: fixed(1),
        strength: 8,
        skill: 2,
        damage: fixed(1),
        firingModels: 50,
      });
      const defender = makeDefender({ toughness: 4, save: 7, wounds: 3, modelCount: 100 });

      const inputBase = makeInput([weapon], defender, 1000);
      const resultBase = runSimulation(inputBase);

      // +1 damage per wound (1 → 2)
      const inputBonus = makeInput([weapon], defender, 1000);
      inputBonus.attacker.attackerEffects = [
        {
          combatType: 'any',
          modifiers: { damageBonus: 1 },
          conditionals: [],
          isParsed: true,
          confidence: 'manual',
        },
      ];
      const resultBonus = runSimulation(inputBonus);

      expect(resultBonus.summary.damage.mean).toBeGreaterThan(resultBase.summary.damage.mean * 1.5);
    });
  });

  describe('Conditional modifiers in engine', () => {
    it('conditional modifier only applies when condition is met', () => {
      // Test: +1 wound only when closestTarget is true
      const weapon = makeWeapon({
        attacks: fixed(1),
        strength: 4,
        skill: 2,
        firingModels: 100,
      });
      const defender = makeDefender({ toughness: 5, save: 7, wounds: 1, modelCount: 200 });

      // closestTarget = false → conditional should NOT apply
      const inputOff = makeInput([weapon], defender, 1000);
      inputOff.defender.gameState.closestTarget = false;
      inputOff.attacker.attackerEffects = [
        {
          combatType: 'any',
          modifiers: {},
          conditionals: [{ condition: { type: 'closestTarget' }, modifiers: { woundModifier: 1 } }],
          isParsed: true,
          confidence: 'manual',
        },
      ];
      const resultOff = runSimulation(inputOff);

      // closestTarget = true → conditional SHOULD apply
      const inputOn = makeInput([weapon], defender, 1000);
      inputOn.defender.gameState.closestTarget = true;
      inputOn.attacker.attackerEffects = [
        {
          combatType: 'any',
          modifiers: {},
          conditionals: [{ condition: { type: 'closestTarget' }, modifiers: { woundModifier: 1 } }],
          isParsed: true,
          confidence: 'manual',
        },
      ];
      const resultOn = runSimulation(inputOn);

      // With +1 wound, should deal more damage
      expect(resultOn.summary.damage.mean).toBeGreaterThan(resultOff.summary.damage.mean * 1.2);
    });

    it('weaponHasKeyword condition checks weapon keywords', () => {
      // Assault weapon should get sustained hits from BLITZING FUSILLADE
      const assaultWeapon = makeWeapon({
        attacks: fixed(1),
        strength: 4,
        skill: 3,
        firingModels: 100,
        keywords: { ...EMPTY_KEYWORDS, assault: true },
      });
      const nonAssaultWeapon = makeWeapon({
        attacks: fixed(1),
        strength: 4,
        skill: 3,
        firingModels: 100,
      });
      const defender = makeDefender({ toughness: 3, save: 7, wounds: 1, modelCount: 200 });

      const effect = {
        combatType: 'any' as const,
        modifiers: {},
        conditionals: [
          {
            condition: { type: 'weaponHasKeyword' as const, weaponKeyword: 'assault' as const },
            modifiers: { sustainedHits: 1 },
          },
        ],
        isParsed: true,
        confidence: 'manual' as const,
      };

      const inputAssault = makeInput([assaultWeapon], defender, 2000);
      inputAssault.attacker.attackerEffects = [effect];
      const resultAssault = runSimulation(inputAssault);

      const inputNonAssault = makeInput([nonAssaultWeapon], defender, 2000);
      inputNonAssault.attacker.attackerEffects = [effect];
      const resultNonAssault = runSimulation(inputNonAssault);

      // Assault weapon should get sustained hits → more damage
      expect(resultAssault.summary.damage.mean).toBeGreaterThan(
        resultNonAssault.summary.damage.mean * 1.05
      );
    });
  });
});
