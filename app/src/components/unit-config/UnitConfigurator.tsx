import type { UnitDatasheet } from '../../types/data';
import type { ConfiguredModel, SelectedWeapon } from '../../types/config';
import { StatLine } from '../shared/StatLine';
import { ModelCountSelector } from './ModelCountSelector';
import { WargearConfigurator } from './WargearConfigurator';
import { WeaponSelector } from './WeaponSelector';
import { getAvailableWeapons, isWargearCustomized } from '../../logic/unit-config';

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

  const hasVariableModels = datasheet.model_definitions.some((d) => d.min_models !== d.max_models);
  const hasWargearOptions = datasheet.wargear_options.length > 0;
  const wargearCustomized = hasWargearOptions && isWargearCustomized(datasheet, models);

  const modelSummary = models.map((m) => `${m.count} ${m.definitionName}`).join(', ');

  const selectedWeaponCount = selectedWeapons?.length ?? 0;

  return (
    <div className="unit-configurator">
      <h3>{datasheet.name}</h3>
      <StatLine stats={datasheet.stats} invulnerableSave={datasheet.invulnerable_save} />

      <details className="config-section">
        <summary>Keywords ({datasheet.keywords.length})</summary>
        <div className="config-section-content">
          <div className="unit-keywords">
            {datasheet.keywords.map((k) => (
              <span key={k} className="keyword-badge keyword-unit">
                {k}
              </span>
            ))}
          </div>
        </div>
      </details>

      {hasVariableModels && (
        <details className="config-section">
          <summary>Models · {modelSummary}</summary>
          <div className="config-section-content">
            <ModelCountSelector
              definitions={datasheet.model_definitions}
              models={models}
              onChange={onModelsChange}
            />
          </div>
        </details>
      )}

      {hasWargearOptions && (
        <details className="config-section">
          <summary>
            Wargear Options ({datasheet.wargear_options.length})
            {wargearCustomized && <span className="config-badge">customized</span>}
          </summary>
          <div className="config-section-content">
            <WargearConfigurator datasheet={datasheet} models={models} onChange={onModelsChange} />
          </div>
        </details>
      )}

      {side === 'attacker' && selectedWeapons && onWeaponsChange && (
        <details className="config-section">
          <summary>Weapons ({selectedWeaponCount} selected)</summary>
          <div className="config-section-content">
            <WeaponSelector
              available={available}
              selected={selectedWeapons}
              onChange={onWeaponsChange}
              attackMode={attackMode}
            />
          </div>
        </details>
      )}

      {side === 'defender' && (
        <details className="config-section">
          <summary>Weapons (reference)</summary>
          <div className="config-section-content defender-weapons-info">
            {datasheet.weapons.map((w) => (
              <div key={w.name} className="weapon-profile">
                {w.name} — {w.range} | A:{w.A} | S:{w.S} | AP:{w.AP} | D:{w.D}
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
