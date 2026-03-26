import type { DiceExpr } from "../types/simulation";

const DICE_RE = /^(?:(\d+))?[Dd]([36])(?:\+(\d+))?$/;

/**
 * Parse a dice expression string into a DiceExpr.
 * Handles: "4" (fixed), "D6", "2D3+1", "D6+3", etc.
 */
export function parseDiceExpr(raw: string): DiceExpr {
  const trimmed = raw.trim();

  // Try fixed integer first
  const asInt = parseInt(trimmed, 10);
  if (!isNaN(asInt) && String(asInt) === trimmed) {
    return { type: "fixed", value: asInt };
  }

  const match = trimmed.match(DICE_RE);
  if (!match) {
    throw new Error(`Invalid dice expression: "${raw}"`);
  }

  return {
    type: "dice",
    count: match[1] ? parseInt(match[1], 10) : 1,
    sides: parseInt(match[2], 10),
    modifier: match[3] ? parseInt(match[3], 10) : 0,
  };
}

/** Roll a DiceExpr and return the result. */
export function rollDiceExpr(expr: DiceExpr): number {
  if (expr.type === "fixed") return expr.value;

  let total = expr.modifier;
  for (let i = 0; i < expr.count; i++) {
    total += Math.floor(Math.random() * expr.sides) + 1;
  }
  return total;
}

/** Roll a single D6. */
export function rollD6(): number {
  return Math.floor(Math.random() * 6) + 1;
}

/** Get the minimum value of a DiceExpr. */
export function diceMin(expr: DiceExpr): number {
  if (expr.type === "fixed") return expr.value;
  return expr.count + expr.modifier;
}

/** Get the maximum value of a DiceExpr. */
export function diceMax(expr: DiceExpr): number {
  if (expr.type === "fixed") return expr.value;
  return expr.count * expr.sides + expr.modifier;
}

/** Get the average value of a DiceExpr. */
export function diceAverage(expr: DiceExpr): number {
  if (expr.type === "fixed") return expr.value;
  return expr.count * (expr.sides + 1) / 2 + expr.modifier;
}

/**
 * Parse a roll target string like "3+" into the numeric threshold.
 * Returns 0 for "N/A" (auto-hit).
 */
export function parseRollTarget(raw: string | null): number {
  if (!raw || raw === "N/A") return 0;
  const trimmed = raw.replace("+", "").replace("*", "").trim();
  return parseInt(trimmed, 10);
}

/**
 * Parse AP string like "-2" or "0" into a positive number.
 * AP "-2" → 2, AP "0" → 0.
 */
export function parseAP(raw: string): number {
  const val = parseInt(raw, 10);
  return Math.abs(val);
}

/**
 * Parse a stat string that might have quotes (inches).
 * "6\"" → 6, "12\"" → 12, "Melee" → 0, "N/A" → 0
 */
export function parseRange(raw: string): number {
  if (raw === "Melee" || raw === "N/A") return 0;
  const cleaned = raw.replace('"', "").replace("+", "").trim();
  const val = parseInt(cleaned, 10);
  return isNaN(val) ? 0 : val;
}

/** Parse a strength value (always a fixed integer in the JSON). */
export function parseStrength(raw: string): number {
  return parseInt(raw, 10);
}
