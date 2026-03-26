import { Overlay } from '../layout/Overlay';
import { FactionPicker } from '../faction/FactionPicker';
import { useAppStore } from '../../store/store';

interface Props {
  side: 'attacker' | 'defender';
  isOpen: boolean;
  onClose: () => void;
}

export function FactionOverlay({ side, isOpen, onClose }: Props) {
  const isAttacker = side === 'attacker';

  const setFaction = useAppStore((s) => (isAttacker ? s.setAttackerFaction : s.setDefenderFaction));
  const loadFaction = useAppStore((s) => s.loadFaction);

  return (
    <Overlay
      isOpen={isOpen}
      onClose={onClose}
      title={isAttacker ? 'Attacking Faction' : 'Defending Faction'}
    >
      <FactionPicker
        label={isAttacker ? 'Attacking Faction' : 'Defending Faction'}
        onChange={(slug, chapterKeyword) => {
          setFaction(slug, chapterKeyword);
          loadFaction(slug);
          onClose();
        }}
      />
    </Overlay>
  );
}
