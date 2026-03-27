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
 *
 * Toughness: highest T among all models (per Rules Commentary).
 * Sv/W: from first model (per-model allocation not yet modelled).
 */
export function buildDefenderProfile(
  datasheet: UnitDatasheet,
  modelCount: number
): DefenderProfile {
  // Toughness is the highest among all models in the unit
  const toughness = Math.max(
    ...datasheet.models.map((m) => parseInt(m.stats.T, 10))
  );
  const firstModel = datasheet.models[0];
  const save = parseRollTarget(firstModel.stats.Sv);
  const wounds = parseInt(firstModel.stats.W, 10);
  const invulnerableSave = datasheet.invulnerableSave
    ? parseRollTarget(datasheet.invulnerableSave)
    : null;

  // FNP is now a structured field on abilities
  const feelNoPain = datasheet.abilities.feelNoPain;

  return {
    toughness,
    save,
    invulnerableSave,
    wounds,
    modelCount,
    feelNoPain,
    keywords: [...datasheet.keywords, ...datasheet.factionKeywords],
  };
}
