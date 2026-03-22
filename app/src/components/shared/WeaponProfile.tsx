import type { RawWeapon } from "../../types/data";

interface Props {
  weapon: RawWeapon;
}

export function WeaponProfile({ weapon }: Props) {
  return (
    <div className="weapon-profile">
      <span className="weapon-name">{weapon.name}</span>
      <span className="weapon-stats">
        {weapon.range} | A:{weapon.A} |{" "}
        {weapon.type === "ranged" ? `BS:${weapon.BS}` : `WS:${weapon.WS}`} |
        S:{weapon.S} | AP:{weapon.AP} | D:{weapon.D}
      </span>
      {weapon.keywords.length > 0 && (
        <span className="weapon-keywords">
          [{weapon.keywords.join(", ")}]
        </span>
      )}
    </div>
  );
}
