import { useMemo } from 'react';
import { Overlay } from '../layout/Overlay';
import { UnitPicker } from '../faction/UnitPicker';
import { useAppStore } from '../../store/store';
import { useFactionData } from '../../data/hooks';
import type { UnitDatasheet } from '../../types/data';

function filterByChapter(units: UnitDatasheet[], chapter: string | null): UnitDatasheet[] {
  if (!chapter) return units;
  if (chapter === 'ADEPTUS ASTARTES') {
    // "Other Chapters" — only generic units with no chapter-specific keyword
    return units.filter((u) => {
      const fk = u.factionKeywords.map((k) => k.toUpperCase());
      return fk.length === 1 && fk[0] === 'ADEPTUS ASTARTES';
    });
  }
  // Chapter selected — show units with this chapter keyword OR generic-only
  return units.filter((u) => {
    const fk = u.factionKeywords.map((k) => k.toUpperCase());
    return fk.includes(chapter) || (fk.length === 1 && fk[0] === 'ADEPTUS ASTARTES');
  });
}

interface Props {
  side: 'attacker' | 'defender';
  isOpen: boolean;
  onClose: () => void;
}

export function UnitOverlay({ side, isOpen, onClose }: Props) {
  const isAttacker = side === 'attacker';

  const factionSlug = useAppStore((s) =>
    isAttacker ? s.attacker.factionSlug : s.defender.factionSlug
  );
  const chapter = useAppStore((s) => (isAttacker ? s.attacker.chapter : s.defender.chapter));
  const setUnit = useAppStore((s) => (isAttacker ? s.setAttackerUnit : s.setDefenderUnit));

  const { data } = useFactionData(factionSlug);

  const units = useMemo(
    () => (data ? filterByChapter(data.datasheets.datasheets, chapter) : []),
    [data, chapter]
  );

  if (!data) return null;

  return (
    <Overlay
      isOpen={isOpen}
      onClose={onClose}
      title={isAttacker ? 'Select Attacker Unit' : 'Select Defender Unit'}
    >
      <UnitPicker
        units={units}
        onChange={(name) => {
          setUnit(name);
          onClose();
        }}
      />
    </Overlay>
  );
}
