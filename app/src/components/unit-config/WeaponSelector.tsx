import type { RawWeapon } from "../../types/data";
import type { SelectedWeapon } from "../../types/config";
import { WeaponProfile } from "../shared/WeaponProfile";

interface AvailableWeapon {
  weapon: RawWeapon;
  maxFiringModels: number;
}

interface Props {
  available: AvailableWeapon[];
  selected: SelectedWeapon[];
  onChange: (selected: SelectedWeapon[]) => void;
}

export function WeaponSelector({ available, selected, onChange }: Props) {
  const isSelected = (name: string) =>
    selected.some((s) => s.weapon.name === name);

  const getSelected = (name: string) =>
    selected.find((s) => s.weapon.name === name);

  const toggleWeapon = (weapon: RawWeapon, maxModels: number) => {
    if (isSelected(weapon.name)) {
      onChange(selected.filter((s) => s.weapon.name !== weapon.name));
    } else {
      onChange([
        ...selected,
        {
          weapon,
          firingModelCount: maxModels,
          targetInHalfRange: false,
        },
      ]);
    }
  };

  const setFiringModels = (name: string, count: number) => {
    onChange(
      selected.map((s) =>
        s.weapon.name === name ? { ...s, firingModelCount: count } : s,
      ),
    );
  };

  const setHalfRange = (name: string, value: boolean) => {
    onChange(
      selected.map((s) =>
        s.weapon.name === name ? { ...s, targetInHalfRange: value } : s,
      ),
    );
  };

  return (
    <div className="weapon-selector">
      <label>Weapons</label>
      {available.map(({ weapon, maxFiringModels }) => {
        const sel = getSelected(weapon.name);
        const active = !!sel;

        return (
          <div
            key={weapon.name}
            className={`weapon-row ${active ? "active" : ""}`}
          >
            <label className="weapon-toggle">
              <input
                type="checkbox"
                checked={active}
                onChange={() => toggleWeapon(weapon, maxFiringModels)}
              />
              <WeaponProfile weapon={weapon} />
            </label>
            {active && (
              <div className="weapon-config">
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
                        Math.max(
                          1,
                          Math.min(maxFiringModels, parseInt(e.target.value, 10) || 1),
                        ),
                      )
                    }
                  />
                </label>
                {weapon.type === "ranged" && (
                  <label className="half-range-toggle">
                    <input
                      type="checkbox"
                      checked={sel!.targetInHalfRange}
                      onChange={(e) =>
                        setHalfRange(weapon.name, e.target.checked)
                      }
                    />
                    Half range
                  </label>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
