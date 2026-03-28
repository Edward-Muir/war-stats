import type { UnitDatasheet, RawWeapon, V2ModelDefinition } from '../types/data';
import type {
  WargearSlot,
  WargearSlotOption,
  SlotScope,
  SlotSelection,
  ConfiguredModel,
  WeaponFiringConfig,
  SelectedWeapon,
} from '../types/config';
import { filterWeaponsByPistolMode } from './pistol-restrictions';

// ─── Model Pools ───────────────────────────────────────────────

/**
 * A pool of model definitions that share a count space.
 * Variant models redistribute from the base model's count.
 */
export interface ModelPool {
  baseDefName: string;        // The definition with min > 0
  variantDefNames: string[];  // Definitions with min = 0
  minTotal: number;           // base.min (pool floor)
  maxTotal: number;           // base.max (pool ceiling)
}

/**
 * Detect model pools by grouping definitions with identical stats.
 * A pool forms when a stat group has exactly one def with min > 0 (base)
 * and one or more defs with min = 0 (variants).
 */
export function buildModelPools(datasheet: UnitDatasheet): ModelPool[] {
  const statKey = (m: V2ModelDefinition) =>
    `${m.stats.M}|${m.stats.T}|${m.stats.Sv}|${m.stats.W}|${m.stats.Ld}|${m.stats.OC}`;

  const groups = new Map<string, V2ModelDefinition[]>();
  for (const model of datasheet.models) {
    const key = statKey(model);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(model);
  }

  const pools: ModelPool[] = [];
  for (const defs of groups.values()) {
    if (defs.length < 2) continue;

    // Find candidates: exactly one base (min > 0, not fixed single like sergeants)
    const bases = defs.filter((d) => d.min > 0 && !(d.min === d.max && d.max === 1));
    const variants = defs.filter((d) => d.min === 0);

    if (bases.length !== 1 || variants.length === 0) continue;

    const base = bases[0];
    pools.push({
      baseDefName: base.name,
      variantDefNames: variants.map((v) => v.name),
      minTotal: base.min,
      maxTotal: base.max,
    });
  }

  return pools;
}

// ─── Slot Construction ──────────────────────────────────────────

/**
 * Build all wargear slots for a datasheet.
 * Each V2SelectionGroup on each model becomes one WargearSlot.
 */
export function buildWargearSlots(datasheet: UnitDatasheet): WargearSlot[] {
  const slots: WargearSlot[] = [];

  for (const model of datasheet.models) {
    for (const group of model.selectionGroups) {
      const options: WargearSlotOption[] = group.selections.map((sel) => ({
        selectionGroupId: group.id,
        selectionId: sel.id,
        weaponIds: sel.weaponIds,
        label: sel.label,
        pointsDelta: sel.pointsDelta,
      }));

      if (options.length === 0) continue;

      const slotId = `${model.id}::${group.id}`;
      const scope = determineSlotScope(model, group.min, group.max);

      // If the group requires a selection (min >= 1), it replaces default weapons
      const type: 'replace' | 'add' = group.min >= 1 ? 'replace' : 'add';
      const replaces = group.min >= 1 ? model.defaultWeaponIds.map((id) => id.toLowerCase()) : [];

      slots.push({
        slotId,
        definitionName: model.name,
        replaces,
        type,
        options,
        scope,
      });
    }
  }

  return slots;
}

/**
 * Determine the UI scope for a wargear slot based on model and group constraints.
 */
function determineSlotScope(
  model: V2ModelDefinition,
  _groupMin: number,
  groupMax: number
): SlotScope {
  const isFixedSingleModel = model.min === model.max && model.max === 1;

  // Single-model definition (e.g. Sergeant) → single dropdown
  if (isFixedSingleModel) {
    return { kind: 'single_model' };
  }

  // Group allows multiple selections → variable count
  if (groupMax > 1) {
    return { kind: 'variable_count', maxCount: groupMax, noDuplicates: false };
  }

  // Multi-model definition with single selection → all_or_nothing
  if (model.max > 1 && groupMax === 1) {
    return { kind: 'all_or_nothing' };
  }

  return { kind: 'single_model' };
}

// ─── Equipment Derivation ───────────────────────────────────────

/**
 * Compute weapon IDs for a model group from its slot selections.
 * Starts with defaultWeaponIds, applies active selections.
 */
export function computeWeaponIds(
  model: V2ModelDefinition,
  slotSelections: SlotSelection[],
  slots: WargearSlot[]
): string[] {
  const weaponIds = [...model.defaultWeaponIds];

  for (const sel of slotSelections) {
    const slot = slots.find((s) => s.slotId === sel.slotId);
    if (!slot) continue;

    const option = slot.options.find(
      (o) => `${o.selectionGroupId}:${o.selectionId}` === sel.optionKey
    );
    if (!option) continue;

    if (slot.type === 'replace') {
      // Remove replaced weapon IDs
      for (const replaced of slot.replaces) {
        const idx = weaponIds.findIndex((id) => id.toLowerCase() === replaced);
        if (idx >= 0) weaponIds.splice(idx, 1);
      }
    }

    // Add the selected weapon IDs
    for (const id of option.weaponIds) {
      weaponIds.push(id);
    }
  }

  return weaponIds;
}

// ─── Model Group Management ─────────────────────────────────────

/**
 * Build initial model groups for a datasheet.
 * One base group per model definition at min count (0 for optional models).
 */
export function buildDefaultModels(
  datasheet: UnitDatasheet,
  _slots: WargearSlot[]
): ConfiguredModel[] {
  return datasheet.models.map((model) => ({
    groupId: model.name,
    definitionName: model.name,
    count: model.min,
    isBase: true,
    slotSelections: [],
  }));
}

/**
 * Apply a slot selection to model groups.
 */
export function applySlotSelection(
  models: ConfiguredModel[],
  slots: WargearSlot[],
  datasheet: UnitDatasheet,
  slotId: string,
  optionKey: string | null
): ConfiguredModel[] {
  const slot = slots.find((s) => s.slotId === slotId);
  if (!slot) return models;

  switch (slot.scope.kind) {
    case 'single_model':
      return applySingleModelSelection(models, slot, slotId, optionKey);

    case 'all_or_nothing':
      return applyAllOrNothingSelection(models, slot, slotId, optionKey);

    case 'variable_count':
      return applyVariableCountSelection(models, slot, datasheet, slotId, optionKey);
  }
}

function applySingleModelSelection(
  models: ConfiguredModel[],
  slot: WargearSlot,
  slotId: string,
  optionKey: string | null
): ConfiguredModel[] {
  return models.map((m) => {
    if (m.definitionName !== slot.definitionName) return m;

    const filtered = m.slotSelections.filter((s) => s.slotId !== slotId);
    if (optionKey) {
      filtered.push({ slotId, optionKey, modelCount: 1 });
    }
    return { ...m, slotSelections: filtered };
  });
}

function applyAllOrNothingSelection(
  models: ConfiguredModel[],
  slot: WargearSlot,
  slotId: string,
  optionKey: string | null
): ConfiguredModel[] {
  return models.map((m) => {
    if (m.definitionName !== slot.definitionName) return m;

    const filtered = m.slotSelections.filter((s) => s.slotId !== slotId);
    if (optionKey) {
      filtered.push({ slotId, optionKey, modelCount: m.count });
    }
    return { ...m, slotSelections: filtered };
  });
}

function applyVariableCountSelection(
  models: ConfiguredModel[],
  slot: WargearSlot,
  datasheet: UnitDatasheet,
  slotId: string,
  optionKey: string | null
): ConfiguredModel[] {
  const model = datasheet.models.find(
    (d) => d.name === slot.definitionName
  );
  if (!model) return models;

  if (optionKey === null) {
    // Remove all variant groups for this slot and return count to base
    const base = models.find(
      (m) => m.definitionName === slot.definitionName && m.isBase
    );
    const removedCount = models
      .filter(
        (m) =>
          m.definitionName === slot.definitionName &&
          !m.isBase &&
          m.slotSelections.some((s) => s.slotId === slotId)
      )
      .reduce((sum, m) => sum + m.count, 0);

    return models
      .filter(
        (m) =>
          !(
            m.definitionName === slot.definitionName &&
            !m.isBase &&
            m.slotSelections.some((s) => s.slotId === slotId)
          )
      )
      .map((m) =>
        m === base ? { ...m, count: m.count + removedCount } : m
      );
  }

  // Check if a variant group already exists for this option
  const existingVariant = models.find(
    (m) =>
      !m.isBase &&
      m.slotSelections.some(
        (s) => s.slotId === slotId && s.optionKey === optionKey
      )
  );

  if (existingVariant) {
    return models;
  }

  // Create a new variant group with count 0
  const groupId = `${slot.definitionName}__${slotId}__${optionKey}`;
  const newGroup: ConfiguredModel = {
    groupId,
    definitionName: slot.definitionName,
    count: 0,
    isBase: false,
    slotSelections: [{ slotId, optionKey, modelCount: 0 }],
  };

  return [...models, newGroup];
}

/**
 * Set count for a variant group, redistributing with the base.
 */
export function setVariableCount(
  models: ConfiguredModel[],
  groupId: string,
  newCount: number,
  datasheet: UnitDatasheet,
  slots: WargearSlot[]
): ConfiguredModel[] {
  const target = models.find((m) => m.groupId === groupId);
  if (!target) return models;

  const model = datasheet.models.find(
    (d) => d.name === target.definitionName
  );
  if (!model) return models;

  // Get the slot to check maxCount
  const slotSel = target.slotSelections[0];
  const slot = slotSel ? slots.find((s) => s.slotId === slotSel.slotId) : null;

  // For per_n_models, recompute max from current total model count
  let maxForSlot: number;
  if (slot?.scope.kind === 'variable_count' && slot.scope.perN) {
    const currentTotal = models
      .filter((m) => m.definitionName === target.definitionName)
      .reduce((sum, m) => sum + m.count, 0);
    maxForSlot = Math.floor(currentTotal / slot.scope.perN) * (slot.scope.maxPerN ?? 1);
  } else if (slot?.scope.kind === 'variable_count') {
    maxForSlot = slot.scope.maxCount;
  } else {
    maxForSlot = model.max;
  }

  const base = models.find(
    (m) => m.definitionName === target.definitionName && m.isBase
  );
  if (!base) return models;

  // Budget group constraint
  let maxFromBudget = Infinity;
  if (slot?.budgetGroup) {
    const siblingSlotIds = new Set(
      slots
        .filter((s) => s.budgetGroup === slot.budgetGroup && s.slotId !== slot.slotId)
        .map((s) => s.slotId)
    );
    const siblingAllocated = models
      .filter(
        (m) =>
          m.definitionName === target.definitionName &&
          !m.isBase &&
          m.groupId !== groupId &&
          m.slotSelections.some((s) => siblingSlotIds.has(s.slotId))
      )
      .reduce((sum, m) => sum + m.count, 0);

    const totalForDef = models
      .filter((m) => m.definitionName === target.definitionName)
      .reduce((sum, m) => sum + m.count, 0);
    maxFromBudget = totalForDef - siblingAllocated;
  }

  // Clamp
  const available = base.count + target.count;
  const clamped = Math.max(0, Math.min(newCount, maxForSlot, available, maxFromBudget));
  const delta = clamped - target.count;
  if (delta === 0) return models;

  const newBaseCount = base.count - delta;
  if (newBaseCount < 0) return models;

  return models.map((m) => {
    if (m.groupId === groupId) {
      const updated = { ...m, count: clamped };
      updated.slotSelections = updated.slotSelections.map((s) => ({
        ...s,
        modelCount: clamped,
      }));
      return updated;
    }
    if (m.groupId === base.groupId) return { ...m, count: newBaseCount };
    return m;
  });
}

/**
 * Set the total model count for a definition, adjusting the base group.
 * Pool-aware: variant definitions redistribute from the pool base;
 * base definitions control the pool total.
 */
export function setDefinitionTotal(
  models: ConfiguredModel[],
  definitionName: string,
  newTotal: number,
  datasheet: UnitDatasheet
): ConfiguredModel[] {
  const model = datasheet.models.find((d) => d.name === definitionName);
  if (!model) return models;

  // Check if this definition is part of a model pool
  const pools = buildModelPools(datasheet);
  const pool = pools.find(
    (p) => p.baseDefName === definitionName || p.variantDefNames.includes(definitionName)
  );

  if (pool && pool.variantDefNames.includes(definitionName)) {
    return setPoolVariantCount(models, definitionName, newTotal, model, pool);
  }

  if (pool && pool.baseDefName === definitionName) {
    return setPoolTotal(models, newTotal, pool);
  }

  // Non-pooled: original behavior
  const clamped = Math.max(model.min, Math.min(model.max, newTotal));
  const currentTotal = models
    .filter((m) => m.definitionName === definitionName)
    .reduce((sum, m) => sum + m.count, 0);
  const delta = clamped - currentTotal;
  if (delta === 0) return models;

  const base = models.find((m) => m.definitionName === definitionName && m.isBase);
  if (!base) return models;

  const newBaseCount = base.count + delta;
  if (newBaseCount < 0) return models;

  return models.map((m) =>
    m.groupId === base.groupId ? { ...m, count: newBaseCount } : m
  );
}

/**
 * Set a pool variant's count, redistributing from the pool base.
 * Pool total stays the same.
 */
function setPoolVariantCount(
  models: ConfiguredModel[],
  variantDefName: string,
  newCount: number,
  variantDef: V2ModelDefinition,
  pool: ModelPool
): ConfiguredModel[] {
  const base = models.find((m) => m.definitionName === pool.baseDefName && m.isBase);
  const variant = models.find((m) => m.definitionName === variantDefName && m.isBase);
  if (!base || !variant) return models;

  // Clamp: can't exceed variant's max OR available in pool (base + current variant)
  const available = base.count + variant.count;
  const clamped = Math.max(variantDef.min, Math.min(newCount, variantDef.max, available));
  const delta = clamped - variant.count;
  if (delta === 0) return models;

  const newBaseCount = base.count - delta;
  if (newBaseCount < 0) return models;

  return models.map((m) => {
    if (m.definitionName === variantDefName && m.isBase) return { ...m, count: clamped };
    if (m.definitionName === pool.baseDefName && m.isBase) return { ...m, count: newBaseCount };
    return m;
  });
}

/**
 * Set the base model count within a pool.
 * Variants stay unchanged; pool total = base + variants.
 * Clamps so that pool total stays within [minTotal, maxTotal].
 */
function setPoolTotal(
  models: ConfiguredModel[],
  newBaseCount: number,
  pool: ModelPool
): ConfiguredModel[] {
  const base = models.find((m) => m.definitionName === pool.baseDefName && m.isBase);
  if (!base) return models;

  const variantTotal = models
    .filter((m) => pool.variantDefNames.includes(m.definitionName))
    .reduce((sum, m) => sum + m.count, 0);

  // Clamp: base >= 0 AND pool total (base + variants) in [minTotal, maxTotal]
  const minBase = Math.max(0, pool.minTotal - variantTotal);
  const maxBase = pool.maxTotal - variantTotal;
  const clamped = Math.max(minBase, Math.min(maxBase, newBaseCount));
  if (clamped === base.count) return models;

  return models.map((m) =>
    m.definitionName === pool.baseDefName && m.isBase ? { ...m, count: clamped } : m
  );
}

// ─── Weapon Resolution ──────────────────────────────────────────

/**
 * Get the weapons available to a model group via direct ID lookup.
 */
export function getGroupWeapons(
  datasheet: UnitDatasheet,
  model: V2ModelDefinition,
  slotSelections: SlotSelection[],
  slots: WargearSlot[]
): RawWeapon[] {
  const weaponIds = computeWeaponIds(model, slotSelections, slots);
  const weapons: RawWeapon[] = [];
  const seen = new Set<string>();

  for (const id of weaponIds) {
    if (seen.has(id)) continue;
    const weapon = datasheet.weapons[id];
    if (weapon) {
      weapons.push(weapon);
      seen.add(id);
    }
  }

  return weapons;
}

/**
 * Extract the base name from a profile weapon name.
 * Profile weapons have the format "➤ Base Name - profile".
 * Returns null for non-profile weapons.
 */
export function getProfileBaseName(weaponName: string): string | null {
  if (!weaponName.startsWith('➤')) return null;
  const dashIdx = weaponName.lastIndexOf(' - ');
  if (dashIdx < 0) return null;
  return weaponName.slice(0, dashIdx).trim();
}

/**
 * Build default firing config: all models fire all their weapons.
 * For profile weapons (➤), only the first profile in each group fires by default.
 */
export function buildDefaultFiringConfig(
  models: ConfiguredModel[],
  slots: WargearSlot[],
  datasheet: UnitDatasheet
): WeaponFiringConfig[] {
  const config: WeaponFiringConfig[] = [];

  for (const group of models) {
    const model = datasheet.models.find(
      (d) => d.name === group.definitionName
    );
    if (!model) continue;

    const weapons = getGroupWeapons(datasheet, model, group.slotSelections, slots);
    const seenProfiles = new Set<string>();

    for (const weapon of weapons) {
      const profileBase = getProfileBaseName(weapon.name);
      let firingCount = group.count;

      if (profileBase !== null) {
        if (seenProfiles.has(profileBase)) {
          // Second+ profile in group: default to 0
          firingCount = 0;
        } else {
          seenProfiles.add(profileBase);
        }
      }

      config.push({
        groupId: group.groupId,
        weaponName: weapon.name,
        firingModelCount: firingCount,
      });
    }
  }

  return config;
}

/**
 * Derive flat SelectedWeapon[] from model groups and firing config.
 * Aggregates across groups, filters by attack mode and pistol mode.
 */
export function deriveSelectedWeapons(
  models: ConfiguredModel[],
  firingConfig: WeaponFiringConfig[],
  slots: WargearSlot[],
  datasheet: UnitDatasheet,
  attackMode: 'ranged' | 'melee',
  pistolMode: 'pistols_only' | 'non_pistols_only' | null = null
): SelectedWeapon[] {
  const aggregated = new Map<string, { weapon: RawWeapon; totalCount: number }>();

  for (const group of models) {
    if (group.count === 0) continue;

    const model = datasheet.models.find(
      (d) => d.name === group.definitionName
    );
    if (!model) continue;

    let weapons = getGroupWeapons(datasheet, model, group.slotSelections, slots);

    // Apply pistol mode filter for ranged weapons
    if (attackMode === 'ranged' && pistolMode !== null) {
      weapons = filterWeaponsByPistolMode(weapons, pistolMode);
    }

    for (const weapon of weapons) {
      if (weapon.type !== attackMode) continue;

      const fc = firingConfig.find(
        (f) => f.groupId === group.groupId && f.weaponName === weapon.name
      );
      const firingCount = Math.min(fc?.firingModelCount ?? group.count, group.count);
      if (firingCount === 0) continue;

      const existing = aggregated.get(weapon.name);
      if (existing) {
        existing.totalCount += firingCount;
      } else {
        aggregated.set(weapon.name, { weapon, totalCount: firingCount });
      }
    }
  }

  return Array.from(aggregated.values()).map(({ weapon, totalCount }) => ({
    weapon,
    firingModelCount: totalCount,
  }));
}

/**
 * Get the total model count across all groups.
 */
export function getTotalModels(models: ConfiguredModel[]): number {
  return models.reduce((sum, m) => sum + m.count, 0);
}
