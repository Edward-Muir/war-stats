import type { RawWeapon } from '../../types/data';

interface Props {
  weapon: RawWeapon;
}

export function WeaponProfile({ weapon }: Props) {
  return (
    <div className="space-y-0.5">
      <span className="block font-bold text-foreground">{weapon.name}</span>
      <span className="block text-[0.8125rem] text-muted-foreground">
        {weapon.range} | A:{weapon.A} |{' '}
        {weapon.type === 'ranged' ? `BS:${weapon.BS}` : `WS:${weapon.WS}`} | S:{weapon.S} | AP:
        {weapon.AP} | D:{weapon.D}
      </span>
      {weapon.keywords.length > 0 && (
        <span className="block text-[0.8125rem] text-[var(--keyword-weapon-fg)]">
          [{weapon.keywords.join(', ')}]
        </span>
      )}
    </div>
  );
}
