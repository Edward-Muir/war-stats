import type {
  SimulationInput,
  SimulationResults,
  SingleSimulationResult,
  DistributionStats,
} from "../types/simulation";
import { computeModifiers } from "./modifiers";
import { resolveWeaponGroup } from "./weapon-resolver";
import { allocateDamage, buildModelPool } from "./allocation";

/**
 * Run N Monte Carlo iterations of the full attack sequence.
 */
export function runSimulation(input: SimulationInput): SimulationResults {
  const results: SingleSimulationResult[] = [];

  for (let i = 0; i < input.iterations; i++) {
    results.push(runSingleIteration(input));
  }

  return {
    iterations: input.iterations,
    results,
    summary: {
      damage: computeDistributionStats(results.map((r) => r.totalDamage)),
      modelsKilled: computeDistributionStats(results.map((r) => r.modelsKilled)),
      mortalWounds: computeDistributionStats(results.map((r) => r.mortalWoundsDealt)),
    },
  };
}

function runSingleIteration(input: SimulationInput): SingleSimulationResult {
  const defender = input.defender;
  let totalHits = 0;
  let totalWounds = 0;
  let unsavedWounds = 0;
  const allDamage: number[] = [];
  let allMortalWounds = 0;

  // Resolve each weapon group
  for (const weaponGroup of input.attacker.weaponGroups) {
    const modifiers = computeModifiers(
      weaponGroup,
      input.attacker.gameState,
      defender.gameState,
      defender,
    );

    const groupResult = resolveWeaponGroup(weaponGroup, modifiers, defender);

    totalHits += groupResult.totalHits;
    totalWounds += groupResult.totalWounds;
    unsavedWounds += groupResult.unsavedWounds;
    allDamage.push(...groupResult.damageSequence);
    allMortalWounds += groupResult.mortalWounds;
  }

  // Allocate all damage to defender model pool
  const pool = buildModelPool(defender.modelCount, defender.wounds);
  const allocation = allocateDamage(
    allDamage,
    allMortalWounds,
    pool,
    defender.feelNoPain,
  );

  return {
    totalDamage: allocation.totalDamageDealt,
    modelsKilled: allocation.modelsKilled,
    mortalWoundsDealt: allocation.mortalWoundsDamageDealt,
    normalDamageDealt: allocation.totalDamageDealt - allocation.mortalWoundsDamageDealt,
    totalHits,
    totalWounds,
    unsavedWounds,
  };
}

// ─── Statistics helpers ──────────────────────────────────────────

function computeDistributionStats(values: number[]): DistributionStats {
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;

  if (n === 0) {
    return {
      mean: 0,
      median: 0,
      stdDev: 0,
      min: 0,
      max: 0,
      percentiles: { p10: 0, p25: 0, p75: 0, p90: 0 },
      histogram: [],
    };
  }

  const sum = sorted.reduce((a, b) => a + b, 0);
  const mean = sum / n;
  const median = sorted[Math.floor(n / 2)];
  const variance = sorted.reduce((acc, v) => acc + (v - mean) ** 2, 0) / n;
  const stdDev = Math.sqrt(variance);
  const min = sorted[0];
  const max = sorted[n - 1];

  const percentile = (p: number) => sorted[Math.floor((p / 100) * n)];

  // Build histogram
  const bucketCount = max - min + 1;
  const histogram: { bucket: number; count: number }[] = [];

  if (bucketCount <= 100) {
    // One bucket per integer value
    const counts = new Map<number, number>();
    for (const v of sorted) {
      counts.set(v, (counts.get(v) ?? 0) + 1);
    }
    for (let b = min; b <= max; b++) {
      histogram.push({ bucket: b, count: counts.get(b) ?? 0 });
    }
  } else {
    // Group into ~50 buckets
    const bucketSize = Math.ceil(bucketCount / 50);
    for (let start = min; start <= max; start += bucketSize) {
      const end = start + bucketSize;
      const count = sorted.filter((v) => v >= start && v < end).length;
      histogram.push({ bucket: start, count });
    }
  }

  return {
    mean,
    median,
    stdDev,
    min,
    max,
    percentiles: {
      p10: percentile(10),
      p25: percentile(25),
      p75: percentile(75),
      p90: percentile(90),
    },
    histogram,
  };
}
