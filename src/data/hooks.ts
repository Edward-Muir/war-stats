import { useEffect } from "react";
import { useAppStore } from "../store/store";

/** Load faction index on mount if not already loaded. */
export function useFactionIndex() {
  const index = useAppStore((s) => s.factionIndex);
  const loadIndex = useAppStore((s) => s.loadFactionIndex);

  useEffect(() => {
    if (!index) loadIndex();
  }, [index, loadIndex]);

  return { index, loading: !index };
}

/** Load faction data (datasheets + rules) when slug changes. */
export function useFactionData(slug: string | null) {
  const loadedFactions = useAppStore((s) => s.loadedFactions);
  const loadFaction = useAppStore((s) => s.loadFaction);

  useEffect(() => {
    if (slug && !loadedFactions[slug]) {
      loadFaction(slug);
    }
  }, [slug, loadedFactions, loadFaction]);

  if (!slug) return { data: null, loading: false };
  const data = loadedFactions[slug] ?? null;
  return { data, loading: slug !== null && !data };
}
