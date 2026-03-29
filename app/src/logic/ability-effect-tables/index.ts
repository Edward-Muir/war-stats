import type { AbilityEffectEntry } from '../ability-effects';
import { IMPERIUM_ABILITY_EFFECTS } from './imperium';
import { CHAOS_ABILITY_EFFECTS } from './chaos';
import { XENOS_ABILITY_EFFECTS } from './xenos';

/** Merged ability effects across all factions. */
export const ABILITY_EFFECTS: Record<string, AbilityEffectEntry> = {
  ...IMPERIUM_ABILITY_EFFECTS,
  ...CHAOS_ABILITY_EFFECTS,
  ...XENOS_ABILITY_EFFECTS,
};
