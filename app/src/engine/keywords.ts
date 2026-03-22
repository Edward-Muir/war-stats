import type { ParsedWeaponKeywords } from "../types/simulation";
import { EMPTY_KEYWORDS } from "../types/simulation";

// Regex patterns for parameterized keywords
const SUSTAINED_HITS_RE = /^sustained hits (\d+)$/;
const ANTI_RE = /^anti-(.+?) (\d)\+$/;
const RAPID_FIRE_RE = /^rapid fire (\d+)$/;
const MELTA_RE = /^melta (\d+)$/;

/** Try to parse a parameterized keyword, returning true if matched. */
function tryParseParameterized(lower: string, result: ParsedWeaponKeywords): boolean {
  let match: RegExpMatchArray | null;

  match = lower.match(SUSTAINED_HITS_RE);
  if (match) {
    result.sustainedHits = parseInt(match[1], 10);
    return true;
  }

  match = lower.match(ANTI_RE);
  if (match) {
    result.antiKeyword = match[1].toUpperCase();
    result.antiThreshold = parseInt(match[2], 10);
    return true;
  }

  match = lower.match(RAPID_FIRE_RE);
  if (match) {
    result.rapidFire = parseInt(match[1], 10);
    return true;
  }

  match = lower.match(MELTA_RE);
  if (match) {
    result.melta = parseInt(match[1], 10);
    return true;
  }

  return false;
}

/** Boolean keyword lookup table. */
const BOOLEAN_KEYWORDS: Record<string, keyof ParsedWeaponKeywords> = {
  "lethal hits": "lethalHits",
  "devastating wounds": "devastatingWounds",
  "torrent": "torrent",
  "heavy": "heavy",
  "assault": "assault",
  "lance": "lance",
  "twin-linked": "twinLinked",
  "ignores cover": "ignoresCover",
  "indirect fire": "indirectFire",
  "precision": "precision",
  "hazardous": "hazardous",
  "extra attacks": "extraAttacks",
  "pistol": "pistol",
  "blast": "blast",
};

/**
 * Parse an array of lowercase weapon keyword strings into a typed struct.
 *
 * Examples:
 *   ["sustained hits 2", "lethal hits"] →
 *     { sustainedHits: 2, lethalHits: true, ... }
 *   ["anti-vehicle 4+", "devastating wounds"] →
 *     { antiKeyword: "VEHICLE", antiThreshold: 4, devastatingWounds: true, ... }
 */
export function parseWeaponKeywords(keywords: string[]): ParsedWeaponKeywords {
  const result = { ...EMPTY_KEYWORDS };

  for (const kw of keywords) {
    const lower = kw.toLowerCase().trim();

    if (tryParseParameterized(lower, result)) continue;

    const field = BOOLEAN_KEYWORDS[lower];
    if (field) {
      (result[field] as boolean) = true;
    }
    // Skip unrecognized keywords (e.g. "psychic", "overcharge")
  }

  return result;
}
