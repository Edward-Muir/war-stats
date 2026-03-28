import { useMemo } from 'react';
import type { UnitDatasheet } from '../../types/data';
import type { ConfiguredModel, WargearSlot, WeaponFiringConfig } from '../../types/config';
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
  const isAttacker = side === 'attacker';
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

        // Check if this group is part of a model pool
        const pool = pools.find(
          (p) => p.baseDefName === group.definitionName || p.variantDefNames.includes(group.definitionName)
        );
        const isPoolBase = pool?.baseDefName === group.definitionName;
        const isPoolVariant = pool != null && pool.variantDefNames.includes(group.definitionName);

        let maxCount: number;
        let displayCount: number | undefined;
        let minCount: number;

        if (isPoolBase && pool) {
          // Pool base: stepper shows base count; + adds to base, - removes from base
          const variantTotal = models
            .filter((m) => pool.variantDefNames.includes(m.definitionName))
            .reduce((sum, m) => sum + m.count, 0);
          displayCount = undefined; // show group.count (base count)
          maxCount = pool.maxTotal - variantTotal;
          minCount = Math.max(0, pool.minTotal - variantTotal);
        } else if (isPoolVariant && pool) {
          // Pool variant: stepper controls variant count, limited by available pool
          const base = models.find((m) => m.definitionName === pool.baseDefName && m.isBase);
          displayCount = undefined; // show own count
          maxCount = Math.min(def?.max ?? 0, (base?.count ?? 0) + group.count);
          minCount = 0;
        } else if (group.isBase) {
          // Non-pooled base: existing behavior
          displayCount = models
            .filter((m) => m.definitionName === group.definitionName)
            .reduce((sum, m) => sum + m.count, 0);
          maxCount = def?.max ?? group.count;
          minCount = def?.min ?? 0;
        } else {
          // Non-pooled variant (wargear variant group)
          displayCount = undefined;
          maxCount = group.count +
            (models.find((m) => m.definitionName === group.definitionName && m.isBase)?.count ?? 0);
          minCount = 0;
        }

        const groupFiringConfig = firingConfig.filter((fc) => fc.groupId === group.groupId);

        return (
          <ModelGroup
            key={group.groupId}
            group={group}
            allModels={models}
            datasheet={datasheet}
            slots={slots}
            firingConfig={groupFiringConfig}
            interactive={isAttacker}
            attackMode={isAttacker ? attackMode : undefined}
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
