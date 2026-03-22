import type { RawWeapon, UnitDatasheet } from '../types/data';
import type { ConfiguredModel, SelectedWeapon } from '../types/config';
import type { ResolvedWeaponGroup, DefenderProfile } from '../types/simulation';
import { parseDiceExpr, parseRollTarget, parseAP, parseRange, parseStrength } from '../engine/dice';
import { parseWeaponKeywords } from '../engine/keywords';

/**
 * Get the list of weapons available on a unit based on current equipment.
 * Matches configured equipment names to weapon profiles on the datasheet.
 */
export function getAvailableWeapons(
  datasheet: UnitDatasheet,
  models: ConfiguredModel[]
): { weapon: RawWeapon; maxFiringModels: number }[] {
  const weaponMap = new Map<string, { weapon: RawWeapon; maxFiringModels: number }>();

  for (const model of models) {
    for (const equipName of model.equipment) {
      // Find matching weapon profile on the datasheet
      const weapon = datasheet.weapons.find(
        (w) => w.name.toLowerCase() === equipName.toLowerCase()
      );
      if (weapon) {
        const existing = weaponMap.get(weapon.name);
        if (existing) {
          existing.maxFiringModels += model.count;
        } else {
          weaponMap.set(weapon.name, { weapon, maxFiringModels: model.count });
        }
      }
    }
  }

  // Also include weapons that every model has by default but might not be
  // explicitly in the equipment list (e.g., close combat weapon)
  for (const weapon of datasheet.weapons) {
    if (!weaponMap.has(weapon.name)) {
      // Check if this weapon is default equipment for any model def
      const totalModels = models.reduce((sum, m) => {
        const def = datasheet.model_definitions.find((d) => d.name === m.definitionName);
        if (
          def &&
          def.default_equipment.some((e) => e.toLowerCase() === weapon.name.toLowerCase())
        ) {
          return sum + m.count;
        }
        return sum;
      }, 0);
      if (totalModels > 0) {
        weaponMap.set(weapon.name, { weapon, maxFiringModels: totalModels });
      }
    }
  }

  return Array.from(weaponMap.values());
}

/**
 * Convert selected weapons into ResolvedWeaponGroups for the simulation engine.
 */
export function resolveWeaponGroups(selectedWeapons: SelectedWeapon[]): ResolvedWeaponGroup[] {
  return selectedWeapons
    .filter((sw) => sw.firingModelCount > 0)
    .map((sw) => {
      const w = sw.weapon;
      const skill = w.type === 'ranged' ? parseRollTarget(w.BS) : parseRollTarget(w.WS);

      return {
        name: w.name,
        type: w.type,
        rangeInches: parseRange(w.range),
        attacks: parseDiceExpr(w.A),
        skill,
        strength: parseStrength(w.S),
        ap: parseAP(w.AP),
        damage: parseDiceExpr(w.D),
        keywords: parseWeaponKeywords(w.keywords),
        firingModels: sw.firingModelCount,
        targetInHalfRange: false, // Set globally by simulation slice from game state
      };
    });
}

/**
 * Check if any model's equipment differs from its default.
 */
export function isWargearCustomized(datasheet: UnitDatasheet, models: ConfiguredModel[]): boolean {
  return models.some((model) => {
    const def = datasheet.model_definitions.find((d) => d.name === model.definitionName);
    if (!def) return false;
    const defaultSet = new Set(def.default_equipment.map((e) => e.toLowerCase()));
    const currentSet = new Set(model.equipment.map((e) => e.toLowerCase()));
    if (defaultSet.size !== currentSet.size) return true;
    for (const e of defaultSet) {
      if (!currentSet.has(e)) return true;
    }
    return false;
  });
}

/**
 * Build a DefenderProfile from a datasheet and model count.
 */
export function buildDefenderProfile(
  datasheet: UnitDatasheet,
  modelCount: number
): DefenderProfile {
  const toughness = parseInt(datasheet.stats.T, 10);
  const save = parseRollTarget(datasheet.stats.Sv);
  const wounds = parseInt(datasheet.stats.W, 10);
  const invulnerableSave = datasheet.invulnerable_save
    ? parseRollTarget(datasheet.invulnerable_save)
    : null;

  // Extract FNP from core abilities (e.g. "Feel No Pain 5+")
  let feelNoPain: number | null = null;
  for (const ability of datasheet.abilities.core) {
    const fnpMatch = ability.match(/feel no pain (\d)\+/i);
    if (fnpMatch) {
      feelNoPain = parseInt(fnpMatch[1], 10);
    }
  }

  return {
    toughness,
    save,
    invulnerableSave,
    wounds,
    modelCount,
    feelNoPain,
    keywords: [...datasheet.keywords, ...datasheet.faction_keywords],
  };
}
