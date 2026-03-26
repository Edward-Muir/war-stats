import type { UnitDatasheet } from '../../types/data';
import type { ConfiguredModel, WargearSlot, WeaponFiringConfig } from '../../types/config';
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
  onDefinitionCount,
  onWeaponFiringCount,
}: Props) {
  const isAttacker = side === 'attacker';

  // Sort: base groups first, then variants
  const sorted = [...models].sort((a, b) => {
    if (a.definitionName !== b.definitionName) {
      const aIdx = datasheet.model_definitions.findIndex(
        (d) => d.name === a.definitionName
      );
      const bIdx = datasheet.model_definitions.findIndex(
        (d) => d.name === b.definitionName
      );
      return aIdx - bIdx;
    }
    if (a.isBase && !b.isBase) return -1;
    if (!a.isBase && b.isBase) return 1;
    return 0;
  });

  return (
    <div className="unit-configurator">
      <UnitInfoCard datasheet={datasheet} />

      {sorted.map((group) => {
        const def = datasheet.model_definitions.find(
          (d) => d.name === group.definitionName
        );
        const maxCount = group.isBase
          ? (def?.max_models ?? group.count)
          : group.count + (models.find(
              (m) => m.definitionName === group.definitionName && m.isBase
            )?.count ?? 0);

        const groupFiringConfig = firingConfig.filter(
          (fc) => fc.groupId === group.groupId
        );

        return (
          <ModelGroup
            key={group.groupId}
            group={group}
            datasheet={datasheet}
            slots={slots}
            firingConfig={groupFiringConfig}
            interactive={isAttacker}
            attackMode={isAttacker ? attackMode : undefined}
            maxCount={maxCount}
            onCountChange={
              group.isBase && onDefinitionCount
                ? (count) => onDefinitionCount(group.definitionName, count)
                : onVariableSlotCount
                  ? (count) => onVariableSlotCount(group.groupId, count)
                  : undefined
            }
            onWeaponCountChange={
              onWeaponFiringCount
                ? (weaponName, count) =>
                    onWeaponFiringCount(group.groupId, weaponName, count)
                : undefined
            }
            onSlotSelect={onSlotSelect}
          />
        );
      })}
    </div>
  );
}
