/**
 * Check if a unit matches a compound keyword string.
 *
 * Compound keywords like "ADEPTUS ASTARTES INFANTRY" are decomposed:
 * every word must exist in the unit's combined keywords + faction_keywords.
 *
 * This mirrors the Python Stratagem.applies_to() logic.
 */
export function matchesCompoundKeyword(
  compoundKeyword: string,
  unitKeywords: string[],
  factionKeywords: string[]
): boolean {
  const allKeywords = new Set<string>();
  for (const k of [...unitKeywords, ...factionKeywords]) {
    const upper = k.toUpperCase();
    allKeywords.add(upper);
    // Decompose multi-word keywords so compound matching works
    // e.g. "ADEPTUS ASTARTES" adds both the full string AND "ADEPTUS", "ASTARTES"
    for (const word of upper.split(/\s+/)) {
      if (word) allKeywords.add(word);
    }
  }

  const words = compoundKeyword
    .toUpperCase()
    .split(/\s+/)
    .filter((w) => w.length > 0);

  return words.every((word) => allKeywords.has(word));
}

/**
 * Check if a unit matches ANY of the target keywords (OR logic).
 * Each target keyword is checked as a compound keyword.
 */
export function matchesAnyTargetKeyword(
  targetKeywords: string[],
  unitKeywords: string[],
  factionKeywords: string[]
): boolean {
  if (targetKeywords.length === 0) return true; // No restrictions
  return targetKeywords.some((tk) => matchesCompoundKeyword(tk, unitKeywords, factionKeywords));
}

/**
 * Check if a unit matches ALL keyword restrictions (AND logic).
 * Used for enhancement restrictions.
 */
export function matchesAllKeywordRestrictions(
  restrictions: string[],
  unitKeywords: string[],
  factionKeywords: string[]
): boolean {
  if (restrictions.length === 0) return true;
  const allKeywords = new Set<string>();
  for (const k of [...unitKeywords, ...factionKeywords]) {
    const upper = k.toUpperCase();
    allKeywords.add(upper);
    for (const word of upper.split(/\s+/)) {
      if (word) allKeywords.add(word);
    }
  }
  return restrictions.every((r) => allKeywords.has(r.toUpperCase()));
}
