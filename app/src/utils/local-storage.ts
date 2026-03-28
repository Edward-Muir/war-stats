import type { AttackerGameState, DefenderGameState } from '../types/config';

const STORAGE_KEY = 'warstats-defaults-v1';

export interface StoredDefaults {
  attackerFactionSlug: string;
  attackerChapter: string | null;
  attackerGameState: Partial<AttackerGameState>;
  defenderFactionSlug: string;
  defenderChapter: string | null;
  defenderGameState: Partial<DefenderGameState>;
  simulationIterations: number;
}

export const BUILTIN_DEFAULTS: StoredDefaults = {
  attackerFactionSlug: 'space-marines',
  attackerChapter: null,
  attackerGameState: {},
  defenderFactionSlug: 'space-marines',
  defenderChapter: null,
  defenderGameState: {},
  simulationIterations: 10000,
};

export function loadStoredDefaults(): StoredDefaults | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredDefaults;
  } catch {
    return null;
  }
}

export function saveStoredDefaults(defaults: StoredDefaults): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults));
  } catch {
    // localStorage full or unavailable — silently ignore
  }
}

export function clearStoredDefaults(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // silently ignore
  }
}
