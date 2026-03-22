import type { KeyboardEvent } from 'react';
import type { RawWeapon } from '../../types/data';
import type { SelectedWeapon } from '../../types/config';
import { WeaponProfile } from '../shared/WeaponProfile';

interface AvailableWeapon {
  weapon: RawWeapon;
  maxFiringModels: number;
}

interface Props {
  available: AvailableWeapon[];
  selected: SelectedWeapon[];
  onChange: (selected: SelectedWeapon[]) => void;
  attackMode: 'ranged' | 'melee';
}

export function WeaponSelector({ available, selected, onChange, attackMode }: Props) {
  const filtered = available.filter(({ weapon }) => weapon.type === attackMode);

  const isSelected = (name: string) => selected.some((s) => s.weapon.name === name);

  const getSelected = (name: string) => selected.find((s) => s.weapon.name === name);

  const toggleWeapon = (weapon: RawWeapon, maxModels: number) => {
    if (isSelected(weapon.name)) {
      onChange(selected.filter((s) => s.weapon.name !== weapon.name));
    } else {
      onChange([
        ...selected,
        {
          weapon,
          firingModelCount: maxModels,
        },
      ]);
    }
  };

  const setFiringModels = (name: string, count: number) => {
    onChange(selected.map((s) => (s.weapon.name === name ? { ...s, firingModelCount: count } : s)));
  };

  const handleKeyDown = (e: KeyboardEvent, weapon: RawWeapon, maxModels: number) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleWeapon(weapon, maxModels);
    }
  };

  return (
    <div className="weapon-selector">
      <label>Weapons</label>
      {filtered.map(({ weapon, maxFiringModels }) => {
        const sel = getSelected(weapon.name);
        const active = !!sel;

        return (
          <div
            key={weapon.name}
            className={`weapon-row ${active ? 'active' : ''}`}
            onClick={() => toggleWeapon(weapon, maxFiringModels)}
            onKeyDown={(e) => handleKeyDown(e, weapon, maxFiringModels)}
            role="switch"
            aria-checked={active}
            tabIndex={0}
          >
            <div className="weapon-toggle">
              <WeaponProfile weapon={weapon} />
            </div>
            {active && (
              <div className="weapon-config" onClick={(e) => e.stopPropagation()}>
                <label>
                  Models firing:
                  <input
                    type="number"
                    min={1}
                    max={maxFiringModels}
                    value={sel!.firingModelCount}
                    onChange={(e) =>
                      setFiringModels(
                        weapon.name,
                        Math.max(1, Math.min(maxFiringModels, parseInt(e.target.value, 10) || 1))
                      )
                    }
                  />
                </label>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
