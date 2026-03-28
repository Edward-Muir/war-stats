import type { ResolvedModifiers, ResolvedWeaponGroup, DefenderProfile } from '../types/simulation';
import { rollDiceExpr } from './dice';
import { resolveAttack } from './attack';

/** Result of resolving all attacks from a single weapon group. */
export interface WeaponGroupResult {
  totalHits: number;
  totalWounds: number;
  unsavedWounds: number;
  /** Ordered list of damage values from unsaved wounds (for allocation). */
  damageSequence: number[];
  /** Total mortal wounds from devastating wounds. */
  mortalWounds: number;
}

/**
 * Resolve all attacks from a weapon group (weapon profile × N firing models).
 * Handles sustained hits by queuing extra attacks that auto-hit.
 */
export function resolveWeaponGroup(
  weapon: ResolvedWeaponGroup,
  modifiers: ResolvedModifiers,
  defender: DefenderProfile
): WeaponGroupResult {
  const result: WeaponGroupResult = {
    totalHits: 0,
    totalWounds: 0,
    unsavedWounds: 0,
    damageSequence: [],
    mortalWounds: 0,
  };

  // Determine total attacks across all firing models
  let totalAttacks = 0;
  for (let m = 0; m < weapon.firingModels; m++) {
    totalAttacks += rollDiceExpr(weapon.attacks) + modifiers.attacksBonus;
  }
  totalAttacks = Math.max(0, totalAttacks);

  // Queue of attacks to resolve. false = normal, true = auto-hit (sustained hits extra)
  const attackQueue: boolean[] = new Array(totalAttacks).fill(false);

  let queueIdx = 0;
  while (queueIdx < attackQueue.length) {
    const isAutoHit = attackQueue[queueIdx];
    queueIdx++;

    const atk = resolveAttack(
      weapon.skill,
      weapon.strength + modifiers.strengthBonus,
      weapon.damage,
      modifiers,
      defender,
      isAutoHit
    );

    if (atk.hit) result.totalHits++;
    if (atk.wound) result.totalWounds++;

    // Queue sustained hits extras (they auto-hit but need wound rolls)
    if (atk.sustainedExtraHits > 0) {
      for (let i = 0; i < atk.sustainedExtraHits; i++) {
        attackQueue.push(true);
      }
    }

    // Collect damage
    if (atk.damage > 0) {
      result.unsavedWounds++;
      result.damageSequence.push(atk.damage);
    }
    if (atk.mortalWounds > 0) {
      result.mortalWounds += atk.mortalWounds;
    }
  }

  return result;
}
