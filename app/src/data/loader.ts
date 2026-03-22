import type { FactionIndex, FactionDatasheets, FactionRules } from "../types/data";

const DATA_BASE = "/data/factions";

/** Fetch the faction index (9 KB). Called once on app mount. */
export async function fetchFactionIndex(): Promise<FactionIndex> {
  const res = await fetch(`${DATA_BASE}/index.json`);
  if (!res.ok) throw new Error(`Failed to fetch faction index: ${res.status}`);
  return res.json();
}

/** Fetch both datasheets and rules for a faction in parallel. */
export async function fetchFactionData(slug: string): Promise<{
  datasheets: FactionDatasheets;
  rules: FactionRules;
}> {
  const [datasheetsRes, rulesRes] = await Promise.all([
    fetch(`${DATA_BASE}/datasheets/${slug}.json`),
    fetch(`${DATA_BASE}/rules/${slug}.json`),
  ]);

  if (!datasheetsRes.ok) {
    throw new Error(`Failed to fetch datasheets for ${slug}: ${datasheetsRes.status}`);
  }
  if (!rulesRes.ok) {
    throw new Error(`Failed to fetch rules for ${slug}: ${rulesRes.status}`);
  }

  const [datasheets, rules] = await Promise.all([
    datasheetsRes.json() as Promise<FactionDatasheets>,
    rulesRes.json() as Promise<FactionRules>,
  ]);

  return { datasheets, rules };
}
