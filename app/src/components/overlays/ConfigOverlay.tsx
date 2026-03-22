import { Overlay } from '../layout/Overlay';
import { DetachmentPicker } from '../faction/DetachmentPicker';
import { UnitConfigurator } from '../unit-config/UnitConfigurator';
import { StratagemPicker } from '../game-state/StratagemPicker';
import { useAppStore } from '../../store/store';
import { useFactionData } from '../../data/hooks';
import { filterAttackerStratagems, filterDefenderStratagems } from '../../logic/stratagems';

interface Props {
  side: 'attacker' | 'defender';
  isOpen: boolean;
  onClose: () => void;
}

export function ConfigOverlay({ side, isOpen, onClose }: Props) {
  const isAttacker = side === 'attacker';

  const factionSlug = useAppStore((s) =>
    isAttacker ? s.attacker.factionSlug : s.defender.factionSlug
  );
  const unitName = useAppStore((s) => (isAttacker ? s.attacker.unitName : s.defender.unitName));
  const detachmentName = useAppStore((s) =>
    isAttacker ? s.attacker.detachmentName : s.defender.detachmentName
  );
  const setDetachment = useAppStore((s) =>
    isAttacker ? s.setAttackerDetachment : s.setDefenderDetachment
  );
  const models = useAppStore((s) => (isAttacker ? s.attacker.models : s.defender.models));
  const setModels = useAppStore((s) => (isAttacker ? s.setAttackerModels : s.setDefenderModels));
  const selectedWeapons = useAppStore((s) => (isAttacker ? s.attacker.selectedWeapons : undefined));
  const setWeapons = useAppStore((s) => (isAttacker ? s.setAttackerSelectedWeapons : undefined));
  const activeStratagems = useAppStore((s) =>
    isAttacker ? s.attacker.activeStratagems : s.defender.activeStratagems
  );
  const toggleStratagem = useAppStore((s) =>
    isAttacker ? s.toggleAttackerStratagem : s.toggleDefenderStratagem
  );
  const attackMode = useAppStore((s) => s.attacker.gameState.attackMode);

  const chapter = useAppStore((s) => (isAttacker ? s.attacker.chapter : s.defender.chapter));

  const { data } = useFactionData(factionSlug);

  // When a chapter is selected, prefer the chapter-specific variant of a unit
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
        onModelsChange={setModels}
        selectedWeapons={selectedWeapons}
        onWeaponsChange={setWeapons}
        side={side}
        attackMode={isAttacker ? attackMode : undefined}
      />

      {applicableStratagems.length > 0 && (
        <StratagemPicker
          available={applicableStratagems}
          active={activeStratagems}
          onToggle={toggleStratagem}
        />
      )}
    </Overlay>
  );
}
