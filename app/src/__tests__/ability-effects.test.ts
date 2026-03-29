import { describe, it, expect } from 'vitest';
import { runSimulation } from '../engine/simulation';
import type {
  SimulationInput,
  ResolvedWeaponGroup,
  DefenderProfile,
  DiceExpr,
} from '../types/simulation';
import { EMPTY_KEYWORDS } from '../types/simulation';
import { DEFAULT_ATTACKER_STATE, DEFAULT_DEFENDER_STATE } from '../types/config';
import type { UnitEffect } from '../types/effects';
import type { StratagemModifier } from '../logic/stratagem-effects';

// ─── Helpers ─────────────────────────────────────────────────────

const ITERATIONS = 5000;

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
    save: 4,
    invulnerableSave: null,
    wounds: 1,
    modelCount: 10,
    feelNoPain: null,
    keywords: ['INFANTRY'],
    ...overrides,
  };
}

function makeInput(
  weaponGroups: ResolvedWeaponGroup[],
  defender: DefenderProfile,
  iterations = ITERATIONS
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

function makeEffect(
  modifiers: StratagemModifier,
  side: 'attacker' | 'defender' = 'attacker'
): UnitEffect {
  return {
    id: 'test-effect',
    label: 'Test Effect',
    source: 'Test',
    side,
    activation: 'toggle',
    combatType: 'any',
    modifiers,
    conditionals: [],
  };
}

// ─── Tests ───────────────────────────────────────────────────────

describe('Ability Effects', () => {
  // ── Hit Rerolls ─────────────────────────────────────────────────

  describe('Reroll Hits: Ones', () => {
    it('bolt rifles (BS3+) vs Marines should increase damage', () => {
      const weapon = makeWeapon({ attacks: fixed(2), skill: 3, strength: 4, firingModels: 5 });
      const defender = makeDefender({ toughness: 4, save: 3, wounds: 2, modelCount: 5 });

      const base = runSimulation(makeInput([weapon], defender));
      const input = makeInput([weapon], defender);
      input.attacker.attackerEffects = [makeEffect({ rerollHits: 'ones' })];
      const withAbility = runSimulation(input);

      expect(withAbility.summary.damage.mean).toBeGreaterThan(base.summary.damage.mean);
    });

    it('heavy bolter (BS4+) vs light infantry should increase damage', () => {
      const weapon = makeWeapon({
        attacks: fixed(3),
        skill: 4,
        strength: 5,
        ap: 1,
        firingModels: 3,
      });
      const defender = makeDefender({ toughness: 3, save: 5, wounds: 1, modelCount: 10 });

      const base = runSimulation(makeInput([weapon], defender));
      const input = makeInput([weapon], defender);
      input.attacker.attackerEffects = [makeEffect({ rerollHits: 'ones' })];
      const withAbility = runSimulation(input);

      expect(withAbility.summary.damage.mean).toBeGreaterThan(base.summary.damage.mean);
    });
  });

  describe('Reroll Hits: All', () => {
    it('plasma guns (BS3+) vs heavy infantry should increase damage', () => {
      const weapon = makeWeapon({
        attacks: fixed(1),
        skill: 3,
        strength: 7,
        ap: 3,
        damage: fixed(2),
        firingModels: 5,
      });
      const defender = makeDefender({ toughness: 5, save: 3, wounds: 3, modelCount: 5 });

      const base = runSimulation(makeInput([weapon], defender));
      const input = makeInput([weapon], defender);
      input.attacker.attackerEffects = [makeEffect({ rerollHits: 'all' })];
      const withAbility = runSimulation(input);

      expect(withAbility.summary.damage.mean).toBeGreaterThan(base.summary.damage.mean);
    });

    it('lascannons (BS4+) vs vehicles should increase damage', () => {
      const weapon = makeWeapon({
        attacks: fixed(1),
        skill: 4,
        strength: 12,
        ap: 3,
        damage: { type: 'dice', count: 1, sides: 6, modifier: 0 },
        firingModels: 3,
      });
      const defender = makeDefender({
        toughness: 10,
        save: 3,
        wounds: 12,
        modelCount: 1,
        keywords: ['VEHICLE'],
      });

      const base = runSimulation(makeInput([weapon], defender));
      const input = makeInput([weapon], defender);
      input.attacker.attackerEffects = [makeEffect({ rerollHits: 'all' })];
      const withAbility = runSimulation(input);

      expect(withAbility.summary.damage.mean).toBeGreaterThan(base.summary.damage.mean);
    });

    it('reroll all should increase damage more than reroll ones', () => {
      const weapon = makeWeapon({ attacks: fixed(2), skill: 4, strength: 4, firingModels: 5 });
      const defender = makeDefender({ toughness: 4, save: 4, wounds: 1, modelCount: 10 });

      const inputOnes = makeInput([weapon], defender);
      inputOnes.attacker.attackerEffects = [makeEffect({ rerollHits: 'ones' })];
      const onesResult = runSimulation(inputOnes);

      const inputAll = makeInput([weapon], defender);
      inputAll.attacker.attackerEffects = [makeEffect({ rerollHits: 'all' })];
      const allResult = runSimulation(inputAll);

      expect(allResult.summary.damage.mean).toBeGreaterThan(onesResult.summary.damage.mean);
    });
  });

  // ── Wound Rerolls ───────────────────────────────────────────────

  describe('Reroll Wounds: Ones', () => {
    it('lasguns (S3) vs T4 targets should increase damage', () => {
      const weapon = makeWeapon({ attacks: fixed(1), skill: 4, strength: 3, firingModels: 10 });
      const defender = makeDefender({ toughness: 4, save: 5, wounds: 1, modelCount: 10 });

      const base = runSimulation(makeInput([weapon], defender));
      const input = makeInput([weapon], defender);
      input.attacker.attackerEffects = [makeEffect({ rerollWounds: 'ones' })];
      const withAbility = runSimulation(input);

      expect(withAbility.summary.damage.mean).toBeGreaterThan(base.summary.damage.mean);
    });

    it('bolters (S4) vs T5 targets should increase damage', () => {
      const weapon = makeWeapon({ attacks: fixed(2), skill: 3, strength: 4, firingModels: 5 });
      const defender = makeDefender({ toughness: 5, save: 3, wounds: 2, modelCount: 5 });

      const base = runSimulation(makeInput([weapon], defender));
      const input = makeInput([weapon], defender);
      input.attacker.attackerEffects = [makeEffect({ rerollWounds: 'ones' })];
      const withAbility = runSimulation(input);

      expect(withAbility.summary.damage.mean).toBeGreaterThan(base.summary.damage.mean);
    });
  });

  describe('Reroll Wounds: All', () => {
    it('S3 vs T8 (wound on 6+) should increase damage significantly', () => {
      const weapon = makeWeapon({ attacks: fixed(1), skill: 3, strength: 3, firingModels: 10 });
      const defender = makeDefender({ toughness: 8, save: 4, wounds: 1, modelCount: 10 });

      const base = runSimulation(makeInput([weapon], defender));
      const input = makeInput([weapon], defender);
      input.attacker.attackerEffects = [makeEffect({ rerollWounds: 'all' })];
      const withAbility = runSimulation(input);

      expect(withAbility.summary.damage.mean).toBeGreaterThan(base.summary.damage.mean);
    });

    it('S4 vs T5 (wound on 5+) should increase damage', () => {
      const weapon = makeWeapon({
        attacks: fixed(2),
        skill: 3,
        strength: 4,
        ap: 1,
        firingModels: 5,
      });
      const defender = makeDefender({ toughness: 5, save: 3, wounds: 2, modelCount: 5 });

      const base = runSimulation(makeInput([weapon], defender));
      const input = makeInput([weapon], defender);
      input.attacker.attackerEffects = [makeEffect({ rerollWounds: 'all' })];
      const withAbility = runSimulation(input);

      expect(withAbility.summary.damage.mean).toBeGreaterThan(base.summary.damage.mean);
    });

    it('reroll all should increase damage more than reroll ones', () => {
      const weapon = makeWeapon({ attacks: fixed(2), skill: 3, strength: 4, firingModels: 5 });
      const defender = makeDefender({ toughness: 5, save: 4, wounds: 1, modelCount: 10 });

      const inputOnes = makeInput([weapon], defender);
      inputOnes.attacker.attackerEffects = [makeEffect({ rerollWounds: 'ones' })];
      const onesResult = runSimulation(inputOnes);

      const inputAll = makeInput([weapon], defender);
      inputAll.attacker.attackerEffects = [makeEffect({ rerollWounds: 'all' })];
      const allResult = runSimulation(inputAll);

      expect(allResult.summary.damage.mean).toBeGreaterThan(onesResult.summary.damage.mean);
    });
  });

  // ── Hit Modifiers ───────────────────────────────────────────────

  describe('Hit Modifier: +1', () => {
    it('BS4+ unit should increase damage', () => {
      const weapon = makeWeapon({ attacks: fixed(2), skill: 4, strength: 4, firingModels: 5 });
      const defender = makeDefender({ toughness: 4, save: 4, wounds: 1, modelCount: 10 });

      const base = runSimulation(makeInput([weapon], defender));
      const input = makeInput([weapon], defender);
      input.attacker.attackerEffects = [makeEffect({ hitModifier: 1 })];
      const withAbility = runSimulation(input);

      expect(withAbility.summary.damage.mean).toBeGreaterThan(base.summary.damage.mean);
    });

    it('BS3+ unit should increase damage', () => {
      const weapon = makeWeapon({
        attacks: fixed(1),
        skill: 3,
        strength: 5,
        ap: 1,
        firingModels: 5,
      });
      const defender = makeDefender({ toughness: 4, save: 3, wounds: 2, modelCount: 5 });

      const base = runSimulation(makeInput([weapon], defender));
      const input = makeInput([weapon], defender);
      input.attacker.attackerEffects = [makeEffect({ hitModifier: 1 })];
      const withAbility = runSimulation(input);

      expect(withAbility.summary.damage.mean).toBeGreaterThan(base.summary.damage.mean);
    });
  });

  describe('Hit Modifier: -1', () => {
    it('BS3+ unit should decrease damage', () => {
      const weapon = makeWeapon({ attacks: fixed(2), skill: 3, strength: 4, firingModels: 5 });
      const defender = makeDefender({ toughness: 4, save: 4, wounds: 1, modelCount: 10 });

      const base = runSimulation(makeInput([weapon], defender));
      const input = makeInput([weapon], defender);
      input.attacker.attackerEffects = [makeEffect({ hitModifier: -1 })];
      const withAbility = runSimulation(input);

      expect(withAbility.summary.damage.mean).toBeLessThan(base.summary.damage.mean);
    });

    it('BS4+ unit should decrease damage', () => {
      const weapon = makeWeapon({
        attacks: fixed(3),
        skill: 4,
        strength: 5,
        ap: 1,
        firingModels: 3,
      });
      const defender = makeDefender({ toughness: 3, save: 5, wounds: 1, modelCount: 10 });

      const base = runSimulation(makeInput([weapon], defender));
      const input = makeInput([weapon], defender);
      input.attacker.attackerEffects = [makeEffect({ hitModifier: -1 })];
      const withAbility = runSimulation(input);

      expect(withAbility.summary.damage.mean).toBeLessThan(base.summary.damage.mean);
    });
  });

  // ── Wound Modifiers ─────────────────────────────────────────────

  describe('Wound Modifier: +1', () => {
    it('S4 vs T5 should increase damage (crosses threshold)', () => {
      const weapon = makeWeapon({ attacks: fixed(2), skill: 3, strength: 4, firingModels: 5 });
      const defender = makeDefender({ toughness: 5, save: 4, wounds: 1, modelCount: 10 });

      const base = runSimulation(makeInput([weapon], defender));
      const input = makeInput([weapon], defender);
      input.attacker.attackerEffects = [makeEffect({ woundModifier: 1 })];
      const withAbility = runSimulation(input);

      expect(withAbility.summary.damage.mean).toBeGreaterThan(base.summary.damage.mean);
    });

    it('S3 vs T4 should increase damage', () => {
      const weapon = makeWeapon({ attacks: fixed(1), skill: 4, strength: 3, firingModels: 10 });
      const defender = makeDefender({ toughness: 4, save: 5, wounds: 1, modelCount: 10 });

      const base = runSimulation(makeInput([weapon], defender));
      const input = makeInput([weapon], defender);
      input.attacker.attackerEffects = [makeEffect({ woundModifier: 1 })];
      const withAbility = runSimulation(input);

      expect(withAbility.summary.damage.mean).toBeGreaterThan(base.summary.damage.mean);
    });
  });

  describe('Wound Modifier: -1', () => {
    it('S4 vs T4 should decrease damage', () => {
      const weapon = makeWeapon({ attacks: fixed(2), skill: 3, strength: 4, firingModels: 5 });
      const defender = makeDefender({ toughness: 4, save: 4, wounds: 1, modelCount: 10 });

      const base = runSimulation(makeInput([weapon], defender));
      const input = makeInput([weapon], defender);
      input.defender.defenderEffects = [makeEffect({ woundModifier: -1 })];
      const withAbility = runSimulation(input);

      expect(withAbility.summary.damage.mean).toBeLessThan(base.summary.damage.mean);
    });

    it('S8 vs T4 should decrease damage', () => {
      const weapon = makeWeapon({
        attacks: fixed(1),
        skill: 3,
        strength: 8,
        ap: 2,
        damage: fixed(2),
        firingModels: 3,
      });
      const defender = makeDefender({ toughness: 4, save: 3, wounds: 2, modelCount: 5 });

      const base = runSimulation(makeInput([weapon], defender));
      const input = makeInput([weapon], defender);
      input.defender.defenderEffects = [makeEffect({ woundModifier: -1 })];
      const withAbility = runSimulation(input);

      expect(withAbility.summary.damage.mean).toBeLessThan(base.summary.damage.mean);
    });
  });

  // ── Lethal Hits ─────────────────────────────────────────────────

  describe('Lethal Hits', () => {
    it('S3 vs T12 (hard to wound) should increase damage significantly', () => {
      const weapon = makeWeapon({ attacks: fixed(1), skill: 3, strength: 3, firingModels: 20 });
      const defender = makeDefender({ toughness: 12, save: 6, wounds: 1, modelCount: 20 });

      const base = runSimulation(makeInput([weapon], defender));
      const input = makeInput([weapon], defender);
      input.attacker.attackerEffects = [makeEffect({ lethalHits: true })];
      const withAbility = runSimulation(input);

      expect(withAbility.summary.damage.mean).toBeGreaterThan(base.summary.damage.mean);
    });

    it('S4 vs T4 (easy to wound) should still increase damage', () => {
      const weapon = makeWeapon({ attacks: fixed(2), skill: 3, strength: 4, firingModels: 5 });
      const defender = makeDefender({ toughness: 4, save: 5, wounds: 1, modelCount: 10 });

      const base = runSimulation(makeInput([weapon], defender));
      const input = makeInput([weapon], defender);
      input.attacker.attackerEffects = [makeEffect({ lethalHits: true })];
      const withAbility = runSimulation(input);

      expect(withAbility.summary.damage.mean).toBeGreaterThan(base.summary.damage.mean);
    });
  });

  // ── Sustained Hits ──────────────────────────────────────────────

  describe('Sustained Hits', () => {
    it('sustained hits 1: bolt rifle volley should increase damage', () => {
      const weapon = makeWeapon({ attacks: fixed(2), skill: 3, strength: 4, firingModels: 5 });
      const defender = makeDefender({ toughness: 4, save: 4, wounds: 1, modelCount: 10 });

      const base = runSimulation(makeInput([weapon], defender));
      const input = makeInput([weapon], defender);
      input.attacker.attackerEffects = [makeEffect({ sustainedHits: 1 })];
      const withAbility = runSimulation(input);

      expect(withAbility.summary.damage.mean).toBeGreaterThan(base.summary.damage.mean);
    });

    it('sustained hits 1: melee attacks should increase damage', () => {
      const weapon = makeWeapon({
        type: 'melee',
        attacks: fixed(4),
        skill: 3,
        strength: 6,
        ap: 2,
        damage: fixed(2),
        firingModels: 1,
        rangeInches: 0,
      });
      const defender = makeDefender({ toughness: 5, save: 3, wounds: 3, modelCount: 3 });

      const base = runSimulation(makeInput([weapon], defender));
      const input = makeInput([weapon], defender);
      input.attacker.attackerEffects = [makeEffect({ sustainedHits: 1 })];
      const withAbility = runSimulation(input);

      expect(withAbility.summary.damage.mean).toBeGreaterThan(base.summary.damage.mean);
    });
  });

  // ── Devastating Wounds ──────────────────────────────────────────

  describe('Devastating Wounds', () => {
    it('anti-vehicle 4+ weapon should produce mortal wounds', () => {
      const weapon = makeWeapon({
        attacks: fixed(1),
        skill: 3,
        strength: 8,
        ap: 2,
        damage: fixed(3),
        firingModels: 5,
        keywords: {
          ...EMPTY_KEYWORDS,
          devastatingWounds: true,
          antiKeyword: 'VEHICLE',
          antiThreshold: 4,
        },
      });
      const defender = makeDefender({
        toughness: 10,
        save: 3,
        wounds: 12,
        modelCount: 1,
        keywords: ['VEHICLE'],
      });

      const base = runSimulation(makeInput([weapon], defender));
      // Remove dev wounds from weapon keywords and use effect instead
      const weaponNoDW = makeWeapon({
        attacks: fixed(1),
        skill: 3,
        strength: 8,
        ap: 2,
        damage: fixed(3),
        firingModels: 5,
        keywords: { ...EMPTY_KEYWORDS, antiKeyword: 'VEHICLE', antiThreshold: 4 },
      });
      const baseNoDW = runSimulation(makeInput([weaponNoDW], defender));

      expect(base.summary.damage.mean).toBeGreaterThan(baseNoDW.summary.damage.mean);
    });

    it('standard weapon (crit wound on 6) should still increase damage via effect', () => {
      const weapon = makeWeapon({
        attacks: fixed(2),
        skill: 3,
        strength: 4,
        ap: 1,
        firingModels: 5,
      });
      const defender = makeDefender({ toughness: 4, save: 3, wounds: 2, modelCount: 5 });

      const base = runSimulation(makeInput([weapon], defender));
      const input = makeInput([weapon], defender);
      input.attacker.attackerEffects = [makeEffect({ devastatingWounds: true })];
      const withAbility = runSimulation(input);

      expect(withAbility.summary.damage.mean).toBeGreaterThan(base.summary.damage.mean);
    });
  });

  // ── Critical Hit Threshold ──────────────────────────────────────

  describe('Critical Hit Threshold', () => {
    it('critHitOn 5 with lethal hits should increase damage vs tough targets', () => {
      // Crit threshold matters when paired with lethal hits (auto-wound on crit)
      const weapon = makeWeapon({ attacks: fixed(2), skill: 3, strength: 3, firingModels: 5 });
      const defender = makeDefender({ toughness: 8, save: 5, wounds: 1, modelCount: 10 });

      const inputLethal = makeInput([weapon], defender);
      inputLethal.attacker.attackerEffects = [makeEffect({ lethalHits: true })];
      const lethalOnly = runSimulation(inputLethal);

      const inputBoth = makeInput([weapon], defender);
      inputBoth.attacker.attackerEffects = [makeEffect({ lethalHits: true, critHitOn: 5 })];
      const withBoth = runSimulation(inputBoth);

      expect(withBoth.summary.damage.mean).toBeGreaterThan(lethalOnly.summary.damage.mean);
    });

    it('critHitOn 5 combined with sustained hits should amplify effect', () => {
      const weapon = makeWeapon({
        attacks: fixed(3),
        skill: 3,
        strength: 5,
        ap: 1,
        firingModels: 3,
      });
      const defender = makeDefender({ toughness: 4, save: 3, wounds: 2, modelCount: 5 });

      const inputSustained = makeInput([weapon], defender);
      inputSustained.attacker.attackerEffects = [makeEffect({ sustainedHits: 1 })];
      const sustainedResult = runSimulation(inputSustained);

      const inputBoth = makeInput([weapon], defender);
      inputBoth.attacker.attackerEffects = [makeEffect({ sustainedHits: 1, critHitOn: 5 })];
      const bothResult = runSimulation(inputBoth);

      expect(bothResult.summary.damage.mean).toBeGreaterThan(sustainedResult.summary.damage.mean);
    });
  });

  // ── AP Improvement ──────────────────────────────────────────────

  describe('AP Improvement', () => {
    it('AP0 weapon vs Sv3+ should increase damage', () => {
      const weapon = makeWeapon({
        attacks: fixed(2),
        skill: 3,
        strength: 4,
        ap: 0,
        firingModels: 5,
      });
      const defender = makeDefender({ toughness: 4, save: 3, wounds: 1, modelCount: 10 });

      const base = runSimulation(makeInput([weapon], defender));
      const input = makeInput([weapon], defender);
      input.attacker.attackerEffects = [makeEffect({ apImprovement: 1 })];
      const withAbility = runSimulation(input);

      expect(withAbility.summary.damage.mean).toBeGreaterThan(base.summary.damage.mean);
    });

    it('AP2 weapon vs Sv3+ should increase damage', () => {
      const weapon = makeWeapon({
        attacks: fixed(1),
        skill: 3,
        strength: 8,
        ap: 2,
        damage: fixed(2),
        firingModels: 3,
      });
      const defender = makeDefender({ toughness: 5, save: 3, wounds: 2, modelCount: 5 });

      const base = runSimulation(makeInput([weapon], defender));
      const input = makeInput([weapon], defender);
      input.attacker.attackerEffects = [makeEffect({ apImprovement: 1 })];
      const withAbility = runSimulation(input);

      expect(withAbility.summary.damage.mean).toBeGreaterThan(base.summary.damage.mean);
    });
  });

  // ── Bonus Attacks ───────────────────────────────────────────────

  describe('Bonus Attacks', () => {
    it('1-attack weapon should roughly double damage', () => {
      const weapon = makeWeapon({ attacks: fixed(1), skill: 3, strength: 4, firingModels: 5 });
      const defender = makeDefender({ toughness: 4, save: 4, wounds: 1, modelCount: 10 });

      const base = runSimulation(makeInput([weapon], defender));
      const input = makeInput([weapon], defender);
      input.attacker.attackerEffects = [makeEffect({ bonusAttacks: 1 })];
      const withAbility = runSimulation(input);

      expect(withAbility.summary.damage.mean).toBeGreaterThan(base.summary.damage.mean * 1.5);
    });

    it('D6-attack weapon should increase damage', () => {
      const weapon = makeWeapon({
        attacks: { type: 'dice', count: 1, sides: 6, modifier: 0 },
        skill: 3,
        strength: 5,
        ap: 1,
        firingModels: 3,
      });
      const defender = makeDefender({ toughness: 4, save: 4, wounds: 1, modelCount: 10 });

      const base = runSimulation(makeInput([weapon], defender));
      const input = makeInput([weapon], defender);
      input.attacker.attackerEffects = [makeEffect({ bonusAttacks: 1 })];
      const withAbility = runSimulation(input);

      expect(withAbility.summary.damage.mean).toBeGreaterThan(base.summary.damage.mean);
    });
  });

  // ── Bonus Damage ────────────────────────────────────────────────

  describe('Bonus Damage', () => {
    it('D1 weapon vs multi-wound models should increase damage', () => {
      const weapon = makeWeapon({
        attacks: fixed(2),
        skill: 3,
        strength: 4,
        ap: 1,
        damage: fixed(1),
        firingModels: 5,
      });
      const defender = makeDefender({ toughness: 4, save: 3, wounds: 2, modelCount: 5 });

      const base = runSimulation(makeInput([weapon], defender));
      const input = makeInput([weapon], defender);
      input.attacker.attackerEffects = [makeEffect({ damageBonus: 1 })];
      const withAbility = runSimulation(input);

      expect(withAbility.summary.damage.mean).toBeGreaterThan(base.summary.damage.mean);
    });

    it('D2 weapon vs multi-wound models should increase damage', () => {
      const weapon = makeWeapon({
        attacks: fixed(1),
        skill: 3,
        strength: 6,
        ap: 2,
        damage: fixed(2),
        firingModels: 3,
      });
      const defender = makeDefender({ toughness: 5, save: 3, wounds: 3, modelCount: 3 });

      const base = runSimulation(makeInput([weapon], defender));
      const input = makeInput([weapon], defender);
      input.attacker.attackerEffects = [makeEffect({ damageBonus: 1 })];
      const withAbility = runSimulation(input);

      expect(withAbility.summary.damage.mean).toBeGreaterThan(base.summary.damage.mean);
    });
  });

  // ── Strength Bonus ──────────────────────────────────────────────

  describe('Strength Bonus', () => {
    it('S4 vs T5 with +2 strength should cross wound threshold', () => {
      const weapon = makeWeapon({ attacks: fixed(2), skill: 3, strength: 4, firingModels: 5 });
      const defender = makeDefender({ toughness: 5, save: 4, wounds: 1, modelCount: 10 });

      const base = runSimulation(makeInput([weapon], defender));
      const input = makeInput([weapon], defender);
      input.attacker.attackerEffects = [makeEffect({ strengthBonus: 2 })];
      const withAbility = runSimulation(input);

      expect(withAbility.summary.damage.mean).toBeGreaterThan(base.summary.damage.mean);
    });

    it('S3 vs T6 with +2 strength should improve wound rate', () => {
      const weapon = makeWeapon({ attacks: fixed(1), skill: 4, strength: 3, firingModels: 10 });
      const defender = makeDefender({ toughness: 6, save: 4, wounds: 1, modelCount: 10 });

      const base = runSimulation(makeInput([weapon], defender));
      const input = makeInput([weapon], defender);
      input.attacker.attackerEffects = [makeEffect({ strengthBonus: 2 })];
      const withAbility = runSimulation(input);

      expect(withAbility.summary.damage.mean).toBeGreaterThan(base.summary.damage.mean);
    });
  });

  // ── Ignores Cover ───────────────────────────────────────────────

  describe('Ignores Cover', () => {
    it('AP1 weapon vs defender with cover should increase damage', () => {
      const weapon = makeWeapon({
        attacks: fixed(2),
        skill: 3,
        strength: 4,
        ap: 1,
        firingModels: 5,
      });
      const defender = makeDefender({ toughness: 4, save: 4, wounds: 1, modelCount: 10 });

      const inputCover = makeInput([weapon], defender);
      inputCover.defender.gameState.benefitOfCover = true;
      const withCover = runSimulation(inputCover);

      const inputIgnore = makeInput([weapon], defender);
      inputIgnore.defender.gameState.benefitOfCover = true;
      inputIgnore.attacker.attackerEffects = [makeEffect({ ignoresCover: true })];
      const withIgnore = runSimulation(inputIgnore);

      expect(withIgnore.summary.damage.mean).toBeGreaterThan(withCover.summary.damage.mean);
    });

    it('AP0 weapon vs defender with cover (Sv4+) should increase damage', () => {
      const weapon = makeWeapon({
        attacks: fixed(2),
        skill: 3,
        strength: 4,
        ap: 0,
        firingModels: 5,
      });
      const defender = makeDefender({ toughness: 4, save: 4, wounds: 1, modelCount: 10 });

      const inputCover = makeInput([weapon], defender);
      inputCover.defender.gameState.benefitOfCover = true;
      const withCover = runSimulation(inputCover);

      const inputIgnore = makeInput([weapon], defender);
      inputIgnore.defender.gameState.benefitOfCover = true;
      inputIgnore.attacker.attackerEffects = [makeEffect({ ignoresCover: true })];
      const withIgnore = runSimulation(inputIgnore);

      expect(withIgnore.summary.damage.mean).toBeGreaterThan(withCover.summary.damage.mean);
    });
  });

  // ── Benefit of Cover (Defender) ─────────────────────────────────

  describe('Benefit of Cover', () => {
    it('should decrease damage vs AP1 weapons', () => {
      const weapon = makeWeapon({
        attacks: fixed(2),
        skill: 3,
        strength: 4,
        ap: 1,
        firingModels: 5,
      });
      const defender = makeDefender({ toughness: 4, save: 4, wounds: 1, modelCount: 10 });

      const base = runSimulation(makeInput([weapon], defender));
      const input = makeInput([weapon], defender);
      input.defender.gameState.benefitOfCover = true;
      const withCover = runSimulation(input);

      expect(withCover.summary.damage.mean).toBeLessThan(base.summary.damage.mean);
    });

    it('should decrease damage vs AP2 weapons', () => {
      const weapon = makeWeapon({
        attacks: fixed(1),
        skill: 3,
        strength: 8,
        ap: 2,
        damage: fixed(2),
        firingModels: 3,
      });
      const defender = makeDefender({ toughness: 5, save: 3, wounds: 2, modelCount: 5 });

      const base = runSimulation(makeInput([weapon], defender));
      const input = makeInput([weapon], defender);
      input.defender.gameState.benefitOfCover = true;
      const withCover = runSimulation(input);

      expect(withCover.summary.damage.mean).toBeLessThan(base.summary.damage.mean);
    });
  });

  // ── Stealth (Defender) ──────────────────────────────────────────

  describe('Stealth', () => {
    it('should decrease ranged damage', () => {
      const weapon = makeWeapon({ attacks: fixed(2), skill: 3, strength: 4, firingModels: 5 });
      const defender = makeDefender({ toughness: 4, save: 4, wounds: 1, modelCount: 10 });

      const base = runSimulation(makeInput([weapon], defender));
      const input = makeInput([weapon], defender);
      input.defender.gameState.stealthAll = true;
      const withStealth = runSimulation(input);

      expect(withStealth.summary.damage.mean).toBeLessThan(base.summary.damage.mean);
    });

    it('should decrease damage for BS4+ shooters', () => {
      const weapon = makeWeapon({
        attacks: fixed(3),
        skill: 4,
        strength: 5,
        ap: 1,
        firingModels: 3,
      });
      const defender = makeDefender({ toughness: 3, save: 5, wounds: 1, modelCount: 10 });

      const base = runSimulation(makeInput([weapon], defender));
      const input = makeInput([weapon], defender);
      input.defender.gameState.stealthAll = true;
      const withStealth = runSimulation(input);

      expect(withStealth.summary.damage.mean).toBeLessThan(base.summary.damage.mean);
    });
  });

  // ── Feel No Pain (Defender) ─────────────────────────────────────

  describe('Feel No Pain', () => {
    it('FNP 5+ should reduce damage by roughly 33%', () => {
      const weapon = makeWeapon({
        attacks: fixed(2),
        skill: 3,
        strength: 4,
        ap: 1,
        firingModels: 5,
      });
      const defender = makeDefender({ toughness: 4, save: 4, wounds: 1, modelCount: 10 });

      const base = runSimulation(makeInput([weapon], defender));
      const input = makeInput([weapon], defender);
      input.defender.defenderEffects = [makeEffect({ feelNoPain: 5 })];
      const withFNP = runSimulation(input);

      expect(withFNP.summary.damage.mean).toBeLessThan(base.summary.damage.mean);
      const ratio = withFNP.summary.damage.mean / base.summary.damage.mean;
      expect(ratio).toBeGreaterThan(0.5);
      expect(ratio).toBeLessThan(0.85);
    });

    it('FNP 4+ should reduce damage by roughly 50%', () => {
      const weapon = makeWeapon({
        attacks: fixed(1),
        skill: 3,
        strength: 5,
        ap: 1,
        damage: fixed(2),
        firingModels: 5,
      });
      const defender = makeDefender({ toughness: 4, save: 4, wounds: 2, modelCount: 5 });

      const base = runSimulation(makeInput([weapon], defender));
      const input = makeInput([weapon], defender);
      input.defender.defenderEffects = [makeEffect({ feelNoPain: 4 })];
      const withFNP = runSimulation(input);

      expect(withFNP.summary.damage.mean).toBeLessThan(base.summary.damage.mean);
      const ratio = withFNP.summary.damage.mean / base.summary.damage.mean;
      expect(ratio).toBeGreaterThan(0.3);
      expect(ratio).toBeLessThan(0.7);
    });
  });

  // ── Damage Reduction (Defender) ─────────────────────────────────

  describe('Damage Reduction', () => {
    it('D2 weapon reduced to D1 should decrease damage', () => {
      const weapon = makeWeapon({
        attacks: fixed(2),
        skill: 3,
        strength: 5,
        ap: 1,
        damage: fixed(2),
        firingModels: 5,
      });
      const defender = makeDefender({ toughness: 4, save: 4, wounds: 2, modelCount: 5 });

      const base = runSimulation(makeInput([weapon], defender));
      const input = makeInput([weapon], defender);
      input.defender.defenderEffects = [makeEffect({ damageReduction: 1 })];
      const withReduction = runSimulation(input);

      expect(withReduction.summary.damage.mean).toBeLessThan(base.summary.damage.mean);
    });

    it('D1 weapon should still deal minimum 1 damage', () => {
      const weapon = makeWeapon({
        attacks: fixed(2),
        skill: 3,
        strength: 4,
        ap: 1,
        damage: fixed(1),
        firingModels: 5,
      });
      const defender = makeDefender({ toughness: 4, save: 5, wounds: 1, modelCount: 10 });

      const base = runSimulation(makeInput([weapon], defender));
      const input = makeInput([weapon], defender);
      input.defender.defenderEffects = [makeEffect({ damageReduction: 1 })];
      const withReduction = runSimulation(input);

      // D1 - 1 = 0, but floors to 1, so damage should be the same
      expect(withReduction.summary.damage.mean).toBeCloseTo(base.summary.damage.mean, 0);
    });
  });

  // ── Reroll Saves (Defender) ─────────────────────────────────────

  describe('Reroll Saves', () => {
    it('reroll saves ones: Sv3+ should decrease damage', () => {
      const weapon = makeWeapon({
        attacks: fixed(2),
        skill: 3,
        strength: 4,
        ap: 1,
        firingModels: 5,
      });
      const defender = makeDefender({ toughness: 4, save: 3, wounds: 1, modelCount: 10 });

      const base = runSimulation(makeInput([weapon], defender));
      const input = makeInput([weapon], defender);
      input.defender.defenderEffects = [makeEffect({ rerollSaves: 'ones' })];
      const withReroll = runSimulation(input);

      expect(withReroll.summary.damage.mean).toBeLessThan(base.summary.damage.mean);
    });

    it('reroll saves all: Sv4+ should decrease damage', () => {
      const weapon = makeWeapon({
        attacks: fixed(2),
        skill: 3,
        strength: 4,
        ap: 1,
        firingModels: 5,
      });
      const defender = makeDefender({ toughness: 4, save: 4, wounds: 1, modelCount: 10 });

      const base = runSimulation(makeInput([weapon], defender));
      const input = makeInput([weapon], defender);
      input.defender.defenderEffects = [makeEffect({ rerollSaves: 'all' })];
      const withReroll = runSimulation(input);

      expect(withReroll.summary.damage.mean).toBeLessThan(base.summary.damage.mean);
    });

    it('reroll all should decrease damage more than reroll ones', () => {
      const weapon = makeWeapon({
        attacks: fixed(2),
        skill: 3,
        strength: 4,
        ap: 1,
        firingModels: 5,
      });
      const defender = makeDefender({ toughness: 4, save: 3, wounds: 1, modelCount: 10 });

      const inputOnes = makeInput([weapon], defender);
      inputOnes.defender.defenderEffects = [makeEffect({ rerollSaves: 'ones' })];
      const onesResult = runSimulation(inputOnes);

      const inputAll = makeInput([weapon], defender);
      inputAll.defender.defenderEffects = [makeEffect({ rerollSaves: 'all' })];
      const allResult = runSimulation(inputAll);

      expect(allResult.summary.damage.mean).toBeLessThan(onesResult.summary.damage.mean);
    });
  });

  // ── Weapon Keyword Abilities ────────────────────────────────────

  describe('Heavy + Remained Stationary', () => {
    it('heavy bolter should get +1 to hit when stationary', () => {
      const weapon = makeWeapon({
        attacks: fixed(3),
        skill: 4,
        strength: 5,
        ap: 1,
        firingModels: 3,
        keywords: { ...EMPTY_KEYWORDS, heavy: true },
      });
      const defender = makeDefender({ toughness: 4, save: 4, wounds: 1, modelCount: 10 });

      const base = runSimulation(makeInput([weapon], defender));
      const input = makeInput([weapon], defender);
      input.attacker.gameState.remainedStationary = true;
      const withStationary = runSimulation(input);

      expect(withStationary.summary.damage.mean).toBeGreaterThan(base.summary.damage.mean);
    });

    it('heavy weapon on BS3+ unit should benefit from stationary', () => {
      const weapon = makeWeapon({
        attacks: fixed(2),
        skill: 3,
        strength: 8,
        ap: 2,
        damage: fixed(2),
        firingModels: 2,
        keywords: { ...EMPTY_KEYWORDS, heavy: true },
      });
      const defender = makeDefender({ toughness: 5, save: 3, wounds: 2, modelCount: 5 });

      const base = runSimulation(makeInput([weapon], defender));
      const input = makeInput([weapon], defender);
      input.attacker.gameState.remainedStationary = true;
      const withStationary = runSimulation(input);

      expect(withStationary.summary.damage.mean).toBeGreaterThan(base.summary.damage.mean);
    });
  });

  describe('Lance + Charged', () => {
    it('lance melee weapon should get +1 to wound when charged', () => {
      const weapon = makeWeapon({
        type: 'melee',
        attacks: fixed(3),
        skill: 3,
        strength: 6,
        ap: 2,
        damage: fixed(2),
        firingModels: 1,
        rangeInches: 0,
        keywords: { ...EMPTY_KEYWORDS, lance: true },
      });
      const defender = makeDefender({ toughness: 5, save: 3, wounds: 3, modelCount: 3 });

      const base = runSimulation(makeInput([weapon], defender));
      const input = makeInput([weapon], defender);
      input.attacker.gameState.charged = true;
      const withCharge = runSimulation(input);

      expect(withCharge.summary.damage.mean).toBeGreaterThan(base.summary.damage.mean);
    });

    it('lance ranged weapon should get +1 to wound when charged', () => {
      const weapon = makeWeapon({
        attacks: fixed(2),
        skill: 3,
        strength: 9,
        ap: 3,
        damage: fixed(3),
        firingModels: 1,
        keywords: { ...EMPTY_KEYWORDS, lance: true },
      });
      const defender = makeDefender({
        toughness: 10,
        save: 3,
        wounds: 12,
        modelCount: 1,
        keywords: ['VEHICLE'],
      });

      const base = runSimulation(makeInput([weapon], defender));
      const input = makeInput([weapon], defender);
      input.attacker.gameState.charged = true;
      const withCharge = runSimulation(input);

      expect(withCharge.summary.damage.mean).toBeGreaterThan(base.summary.damage.mean);
    });
  });

  describe('Rapid Fire + Half Range', () => {
    it('rapid fire 1 should add 1 attack per model at half range', () => {
      const weapon = makeWeapon({
        attacks: fixed(1),
        skill: 3,
        strength: 4,
        firingModels: 5,
        keywords: { ...EMPTY_KEYWORDS, rapidFire: 1 },
        targetInHalfRange: false,
      });
      const defender = makeDefender({ toughness: 4, save: 4, wounds: 1, modelCount: 10 });

      const base = runSimulation(makeInput([weapon], defender));
      const weaponHalf = { ...weapon, targetInHalfRange: true };
      const withHalf = runSimulation(makeInput([weaponHalf], defender));

      expect(withHalf.summary.damage.mean).toBeGreaterThan(base.summary.damage.mean * 1.5);
    });

    it('rapid fire 2 should add 2 attacks per model at half range', () => {
      const weapon = makeWeapon({
        attacks: fixed(2),
        skill: 3,
        strength: 5,
        ap: 1,
        firingModels: 3,
        keywords: { ...EMPTY_KEYWORDS, rapidFire: 2 },
        targetInHalfRange: false,
      });
      const defender = makeDefender({ toughness: 4, save: 4, wounds: 1, modelCount: 10 });

      const base = runSimulation(makeInput([weapon], defender));
      const weaponHalf = { ...weapon, targetInHalfRange: true };
      const withHalf = runSimulation(makeInput([weaponHalf], defender));

      expect(withHalf.summary.damage.mean).toBeGreaterThan(base.summary.damage.mean);
    });
  });

  describe('Melta + Half Range', () => {
    it('melta 2 should add +2 damage at half range', () => {
      const weapon = makeWeapon({
        attacks: fixed(1),
        skill: 3,
        strength: 9,
        ap: 4,
        damage: { type: 'dice', count: 1, sides: 6, modifier: 0 },
        firingModels: 2,
        keywords: { ...EMPTY_KEYWORDS, melta: 2 },
        targetInHalfRange: false,
      });
      const defender = makeDefender({
        toughness: 10,
        save: 3,
        wounds: 12,
        modelCount: 1,
        keywords: ['VEHICLE'],
      });

      const base = runSimulation(makeInput([weapon], defender));
      const weaponHalf = { ...weapon, targetInHalfRange: true };
      const withHalf = runSimulation(makeInput([weaponHalf], defender));

      expect(withHalf.summary.damage.mean).toBeGreaterThan(base.summary.damage.mean);
    });

    it('melta 4 should add +4 damage at half range', () => {
      const weapon = makeWeapon({
        attacks: fixed(2),
        skill: 3,
        strength: 12,
        ap: 4,
        damage: { type: 'dice', count: 2, sides: 6, modifier: 0 },
        firingModels: 1,
        keywords: { ...EMPTY_KEYWORDS, melta: 4 },
        targetInHalfRange: false,
      });
      const defender = makeDefender({
        toughness: 12,
        save: 3,
        wounds: 16,
        modelCount: 1,
        keywords: ['VEHICLE'],
      });

      const base = runSimulation(makeInput([weapon], defender));
      const weaponHalf = { ...weapon, targetInHalfRange: true };
      const withHalf = runSimulation(makeInput([weaponHalf], defender));

      expect(withHalf.summary.damage.mean).toBeGreaterThan(base.summary.damage.mean);
    });
  });

  describe('Twin-Linked', () => {
    it('twin-linked bolter should reroll failed wounds', () => {
      const weapon = makeWeapon({
        attacks: fixed(2),
        skill: 3,
        strength: 4,
        firingModels: 5,
        keywords: { ...EMPTY_KEYWORDS, twinLinked: true },
      });
      const weaponNoTL = makeWeapon({
        attacks: fixed(2),
        skill: 3,
        strength: 4,
        firingModels: 5,
      });
      const defender = makeDefender({ toughness: 5, save: 4, wounds: 1, modelCount: 10 });

      const base = runSimulation(makeInput([weaponNoTL], defender));
      const withTL = runSimulation(makeInput([weapon], defender));

      expect(withTL.summary.damage.mean).toBeGreaterThan(base.summary.damage.mean);
    });

    it('twin-linked heavy weapon should reroll failed wounds', () => {
      const weapon = makeWeapon({
        attacks: fixed(1),
        skill: 3,
        strength: 8,
        ap: 2,
        damage: fixed(2),
        firingModels: 3,
        keywords: { ...EMPTY_KEYWORDS, twinLinked: true },
      });
      const weaponNoTL = makeWeapon({
        attacks: fixed(1),
        skill: 3,
        strength: 8,
        ap: 2,
        damage: fixed(2),
        firingModels: 3,
      });
      const defender = makeDefender({ toughness: 8, save: 3, wounds: 3, modelCount: 3 });

      const base = runSimulation(makeInput([weaponNoTL], defender));
      const withTL = runSimulation(makeInput([weapon], defender));

      expect(withTL.summary.damage.mean).toBeGreaterThan(base.summary.damage.mean);
    });
  });

  describe('TORRENT', () => {
    it('flamer should auto-hit (100% hit rate)', () => {
      const weapon = makeWeapon({
        attacks: fixed(6),
        skill: 0,
        strength: 4,
        firingModels: 1,
        keywords: { ...EMPTY_KEYWORDS, torrent: true },
      });
      const defender = makeDefender({ toughness: 4, save: 4, wounds: 1, modelCount: 10 });

      const result = runSimulation(makeInput([weapon], defender, 1000));
      for (const r of result.results) {
        expect(r.totalHits).toBe(6);
      }
    });

    it('heavy flamer should auto-hit regardless of BS', () => {
      const weapon = makeWeapon({
        attacks: fixed(6),
        skill: 5,
        strength: 5,
        ap: 1,
        firingModels: 2,
        keywords: { ...EMPTY_KEYWORDS, torrent: true },
      });
      const defender = makeDefender({ toughness: 4, save: 4, wounds: 1, modelCount: 20 });

      const result = runSimulation(makeInput([weapon], defender, 1000));
      for (const r of result.results) {
        expect(r.totalHits).toBe(12); // 6 attacks × 2 models
      }
    });
  });

  describe('Blast', () => {
    it('blast vs 10 models should add 2 attacks', () => {
      const weapon = makeWeapon({
        attacks: { type: 'dice', count: 1, sides: 6, modifier: 0 },
        skill: 3,
        strength: 4,
        firingModels: 1,
        keywords: { ...EMPTY_KEYWORDS, blast: true },
      });
      const weaponNoBlast = makeWeapon({
        attacks: { type: 'dice', count: 1, sides: 6, modifier: 0 },
        skill: 3,
        strength: 4,
        firingModels: 1,
      });
      const defender = makeDefender({ toughness: 4, save: 4, wounds: 1, modelCount: 10 });

      const base = runSimulation(makeInput([weaponNoBlast], defender));
      const withBlast = runSimulation(makeInput([weapon], defender));

      expect(withBlast.summary.damage.mean).toBeGreaterThan(base.summary.damage.mean);
    });

    it('blast vs 20 models should add 4 attacks', () => {
      const weapon = makeWeapon({
        attacks: fixed(1),
        skill: 3,
        strength: 4,
        firingModels: 1,
        keywords: { ...EMPTY_KEYWORDS, blast: true },
      });
      const weaponNoBlast = makeWeapon({
        attacks: fixed(1),
        skill: 3,
        strength: 4,
        firingModels: 1,
      });
      const defender = makeDefender({ toughness: 4, save: 4, wounds: 1, modelCount: 20 });

      const base = runSimulation(makeInput([weaponNoBlast], defender));
      const withBlast = runSimulation(makeInput([weapon], defender));

      // Blast adds floor(20/5) = 4 attacks on top of 1 base = 5 total vs 1
      expect(withBlast.summary.damage.mean).toBeGreaterThan(base.summary.damage.mean * 3);
    });
  });

  // ── Wound Reroll + Anti-X Crit Wound Interaction ────────────────

  describe('Wound Reroll + Anti-X Interaction', () => {
    it('reroll all wounds should not reroll Anti-X crit wounds', () => {
      // Anti-Vehicle 4+ with weak S vs high T: crit wound on 4+, normal wound on 6+
      // Without the fix, reroll-all would reroll rolls of 4-5 (which are crit wounds)
      const weapon = makeWeapon({
        attacks: fixed(1),
        skill: 3,
        strength: 3,
        firingModels: 20,
        keywords: { ...EMPTY_KEYWORDS, antiKeyword: 'VEHICLE', antiThreshold: 4 },
      });
      const defender = makeDefender({
        toughness: 10,
        save: 6,
        wounds: 1,
        modelCount: 20,
        keywords: ['VEHICLE'],
      });

      const inputReroll = makeInput([weapon], defender);
      inputReroll.attacker.attackerEffects = [makeEffect({ rerollWounds: 'all' })];
      const withReroll = runSimulation(inputReroll);

      const base = runSimulation(makeInput([weapon], defender));

      // With rerolls, damage should increase (not decrease from rerolling good rolls)
      expect(withReroll.summary.damage.mean).toBeGreaterThan(base.summary.damage.mean);
    });
  });
});
