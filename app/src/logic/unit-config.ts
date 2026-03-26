import type { UnitDatasheet } from '../types/data';
import type { SelectedWeapon } from '../types/config';
import type { ResolvedWeaponGroup, DefenderProfile } from '../types/simulation';
import { parseDiceExpr, parseRollTarget, parseAP, parseRange, parseStrength } from '../engine/dice';
import { parseWeaponKeywords } from '../engine/keywords';

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
        targetInHalfRange: false,
      };
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
