import type { DiceExpr } from "../types/simulation";

/** Format a DiceExpr for display: "4", "D6", "2D3+1". */
export function formatDiceExpr(expr: DiceExpr): string {
  if (expr.type === "fixed") return String(expr.value);
  const count = expr.count > 1 ? String(expr.count) : "";
  const mod = expr.modifier > 0 ? `+${expr.modifier}` : "";
  return `${count}D${expr.sides}${mod}`;
}

/** Format a number as a percentage. */
export function formatPercent(value: number, decimals = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/** Format a stat value for display (strip quotes). */
export function formatStat(raw: string): string {
  return raw.replace(/"/g, '"');
}
