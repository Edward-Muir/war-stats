import { describe, it, expect } from 'vitest';
import { runSimulation } from '../engine/simulation';
import { computeModifiers } from '../engine/modifiers';
import type {
  SimulationInput,
  ResolvedWeaponGroup,
  DefenderProfile,
  DiceExpr,
} from '../types/simulation';
import { EMPTY_KEYWORDS } from '../types/simulation';
import { DEFAULT_ATTACKER_STATE, DEFAULT_DEFENDER_STATE } from '../types/config';
import type { UnitEffect, WeaponScope } from '../types/effects';
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
  opts: { weaponScope?: WeaponScope; combatType?: 'ranged' | 'melee' | 'any' } = {}
): UnitEffect {
  return {
    id: 'test-effect',
    label: 'Test Effect',
    source: 'Test',
    side: 'attacker',
    activation: 'toggle',
    combatType: opts.combatType ?? 'any',
    modifiers,
    conditionals: [],
    weaponScope: opts.weaponScope,
  };
}

// ─── Tests ───────────────────────────────────────────────────────

describe('Scoped Effects', () => {
  describe('Weapon scope filtering — name match', () => {
    it('effect with weaponNameIncludes only applies to matching weapons', () => {
      const boltRifle = makeWeapon({ name: 'Bolt Rifle', attacks: fixed(2), firingModels: 5 });
      const grenadeLauncher = makeWeapon({
        name: 'Astartes Grenade Launcher',
        attacks: fixed(1),
        firingModels: 1,
      });
      const defender = makeDefender();

      const scopedEffect = makeEffect(
        { bonusAttacks: 2 },
        { weaponScope: { weaponNameIncludes: 'bolt' } }
      );

      // Bolt rifle should get +2 attacks
      const boltMods = computeModifiers(
        boltRifle,
        DEFAULT_ATTACKER_STATE,
        DEFAULT_DEFENDER_STATE,
        defender,
        [scopedEffect]
      );
      expect(boltMods.attacksBonus).toBe(2);

      // Grenade launcher should NOT get +2 attacks
      const grenadeMods = computeModifiers(
        grenadeLauncher,
        DEFAULT_ATTACKER_STATE,
        DEFAULT_DEFENDER_STATE,
        defender,
        [scopedEffect]
      );
      expect(grenadeMods.attacksBonus).toBe(0);
    });

    it('name matching is case-insensitive', () => {
      const weapon = makeWeapon({ name: 'BOLT RIFLE' });
      const defender = makeDefender();
      const effect = makeEffect(
        { bonusAttacks: 1 },
        { weaponScope: { weaponNameIncludes: 'bolt' } }
      );

      const mods = computeModifiers(
        weapon,
        DEFAULT_ATTACKER_STATE,
        DEFAULT_DEFENDER_STATE,
        defender,
        [effect]
      );
      expect(mods.attacksBonus).toBe(1);
    });
  });

  describe('Weapon scope filtering — keyword match', () => {
    it('effect with weaponHasKeyword only applies to weapons with that keyword', () => {
      const assaultWeapon = makeWeapon({
        name: 'Assault Bolter',
        keywords: { ...EMPTY_KEYWORDS, assault: true },
      });
      const heavyWeapon = makeWeapon({
        name: 'Heavy Bolter',
        keywords: { ...EMPTY_KEYWORDS, heavy: true },
      });
      const defender = makeDefender();

      const effect = makeEffect(
        { hitModifier: 1 },
        { weaponScope: { weaponHasKeyword: 'assault' } }
      );

      const assaultMods = computeModifiers(
        assaultWeapon,
        DEFAULT_ATTACKER_STATE,
        DEFAULT_DEFENDER_STATE,
        defender,
        [effect]
      );
      // +1 hit from effect (no other sources of hit mod)
      expect(assaultMods.hitModifier).toBe(1);

      const heavyMods = computeModifiers(
        heavyWeapon,
        DEFAULT_ATTACKER_STATE,
        DEFAULT_DEFENDER_STATE,
        defender,
        [effect]
      );
      expect(heavyMods.hitModifier).toBe(0);
    });
  });

  describe('Unscoped effect applies to all weapons', () => {
    it('effect without weaponScope applies to every weapon', () => {
      const weapon1 = makeWeapon({ name: 'Bolt Rifle' });
      const weapon2 = makeWeapon({ name: 'Grenade Launcher' });
      const defender = makeDefender();

      const effect = makeEffect({ rerollHits: 'all' });

      for (const weapon of [weapon1, weapon2]) {
        const mods = computeModifiers(
          weapon,
          DEFAULT_ATTACKER_STATE,
          DEFAULT_DEFENDER_STATE,
          defender,
          [effect]
        );
        expect(mods.rerollHits).toBe('all');
      }
    });
  });

  describe('Combat type filtering still works', () => {
    it('ranged-only effect does not apply to melee weapon', () => {
      const meleeWeapon = makeWeapon({ name: 'Power Sword', type: 'melee' });
      const defender = makeDefender();

      const rangedEffect = makeEffect({ rerollHits: 'all' }, { combatType: 'ranged' });

      const mods = computeModifiers(
        meleeWeapon,
        DEFAULT_ATTACKER_STATE,
        DEFAULT_DEFENDER_STATE,
        defender,
        [rangedEffect]
      );
      expect(mods.rerollHits).toBe('none');
    });
  });

  describe('Full simulation — scoped vs unscoped damage', () => {
    it('weapon-scoped +2 attacks produces less damage than blanket +2 attacks', () => {
      // 5 bolt rifles + 1 grenade launcher
      const boltRifle = makeWeapon({
        name: 'Bolt Rifle',
        attacks: fixed(2),
        skill: 3,
        strength: 4,
        firingModels: 5,
      });
      const grenadeLauncher = makeWeapon({
        name: 'Astartes Grenade Launcher',
        attacks: fixed(1),
        skill: 3,
        strength: 4,
        firingModels: 1,
      });
      const defender = makeDefender({ toughness: 4, save: 3, wounds: 2, modelCount: 5 });

      // Scoped: +2 attacks only to bolt weapons
      const scopedInput = makeInput([boltRifle, grenadeLauncher], defender);
      scopedInput.attacker.attackerEffects = [
        makeEffect({ bonusAttacks: 2 }, { weaponScope: { weaponNameIncludes: 'bolt' } }),
      ];
      const scopedResult = runSimulation(scopedInput);

      // Blanket: +2 attacks to ALL weapons (old broken behavior)
      const blanketInput = makeInput([boltRifle, grenadeLauncher], defender);
      blanketInput.attacker.attackerEffects = [makeEffect({ bonusAttacks: 2 })];
      const blanketResult = runSimulation(blanketInput);

      // Base: no effect
      const baseInput = makeInput([boltRifle, grenadeLauncher], defender);
      const baseResult = runSimulation(baseInput);

      // Scoped should be more than base
      expect(scopedResult.summary.damage.mean).toBeGreaterThan(baseResult.summary.damage.mean);

      // Blanket should be more than scoped (grenade launcher also gets +2)
      expect(blanketResult.summary.damage.mean).toBeGreaterThan(scopedResult.summary.damage.mean);
    });
  });

  describe('Always-on effects', () => {
    it('deriveAbilityUnitEffects marks always-on abilities correctly', async () => {
      const { deriveAbilityUnitEffects } = await import('../logic/ability-effects');

      // Create a minimal datasheet with an always-on ability
      const datasheet = {
        name: 'Test Unit',
        baseSize: '32mm',
        invulnerableSave: null,
        weapons: {},
        abilities: {
          core: [],
          faction: [],
          other: [
            { name: 'Astartes shield', description: 'This model has a 4+ invulnerable save.' },
          ],
          feelNoPain: null,
          damaged: null,
        },
        keywords: ['INFANTRY'],
        factionKeywords: ['ADEPTUS ASTARTES'],
        composition: { options: [] },
        models: [],
        leaderUnits: [],
      };

      const effects = deriveAbilityUnitEffects(datasheet as never, 'space-marines', 'defender');
      expect(effects.length).toBe(1);
      expect(effects[0].activation).toBe('always');
      expect(effects[0].modifiers.invulnerableSave).toBe(4);
      expect(effects[0].id).toBe('ability::Astartes shield::invulnerableSave');
    });
  });
});
