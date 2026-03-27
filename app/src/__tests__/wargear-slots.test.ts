import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { UnitDatasheet, FactionDatasheets } from '../types/data';
import {
  buildWargearSlots,
  computeWeaponIds,
  buildDefaultModels,
  applySlotSelection,
  setDefinitionTotal,
  deriveSelectedWeapons,
  buildDefaultFiringConfig,
} from '../logic/wargear-slots';

// ─── Helpers ─────────────────────────────────────────────────────

const thisDir = path.dirname(fileURLToPath(import.meta.url));

function loadFaction(slug: string): FactionDatasheets {
  const filePath = path.join(thisDir, '..', '..', '..', 'factions', 'datasheets', `${slug}.json`);
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function findUnit(faction: FactionDatasheets, name: string): UnitDatasheet {
  const ds = faction.datasheets.find((d) => d.name === name);
  if (!ds) throw new Error(`Unit "${name}" not found in faction`);
  return ds;
}

// ─── Test Data ───────────────────────────────────────────────────

let spaceMarine: FactionDatasheets;

beforeAll(() => {
  spaceMarine = loadFaction('space-marines');
});

// ─── Test 1: Basic slot construction from selectionGroups ────────

describe('V2 selectionGroup slot construction', () => {
  it('should create slots from model selectionGroups', () => {
    const ds = findUnit(spaceMarine, 'Intercessor Squad');
    const slots = buildWargearSlots(ds);

    // Should have at least some slots
    expect(slots.length).toBeGreaterThan(0);

    // Each slot should have a valid slotId and options
    for (const slot of slots) {
      expect(slot.slotId).toBeTruthy();
      expect(slot.definitionName).toBeTruthy();
      expect(slot.options.length).toBeGreaterThan(0);
      for (const opt of slot.options) {
        expect(opt.selectionGroupId).toBeTruthy();
        expect(opt.selectionId).toBeTruthy();
      }
    }
  });
});

// ─── Test 2: Default models with min: 0 ──────────────────────────

describe('buildDefaultModels handles min: 0', () => {
  it('should create groups with count 0 for optional models', () => {
    // Find a unit that has optional models (min: 0)
    const allUnits = spaceMarine.datasheets;
    const unitWithOptional = allUnits.find((ds) =>
      ds.models.some((m) => m.min === 0)
    );

    if (unitWithOptional) {
      const slots = buildWargearSlots(unitWithOptional);
      const models = buildDefaultModels(unitWithOptional, slots);

      const optionalModel = unitWithOptional.models.find((m) => m.min === 0);
      const optionalGroup = models.find(
        (m) => m.definitionName === optionalModel!.name
      );
      expect(optionalGroup).toBeDefined();
      expect(optionalGroup!.count).toBe(0);
    }
  });
});

// ─── Test 3: Weapon ID lookup ────────────────────────────────────

describe('computeWeaponIds', () => {
  it('should return defaultWeaponIds when no selections', () => {
    const ds = findUnit(spaceMarine, 'Intercessor Squad');
    const slots = buildWargearSlots(ds);

    const model = ds.models[0]; // First model definition
    const weaponIds = computeWeaponIds(model, [], slots);
    expect(weaponIds).toEqual(model.defaultWeaponIds);
  });
});

// ─── Test 4: Slot selection applies correctly ────────────────────

describe('applySlotSelection', () => {
  it('should apply a single_model selection', () => {
    const ds = findUnit(spaceMarine, 'Intercessor Squad');
    const slots = buildWargearSlots(ds);
    let models = buildDefaultModels(ds, slots);

    const singleSlots = slots.filter((s) => s.scope.kind === 'single_model');
    if (singleSlots.length > 0) {
      const slot = singleSlots[0];
      const opt = slot.options[0];
      const optionKey = `${opt.selectionGroupId}:${opt.selectionId}`;

      models = applySlotSelection(models, slots, ds, slot.slotId, optionKey);

      const target = models.find((m) => m.definitionName === slot.definitionName);
      expect(target).toBeDefined();
      expect(target!.slotSelections.some((s) => s.slotId === slot.slotId)).toBe(true);
    }
  });
});

// ─── Test 5: deriveSelectedWeapons ───────────────────────────────

describe('deriveSelectedWeapons', () => {
  it('should produce weapons for simulation', () => {
    const ds = findUnit(spaceMarine, 'Intercessor Squad');
    const slots = buildWargearSlots(ds);
    const models = buildDefaultModels(ds, slots);
    const firingConfig = buildDefaultFiringConfig(models, slots, ds);

    const ranged = deriveSelectedWeapons(models, firingConfig, slots, ds, 'ranged');
    const melee = deriveSelectedWeapons(models, firingConfig, slots, ds, 'melee');

    // Should have at least some weapons
    expect(ranged.length + melee.length).toBeGreaterThan(0);

    // Each weapon should reference a real weapon from the registry
    for (const sw of [...ranged, ...melee]) {
      expect(sw.weapon.name).toBeTruthy();
      expect(sw.firingModelCount).toBeGreaterThan(0);
    }
  });
});

// ─── Test 6: setDefinitionTotal ──────────────────────────────────

describe('setDefinitionTotal', () => {
  it('should adjust base group count within min/max', () => {
    const ds = findUnit(spaceMarine, 'Intercessor Squad');
    const slots = buildWargearSlots(ds);
    let models = buildDefaultModels(ds, slots);

    // Find a model definition with max > min
    const scalable = ds.models.find((m) => m.max > m.min);
    if (scalable) {
      models = setDefinitionTotal(models, scalable.name, scalable.max, ds);
      const total = models
        .filter((m) => m.definitionName === scalable.name)
        .reduce((sum, m) => sum + m.count, 0);
      expect(total).toBe(scalable.max);
    }
  });
});

// ─── Test 7: Empty selection groups → no slots ───────────────────

describe('Empty selectionGroups', () => {
  it('should not create slots for models without selectionGroups', () => {
    const ds: UnitDatasheet = {
      name: 'Test Unit',
      baseSize: '32mm',
      invulnerableSave: null,
      weapons: {
        'test-weapon': {
          name: 'Test Weapon',
          type: 'ranged',
          range: '24"',
          A: '1',
          BS: '3+',
          WS: null,
          S: '4',
          AP: '0',
          D: '1',
          keywords: [],
        },
      },
      abilities: { core: [], faction: [], other: [], feelNoPain: null, damaged: null },
      keywords: [],
      factionKeywords: [],
      composition: { models: [], equipment: '', points: [] },
      models: [
        {
          id: 'trooper',
          name: 'Trooper',
          min: 5,
          max: 10,
          stats: { M: '6"', T: '4', Sv: '3+', W: '1', Ld: '6+', OC: '1' },
          defaultWeaponIds: ['test-weapon'],
          selectionGroups: [],
        },
      ],
      leaderUnits: [],
    };

    const slots = buildWargearSlots(ds);
    expect(slots.length).toBe(0);
  });
});
