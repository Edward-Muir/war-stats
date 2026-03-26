import type { UnitDatasheet } from '../../types/data';
import { StatLine } from '../shared/StatLine';

interface Props {
  datasheet: UnitDatasheet;
}

export function UnitInfoCard({ datasheet }: Props) {
  const abilities = datasheet.abilities;
  const coreAbilities = abilities.core;
  const otherAbilities = abilities.other;
  const damaged = abilities.damaged;
  const damagedDescription = abilities.damaged_description;

  return (
    <details className="config-section unit-info-card" open>
      <summary>
        <span className="unit-info-name">{datasheet.name}</span>
        {datasheet.composition.points.length > 0 && (
          <span className="unit-info-points">
            {datasheet.composition.points[0].points} pts
          </span>
        )}
      </summary>
      <div className="config-section-content">
        <div className="unit-info-stats">
          <StatLine stats={datasheet.stats} invulnerableSave={datasheet.invulnerable_save} />
        </div>

        {otherAbilities.map((ability) => (
          <div key={ability.name} className="unit-ability">
            <strong>{ability.name}</strong>
            <p>{ability.description}</p>
          </div>
        ))}

        {damaged && damagedDescription && (
          <div className="unit-ability unit-ability--damaged">
            <strong>{damaged}</strong>
            <p>{damagedDescription}</p>
          </div>
        )}

        {coreAbilities.length > 0 && (
          <div className="unit-ability-badges">
            {coreAbilities.map((a) => (
              <span key={a} className="keyword-badge keyword-ability">
                {a}
              </span>
            ))}
          </div>
        )}

        <details className="config-section config-section--nested">
          <summary>Keywords</summary>
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
      </div>
    </details>
  );
}
