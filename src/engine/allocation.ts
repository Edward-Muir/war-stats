import { rollD6 } from "./dice";

/** A model in the defender pool, tracking remaining wounds. */
export interface DefenderModel {
  currentWounds: number;
  maxWounds: number;
}

/** Result of allocating damage to the defender model pool. */
export interface AllocationResult {
  totalDamageDealt: number;
  mortalWoundsDamageDealt: number;
  modelsKilled: number;
  remainingModels: DefenderModel[];
}

/**
 * Build a fresh defender model pool.
 */
export function buildModelPool(modelCount: number, woundsPerModel: number): DefenderModel[] {
  return Array.from({ length: modelCount }, () => ({
    currentWounds: woundsPerModel,
    maxWounds: woundsPerModel,
  }));
}

/**
 * Allocate damage to the defender model pool following 10th Edition rules:
 *
 * 1. Normal damage: applied per attack, excess does NOT carry over.
 * 2. Mortal wounds: applied after normal damage, excess DOES carry over.
 * 3. FNP: roll D6 per wound lost; on X+, wound is ignored.
 * 4. Must allocate to already-wounded model first.
 */
export function allocateDamage(
  damageSequence: number[],
  mortalWounds: number,
  pool: DefenderModel[],
  feelNoPain: number | null,
): AllocationResult {
  let totalDamageDealt = 0;
  let mortalWoundsDamageDealt = 0;
  let modelsKilled = 0;

  // ── Normal damage: per-attack, no carry-over ──
  for (const rawDmg of damageSequence) {
    const target = findAllocationTarget(pool);
    if (!target) break; // All models dead

    const effectiveDmg = applyFNP(rawDmg, feelNoPain);
    const dealt = Math.min(effectiveDmg, target.currentWounds);
    target.currentWounds -= dealt;
    totalDamageDealt += dealt;

    if (target.currentWounds <= 0) {
      modelsKilled++;
      // Excess damage is lost for normal attacks
    }
  }

  // ── Mortal wounds: carry over between models ──
  let mwRemaining = mortalWounds;
  while (mwRemaining > 0) {
    const target = findAllocationTarget(pool);
    if (!target) break;

    // Apply FNP to this single mortal wound
    const effectiveMW = applyFNP(1, feelNoPain);
    if (effectiveMW > 0) {
      target.currentWounds -= 1;
      totalDamageDealt += 1;
      mortalWoundsDamageDealt += 1;

      if (target.currentWounds <= 0) {
        modelsKilled++;
        // Mortal wound excess DOES carry over (handled by continuing the loop)
      }
    }
    mwRemaining--;
  }

  const remainingModels = pool.filter((m) => m.currentWounds > 0);

  return {
    totalDamageDealt,
    mortalWoundsDamageDealt,
    modelsKilled,
    remainingModels,
  };
}

/**
 * Find the model to allocate damage to.
 * Priority: already-wounded model, then first alive model.
 */
function findAllocationTarget(pool: DefenderModel[]): DefenderModel | null {
  // Find already-wounded model (has lost wounds but still alive)
  const wounded = pool.find(
    (m) => m.currentWounds > 0 && m.currentWounds < m.maxWounds,
  );
  if (wounded) return wounded;

  // Otherwise, first alive model
  return pool.find((m) => m.currentWounds > 0) ?? null;
}

/**
 * Apply Feel No Pain to a number of wounds.
 * Each wound is rolled individually: on X+, the wound is ignored.
 */
function applyFNP(wounds: number, fnp: number | null): number {
  if (fnp === null) return wounds;

  let dealt = 0;
  for (let i = 0; i < wounds; i++) {
    const roll = rollD6();
    if (roll < fnp) {
      dealt++; // FNP failed, wound goes through
    }
    // FNP passed, wound is ignored
  }
  return dealt;
}
