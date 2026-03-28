import type { RawWeapon, UnitDatasheet } from '../types/data';
import { parseWeaponKeywords } from '../engine/keywords';

/**
 * Check if a unit has the pistol weapon restriction.
 *
 * Returns true if:
 * - Unit is NOT a Monster or Vehicle
 * - Unit has both pistol and non-pistol ranged weapons
 */
export function hasPistolRestriction(
  datasheet: UnitDatasheet,
  rangedWeapons: RawWeapon[]
): boolean {
  // Check if unit is Monster or Vehicle (exempt from restriction)
  const allKeywords = [
    ...datasheet.keywords.map(k => k.toUpperCase()),
    ...datasheet.factionKeywords.map(k => k.toUpperCase())
  ];

  if (allKeywords.includes('MONSTER') || allKeywords.includes('VEHICLE')) {
    return false;
  }

  // Check if unit has both pistol and non-pistol ranged weapons
  let hasPistols = false;
  let hasNonPistols = false;

  for (const weapon of rangedWeapons) {
    const keywords = parseWeaponKeywords(weapon.keywords);
    if (keywords.pistol) {
      hasPistols = true;
    } else {
      hasNonPistols = true;
    }

    if (hasPistols && hasNonPistols) {
      return true;
    }
  }

  return false;
}

/**
 * Filter ranged weapons based on pistol mode.
 *
 * - null: no filtering (for Monsters/Vehicles or units without restriction)
 * - 'pistols_only': only pistol weapons
 * - 'non_pistols_only': only non-pistol weapons (default)
 */
export function filterWeaponsByPistolMode(
  weapons: RawWeapon[],
  pistolMode: 'pistols_only' | 'non_pistols_only' | null
): RawWeapon[] {
  if (pistolMode === null) {
    return weapons;
  }

  return weapons.filter(weapon => {
    const keywords = parseWeaponKeywords(weapon.keywords);
    const isPistol = keywords.pistol;

    if (pistolMode === 'pistols_only') {
      return isPistol;
    } else {
      return !isPistol;
    }
  });
}

/**
 * Get available pistol modes for a set of ranged weapons.
 * Returns both modes only if unit has both pistol and non-pistol weapons.
 */
export function getAvailablePistolModes(
  rangedWeapons: RawWeapon[]
): Array<'pistols_only' | 'non_pistols_only'> {
  let hasPistols = false;
  let hasNonPistols = false;

  for (const weapon of rangedWeapons) {
    const keywords = parseWeaponKeywords(weapon.keywords);
    if (keywords.pistol) {
      hasPistols = true;
    } else {
      hasNonPistols = true;
    }
  }

  const modes: Array<'pistols_only' | 'non_pistols_only'> = [];
  if (hasNonPistols) modes.push('non_pistols_only');
  if (hasPistols) modes.push('pistols_only');

  return modes;
}
