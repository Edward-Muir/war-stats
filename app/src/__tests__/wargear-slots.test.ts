import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { UnitDatasheet, FactionDatasheets } from '../types/data';
import {
  buildWargearSlots,
  computeEquipment,
  buildDefaultModels,
  applySlotSelection,
  setVariableCount,
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
let votann: FactionDatasheets;

beforeAll(() => {
  spaceMarine = loadFaction('space-marines');
  votann = loadFaction('leagues-of-votann');
});

// ─── Test 1: Intercessor Sergeant — independent single_model slots ───

describe('Intercessor Sergeant — independent slots', () => {
  it('should create 2 independent single_model slots for the Sergeant', () => {
    const ds = findUnit(spaceMarine, 'Intercessor Squad');
    const slots = buildWargearSlots(ds);

    const sergeantSlots = slots.filter((s) => s.definitionName === 'Intercessor Sergeant');

    // Should have 2 replace slots (bolt rifle + ccw) + possibly a grenade launcher add slot
    const replaceSlots = sergeantSlots.filter((s) => s.type === 'replace');
    expect(replaceSlots.length).toBe(2);
    expect(replaceSlots.every((s) => s.scope.kind === 'single_model')).toBe(true);

    const boltRifleSlot = sergeantSlots.find((s) =>
      s.replaces.includes('bolt rifle')
    );
    const ccwSlot = sergeantSlots.find((s) =>
      s.replaces.includes('close combat weapon')
    );

    expect(boltRifleSlot).toBeDefined();
    expect(ccwSlot).toBeDefined();

    // Bolt rifle slot should have 4 choices
    expect(boltRifleSlot!.options.length).toBe(4);
    expect(boltRifleSlot!.options.map((o) => o.label)).toContain('hand flamer');

    // CCW slot should have 4 choices
    expect(ccwSlot!.options.length).toBe(4);
    expect(ccwSlot!.options.map((o) => o.label)).toContain('power fist');
  });

  it('should allow selecting from both slots simultaneously', () => {
    const ds = findUnit(spaceMarine, 'Intercessor Squad');
    const slots = buildWargearSlots(ds);
    let models = buildDefaultModels(ds, slots);

    const sergeantSlots = slots.filter(
      (s) => s.definitionName === 'Intercessor Sergeant'
    );
    const boltRifleSlot = sergeantSlots.find((s) =>
      s.replaces.includes('bolt rifle')
    )!;
    const ccwSlot = sergeantSlots.find((s) =>
      s.replaces.includes('close combat weapon')
    )!;

    // Select hand flamer for bolt rifle slot
    const handFlamerOpt = boltRifleSlot.options.find(
      (o) => o.label === 'hand flamer'
    )!;
    models = applySlotSelection(
      models,
      slots,
      ds,
      boltRifleSlot.slotId,
      `${handFlamerOpt.optionIndex}:${handFlamerOpt.choiceIndex}`
    );

    // Select power fist for ccw slot
    const powerFistOpt = ccwSlot.options.find((o) => o.label === 'power fist')!;
    models = applySlotSelection(
      models,
      slots,
      ds,
      ccwSlot.slotId,
      `${powerFistOpt.optionIndex}:${powerFistOpt.choiceIndex}`
    );

    // Check the sergeant's model has both selections
    const sergeant = models.find(
      (m) => m.definitionName === 'Intercessor Sergeant'
    )!;
    expect(sergeant.slotSelections.length).toBe(2);

    // Compute equipment
    const def = ds.model_definitions.find(
      (d) => d.name === 'Intercessor Sergeant'
    )!;
    const equipment = computeEquipment(def, sergeant.slotSelections, slots, ds);

    // Should have: bolt pistol (default), hand flamer (replaced bolt rifle), power fist (replaced ccw)
    expect(equipment).toContain('bolt pistol');
    expect(equipment).toContain('hand flamer');
    expect(equipment).toContain('power fist');
    expect(equipment).not.toContain('bolt rifle');
    expect(equipment).not.toContain('close combat weapon');
  });
});

// ─── Test 2: Duplicate weapon names across slots ─────────────────

describe('Intercessor Sergeant — duplicate weapon names', () => {
  it('should handle Astartes chainsword selected in both slots', () => {
    const ds = findUnit(spaceMarine, 'Intercessor Squad');
    const slots = buildWargearSlots(ds);
    let models = buildDefaultModels(ds, slots);

    const sergeantSlots = slots.filter(
      (s) => s.definitionName === 'Intercessor Sergeant'
    );
    const boltRifleSlot = sergeantSlots.find((s) =>
      s.replaces.includes('bolt rifle')
    )!;
    const ccwSlot = sergeantSlots.find((s) =>
      s.replaces.includes('close combat weapon')
    )!;

    // Select Astartes chainsword in BOTH slots
    const chainsword1 = boltRifleSlot.options.find(
      (o) => o.label === 'Astartes chainsword'
    )!;
    const chainsword2 = ccwSlot.options.find(
      (o) => o.label === 'Astartes chainsword'
    )!;

    models = applySlotSelection(
      models,
      slots,
      ds,
      boltRifleSlot.slotId,
      `${chainsword1.optionIndex}:${chainsword1.choiceIndex}`
    );
    models = applySlotSelection(
      models,
      slots,
      ds,
      ccwSlot.slotId,
      `${chainsword2.optionIndex}:${chainsword2.choiceIndex}`
    );

    const sergeant = models.find(
      (m) => m.definitionName === 'Intercessor Sergeant'
    )!;
    const def = ds.model_definitions.find(
      (d) => d.name === 'Intercessor Sergeant'
    )!;
    const equipment = computeEquipment(def, sergeant.slotSelections, slots, ds);

    // Should have 2 Astartes chainswords + bolt pistol
    const chainswordCount = equipment.filter(
      (e) => e.toLowerCase() === 'astartes chainsword'
    ).length;
    expect(chainswordCount).toBe(2);
    expect(equipment).toContain('bolt pistol');
    expect(equipment).not.toContain('bolt rifle');
    expect(equipment).not.toContain('close combat weapon');
  });
});

// ─── Test 3: Aggressor Squad — all_or_nothing swap ───────────────

describe('Aggressor Squad — all_or_nothing swap', () => {
  it('should create one all_or_nothing slot', () => {
    const ds = findUnit(spaceMarine, 'Aggressor Squad');
    const slots = buildWargearSlots(ds);

    // Both Sergeant and Aggressors definitions should get the all_models slot
    const allOrNothingSlots = slots.filter(
      (s) => s.scope.kind === 'all_or_nothing'
    );
    expect(allOrNothingSlots.length).toBeGreaterThanOrEqual(1);

    const slot = allOrNothingSlots[0];
    expect(slot.replaces).toContain('flamestorm gauntlets');
    expect(slot.options.length).toBe(1);
    // The choice is a compound: "auto boltstorm gauntlets and 1 fragstorm grenade launcher"
    expect(slot.options[0].choiceRaw).toContain('auto boltstorm gauntlets');
  });

  it('should swap equipment for all models when toggled', () => {
    const ds = findUnit(spaceMarine, 'Aggressor Squad');
    const slots = buildWargearSlots(ds);
    let models = buildDefaultModels(ds, slots);

    const slot = slots.find((s) => s.scope.kind === 'all_or_nothing')!;
    const opt = slot.options[0];

    models = applySlotSelection(
      models,
      slots,
      ds,
      slot.slotId,
      `${opt.optionIndex}:${opt.choiceIndex}`
    );

    // Check equipment for Aggressor Sergeant
    const sergeant = models.find(
      (m) => m.definitionName === 'Aggressor Sergeant'
    )!;
    const sgtDef = ds.model_definitions.find(
      (d) => d.name === 'Aggressor Sergeant'
    )!;
    const sgtEquip = computeEquipment(
      sgtDef,
      sergeant.slotSelections,
      slots,
      ds
    );

    expect(sgtEquip).toContain('auto boltstorm gauntlets');
    expect(sgtEquip).toContain('fragstorm grenade launcher');
    expect(sgtEquip).not.toContain('flamestorm gauntlets');
    expect(sgtEquip).toContain('twin power fist'); // unchanged
  });
});

// ─── Test 4: Hearthkyn Warriors — variable_count ─────────────────

describe('Hearthkyn Warriors — variable count heavy weapons', () => {
  it('should create variable_count slots for heavy weapons', () => {
    const ds = findUnit(votann, 'Hearthkyn Warriors');
    const slots = buildWargearSlots(ds);

    const variableSlots = slots.filter(
      (s) =>
        s.scope.kind === 'variable_count' &&
        s.definitionName === 'Hearthkyn Warriors'
    );

    // Should have at least one variable_count slot for heavy weapons
    expect(variableSlots.length).toBeGreaterThanOrEqual(1);

    // The heavy weapons slot should have maxCount = 2 (from "up to 2")
    const heavySlot = variableSlots.find((s) =>
      s.options.some((o) => o.label.includes('HYLas'))
    );
    if (heavySlot && heavySlot.scope.kind === 'variable_count') {
      expect(heavySlot.scope.maxCount).toBe(2);
    }
  });
});

// ─── Test 5: Hearthkyn Theyn — named_model + add ────────────────

describe('Hearthkyn Theyn — named model slots', () => {
  it('should create slots for the Theyn including named_model scope', () => {
    const ds = findUnit(votann, 'Hearthkyn Warriors');
    const slots = buildWargearSlots(ds);

    const theynSlots = slots.filter((s) => s.definitionName === 'Theyn');

    // Theyn should have slots: named_model replace (single_model scope)
    // + all_models options that also apply to Theyn
    expect(theynSlots.length).toBeGreaterThanOrEqual(1);

    // The named_model replace slot should have single_model scope
    const namedSlot = theynSlots.find(
      (s) => s.scope.kind === 'single_model' && s.type === 'replace'
    );
    expect(namedSlot).toBeDefined();
    // Should include Theyn's pistol as a choice
    expect(namedSlot!.options.some((o) => o.choiceRaw.includes('pistol'))).toBe(true);
  });
});

// ─── Test 6: Equipment derivation round-trip ─────────────────────

describe('Equipment derivation', () => {
  it('should correctly derive equipment from defaults + selections', () => {
    const ds = findUnit(spaceMarine, 'Intercessor Squad');
    const slots = buildWargearSlots(ds);

    // Default equipment for Intercessor Sergeant
    const def = ds.model_definitions.find(
      (d) => d.name === 'Intercessor Sergeant'
    )!;

    // No selections = default equipment
    const defaultEquip = computeEquipment(def, [], slots, ds);
    expect(defaultEquip).toEqual(def.default_equipment);

    // With one selection
    const boltRifleSlot = slots.find(
      (s) =>
        s.definitionName === 'Intercessor Sergeant' &&
        s.replaces.includes('bolt rifle')
    )!;
    const plasmaOpt = boltRifleSlot.options.find(
      (o) => o.label === 'plasma pistol'
    )!;

    const withPlasma = computeEquipment(
      def,
      [
        {
          slotId: boltRifleSlot.slotId,
          optionKey: `${plasmaOpt.optionIndex}:${plasmaOpt.choiceIndex}`,
          modelCount: 1,
        },
      ],
      slots,
      ds
    );

    expect(withPlasma).toContain('plasma pistol');
    expect(withPlasma).toContain('bolt pistol');
    expect(withPlasma).toContain('close combat weapon');
    expect(withPlasma).not.toContain('bolt rifle');
  });
});

// ─── Test 7: Weapon derivation for simulation ────────────────────

describe('deriveSelectedWeapons', () => {
  it('should produce correct weapons for simulation after wargear changes', () => {
    const ds = findUnit(spaceMarine, 'Intercessor Squad');
    const slots = buildWargearSlots(ds);
    let models = buildDefaultModels(ds, slots);

    // Select power fist for sergeant
    const ccwSlot = slots.find(
      (s) =>
        s.definitionName === 'Intercessor Sergeant' &&
        s.replaces.includes('close combat weapon')
    )!;
    const powerFist = ccwSlot.options.find((o) => o.label === 'power fist')!;
    models = applySlotSelection(
      models,
      slots,
      ds,
      ccwSlot.slotId,
      `${powerFist.optionIndex}:${powerFist.choiceIndex}`
    );

    const firingConfig = buildDefaultFiringConfig(models, slots, ds);

    // Melee weapons should include power fist from sergeant
    const melee = deriveSelectedWeapons(models, firingConfig, slots, ds, 'melee');
    const powerFistWeapon = melee.find((w) =>
      w.weapon.name.toLowerCase().includes('power fist')
    );
    expect(powerFistWeapon).toBeDefined();
    expect(powerFistWeapon!.firingModelCount).toBe(1); // Just the sergeant

    // Ranged should include bolt rifle from regular Intercessors
    const ranged = deriveSelectedWeapons(models, firingConfig, slots, ds, 'ranged');
    const boltRifle = ranged.find((w) =>
      w.weapon.name.toLowerCase() === 'bolt rifle'
    );
    expect(boltRifle).toBeDefined();
    // Sergeant still has bolt rifle (only ccw was replaced) + 4 Intercessors
    expect(boltRifle!.firingModelCount).toBe(5);
  });
});

// ─── Test 8: Empty/placeholder options filtered ──────────────────

describe('Empty option filtering', () => {
  it('should not create slots for options with empty choices', () => {
    // Create a minimal datasheet with an empty option
    const ds: UnitDatasheet = {
      name: 'Test Unit',
      base_size: '32mm',
      stats: { M: '6"', T: '4', Sv: '3+', W: '1', Ld: '6+', OC: '1' },
      invulnerable_save: null,
      weapons: [],
      abilities: { core: [], faction: [], other: [], damaged: null, damaged_description: null },
      keywords: [],
      faction_keywords: [],
      composition: { models: [], equipment: '', points: [] },
      model_definitions: [
        { name: 'Trooper', min_models: 5, max_models: 10, default_equipment: ['bolter'] },
      ],
      wargear_options: [
        {
          raw: 'Empty option',
          type: 'replace',
          scope: 'all_models',
          replaces: ['bolter'],
          choices: ['', ''],
        },
      ],
      leader_units: [],
    } as unknown as UnitDatasheet;

    const slots = buildWargearSlots(ds);
    expect(slots.length).toBe(0);
  });
});

// ─── Test 9-13: Deathwatch Veterans — per_n_models slot splitting ──────

describe('Deathwatch Veterans — per_n_models slots', () => {
  let ds: UnitDatasheet;
  let slots: ReturnType<typeof buildWargearSlots>;

  beforeAll(() => {
    ds = findUnit(spaceMarine, 'Deathwatch Veterans');
    slots = buildWargearSlots(ds);
  });

  it('should create independent variable_count slots for each per_n_models option', () => {
    const vetSlots = slots.filter(
      (s) => s.definitionName === 'Deathwatch Veterans' && s.scope.kind === 'variable_count'
    );
    // 6 per_n_models options + 1 specific_count (Black Shield blades) = 7
    expect(vetSlots.length).toBe(7);
  });

  it('should NOT assign per_n_models or specific_count slots to the Watch Sergeant', () => {
    const sgtSlots = slots.filter((s) => s.definitionName === 'Watch Sergeant');
    // Only the 2 named_model replace slots (power weapon, boltgun)
    expect(sgtSlots.length).toBe(2);
    expect(sgtSlots.every((s) => s.scope.kind === 'single_model')).toBe(true);
  });

  it('should have correct maxCount per slot based on each option\'s max_per_n', () => {
    const vetSlots = slots.filter(
      (s) => s.definitionName === 'Deathwatch Veterans' && s.scope.kind === 'variable_count'
    );
    // With 9 max veterans, floor(9/5)=1, so max_per_n=2 → maxCount=2, max_per_n=1 → maxCount=1
    const maxCounts = vetSlots
      .map((s) => (s.scope.kind === 'variable_count' ? s.scope.maxCount : -1))
      .sort();
    // Expect: specific_count(1), per_n_models with max_per_n=1 (×3), per_n_models with max_per_n=2 (×3)
    expect(maxCounts).toEqual([1, 1, 1, 1, 2, 2, 2]);
  });

  it('should share a budgetGroup across all veteran variable_count slots', () => {
    const vetSlots = slots.filter(
      (s) => s.definitionName === 'Deathwatch Veterans' && s.scope.kind === 'variable_count'
    );
    const groups = new Set(vetSlots.map((s) => s.budgetGroup));
    expect(groups.size).toBe(1);
    expect(vetSlots[0].budgetGroup).toBe('Deathwatch Veterans::boltgun+power weapon');
  });

  it('should allow allocating models to multiple independent slots', () => {
    let models = buildDefaultModels(ds, slots);
    // Base: Watch Sergeant (1), Deathwatch Veterans (4)

    // Allocate 1 thunder hammer (option index 1, choice 0)
    const thunderSlot = slots.find(
      (s) => s.definitionName === 'Deathwatch Veterans' &&
        s.options.some((o) => o.choiceRaw.includes('thunder hammer'))
    )!;
    const thunderOptKey = `${thunderSlot.options[0].optionIndex}:${thunderSlot.options[0].choiceIndex}`;
    models = applySlotSelection(models, slots, ds, thunderSlot.slotId, thunderOptKey);
    // Find the variant group and set count
    const thunderGroupId = `${thunderSlot.definitionName}__${thunderSlot.slotId}__${thunderOptKey}`;
    models = setVariableCount(models, thunderGroupId, 1, ds, slots);

    // Allocate 1 frag cannon (option index 4, choice 0)
    const fragSlot = slots.find(
      (s) => s.definitionName === 'Deathwatch Veterans' &&
        s.options.some((o) => o.choiceRaw.includes('frag cannon'))
    )!;
    const fragOptKey = `${fragSlot.options[0].optionIndex}:${fragSlot.options[0].choiceIndex}`;
    models = applySlotSelection(models, slots, ds, fragSlot.slotId, fragOptKey);
    const fragGroupId = `${fragSlot.definitionName}__${fragSlot.slotId}__${fragOptKey}`;
    models = setVariableCount(models, fragGroupId, 1, ds, slots);

    // Base should now be 2 (4 - 1 thunder - 1 frag)
    const base = models.find((m) => m.definitionName === 'Deathwatch Veterans' && m.isBase);
    expect(base!.count).toBe(2);

    // Both variants exist with count 1
    const thunderGroup = models.find((m) => m.groupId === thunderGroupId);
    const fragGroup = models.find((m) => m.groupId === fragGroupId);
    expect(thunderGroup!.count).toBe(1);
    expect(fragGroup!.count).toBe(1);
  });
});
