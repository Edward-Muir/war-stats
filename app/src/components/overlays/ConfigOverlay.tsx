import { Overlay } from '../layout/Overlay';
import { DetachmentPicker } from '../faction/DetachmentPicker';
import { UnitConfigurator } from '../unit-config/UnitConfigurator';
import { StratagemPicker } from '../game-state/StratagemPicker';
import { useAppStore } from '../../store/store';
import { useFactionData } from '../../data/hooks';
import { filterAttackerStratagems, filterDefenderStratagems } from '../../logic/stratagems';
import type { WargearSlot, WeaponFiringConfig } from '../../types/config';

interface Props {
  side: 'attacker' | 'defender';
  isOpen: boolean;
  onClose: () => void;
}

const EMPTY_SLOTS: WargearSlot[] = [];
const EMPTY_FIRING_CONFIG: WeaponFiringConfig[] = [];

export function ConfigOverlay({ side, isOpen, onClose }: Props) {
  const isAttacker = side === 'attacker';

  const factionSlug = useAppStore((s) =>
    isAttacker ? s.attacker.factionSlug : s.defender.factionSlug,
  );
  const unitName = useAppStore((s) => (isAttacker ? s.attacker.unitName : s.defender.unitName));
  const detachmentName = useAppStore((s) =>
    isAttacker ? s.attacker.detachmentName : s.defender.detachmentName,
  );
  const setDetachment = useAppStore((s) =>
    isAttacker ? s.setAttackerDetachment : s.setDefenderDetachment,
  );
  const models = useAppStore((s) => (isAttacker ? s.attacker.models : s.defender.models));
  const slots = useAppStore((s) => (isAttacker ? s.attacker.slots : EMPTY_SLOTS));
  const firingConfig = useAppStore((s) =>
    isAttacker ? s.attacker.firingConfig : EMPTY_FIRING_CONFIG,
  );
  const activeStratagems = useAppStore((s) =>
    isAttacker ? s.attacker.activeStratagems : s.defender.activeStratagems,
  );
  const toggleStratagem = useAppStore((s) =>
    isAttacker ? s.toggleAttackerStratagem : s.toggleDefenderStratagem,
  );
  const attackMode = useAppStore((s) => s.attacker.gameState.attackMode);

  const selectSlotOption = useAppStore((s) => s.selectSlotOption);
  const setVariableSlotCount = useAppStore((s) => s.setVariableSlotCount);
  const setVariableSlotAllocation = useAppStore((s) => s.setVariableSlotAllocation);
  const setDefinitionCount = useAppStore((s) => s.setDefinitionCount);
  const setWeaponFiringCount = useAppStore((s) => s.setWeaponFiringCount);

  const chapter = useAppStore((s) => (isAttacker ? s.attacker.chapter : s.defender.chapter));

  const { data } = useFactionData(factionSlug);

  const datasheet =
    data?.datasheets.datasheets.find((d) => {
      if (d.name !== unitName) return false;
      if (!chapter || chapter === 'ADEPTUS ASTARTES') return true;
      const fk = d.faction_keywords.map((k) => k.toUpperCase());
      return fk.includes(chapter);
    }) ?? data?.datasheets.datasheets.find((d) => d.name === unitName);
  const detachment = data?.rules.detachments.find((d) => d.name === detachmentName);

  const applicableStratagems =
    detachment && datasheet
      ? isAttacker
        ? filterAttackerStratagems(detachment, datasheet)
        : filterDefenderStratagems(detachment, datasheet)
      : [];

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
          onSlotSelect={isAttacker ? selectSlotOption : undefined}
          onVariableSlotCount={isAttacker ? setVariableSlotCount : undefined}
          onVariableSlotChange={isAttacker ? setVariableSlotAllocation : undefined}
          onDefinitionCount={isAttacker ? setDefinitionCount : undefined}
          onWeaponFiringCount={isAttacker ? setWeaponFiringCount : undefined}
        />

        {applicableStratagems.length > 0 && (
          <StratagemPicker
            available={applicableStratagems}
            active={activeStratagems}
            onToggle={toggleStratagem}
          />
        )}
      </div>
    </Overlay>
  );
}
