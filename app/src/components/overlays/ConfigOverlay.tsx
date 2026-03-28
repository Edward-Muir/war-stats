import { Overlay } from '../layout/Overlay';
import { DetachmentPicker } from '../faction/DetachmentPicker';
import { UnitConfigurator } from '../unit-config/UnitConfigurator';
import { useAppStore } from '../../store/store';
import { useFactionData } from '../../data/hooks';

interface Props {
  side: 'attacker' | 'defender';
  isOpen: boolean;
  onClose: () => void;
}

export function ConfigOverlay({ side, isOpen, onClose }: Props) {
  const isAttacker = side === 'attacker';

  const factionSlug = useAppStore((s) => s[side].factionSlug);
  const unitName = useAppStore((s) => s[side].unitName);
  const detachmentName = useAppStore((s) => s[side].detachmentName);
  const setDetachment = useAppStore((s) =>
    isAttacker ? s.setAttackerDetachment : s.setDefenderDetachment
  );
  const models = useAppStore((s) => s[side].models);
  const slots = useAppStore((s) => s[side].slots);
  const firingConfig = useAppStore((s) => s[side].firingConfig);
  const attackMode = useAppStore((s) => s.attacker.gameState.attackMode);

  const selectSlotOption = useAppStore((s) => s.selectSlotOption);
  const setVariableSlotCount = useAppStore((s) => s.setVariableSlotCount);
  const setVariableSlotAllocation = useAppStore((s) => s.setVariableSlotAllocation);
  const setDefinitionCount = useAppStore((s) => s.setDefinitionCount);
  const setWeaponFiringCount = useAppStore((s) => s.setWeaponFiringCount);

  const chapter = useAppStore((s) => s[side].chapter);

  const { data } = useFactionData(factionSlug);

  const datasheet =
    data?.datasheets.datasheets.find((d) => {
      if (d.name !== unitName) return false;
      if (!chapter || chapter === 'ADEPTUS ASTARTES') return true;
      const fk = d.factionKeywords.map((k) => k.toUpperCase());
      return fk.includes(chapter);
    }) ?? data?.datasheets.datasheets.find((d) => d.name === unitName);

  if (!datasheet) return null;

  return (
    <Overlay
      isOpen={isOpen}
      onClose={onClose}
      title={isAttacker ? 'Attacker Config' : 'Defender Config'}
    >
      <div className="space-y-4">
        {data && (
          <DetachmentPicker
            detachments={data.rules.detachments}
            value={detachmentName}
            onChange={setDetachment}
          />
        )}

        <UnitConfigurator
          datasheet={datasheet}
          models={models}
          slots={slots}
          firingConfig={firingConfig}
          side={side}
          attackMode={isAttacker ? attackMode : undefined}
          onSlotSelect={(slotId, optionKey) => selectSlotOption(side, slotId, optionKey)}
          onVariableSlotCount={(groupId, count) => setVariableSlotCount(side, groupId, count)}
          onVariableSlotChange={(slotId, optionKey, count) =>
            setVariableSlotAllocation(side, slotId, optionKey, count)
          }
          onDefinitionCount={(defName, count) => setDefinitionCount(side, defName, count)}
          onWeaponFiringCount={(groupId, weaponName, count) =>
            setWeaponFiringCount(side, groupId, weaponName, count)
          }
        />
      </div>
    </Overlay>
  );
}
