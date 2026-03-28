// ─── Non-Simulatable Stratagem Registry ────────────────────────
// Reason codes explain why these stratagems have no simulation effect.
// Data is in the JSON file; this module provides typed access.

import data from './non-simulatable-data.json';

export type NonSimReason =
  | 'movement'
  | 'charge'
  | 'deployment'
  | 'morale'
  | 'objective_control'
  | 'targeting'
  | 'heal'
  | 'fight_order'
  | 'cp'
  | 'overwatch'
  | 'heroic_intervention'
  | 'other';

export const NON_SIMULATABLE: Record<string, NonSimReason> = data as Record<string, NonSimReason>;
