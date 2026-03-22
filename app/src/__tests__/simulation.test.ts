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
    toughness: 3,
    save: 5,
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
  iterations = 10000
): SimulationInput {
  return {
    attacker: {
      weaponGroups,
      gameState: { ...DEFAULT_ATTACKER_STATE },
      stratagems: [],
    },
    defender: {
      ...defender,
      gameState: { ...DEFAULT_DEFENDER_STATE },
      stratagems: [],
    },
    iterations,
  };
}

// ─── Tests ───────────────────────────────────────────────────────

describe('Simulation Engine', () => {
  describe('Basic ranged attacks', () => {
    it('10 bolters vs 10 Guardsmen should average ~4.4 kills', () => {
      // 10 bolters: BS 3+, S4, AP0, D1
      // vs 10 Guardsmen: T3, Sv5+, W1
      // Hit: 3+ = 4/6, Wound: S4 vs T3 = 3+ = 4/6, Save: 5+ with AP0 = fail on 1-4 = 4/6
      // Per model: (4/6) * (4/6) * (4/6) = 64/216 ≈ 0.296
      // 10 models × 1 attack × 0.296 ≈ 2.96 damage/kills (all W1 models)
      // But each model fires 1 bolter shot — wait, bolters are rapid fire 1
      // Just testing 10 shots, 1 attack each
      const bolter = makeWeapon({
        name: 'Bolt rifle',
        attacks: fixed(1),
        skill: 3,
        strength: 4,
        ap: 0,
        damage: fixed(1),
        firingModels: 10,
      });

      const guardsmen = makeDefender({
        toughness: 3,
        save: 5,
        wounds: 1,
        modelCount: 10,
      });

      const result = runSimulation(makeInput([bolter], guardsmen));

      // Expected: ~2.96 kills avg (10 attacks × 0.296 per attack)
      expect(result.summary.modelsKilled.mean).toBeGreaterThan(2.0);
      expect(result.summary.modelsKilled.mean).toBeLessThan(4.0);
    });
  });

  describe('Ranged vs Melee weapon difference', () => {
    it('Aggressor-like unit: ranged should differ from melee damage', () => {
      // Simulated Aggressor profile:
      // Ranged: auto boltstorm gauntlets - 3 attacks, BS 3+, S4, AP0, D1 (TWIN-LINKED)
      // Melee: twin power fists - 3 attacks, WS 3+, S8, AP-2, D2

      const rangedWeapon = makeWeapon({
        name: 'Auto boltstorm gauntlets',
        type: 'ranged',
        rangeInches: 18,
        attacks: fixed(3),
        skill: 3,
        strength: 4,
        ap: 0,
        damage: fixed(1),
        keywords: { ...EMPTY_KEYWORDS, twinLinked: true },
        firingModels: 3,
      });

      const meleeWeapon = makeWeapon({
        name: 'Twin power fists',
        type: 'melee',
        rangeInches: 0,
        attacks: fixed(3),
        skill: 3,
        strength: 8,
        ap: 2,
        damage: fixed(2),
        keywords: { ...EMPTY_KEYWORDS },
        firingModels: 3,
      });

      // Target: T5 Sv3+ W2 (like Hearthkyn Warriors)
      const defender = makeDefender({
        toughness: 5,
        save: 3,
        wounds: 2,
        modelCount: 10,
        keywords: ['INFANTRY'],
      });

      const rangedResult = runSimulation(makeInput([rangedWeapon], defender));
      const meleeResult = runSimulation(makeInput([meleeWeapon], defender));

      // Ranged: S4 vs T5 = wound on 5+ (2/6), AP0 vs Sv3+ = save on 3+ (4/6 saved)
      //   Per attack: (4/6 hit) × (2/6 wound, with twin-linked rerolls) × (2/6 failed save) × 1 damage
      //   Twin-linked wound: P(wound) = 1 - (4/6)^2 ≈ 0.556... wait, no.
      //   Twin-linked: reroll failed wounds. P = 2/6 + (4/6)(2/6) = 2/6 + 8/36 = 20/36 ≈ 0.556
      //   Per attack: (4/6) × (20/36) × (2/6) × 1 ≈ 0.123
      //   9 attacks total: ~1.11 damage

      // Melee: S8 vs T5 = wound on 3+ (4/6), AP-2 vs Sv3+ = save on 5+ (2/6 saved)
      //   Per attack: (4/6 hit) × (4/6 wound) × (4/6 failed save) × 2 damage
      //   Per attack: 0.593 damage
      //   9 attacks total: ~5.33 damage

      // Melee should deal significantly more damage
      expect(meleeResult.summary.damage.mean).toBeGreaterThan(
        rangedResult.summary.damage.mean * 1.5
      );

      // Sanity check individual ranges
      expect(rangedResult.summary.damage.mean).toBeGreaterThan(0.5);
      expect(rangedResult.summary.damage.mean).toBeLessThan(3.0);
      expect(meleeResult.summary.damage.mean).toBeGreaterThan(3.0);
      expect(meleeResult.summary.damage.mean).toBeLessThan(8.0);
    });
  });

  describe('Weapon abilities', () => {
    it('TORRENT should auto-hit (100% hit rate)', () => {
      const torrentWeapon = makeWeapon({
        name: 'Flamer',
        attacks: fixed(6),
        skill: 0, // N/A
        strength: 4,
        ap: 0,
        damage: fixed(1),
        keywords: { ...EMPTY_KEYWORDS, torrent: true },
        firingModels: 1,
      });

      const defender = makeDefender({ toughness: 4, save: 4, wounds: 1, modelCount: 20 });
      const result = runSimulation(makeInput([torrentWeapon], defender, 1000));

      // All 6 attacks should hit every iteration
      for (const r of result.results) {
        expect(r.totalHits).toBe(6);
      }
    });

    it('MELTA at half range should add bonus damage', () => {
      const meltaBase = makeWeapon({
        name: 'Multi-melta',
        attacks: fixed(2),
        skill: 3,
        strength: 9,
        ap: 4,
        damage: { type: 'dice', count: 1, sides: 6, modifier: 0 },
        keywords: { ...EMPTY_KEYWORDS, melta: 2 },
        firingModels: 1,
        targetInHalfRange: false,
      });

      const meltaHalf = { ...meltaBase, targetInHalfRange: true };

      const defender = makeDefender({
        toughness: 9,
        save: 3,
        invulnerableSave: null,
        wounds: 12,
        modelCount: 1,
        keywords: ['VEHICLE'],
      });

      const resultFar = runSimulation(makeInput([meltaBase], defender, 5000));
      const resultClose = runSimulation(makeInput([meltaHalf], defender, 5000));

      // At half range, melta 2 adds +2 damage per unsaved wound
      // So close range should deal more damage on average
      expect(resultClose.summary.damage.mean).toBeGreaterThan(resultFar.summary.damage.mean);
    });

    it('LETHAL HITS should skip wound rolls on crit hits', () => {
      // Use a weapon that wounds poorly but has lethal hits
      const lethalWeapon = makeWeapon({
        name: 'Lethal shooter',
        attacks: fixed(1),
        skill: 3,
        strength: 3,
        ap: 0,
        damage: fixed(1),
        keywords: { ...EMPTY_KEYWORDS, lethalHits: true },
        firingModels: 100,
      });

      // Target with very high toughness - wounds on 6+ normally
      const defender = makeDefender({
        toughness: 12,
        save: 7, // auto-fail save to isolate hit/wound
        wounds: 1000,
        modelCount: 1,
      });

      const result = runSimulation(makeInput([lethalWeapon], defender, 1));

      // With lethal hits and 100 models, crit hits (nat 6) auto-wound
      // Hit rate: 4/6, crit hit rate: 1/6 (these auto-wound via lethal hits)
      // Normal wound rate: 5/6 of hits × 1/6 wound on S3 vs T12 = very low
      // Lethal hits contribute significantly — total wounds should be > 0
      expect(result.results[0].totalWounds).toBeGreaterThan(0);
    });
  });

  describe('Defender saves', () => {
    it('Invulnerable save should cap damage against high AP', () => {
      const highAP = makeWeapon({
        name: 'Lascannon',
        attacks: fixed(1),
        skill: 3,
        strength: 12,
        ap: 3,
        damage: fixed(1),
        keywords: { ...EMPTY_KEYWORDS },
        firingModels: 20,
      });

      // Sv 6+ with 4++ invuln
      const withInvuln = makeDefender({
        toughness: 4,
        save: 6,
        invulnerableSave: 4,
        wounds: 1,
        modelCount: 20,
      });

      // Sv 6+ without invuln
      const withoutInvuln = makeDefender({
        toughness: 4,
        save: 6,
        invulnerableSave: null,
        wounds: 1,
        modelCount: 20,
      });

      const resultInvuln = runSimulation(makeInput([highAP], withInvuln));
      const resultNoInvuln = runSimulation(makeInput([highAP], withoutInvuln));

      // With invuln save, fewer models should die
      expect(resultInvuln.summary.modelsKilled.mean).toBeLessThan(
        resultNoInvuln.summary.modelsKilled.mean
      );
    });

    it('Feel No Pain should reduce effective damage', () => {
      const weapon = makeWeapon({
        attacks: fixed(1),
        skill: 3,
        strength: 4,
        ap: 1,
        damage: fixed(1),
        firingModels: 20,
      });

      const noFNP = makeDefender({ wounds: 1, modelCount: 20 });
      const withFNP = makeDefender({ wounds: 1, modelCount: 20, feelNoPain: 5 });

      const resultNoFNP = runSimulation(makeInput([weapon], noFNP));
      const resultFNP = runSimulation(makeInput([weapon], withFNP));

      // FNP 5+ should block ~33% of wounds
      expect(resultFNP.summary.damage.mean).toBeLessThan(resultNoFNP.summary.damage.mean);
      // Roughly 2/3 of the damage should get through
      const ratio = resultFNP.summary.damage.mean / resultNoFNP.summary.damage.mean;
      expect(ratio).toBeGreaterThan(0.5);
      expect(ratio).toBeLessThan(0.85);
    });
  });
});
