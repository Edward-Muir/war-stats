import type { UnitDatasheet, RawWeapon, ModelDefinition } from '../types/data';
import type {
  WargearSlot,
  WargearSlotOption,
  SlotScope,
  SlotSelection,
  ConfiguredModel,
  WeaponFiringConfig,
  SelectedWeapon,
} from '../types/config';
import { parseUpToCount, parseNoDuplicates } from './choice-parser';

// ─── Slot Construction ──────────────────────────────────────────

/**
 * Build all wargear slots for a datasheet.
 * Groups options into slots based on (definitionName, replaces, scopeKind).
 */
export function buildWargearSlots(datasheet: UnitDatasheet): WargearSlot[] {
  const slots: WargearSlot[] = [];

  for (const def of datasheet.model_definitions) {
    const applicableOptions = getApplicableOptionIndices(datasheet, def);

    // Group options by their replaces key to find independent vs exclusive slots
    const groups = new Map<string, { optionIndices: number[]; replaces: string[] }>();

    for (const optIdx of applicableOptions) {
      const option = datasheet.wargear_options[optIdx];
      if (!option.choices || option.choices.length === 0) continue;
      if (option.choices.every((c) => c.length === 0 || c.every((item) => item.trim() === ''))) continue;

      const replacesBase = (option.replaces ?? [])
        .map((r) => r.toLowerCase())
        .sort()
        .join('+') || `add_${optIdx}`;
      // Include scope in key so named_model and all_models don't merge.
      // For per_n_models, each option is an independent quota — don't merge.
      const replacesKey = option.scope === 'per_n_models'
        ? `${replacesBase}::per_n_models::${optIdx}`
        : `${replacesBase}::${option.scope}`;

      const existing = groups.get(replacesKey);
      if (existing) {
        existing.optionIndices.push(optIdx);
      } else {
        groups.set(replacesKey, {
          optionIndices: [optIdx],
          replaces: (option.replaces ?? []).map((r) => r.toLowerCase()),
        });
      }
    }

    // Build a WargearSlot for each group
    for (const [replacesKey, group] of groups) {
      const firstOption = datasheet.wargear_options[group.optionIndices[0]];
      const scope = determineSlotScope(datasheet, def, group.optionIndices);

      // Collect all options across all grouped wargear options
      const slotOptions: WargearSlotOption[] = [];
      for (const optIdx of group.optionIndices) {
        const opt = datasheet.wargear_options[optIdx];
        for (let ci = 0; ci < opt.choices.length; ci++) {
          const choiceItems = opt.choices[ci]; // string[] — pre-split equipment items
          if (choiceItems.length === 0) continue;
          if (choiceItems.every((item) => item.trim() === '')) continue;
          slotOptions.push({
            optionIndex: optIdx,
            choiceIndex: ci,
            choiceRaw: choiceItems.join(', '),
            label: choiceItems.join(', '),
          });
        }
      }

      if (slotOptions.length === 0) continue;

      const scopeKind = scope.kind;
      const slotId = `${def.name}::${replacesKey}::${scopeKind}`;

      // Slots replacing the same equipment on the same definition share a budget group
      const budgetGroup =
        (firstOption.scope === 'per_n_models' || firstOption.scope === 'specific_count')
          ? `${def.name}::${group.replaces.sort().join('+')}`
          : undefined;

      slots.push({
        slotId,
        definitionName: def.name,
        replaces: group.replaces,
        type: firstOption.type,
        options: slotOptions,
        scope,
        raw: firstOption.raw,
        budgetGroup,
      });
    }
  }

  return slots;
}

/**
 * Get indices of wargear options applicable to a model definition.
 */
function getApplicableOptionIndices(
  datasheet: UnitDatasheet,
  def: ModelDefinition
): number[] {
  const isFixedSingleModel = def.min_models === def.max_models && def.max_models === 1;

  return datasheet.wargear_options
    .map((_, index) => index)
    .filter((index) => {
      const opt = datasheet.wargear_options[index];
      switch (opt.scope) {
        case 'named_model':
          return opt.model_name?.toLowerCase() === def.name.toLowerCase();
        case 'per_n_models':
          // per_n_models options apply to the multi-model pool, not single-model named characters
          return !isFixedSingleModel;
        case 'specific_count':
          // specific_count options apply to the multi-model pool, not single-model named characters
          return !isFixedSingleModel;
        case 'all_models':
        case 'this_model':
          return true;
        default:
          return true;
      }
    });
}

/**
 * Determine the scope for a wargear slot.
 */
function determineSlotScope(
  datasheet: UnitDatasheet,
  def: ModelDefinition,
  optionIndices: number[]
): SlotScope {
  const firstOption = datasheet.wargear_options[optionIndices[0]];
  const isFixedSingleModel = def.min_models === def.max_models && def.max_models === 1;

  // Named model on a single-count definition → single_model dropdown
  if (firstOption.scope === 'named_model' && isFixedSingleModel) {
    return { kind: 'single_model' };
  }

  // this_model on a single-count definition → single_model dropdown
  if (firstOption.scope === 'this_model' && isFixedSingleModel) {
    return { kind: 'single_model' };
  }

  // all_models: check for "up to N" constraint
  if (firstOption.scope === 'all_models') {
    const upTo = parseUpToCount(firstOption.raw);
    if (upTo !== null) {
      const noDuplicates = optionIndices.some((i) =>
        parseNoDuplicates(datasheet.wargear_options[i].raw)
      );
      return { kind: 'variable_count', maxCount: upTo, noDuplicates };
    }
    // No "up to" constraint → all_or_nothing
    return { kind: 'all_or_nothing' };
  }

  // specific_count → variable_count
  if (firstOption.scope === 'specific_count') {
    const maxCount = firstOption.max_per_n ?? 1;
    const noDuplicates = optionIndices.some((i) =>
      parseNoDuplicates(datasheet.wargear_options[i].raw)
    );
    return { kind: 'variable_count', maxCount, noDuplicates };
  }

  // per_n_models → variable_count (maxCount uses max_models but recalculated dynamically at use time)
  if (firstOption.scope === 'per_n_models') {
    const perN = firstOption.per_n_models ?? 5;
    const maxPerN = firstOption.max_per_n ?? 1;
    const totalModels = def.max_models;
    const maxCount = Math.floor(totalModels / perN) * maxPerN;
    return { kind: 'variable_count', maxCount, noDuplicates: false, perN, maxPerN };
  }

  // this_model on multi-model definition → variable_count with maxCount = total
  if (firstOption.scope === 'this_model') {
    return { kind: 'variable_count', maxCount: def.max_models, noDuplicates: false };
  }

  return { kind: 'single_model' };
}

// ─── Equipment Derivation ───────────────────────────────────────

/**
 * Compute equipment list for a model group from its slot selections.
 * Pure derivation: defaultEquipment + apply all active selections.
 */
export function computeEquipment(
  definition: ModelDefinition,
  slotSelections: SlotSelection[],
  slots: WargearSlot[],
  datasheet: UnitDatasheet
): string[] {
  const equipment = [...definition.default_equipment];

  for (const sel of slotSelections) {
    const slot = slots.find((s) => s.slotId === sel.slotId);
    if (!slot) continue;

    const [optIdxStr, choiceIdxStr] = sel.optionKey.split(':');
    const optIdx = parseInt(optIdxStr, 10);
    const choiceIdx = parseInt(choiceIdxStr, 10);
    const option = datasheet.wargear_options[optIdx];
    if (!option) continue;

    const choiceItems = option.choices[choiceIdx]; // string[] — pre-split equipment items
    if (!choiceItems || choiceItems.length === 0) continue;

    if (slot.type === 'replace') {
      // Remove replaced items
      for (const replaced of option.replaces ?? []) {
        const idx = equipment.findIndex(
          (e) => e.toLowerCase() === replaced.toLowerCase()
        );
        if (idx >= 0) equipment.splice(idx, 1);
      }
    }

    // Add the chosen equipment items
    for (const item of choiceItems) {
      equipment.push(item);
    }
  }

  return equipment;
}

// ─── Model Group Management ─────────────────────────────────────

/**
 * Build initial model groups for a datasheet.
 * One base group per definition at min_models count, no selections.
 */
export function buildDefaultModels(
  datasheet: UnitDatasheet,
  _slots: WargearSlot[]
): ConfiguredModel[] {
  return datasheet.model_definitions.map((def) => ({
    groupId: def.name,
    definitionName: def.name,
    count: def.min_models,
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
    // Only apply to models matching this slot's definition
    if (m.definitionName !== slot.definitionName) return m;

    // Remove old selection for this slot, add new one
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
  const def = datasheet.model_definitions.find(
    (d) => d.name === slot.definitionName
  );
  if (!def) return models;

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
    // Already exists — no change needed
    return models;
  }

  // Create a new variant group with count 0 (user will adjust with setVariableCount)
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

  const def = datasheet.model_definitions.find(
    (d) => d.name === target.definitionName
  );
  if (!def) return models;

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
    maxForSlot = def.max_models;
  }

  const base = models.find(
    (m) => m.definitionName === target.definitionName && m.isBase
  );
  if (!base) return models;

  // Budget group constraint: total across sibling slots can't exceed def model count
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

  // Clamp: can't exceed slot max, budget max, or take more than base has
  const available = base.count + target.count;
  const clamped = Math.max(0, Math.min(newCount, maxForSlot, available, maxFromBudget));
  const delta = clamped - target.count;
  if (delta === 0) return models;

  const newBaseCount = base.count - delta;
  if (newBaseCount < 0) return models;

  return models.map((m) => {
    if (m.groupId === groupId) {
      const updated = { ...m, count: clamped };
      // Also update the modelCount in slot selections
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
 */
export function setDefinitionTotal(
  models: ConfiguredModel[],
  definitionName: string,
  newTotal: number,
  datasheet: UnitDatasheet
): ConfiguredModel[] {
  const def = datasheet.model_definitions.find((d) => d.name === definitionName);
  if (!def) return models;

  const clamped = Math.max(def.min_models, Math.min(def.max_models, newTotal));
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

// ─── Weapon Resolution ──────────────────────────────────────────

/**
 * Get the weapons available to a model group based on its computed equipment.
 */
export function getGroupWeapons(
  datasheet: UnitDatasheet,
  definition: ModelDefinition,
  slotSelections: SlotSelection[],
  slots: WargearSlot[]
): RawWeapon[] {
  const equipment = computeEquipment(definition, slotSelections, slots, datasheet);
  const weapons: RawWeapon[] = [];
  const seen = new Set<string>();

  for (const equipName of equipment) {
    const lower = equipName.toLowerCase();

    // Exact match first
    const exact = datasheet.weapons.find(
      (w) => w.name.toLowerCase() === lower
    );
    if (exact && !seen.has(exact.name)) {
      weapons.push(exact);
      seen.add(exact.name);
      continue;
    }

    // Multi-profile match: find all weapons whose base name (before ' – ') matches
    const profileMatches = datasheet.weapons.filter((w) => {
      const baseName = w.name.split(/\s[–—]\s/)[0].toLowerCase();
      return baseName === lower && !seen.has(w.name);
    });
    if (profileMatches.length > 0) {
      for (const w of profileMatches) {
        weapons.push(w);
        seen.add(w.name);
      }
      continue;
    }

    // Plural fallback: equipment says "twin power fist" but weapon is "Twin power fists"
    const plural = lower.endsWith('s') ? lower.slice(0, -1) : lower + 's';
    const pluralExact = datasheet.weapons.find(
      (w) => w.name.toLowerCase() === plural
    );
    if (pluralExact && !seen.has(pluralExact.name)) {
      weapons.push(pluralExact);
      seen.add(pluralExact.name);
      continue;
    }

    // Plural + multi-profile fallback
    const pluralProfiles = datasheet.weapons.filter((w) => {
      const baseName = w.name.split(/\s[–—]\s/)[0].toLowerCase();
      return baseName === plural && !seen.has(w.name);
    });
    for (const w of pluralProfiles) {
      weapons.push(w);
      seen.add(w.name);
    }
  }

  return weapons;
}

/**
 * Build default firing config: all models fire all their weapons.
 */
export function buildDefaultFiringConfig(
  models: ConfiguredModel[],
  slots: WargearSlot[],
  datasheet: UnitDatasheet
): WeaponFiringConfig[] {
  const config: WeaponFiringConfig[] = [];

  for (const group of models) {
    const def = datasheet.model_definitions.find(
      (d) => d.name === group.definitionName
    );
    if (!def) continue;

    const weapons = getGroupWeapons(datasheet, def, group.slotSelections, slots);
    for (const weapon of weapons) {
      config.push({
        groupId: group.groupId,
        weaponName: weapon.name,
        firingModelCount: group.count,
      });
    }
  }

  return config;
}

/**
 * Derive flat SelectedWeapon[] from model groups and firing config.
 * Aggregates across groups, filters by attack mode.
 */
export function deriveSelectedWeapons(
  models: ConfiguredModel[],
  firingConfig: WeaponFiringConfig[],
  slots: WargearSlot[],
  datasheet: UnitDatasheet,
  attackMode: 'ranged' | 'melee'
): SelectedWeapon[] {
  const aggregated = new Map<string, { weapon: RawWeapon; totalCount: number }>();

  for (const group of models) {
    if (group.count === 0) continue;

    const def = datasheet.model_definitions.find(
      (d) => d.name === group.definitionName
    );
    if (!def) continue;

    const weapons = getGroupWeapons(datasheet, def, group.slotSelections, slots);

    for (const weapon of weapons) {
      if (weapon.type !== attackMode) continue;

      // Find firing config for this group+weapon
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
