import type { UnitDatasheet } from '../types/data';

// Priority-ordered: first match wins.
// EPIC HERO before CHARACTER (epic heroes are also characters).
// CHARACTER before INFANTRY (characters are also infantry).
// BATTLELINE before INFANTRY (battleline are also infantry).
const CATEGORY_PRIORITY = [
  'EPIC HERO',
  'CHARACTER',
  'BATTLELINE',
  'MONSTER',
  'VEHICLE',
  'MOUNTED',
  'BEAST',
  'FORTIFICATION',
  'INFANTRY',
] as const;

const DISPLAY_NAMES: Record<string, string> = {
  'EPIC HERO': 'Epic Hero',
  CHARACTER: 'Character',
  BATTLELINE: 'Battleline',
  MONSTER: 'Monster',
  VEHICLE: 'Vehicle',
  MOUNTED: 'Mounted',
  BEAST: 'Beast',
  FORTIFICATION: 'Fortification',
  INFANTRY: 'Infantry',
  OTHER: 'Other',
};

export function getUnitCategory(keywords: string[]): string {
  const upper = new Set(keywords.map((k) => k.toUpperCase()));
  for (const cat of CATEGORY_PRIORITY) {
    if (upper.has(cat)) return cat;
  }
  return 'OTHER';
}

export function categoryDisplayName(category: string): string {
  return DISPLAY_NAMES[category] ?? category;
}

export function groupUnitsByCategory(
  units: UnitDatasheet[]
): { category: string; displayName: string; units: UnitDatasheet[] }[] {
  const groups = new Map<string, UnitDatasheet[]>();

  for (const unit of units) {
    const cat = getUnitCategory(unit.keywords);
    const list = groups.get(cat);
    if (list) {
      list.push(unit);
    } else {
      groups.set(cat, [unit]);
    }
  }

  // Return in priority order, then OTHER at the end
  const result: { category: string; displayName: string; units: UnitDatasheet[] }[] = [];
  for (const cat of CATEGORY_PRIORITY) {
    const list = groups.get(cat);
    if (list && list.length > 0) {
      result.push({ category: cat, displayName: categoryDisplayName(cat), units: list });
    }
  }
  const other = groups.get('OTHER');
  if (other && other.length > 0) {
    result.push({ category: 'OTHER', displayName: 'Other', units: other });
  }

  return result;
}
