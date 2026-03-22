import type { UnitDatasheet } from '../../types/data';
import type { ConfiguredModel, SelectedWeapon } from '../../types/config';
import { StatLine } from '../shared/StatLine';
import { ModelCountSelector } from './ModelCountSelector';
import { WargearConfigurator } from './WargearConfigurator';
import { WeaponSelector } from './WeaponSelector';
import { getAvailableWeapons } from '../../logic/unit-config';

interface Props {
  datasheet: UnitDatasheet;
  models: ConfiguredModel[];
  onModelsChange: (models: ConfiguredModel[]) => void;
  /** Only shown for attacker */
  selectedWeapons?: SelectedWeapon[];
  onWeaponsChange?: (weapons: SelectedWeapon[]) => void;
  side: 'attacker' | 'defender';
  attackMode?: 'ranged' | 'melee';
}

export function UnitConfigurator({
  datasheet,
  models,
  onModelsChange,
  selectedWeapons,
  onWeaponsChange,
  side,
  attackMode = 'ranged',
}: Props) {
  const available = getAvailableWeapons(datasheet, models);

  return (
    <div className="unit-configurator">
      <h3>{datasheet.name}</h3>
      <StatLine stats={datasheet.stats} invulnerableSave={datasheet.invulnerable_save} />

      <div className="unit-keywords">
        {datasheet.keywords.map((k) => (
          <span key={k} className="keyword-badge keyword-unit">
            {k}
          </span>
        ))}
      </div>

      <ModelCountSelector
        definitions={datasheet.model_definitions}
        models={models}
        onChange={onModelsChange}
      />

      <WargearConfigurator datasheet={datasheet} models={models} onChange={onModelsChange} />

      {side === 'attacker' && selectedWeapons && onWeaponsChange && (
        <WeaponSelector
          available={available}
          selected={selectedWeapons}
          onChange={onWeaponsChange}
          attackMode={attackMode}
        />
      )}

      {side === 'defender' && (
        <div className="defender-weapons-info">
          <label>Weapons (for reference)</label>
          {datasheet.weapons.map((w) => (
            <div key={w.name} className="weapon-profile">
              {w.name} — {w.range} | A:{w.A} | S:{w.S} | AP:{w.AP} | D:{w.D}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
