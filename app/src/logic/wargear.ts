import type { UnitDatasheet, WargearOption } from "../types/data";
import type { ConfiguredModel, WargearChoice } from "../types/config";

/**
 * Build the initial model configuration from a datasheet's model_definitions.
 * Each model type starts at its min_models count with default_equipment.
 */
export function buildDefaultModels(datasheet: UnitDatasheet): ConfiguredModel[] {
  return datasheet.model_definitions.map((def) => ({
    definitionName: def.name,
    equipment: [...def.default_equipment],
    count: def.min_models,
  }));
}

/**
 * Get the total model count across all configured models.
 */
export function getTotalModels(models: ConfiguredModel[]): number {
  return models.reduce((sum, m) => sum + m.count, 0);
}

/**
 * Set model count for a specific model definition, clamped to min/max.
 */
export function setModelCount(
  models: ConfiguredModel[],
  datasheet: UnitDatasheet,
  definitionName: string,
  count: number,
): ConfiguredModel[] {
  const def = datasheet.model_definitions.find((d) => d.name === definitionName);
  if (!def) return models;

  const clamped = Math.max(def.min_models, Math.min(def.max_models, count));

  return models.map((m) =>
    m.definitionName === definitionName ? { ...m, count: clamped } : m,
  );
}

/**
 * Get wargear options applicable to a model definition.
 * Filters by scope: named_model must match model_name,
 * this_model/all_models apply to any, etc.
 */
export function getApplicableOptions(
  datasheet: UnitDatasheet,
  definitionName: string,
): { option: WargearOption; index: number }[] {
  return datasheet.wargear_options
    .map((opt, index) => ({ option: opt, index }))
    .filter(({ option }) => {
      switch (option.scope) {
        case "named_model":
          return (
            option.model_name?.toLowerCase() === definitionName.toLowerCase()
          );
        case "all_models":
        case "this_model":
        case "specific_count":
        case "per_n_models":
          return true;
        default:
          return true;
      }
    });
}

/**
 * Apply a wargear choice to the model configuration.
 * Returns updated equipment list for the affected model.
 */
export function applyWargearChoice(
  models: ConfiguredModel[],
  datasheet: UnitDatasheet,
  choice: WargearChoice,
): ConfiguredModel[] {
  const option = datasheet.wargear_options[choice.optionIndex];
  if (!option) return models;

  return models.map((m) => {
    if (m.definitionName !== choice.modelName) return m;

    const equipment = [...m.equipment];

    if (option.type === "replace") {
      // Remove replaced items and add the chosen one
      for (const replaced of option.replaces) {
        const idx = equipment.findIndex(
          (e) => e.toLowerCase() === replaced.toLowerCase(),
        );
        if (idx >= 0) equipment.splice(idx, 1);
      }
      equipment.push(choice.chosenEquipment);
    } else {
      // "add" — just add the new equipment
      equipment.push(choice.chosenEquipment);
    }

    return { ...m, equipment };
  });
}
