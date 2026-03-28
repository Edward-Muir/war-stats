import { useMemo } from 'react';
import type { UnitDatasheet, V2ModelDefinition } from '../../types/data';
import type { ConfiguredModel, WargearSlot, WeaponFiringConfig } from '../../types/config';
import type { ModelPool } from '../../logic/wargear-slots';
import { buildModelPools } from '../../logic/wargear-slots';
import { UnitInfoCard } from './UnitInfoCard';
import { ModelGroup } from './ModelGroup';

interface Props {
  datasheet: UnitDatasheet;
  models: ConfiguredModel[];
  slots: WargearSlot[];
  firingConfig: WeaponFiringConfig[];
  side: 'attacker' | 'defender';
  attackMode?: 'ranged' | 'melee';
  onSlotSelect?: (slotId: string, optionKey: string | null) => void;
  onVariableSlotCount?: (groupId: string, count: number) => void;
  onVariableSlotChange?: (slotId: string, optionKey: string, count: number) => void;
  onDefinitionCount?: (definitionName: string, count: number) => void;
  onWeaponFiringCount?: (groupId: string, weaponName: string, count: number) => void;
}

interface CountLimits {
  displayCount: number | undefined;
  maxCount: number;
  minCount: number;
}

function poolBaseLimits(models: ConfiguredModel[], pool: ModelPool): CountLimits {
  const variantTotal = models
    .filter((m) => pool.variantDefNames.includes(m.definitionName))
    .reduce((sum, m) => sum + m.count, 0);
  return {
    displayCount: undefined,
    maxCount: pool.maxTotal - variantTotal,
    minCount: Math.max(0, pool.minTotal - variantTotal),
  };
}

function poolVariantLimits(
  group: ConfiguredModel,
  def: V2ModelDefinition | undefined,
  models: ConfiguredModel[],
  pool: ModelPool
): CountLimits {
  const base = models.find((m) => m.definitionName === pool.baseDefName && m.isBase);
  const defMax = def?.max ?? 0;
  const baseCount = base?.count ?? 0;
  return {
    displayCount: undefined,
    maxCount: Math.min(defMax, baseCount + group.count),
    minCount: 0,
  };
}

function computeCountLimits(
  group: ConfiguredModel,
  def: V2ModelDefinition | undefined,
  models: ConfiguredModel[],
  pool: ModelPool | undefined
): CountLimits {
  if (pool) {
    if (pool.baseDefName === group.definitionName) return poolBaseLimits(models, pool);
    if (pool.variantDefNames.includes(group.definitionName))
      return poolVariantLimits(group, def, models, pool);
  }
  if (group.isBase) {
    const total = models
      .filter((m) => m.definitionName === group.definitionName)
      .reduce((sum, m) => sum + m.count, 0);
    return { displayCount: total, maxCount: def?.max ?? group.count, minCount: def?.min ?? 0 };
  }
  const baseCount =
    models.find((m) => m.definitionName === group.definitionName && m.isBase)?.count ?? 0;
  return { displayCount: undefined, maxCount: group.count + baseCount, minCount: 0 };
}

export function UnitConfigurator({
  datasheet,
  models,
  slots,
  firingConfig,
  side,
  attackMode = 'ranged',
  onSlotSelect,
  onVariableSlotCount,
  onVariableSlotChange,
  onDefinitionCount,
  onWeaponFiringCount,
}: Props) {
  const interactive = !!(onSlotSelect || onDefinitionCount);
  const pools = useMemo(() => buildModelPools(datasheet), [datasheet]);

  const sorted = [...models].sort((a, b) => {
    if (a.definitionName !== b.definitionName) {
      const aIdx = datasheet.models.findIndex((d) => d.name === a.definitionName);
      const bIdx = datasheet.models.findIndex((d) => d.name === b.definitionName);
      return aIdx - bIdx;
    }
    if (a.isBase && !b.isBase) return -1;
    if (!a.isBase && b.isBase) return 1;
    return 0;
  });

  return (
    <div className="space-y-2">
      <UnitInfoCard datasheet={datasheet} />

      {sorted.map((group) => {
        const def = datasheet.models.find((d) => d.name === group.definitionName);
        const pool = pools.find(
          (p) =>
            p.baseDefName === group.definitionName ||
            p.variantDefNames.includes(group.definitionName)
        );
        const { maxCount, displayCount, minCount } = computeCountLimits(group, def, models, pool);
        const groupFiringConfig = firingConfig.filter((fc) => fc.groupId === group.groupId);

        return (
          <ModelGroup
            key={group.groupId}
            group={group}
            allModels={models}
            datasheet={datasheet}
            slots={slots}
            firingConfig={groupFiringConfig}
            interactive={interactive}
            attackMode={side === 'attacker' ? attackMode : undefined}
            maxCount={maxCount}
            displayCount={displayCount}
            minCount={minCount}
            onCountChange={
              group.isBase && onDefinitionCount
                ? (count) => onDefinitionCount(group.definitionName, count)
                : onVariableSlotCount
                  ? (count) => onVariableSlotCount(group.groupId, count)
                  : undefined
            }
            onWeaponCountChange={
              onWeaponFiringCount
                ? (weaponName, count) => onWeaponFiringCount(group.groupId, weaponName, count)
                : undefined
            }
            onSlotSelect={onSlotSelect}
            onVariableSlotChange={onVariableSlotChange}
          />
        );
      })}
    </div>
  );
}
