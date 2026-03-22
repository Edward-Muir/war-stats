import { describe, it, expect } from 'vitest';
import { applyWargearChoice, revertWargearChoice } from '../logic/wargear';
import type { ConfiguredModel } from '../types/config';
import type { UnitDatasheet, WargearOption } from '../types/data';

function makeDatasheet(wargearOptions: WargearOption[]): UnitDatasheet {
  return {
    name: 'Test Unit',
    faction: 'Test Faction',
    keywords: ['INFANTRY'],
    faction_keywords: ['TEST'],
    stats: { M: '6"', T: '4', Sv: '3+', W: '2', LD: '6+', OC: '1' },
    model_definitions: [
      {
        name: 'Trooper',
        min_models: 5,
        max_models: 10,
        default_equipment: ['bolt rifle', 'bolt pistol'],
      },
    ],
    weapons: [],
    wargear_options: wargearOptions,
    abilities: { core: [], faction: '', other: [] },
    invulnerable_save: null,
    points: [],
  } as unknown as UnitDatasheet;
}

describe('Wargear', () => {
  describe('applyWargearChoice', () => {
    it('should replace equipment for replace-type options', () => {
      const datasheet = makeDatasheet([
        {
          raw: 'Replace bolt rifle with plasma gun',
          type: 'replace',
          scope: 'this_model',
          replaces: ['bolt rifle'],
          choices: ['plasma gun', 'melta gun'],
        },
      ]);

      const models: ConfiguredModel[] = [
        { definitionName: 'Trooper', equipment: ['bolt rifle', 'bolt pistol'], count: 5 },
      ];

      const result = applyWargearChoice(models, datasheet, {
        optionIndex: 0,
        modelName: 'Trooper',
        chosenEquipment: 'plasma gun',
      });

      expect(result[0].equipment).toContain('plasma gun');
      expect(result[0].equipment).not.toContain('bolt rifle');
      expect(result[0].equipment).toContain('bolt pistol'); // unchanged
    });
  });

  describe('revertWargearChoice', () => {
    it('should restore default equipment after reverting a replace choice', () => {
      const datasheet = makeDatasheet([
        {
          raw: 'Replace bolt rifle with plasma gun',
          type: 'replace',
          scope: 'this_model',
          replaces: ['bolt rifle'],
          choices: ['plasma gun', 'melta gun'],
        },
      ]);

      // Start with customized equipment (plasma gun instead of bolt rifle)
      const models: ConfiguredModel[] = [
        { definitionName: 'Trooper', equipment: ['plasma gun', 'bolt pistol'], count: 5 },
      ];

      const result = revertWargearChoice(models, datasheet, 0, 'Trooper');

      expect(result[0].equipment).toContain('bolt rifle'); // restored
      expect(result[0].equipment).not.toContain('plasma gun'); // removed
      expect(result[0].equipment).toContain('bolt pistol'); // unchanged
    });

    it('should remove added equipment for add-type options', () => {
      const datasheet = makeDatasheet([
        {
          raw: 'Add a power sword',
          type: 'add',
          scope: 'this_model',
          replaces: [],
          choices: ['power sword'],
        },
      ]);

      const models: ConfiguredModel[] = [
        {
          definitionName: 'Trooper',
          equipment: ['bolt rifle', 'bolt pistol', 'power sword'],
          count: 5,
        },
      ];

      const result = revertWargearChoice(models, datasheet, 0, 'Trooper');

      expect(result[0].equipment).not.toContain('power sword');
      expect(result[0].equipment).toContain('bolt rifle');
      expect(result[0].equipment).toContain('bolt pistol');
    });

    it('should not duplicate default equipment if already present', () => {
      const datasheet = makeDatasheet([
        {
          raw: 'Replace bolt rifle with plasma gun',
          type: 'replace',
          scope: 'this_model',
          replaces: ['bolt rifle'],
          choices: ['plasma gun'],
        },
      ]);

      // Equipment already has bolt rifle (e.g., reverted twice)
      const models: ConfiguredModel[] = [
        { definitionName: 'Trooper', equipment: ['bolt rifle', 'bolt pistol'], count: 5 },
      ];

      const result = revertWargearChoice(models, datasheet, 0, 'Trooper');

      const boltRifleCount = result[0].equipment.filter(
        (e) => e.toLowerCase() === 'bolt rifle'
      ).length;
      expect(boltRifleCount).toBe(1); // no duplicates
    });

    it('round-trip: apply then revert should restore original state', () => {
      const datasheet = makeDatasheet([
        {
          raw: 'Replace bolt rifle with plasma gun or melta gun',
          type: 'replace',
          scope: 'this_model',
          replaces: ['bolt rifle'],
          choices: ['plasma gun', 'melta gun'],
        },
      ]);

      const original: ConfiguredModel[] = [
        { definitionName: 'Trooper', equipment: ['bolt rifle', 'bolt pistol'], count: 5 },
      ];

      // Apply choice
      const applied = applyWargearChoice(original, datasheet, {
        optionIndex: 0,
        modelName: 'Trooper',
        chosenEquipment: 'melta gun',
      });
      expect(applied[0].equipment).toContain('melta gun');
      expect(applied[0].equipment).not.toContain('bolt rifle');

      // Revert
      const reverted = revertWargearChoice(applied, datasheet, 0, 'Trooper');
      expect(reverted[0].equipment.sort()).toEqual(original[0].equipment.sort());
    });
  });
});
