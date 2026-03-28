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
  getGroupWeapons,
  getTotalModels,
  buildModelPools,
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

function findSlot(slots: ReturnType<typeof buildWargearSlots>, defName: string, groupName: string) {
  return slots.find((s) => {
    if (s.definitionName !== defName) return false;
    // Match by checking the selectionGroupId in options maps back to a group with the right name
    // The slotId format is "modelId::groupId" — we match on the groupName from the datasheet
    return s.slotId.includes(groupName) || s.options.some((o) => o.label !== undefined);
  });
}

function findSlotByDefinition(slots: ReturnType<typeof buildWargearSlots>, defName: string, index = 0) {
  return slots.filter((s) => s.definitionName === defName)[index];
}

function makeOptionKey(slot: ReturnType<typeof buildWargearSlots>[0], label: string): string {
  const opt = slot.options.find((o) => o.label === label);
  if (!opt) throw new Error(`Option "${label}" not found in slot ${slot.slotId}`);
  return `${opt.selectionGroupId}:${opt.selectionId}`;
}

// ─── Test Data ───────────────────────────────────────────────────

let spaceMarine: FactionDatasheets;

beforeAll(() => {
  spaceMarine = loadFaction('space-marines');
});

const COMPLEX_UNITS = [
  'Deathwatch Veterans',
  'Sternguard Veteran Squad',
  'Terminator Squad',
  'Fortis Kill Team',
  'Crusader Squad',
];

// ─── Suite 1: Structural Integrity ──────────────────────────────

describe('Structural integrity of complex datasheets', () => {
  it.each(COMPLEX_UNITS)('%s: all defaultWeaponIds exist in weapons registry', (unitName) => {
    const ds = findUnit(spaceMarine, unitName);
    for (const model of ds.models) {
      for (const weaponId of model.defaultWeaponIds) {
        expect(ds.weapons[weaponId], `Missing weapon "${weaponId}" for model "${model.name}" in ${unitName}`).toBeDefined();
      }
    }
  });

  it.each(COMPLEX_UNITS)('%s: all selectionGroup weaponIds exist in weapons registry', (unitName) => {
    const ds = findUnit(spaceMarine, unitName);
    for (const model of ds.models) {
      for (const group of model.selectionGroups) {
        for (const sel of group.selections) {
          for (const weaponId of sel.weaponIds) {
            expect(ds.weapons[weaponId], `Missing weapon "${weaponId}" in selection "${sel.label}" for ${unitName}`).toBeDefined();
          }
        }
      }
    }
  });

  it.each(COMPLEX_UNITS)('%s: all weapons have valid type', (unitName) => {
    const ds = findUnit(spaceMarine, unitName);
    for (const [id, weapon] of Object.entries(ds.weapons)) {
      expect(['ranged', 'melee']).toContain(weapon.type);
    }
  });
});

// ─── Suite 2: Deathwatch Veterans ───────────────────────────────

describe('Deathwatch Veterans', () => {
  let ds: UnitDatasheet;

  beforeAll(() => {
    ds = findUnit(spaceMarine, 'Deathwatch Veterans');
  });

  it('has 14 model definitions, all with min=0', () => {
    expect(ds.models).toHaveLength(14);
    for (const model of ds.models) {
      expect(model.min).toBe(0);
    }
  });

  it('produces zero wargear slots (no selectionGroups)', () => {
    const slots = buildWargearSlots(ds);
    expect(slots).toHaveLength(0);
  });

  it('buildDefaultModels creates 14 groups all at count 0', () => {
    const slots = buildWargearSlots(ds);
    const models = buildDefaultModels(ds, slots);
    expect(models).toHaveLength(14);
    expect(getTotalModels(models)).toBe(0);
    for (const m of models) {
      expect(m.count).toBe(0);
    }
  });

  it('deriveSelectedWeapons returns empty for all-zero defaults', () => {
    const slots = buildWargearSlots(ds);
    const models = buildDefaultModels(ds, slots);
    const firingConfig = buildDefaultFiringConfig(models, slots, ds);
    expect(deriveSelectedWeapons(models, firingConfig, slots, ds, 'ranged')).toHaveLength(0);
    expect(deriveSelectedWeapons(models, firingConfig, slots, ds, 'melee')).toHaveLength(0);
  });

  it('setDefinitionTotal scales boltgun veteran to max 10', () => {
    const slots = buildWargearSlots(ds);
    let models = buildDefaultModels(ds, slots);
    models = setDefinitionTotal(models, 'Veteran w/ boltgun and power weapon', 10, ds);
    const total = models
      .filter((m) => m.definitionName === 'Veteran w/ boltgun and power weapon')
      .reduce((sum, m) => sum + m.count, 0);
    expect(total).toBe(10);
  });

  it('setDefinitionTotal clamps above max', () => {
    const slots = buildWargearSlots(ds);
    let models = buildDefaultModels(ds, slots);
    // frag cannon max is 2, try setting to 5
    models = setDefinitionTotal(models, 'Veteran w/ frag cannon and CCW', 5, ds);
    const total = models
      .filter((m) => m.definitionName === 'Veteran w/ frag cannon and CCW')
      .reduce((sum, m) => sum + m.count, 0);
    expect(total).toBe(2);
  });

  it('can compose a valid 5-model squad', () => {
    const slots = buildWargearSlots(ds);
    let models = buildDefaultModels(ds, slots);
    models = setDefinitionTotal(models, 'Veteran w/ boltgun and power weapon', 4, ds);
    models = setDefinitionTotal(models, 'Sgt w/ boltgun and xenophase blade', 1, ds);
    expect(getTotalModels(models)).toBe(5);
  });

  it('infernus heavy bolter model has both profile weapons available', () => {
    const slots = buildWargearSlots(ds);
    let models = buildDefaultModels(ds, slots);
    models = setDefinitionTotal(models, 'Veteran w/ infernus heavy bolter and CCW', 1, ds);
    const model = ds.models.find((m) => m.name === 'Veteran w/ infernus heavy bolter and CCW')!;
    const weapons = getGroupWeapons(ds, model, [], slots);
    const rangedNames = weapons.filter((w) => w.type === 'ranged').map((w) => w.name);
    expect(rangedNames).toContain('➤ Infernus heavy bolter - heavy bolter');
    expect(rangedNames).toContain('➤ Infernus heavy bolter - heavy flamer');

    // Default firing config: only first profile fires
    const firingConfig = buildDefaultFiringConfig(models, slots, ds);
    const firing = deriveSelectedWeapons(models, firingConfig, slots, ds, 'ranged');
    const firingNames = firing.map((w) => w.weapon.name);
    expect(firingNames).toContain('➤ Infernus heavy bolter - heavy bolter');
    expect(firingNames).not.toContain('➤ Infernus heavy bolter - heavy flamer');
  });
});

// ─── Suite 3: Sternguard Veteran Squad ──────────────────────────

describe('Sternguard Veteran Squad', () => {
  let ds: UnitDatasheet;

  beforeAll(() => {
    ds = findUnit(spaceMarine, 'Sternguard Veteran Squad');
  });

  it('builds exactly 3 wargear slots', () => {
    const slots = buildWargearSlots(ds);
    expect(slots).toHaveLength(3);
  });

  it('sergeant slots are single_model scope', () => {
    const slots = buildWargearSlots(ds);
    const sgtSlots = slots.filter((s) => s.definitionName === 'Sternguard Veteran Sergeant');
    expect(sgtSlots).toHaveLength(2);
    for (const slot of sgtSlots) {
      expect(slot.scope.kind).toBe('single_model');
    }
  });

  it('sergeant weapon slot is type=replace, melee slot is type=add', () => {
    const slots = buildWargearSlots(ds);
    const sgtSlots = slots.filter((s) => s.definitionName === 'Sternguard Veteran Sergeant');
    const replaceSlot = sgtSlots.find((s) => s.type === 'replace');
    const addSlot = sgtSlots.find((s) => s.type === 'add');
    expect(replaceSlot).toBeDefined();
    expect(addSlot).toBeDefined();
    // Replace slot should replace the sergeant's defaults
    expect(replaceSlot!.replaces).toEqual(
      expect.arrayContaining(['sternguard-bolt-pistol', 'close-combat-weapon'])
    );
  });

  it('applying combi-weapon selection replaces defaults', () => {
    const slots = buildWargearSlots(ds);
    const sgtSlots = slots.filter((s) => s.definitionName === 'Sternguard Veteran Sergeant');
    const weaponSlot = sgtSlots.find((s) => s.type === 'replace')!;
    const optionKey = makeOptionKey(weaponSlot, 'Combi-weapon');

    const sgtModel = ds.models.find((m) => m.name === 'Sternguard Veteran Sergeant')!;
    const weaponIds = computeWeaponIds(sgtModel, [{ slotId: weaponSlot.slotId, optionKey, modelCount: 1 }], slots);
    expect(weaponIds).toEqual(['combi-weapon']);
  });

  it('applying combi-weapon + power fist yields combined loadout', () => {
    const slots = buildWargearSlots(ds);
    const sgtSlots = slots.filter((s) => s.definitionName === 'Sternguard Veteran Sergeant');
    const weaponSlot = sgtSlots.find((s) => s.type === 'replace')!;
    const meleeSlot = sgtSlots.find((s) => s.type === 'add')!;

    const sgtModel = ds.models.find((m) => m.name === 'Sternguard Veteran Sergeant')!;
    const weaponIds = computeWeaponIds(
      sgtModel,
      [
        { slotId: weaponSlot.slotId, optionKey: makeOptionKey(weaponSlot, 'Combi-weapon'), modelCount: 1 },
        { slotId: meleeSlot.slotId, optionKey: makeOptionKey(meleeSlot, 'Power Fist'), modelCount: 1 },
      ],
      slots
    );
    expect(weaponIds).toContain('combi-weapon');
    expect(weaponIds).toContain('power-fist');
    expect(weaponIds).toHaveLength(2);
  });

  it('special weapon model starts at count 0 and can be scaled to 1', () => {
    const slots = buildWargearSlots(ds);
    let models = buildDefaultModels(ds, slots);
    const specialGroup = models.find((m) => m.definitionName === 'Sternguard Veteran w/ Special Weapon');
    expect(specialGroup).toBeDefined();
    expect(specialGroup!.count).toBe(0);

    models = setDefinitionTotal(models, 'Sternguard Veteran w/ Special Weapon', 1, ds);
    const updated = models.find((m) => m.definitionName === 'Sternguard Veteran w/ Special Weapon');
    expect(updated!.count).toBe(1);
  });

  it('special weapon with pyrecannon selection produces ranged weapon', () => {
    const slots = buildWargearSlots(ds);
    let models = buildDefaultModels(ds, slots);
    models = setDefinitionTotal(models, 'Sternguard Veteran w/ Special Weapon', 1, ds);

    const specialSlot = findSlotByDefinition(slots, 'Sternguard Veteran w/ Special Weapon');
    expect(specialSlot).toBeDefined();
    const optionKey = makeOptionKey(specialSlot!, 'Pyrecannon');
    models = applySlotSelection(models, slots, ds, specialSlot!.slotId, optionKey);

    const firingConfig = buildDefaultFiringConfig(models, slots, ds);
    const ranged = deriveSelectedWeapons(models, firingConfig, slots, ds, 'ranged');
    const rangedNames = ranged.map((w) => w.weapon.name);
    expect(rangedNames).toContain('Pyrecannon');
  });
});

// ─── Suite 4: Terminator Squad ──────────────────────────────────

describe('Terminator Squad', () => {
  let ds: UnitDatasheet;

  beforeAll(() => {
    ds = findUnit(spaceMarine, 'Terminator Squad');
  });

  it('builds exactly 3 wargear slots', () => {
    const slots = buildWargearSlots(ds);
    expect(slots).toHaveLength(3);
  });

  it('heavy weapon model has empty defaultWeaponIds', () => {
    const hwModel = ds.models.find((m) => m.name === 'Terminator w/ Heavy Weapon');
    expect(hwModel).toBeDefined();
    expect(hwModel!.defaultWeaponIds).toEqual([]);
  });

  it('heavy weapon slots are type=replace with empty replaces', () => {
    const slots = buildWargearSlots(ds);
    const hwSlots = slots.filter((s) => s.definitionName === 'Terminator w/ Heavy Weapon');
    expect(hwSlots).toHaveLength(2);
    for (const slot of hwSlots) {
      expect(slot.type).toBe('replace');
      expect(slot.replaces).toEqual([]);
    }
  });

  it('cyclone option provides 3 weapon IDs', () => {
    const slots = buildWargearSlots(ds);
    const hwSlots = slots.filter((s) => s.definitionName === 'Terminator w/ Heavy Weapon');
    // Find the slot with the cyclone option
    let cycloneOption;
    for (const slot of hwSlots) {
      const opt = slot.options.find((o) => o.label.includes('Cyclone'));
      if (opt) { cycloneOption = opt; break; }
    }
    expect(cycloneOption).toBeDefined();
    expect(cycloneOption!.weaponIds).toHaveLength(3);
    expect(cycloneOption!.weaponIds).toContain('storm-bolter');
    expect(cycloneOption!.weaponIds).toContain('cyclone-missile-launcher-frag');
    expect(cycloneOption!.weaponIds).toContain('cyclone-missile-launcher-krak');
  });

  it('cyclone + power fist yields storm bolter + first cyclone profile + melee', () => {
    const slots = buildWargearSlots(ds);
    let models = buildDefaultModels(ds, slots);
    models = setDefinitionTotal(models, 'Terminator w/ Heavy Weapon', 1, ds);

    const hwSlots = slots.filter((s) => s.definitionName === 'Terminator w/ Heavy Weapon');
    const rangedSlot = hwSlots.find((s) => s.options.some((o) => o.label.includes('Cyclone')))!;
    const meleeSlot = hwSlots.find((s) => s.options.some((o) => o.label === 'Power Fist'))!;

    models = applySlotSelection(models, slots, ds, rangedSlot.slotId, makeOptionKey(rangedSlot, 'Cyclone Missile Launcher & Storm Bolter'));
    models = applySlotSelection(models, slots, ds, meleeSlot.slotId, makeOptionKey(meleeSlot, 'Power Fist'));

    const firingConfig = buildDefaultFiringConfig(models, slots, ds);
    const ranged = deriveSelectedWeapons(models, firingConfig, slots, ds, 'ranged');
    const melee = deriveSelectedWeapons(models, firingConfig, slots, ds, 'melee');

    // Storm bolter + first cyclone profile (second profile defaults to 0)
    expect(ranged).toHaveLength(2);
    expect(melee).toHaveLength(1);
    expect(melee[0].weapon.name).toContain('Power fist');
  });

  it('heavy flamer + chainfist yields 1 ranged + 1 melee', () => {
    const slots = buildWargearSlots(ds);
    let models = buildDefaultModels(ds, slots);
    models = setDefinitionTotal(models, 'Terminator w/ Heavy Weapon', 1, ds);

    const hwSlots = slots.filter((s) => s.definitionName === 'Terminator w/ Heavy Weapon');
    const rangedSlot = hwSlots.find((s) => s.options.some((o) => o.label === 'Heavy Flamer'))!;
    const meleeSlot = hwSlots.find((s) => s.options.some((o) => o.label === 'Chainfist'))!;

    models = applySlotSelection(models, slots, ds, rangedSlot.slotId, makeOptionKey(rangedSlot, 'Heavy Flamer'));
    models = applySlotSelection(models, slots, ds, meleeSlot.slotId, makeOptionKey(meleeSlot, 'Chainfist'));

    const firingConfig = buildDefaultFiringConfig(models, slots, ds);
    const ranged = deriveSelectedWeapons(models, firingConfig, slots, ds, 'ranged');
    const melee = deriveSelectedWeapons(models, firingConfig, slots, ds, 'melee');

    // Heavy flamer from selection, but sergeant also has storm-bolter as default ranged
    const rangedNames = ranged.map((w) => w.weapon.name);
    expect(rangedNames).toContain('Heavy Flamer');
    expect(melee.length).toBeGreaterThanOrEqual(1);
    const meleeNames = melee.map((w) => w.weapon.name);
    expect(meleeNames).toContain('Chainfist');
  });

  it('mixed squad aggregates storm bolter across groups', () => {
    const slots = buildWargearSlots(ds);
    let models = buildDefaultModels(ds, slots);
    models = setDefinitionTotal(models, 'Terminator w/ Power Fist', 4, ds);
    models = setDefinitionTotal(models, 'Terminator w/ Heavy Weapon', 1, ds);

    // Apply cyclone + power fist to heavy weapon model
    const hwSlots = slots.filter((s) => s.definitionName === 'Terminator w/ Heavy Weapon');
    const rangedSlot = hwSlots.find((s) => s.options.some((o) => o.label.includes('Cyclone')))!;
    const meleeSlot = hwSlots.find((s) => s.options.some((o) => o.label === 'Power Fist'))!;
    models = applySlotSelection(models, slots, ds, rangedSlot.slotId, makeOptionKey(rangedSlot, 'Cyclone Missile Launcher & Storm Bolter'));
    models = applySlotSelection(models, slots, ds, meleeSlot.slotId, makeOptionKey(meleeSlot, 'Power Fist'));

    const firingConfig = buildDefaultFiringConfig(models, slots, ds);
    const ranged = deriveSelectedWeapons(models, firingConfig, slots, ds, 'ranged');

    // Storm bolter should aggregate: 4 from power fist terminators + 1 from cyclone + 1 from sergeant
    const stormBolter = ranged.find((w) => w.weapon.name === 'Storm bolter');
    expect(stormBolter).toBeDefined();
    expect(stormBolter!.firingModelCount).toBe(6);
  });
});

// ─── Suite 5: Fortis Kill Team ──────────────────────────────────

describe('Fortis Kill Team', () => {
  let ds: UnitDatasheet;

  beforeAll(() => {
    ds = findUnit(spaceMarine, 'Fortis Kill Team');
  });

  it('has 10 model definitions', () => {
    expect(ds.models).toHaveLength(10);
  });

  it('builds 2 slots, both on sergeant with type=replace', () => {
    const slots = buildWargearSlots(ds);
    expect(slots).toHaveLength(2);
    for (const slot of slots) {
      expect(slot.definitionName).toBe('Kill Team Sergeant');
      expect(slot.type).toBe('replace');
    }
  });

  it('sergeant "Replace bolt rifle" slot has 5 options', () => {
    const slots = buildWargearSlots(ds);
    const boltRifleSlot = slots.find((s) => s.options.some((o) => o.label === 'Deathwatch bolt rifle'));
    expect(boltRifleSlot).toBeDefined();
    expect(boltRifleSlot!.options).toHaveLength(5);
  });

  it('plasma pistol option provides 2 weapon IDs', () => {
    const slots = buildWargearSlots(ds);
    const boltRifleSlot = slots.find((s) => s.options.some((o) => o.label === 'Plasma pistol'))!;
    const plasmaOpt = boltRifleSlot.options.find((o) => o.label === 'Plasma pistol')!;
    expect(plasmaOpt.weaponIds).toHaveLength(2);
    expect(plasmaOpt.weaponIds).toContain('plasma-pistol-standard');
    expect(plasmaOpt.weaponIds).toContain('plasma-pistol-supercharge');
  });

  it('base Kill Team Intercessor starts at count 2', () => {
    const slots = buildWargearSlots(ds);
    const models = buildDefaultModels(ds, slots);
    const base = models.find((m) => m.definitionName === 'Kill Team Intercessor');
    expect(base).toBeDefined();
    expect(base!.count).toBe(2);
  });

  it('plasma model has 5 defaultWeaponIds for dual-fire modes', () => {
    const plasmaModel = ds.models.find((m) => m.name === 'Kill Team Intercessor w/ plasma pistol and incinerator');
    expect(plasmaModel).toBeDefined();
    expect(plasmaModel!.defaultWeaponIds).toHaveLength(5);
    expect(plasmaModel!.defaultWeaponIds).toContain('plasma-pistol-standard');
    expect(plasmaModel!.defaultWeaponIds).toContain('plasma-pistol-supercharge');
    expect(plasmaModel!.defaultWeaponIds).toContain('plasma-incinerator-standard');
    expect(plasmaModel!.defaultWeaponIds).toContain('plasma-incinerator-supercharge');
    expect(plasmaModel!.defaultWeaponIds).toContain('close-combat-weapon');
  });

  it('plasma model defaults to first profile per weapon group', () => {
    const slots = buildWargearSlots(ds);
    let models = buildDefaultModels(ds, slots);
    models = setDefinitionTotal(models, 'Kill Team Intercessor w/ plasma pistol and incinerator', 1, ds);

    const firingConfig = buildDefaultFiringConfig(models, slots, ds);
    const ranged = deriveSelectedWeapons(models, firingConfig, slots, ds, 'ranged');
    const rangedNames = ranged.map((w) => w.weapon.name);

    // First profile of each weapon group fires by default
    expect(rangedNames).toContain('➤ Plasma pistol - standard');
    expect(rangedNames).not.toContain('➤ Plasma pistol - supercharge');
    expect(rangedNames).toContain('➤ Plasma incinerator - Standard');
    expect(rangedNames).not.toContain('➤ Plasma incinerator - Supercharge');
  });

  it('base intercessor can be scaled to 9', () => {
    const slots = buildWargearSlots(ds);
    let models = buildDefaultModels(ds, slots);
    models = setDefinitionTotal(models, 'Kill Team Intercessor', 9, ds);
    const total = models
      .filter((m) => m.definitionName === 'Kill Team Intercessor')
      .reduce((sum, m) => sum + m.count, 0);
    expect(total).toBe(9);
  });

  it('sergeant plasma pistol selection adds dual weapon IDs', () => {
    const slots = buildWargearSlots(ds);
    const boltRifleSlot = slots.find((s) => s.options.some((o) => o.label === 'Plasma pistol'))!;
    const optionKey = makeOptionKey(boltRifleSlot, 'Plasma pistol');

    const sgtModel = ds.models.find((m) => m.name === 'Kill Team Sergeant')!;
    const weaponIds = computeWeaponIds(
      sgtModel,
      [{ slotId: boltRifleSlot.slotId, optionKey, modelCount: 1 }],
      slots
    );
    expect(weaponIds).toContain('plasma-pistol-standard');
    expect(weaponIds).toContain('plasma-pistol-supercharge');
  });
});

// ─── Suite 6: Crusader Squad ────────────────────────────────────

describe('Crusader Squad', () => {
  let ds: UnitDatasheet;

  beforeAll(() => {
    ds = findUnit(spaceMarine, 'Crusader Squad');
  });

  it('builds 1 wargear slot (Sword Brother pistol)', () => {
    const slots = buildWargearSlots(ds);
    expect(slots).toHaveLength(1);
    expect(slots[0].definitionName).toBe('Sword Brother');
    expect(slots[0].scope.kind).toBe('single_model');
  });

  it('Sword Brother pistol slot has 2 options', () => {
    const slots = buildWargearSlots(ds);
    expect(slots[0].options).toHaveLength(2);
    const labels = slots[0].options.map((o) => o.label);
    expect(labels).toContain('Heavy Bolt Pistol');
    expect(labels).toContain('Pyre Pistol');
  });

  it('Neophytes have different Sv than Initiates', () => {
    const neophyte = ds.models.find((m) => m.name === 'Neophyte w/ Firearm');
    const initiate = ds.models.find((m) => m.name === 'Initiate w/Bolt Rifle');
    expect(neophyte).toBeDefined();
    expect(initiate).toBeDefined();
    expect(neophyte!.stats.Sv).toBe('4+');
    expect(initiate!.stats.Sv).toBe('3+');
  });

  it('buildDefaultModels creates 7 groups', () => {
    const slots = buildWargearSlots(ds);
    const models = buildDefaultModels(ds, slots);
    expect(models).toHaveLength(7);
  });

  it('can compose a mixed squad with Marines and Neophytes', () => {
    const slots = buildWargearSlots(ds);
    let models = buildDefaultModels(ds, slots);
    models = setDefinitionTotal(models, 'Initiate w/Bolt Rifle', 4, ds);
    models = setDefinitionTotal(models, 'Neophyte w/ Firearm', 4, ds);
    // Sword Brother is already min=1
    expect(getTotalModels(models)).toBe(9);
  });

  it('applying Pyre Pistol to Sword Brother changes loadout', () => {
    const slots = buildWargearSlots(ds);
    const pistolSlot = slots[0];
    const optionKey = makeOptionKey(pistolSlot, 'Pyre Pistol');

    const sbModel = ds.models.find((m) => m.name === 'Sword Brother')!;
    const weaponIds = computeWeaponIds(
      sbModel,
      [{ slotId: pistolSlot.slotId, optionKey, modelCount: 1 }],
      slots
    );
    // Defaults are ['master-crafted-power-weapon'], replace slot adds pyre-pistol
    // Since pistol group has min=1 (type=replace), it replaces defaults
    expect(weaponIds).toContain('pyre-pistol');
  });

  it('deriveSelectedWeapons includes weapons from both statline groups', () => {
    const slots = buildWargearSlots(ds);
    let models = buildDefaultModels(ds, slots);
    models = setDefinitionTotal(models, 'Initiate w/Bolt Rifle', 4, ds);
    models = setDefinitionTotal(models, 'Neophyte w/ Firearm', 4, ds);

    const firingConfig = buildDefaultFiringConfig(models, slots, ds);
    const melee = deriveSelectedWeapons(models, firingConfig, slots, ds, 'melee');
    const ranged = deriveSelectedWeapons(models, firingConfig, slots, ds, 'ranged');

    // Close combat weapon should aggregate from Initiates + Neophytes
    // Sword Brother has master-crafted-power-weapon, not close-combat-weapon
    const ccw = melee.find((w) => w.weapon.name === 'Close combat weapon');
    expect(ccw).toBeDefined();
    // Initiate w/Bolt Rifle(4) + Neophyte w/Firearm(4) = 8
    expect(ccw!.firingModelCount).toBe(8);

    // Neophyte firearm is unique to Neophytes
    const neophyteFirearm = ranged.find((w) => w.weapon.name === 'Neophyte Firearm');
    expect(neophyteFirearm).toBeDefined();
    expect(neophyteFirearm!.firingModelCount).toBe(4);
  });
});

// ─── Suite 7: Cross-Cutting Edge Cases ──────────────────────────

describe('Cross-cutting edge cases', () => {
  it('getGroupWeapons returns no undefined for any unit default loadout', () => {
    for (const unitName of COMPLEX_UNITS) {
      const ds = findUnit(spaceMarine, unitName);
      const slots = buildWargearSlots(ds);
      const models = buildDefaultModels(ds, slots);
      for (const group of models) {
        const model = ds.models.find((m) => m.name === group.definitionName);
        if (!model) continue;
        const weapons = getGroupWeapons(ds, model, group.slotSelections, slots);
        for (const w of weapons) {
          expect(w, `Undefined weapon in ${unitName} model "${model.name}"`).toBeDefined();
          expect(w.name).toBeTruthy();
        }
      }
    }
  });

  it('setDefinitionTotal clamps at min boundary', () => {
    const ds = findUnit(spaceMarine, 'Sternguard Veteran Squad');
    const slots = buildWargearSlots(ds);
    let models = buildDefaultModels(ds, slots);
    // Sergeant has min=1, try setting to 0
    models = setDefinitionTotal(models, 'Sternguard Veteran Sergeant', 0, ds);
    const sgt = models.find((m) => m.definitionName === 'Sternguard Veteran Sergeant');
    expect(sgt!.count).toBe(1);
  });

  it('setDefinitionTotal clamps at max boundary', () => {
    const ds = findUnit(spaceMarine, 'Terminator Squad');
    const slots = buildWargearSlots(ds);
    let models = buildDefaultModels(ds, slots);
    // Heavy weapon has max=1, try setting to 5
    models = setDefinitionTotal(models, 'Terminator w/ Heavy Weapon', 5, ds);
    const hw = models.find((m) => m.definitionName === 'Terminator w/ Heavy Weapon');
    expect(hw!.count).toBe(1);
  });

  it('applySlotSelection with null clears the selection', () => {
    const ds = findUnit(spaceMarine, 'Sternguard Veteran Squad');
    const slots = buildWargearSlots(ds);
    let models = buildDefaultModels(ds, slots);
    const sgtSlots = slots.filter((s) => s.definitionName === 'Sternguard Veteran Sergeant');
    const meleeSlot = sgtSlots.find((s) => s.type === 'add')!;
    const optionKey = makeOptionKey(meleeSlot, 'Power Weapon');

    // Apply selection
    models = applySlotSelection(models, slots, ds, meleeSlot.slotId, optionKey);
    let sgt = models.find((m) => m.definitionName === 'Sternguard Veteran Sergeant')!;
    expect(sgt.slotSelections.some((s) => s.slotId === meleeSlot.slotId)).toBe(true);

    // Clear selection
    models = applySlotSelection(models, slots, ds, meleeSlot.slotId, null);
    sgt = models.find((m) => m.definitionName === 'Sternguard Veteran Sergeant')!;
    expect(sgt.slotSelections.some((s) => s.slotId === meleeSlot.slotId)).toBe(false);
  });
});

// ─── Suite 8: Model Pools ──────────────────────────────────────

describe('Model Pools — shared count space', () => {
  describe('Pool detection', () => {
    it('Intercessor Squad: Intercessor + GL variant form a pool', () => {
      const ds = findUnit(spaceMarine, 'Intercessor Squad');
      const pools = buildModelPools(ds);
      expect(pools).toHaveLength(1);
      expect(pools[0].baseDefName).toBe('Intercessor');
      expect(pools[0].variantDefNames).toContain('Intercessor w/ Grenade Launcher');
      expect(pools[0].minTotal).toBe(4);
      expect(pools[0].maxTotal).toBe(9);
    });

    it('Terminator Squad: no pool (all non-sergeant models have min=0)', () => {
      const ds = findUnit(spaceMarine, 'Terminator Squad');
      const pools = buildModelPools(ds);
      // All Terminator variants (Power Fist, Chain Fist, Heavy Weapon) have min=0
      // → free composition, no pool needed
      expect(pools).toHaveLength(0);
    });

    it('Deathwatch Veterans: no pools (all min=0)', () => {
      const ds = findUnit(spaceMarine, 'Deathwatch Veterans');
      const pools = buildModelPools(ds);
      expect(pools).toHaveLength(0);
    });

    it('Crusader Squad: different stats prevent pooling', () => {
      const ds = findUnit(spaceMarine, 'Crusader Squad');
      const pools = buildModelPools(ds);
      // Neophytes (Sv 4+) and Initiates (Sv 3+) have different stats — no pool between them
      for (const pool of pools) {
        const allDefs = [pool.baseDefName, ...pool.variantDefNames];
        const hasNeophyte = allDefs.some((n) => n.includes('Neophyte'));
        const hasInitiate = allDefs.some((n) => n.includes('Initiate'));
        expect(hasNeophyte && hasInitiate).toBe(false);
      }
    });
  });

  describe('Intercessor Squad — pool redistribution', () => {
    let ds: UnitDatasheet;

    beforeAll(() => {
      ds = findUnit(spaceMarine, 'Intercessor Squad');
    });

    it('default config: 1 Sgt + 4 Intercessors + 0 GL = 5 total', () => {
      const slots = buildWargearSlots(ds);
      const models = buildDefaultModels(ds, slots);
      expect(getTotalModels(models)).toBe(5);

      const sgt = models.find((m) => m.definitionName === 'Intercessor Sergeant');
      const intercessor = models.find((m) => m.definitionName === 'Intercessor');
      const gl = models.find((m) => m.definitionName === 'Intercessor w/ Grenade Launcher');
      expect(sgt!.count).toBe(1);
      expect(intercessor!.count).toBe(4);
      expect(gl!.count).toBe(0);
    });

    it('setting GL=1 redistributes from base: Sgt(1) + Intercessor(3) + GL(1) = 5', () => {
      const slots = buildWargearSlots(ds);
      let models = buildDefaultModels(ds, slots);
      models = setDefinitionTotal(models, 'Intercessor w/ Grenade Launcher', 1, ds);

      const sgt = models.find((m) => m.definitionName === 'Intercessor Sergeant');
      const intercessor = models.find((m) => m.definitionName === 'Intercessor');
      const gl = models.find((m) => m.definitionName === 'Intercessor w/ Grenade Launcher');
      expect(sgt!.count).toBe(1);
      expect(intercessor!.count).toBe(3);
      expect(gl!.count).toBe(1);
      expect(getTotalModels(models)).toBe(5);
    });

    it('increasing base count via stepper: Sgt(1) + Intercessor(5) + GL(1) = 7', () => {
      const slots = buildWargearSlots(ds);
      let models = buildDefaultModels(ds, slots);
      models = setDefinitionTotal(models, 'Intercessor w/ Grenade Launcher', 1, ds);
      // Increase base intercessor count to 5 (stepper shows base count, not pool total)
      models = setDefinitionTotal(models, 'Intercessor', 5, ds);

      const intercessor = models.find((m) => m.definitionName === 'Intercessor');
      const gl = models.find((m) => m.definitionName === 'Intercessor w/ Grenade Launcher');
      expect(intercessor!.count).toBe(5);
      expect(gl!.count).toBe(1); // Unchanged
      expect(getTotalModels(models)).toBe(7); // 1 sgt + 5 + 1
    });

    it('GL capped at def.max=2 even with large pool', () => {
      const slots = buildWargearSlots(ds);
      let models = buildDefaultModels(ds, slots);
      // Increase pool to 9
      models = setDefinitionTotal(models, 'Intercessor', 9, ds);
      // Try to set GL to 5 — should clamp to 2
      models = setDefinitionTotal(models, 'Intercessor w/ Grenade Launcher', 5, ds);

      const gl = models.find((m) => m.definitionName === 'Intercessor w/ Grenade Launcher');
      expect(gl!.count).toBe(2);
      expect(getTotalModels(models)).toBe(1 + 7 + 2); // sgt + base + gl
    });

    it('base count clamps so pool total stays >= minTotal', () => {
      const slots = buildWargearSlots(ds);
      let models = buildDefaultModels(ds, slots);
      // Set GL=2 (base goes from 4 to 2)
      models = setDefinitionTotal(models, 'Intercessor w/ Grenade Launcher', 2, ds);
      // Try to reduce base to 0 — pool total would be 2 (below minTotal 4)
      models = setDefinitionTotal(models, 'Intercessor', 0, ds);

      const intercessor = models.find((m) => m.definitionName === 'Intercessor');
      const gl = models.find((m) => m.definitionName === 'Intercessor w/ Grenade Launcher');
      // Base clamped to max(0, minTotal - variants) = max(0, 4 - 2) = 2
      expect(intercessor!.count).toBe(2);
      expect(gl!.count).toBe(2);
      expect(intercessor!.count + gl!.count).toBe(4);
    });

    it('setting GL=0 returns count to base', () => {
      const slots = buildWargearSlots(ds);
      let models = buildDefaultModels(ds, slots);
      models = setDefinitionTotal(models, 'Intercessor w/ Grenade Launcher', 2, ds);
      models = setDefinitionTotal(models, 'Intercessor w/ Grenade Launcher', 0, ds);

      const intercessor = models.find((m) => m.definitionName === 'Intercessor');
      const gl = models.find((m) => m.definitionName === 'Intercessor w/ Grenade Launcher');
      expect(intercessor!.count).toBe(4);
      expect(gl!.count).toBe(0);
    });
  });
});
