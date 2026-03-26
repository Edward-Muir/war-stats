import type { RawWeapon } from '../types/data';

/**
 * Parse "up to N" constraint from raw wargear option text.
 * Returns null if no constraint found.
 */
export function parseUpToCount(raw: string): number | null {
  const match = raw.match(/up to (\d+)/i);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Check if raw text indicates duplicates are not allowed.
 */
export function parseNoDuplicates(raw: string): boolean {
  return raw.toLowerCase().includes('duplicates are not allowed');
}

/**
 * Match a choice name fragment to a weapon profile on the datasheet.
 * Handles case-insensitive matching and common naming variations.
 */
export function matchWeaponName(
  fragment: string,
  weapons: RawWeapon[]
): RawWeapon | null {
  const lower = fragment.toLowerCase().trim();
  if (!lower) return null;

  // Exact match (case-insensitive)
  const exact = weapons.find((w) => w.name.toLowerCase() === lower);
  if (exact) return exact;

  // Prefix match: choice "plasma gun" matches weapon "Plasma gun – standard"
  const prefix = weapons.find((w) => w.name.toLowerCase().startsWith(lower));
  if (prefix) return prefix;

  // Contains match: choice fragment appears in weapon name
  const contains = weapons.find((w) => w.name.toLowerCase().includes(lower));
  if (contains) return contains;

  return null;
}

/**
 * Clean up a choice string for display.
 * Strips leading "1 " prefix, trims whitespace.
 */
export function cleanChoiceLabel(choice: string): string {
  return choice.replace(/^1\s+/, '').trim();
}
