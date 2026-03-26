import { useState } from 'react';
import type { UnitDatasheet } from '../../types/data';
import type { ConfiguredModel, WargearSlot, WeaponFiringConfig } from '../../types/config';
import { getGroupWeapons } from '../../logic/wargear-slots';
import { CountStepper } from './CountStepper';
import { WeaponRow } from './WeaponRow';

interface Props {
  group: ConfiguredModel;
  datasheet: UnitDatasheet;
  slots: WargearSlot[];
  firingConfig: WeaponFiringConfig[];
  interactive: boolean;
  attackMode?: 'ranged' | 'melee';
  maxCount: number;
  onCountChange?: (count: number) => void;
  onWeaponCountChange?: (weaponName: string, count: number) => void;
  onSlotSelect?: (slotId: string, optionKey: string | null) => void;
}

export function ModelGroup({
  group,
  datasheet,
  slots,
  firingConfig,
  interactive,
  attackMode,
  maxCount,
  onCountChange,
  onWeaponCountChange,
  onSlotSelect,
}: Props) {
  const [expanded, setExpanded] = useState(group.isBase && group.count > 0);

  const def = datasheet.model_definitions.find((d) => d.name === group.definitionName);
  if (!def) return null;

  const isFixedSingleModel = def.min_models === def.max_models && def.max_models === 1;

  // Get weapons for this group
  const allWeapons = getGroupWeapons(datasheet, def, group.slotSelections, slots);
  const weapons = attackMode
    ? allWeapons.filter((w) => w.type === attackMode)
    : allWeapons;

  // Get slots applicable to this group's definition
  const defSlots = slots.filter(
    (s) => s.definitionName === group.definitionName && s.scope.kind === 'single_model'
  );

  const getFiringCount = (weaponName: string) =>
    firingConfig.find(
      (fc) => fc.groupId === group.groupId && fc.weaponName === weaponName
    )?.firingModelCount ?? group.count;

  if (group.count === 0 && !group.isBase) return null;

  return (
    <div className={`model-group ${!group.isBase ? 'model-group--variant' : ''}`}>
      <div
        className="model-group-header"
        onClick={() => setExpanded(!expanded)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setExpanded(!expanded);
          }
        }}
      >
        <span className="model-group-name">{group.definitionName}</span>

        {isFixedSingleModel && group.isBase ? (
          <span className="model-group-count-fixed">{group.count}</span>
        ) : interactive && onCountChange ? (
          <CountStepper
            value={group.count}
            min={0}
            max={maxCount}
            onChange={onCountChange}
          />
        ) : (
          <span className="model-group-count-fixed">{group.count}</span>
        )}

        <button
          type="button"
          className={`chevron-btn ${expanded ? 'chevron-open' : ''}`}
          tabIndex={-1}
        >
          &#x25BE;
        </button>
      </div>

      {expanded && (
        <div className="model-group-body">
          {/* Per-option dropdowns for single_model slots */}
          {interactive && group.isBase && defSlots.length > 0 && (
            <div className="slot-controls">
              {defSlots.map((slot) => {
                const currentSel = group.slotSelections.find(
                  (s) => s.slotId === slot.slotId
                );
                return (
                  <div key={slot.slotId} className="slot-dropdown-row">
                    <span className="slot-label" title={slot.raw}>
                      {slot.type === 'replace'
                        ? `Replace ${slot.replaces.join(', ')}`
                        : 'Add'}
                    </span>
                    <select
                      className="slot-select"
                      value={currentSel?.optionKey ?? ''}
                      onChange={(e) =>
                        onSlotSelect?.(slot.slotId, e.target.value || null)
                      }
                    >
                      <option value="">
                        {slot.type === 'replace'
                          ? `Keep ${slot.replaces.join(', ')}`
                          : 'None'}
                      </option>
                      {slot.options.map((opt) => {
                        const key = `${opt.optionIndex}:${opt.choiceIndex}`;
                        return (
                          <option key={key} value={key}>
                            {opt.label}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                );
              })}
            </div>
          )}

          {/* Weapons */}
          {weapons.map((weapon) => (
            <WeaponRow
              key={weapon.name}
              weapon={weapon}
              firingCount={interactive ? getFiringCount(weapon.name) : undefined}
              maxFiringCount={group.count}
              onFiringCountChange={
                interactive
                  ? (count) => onWeaponCountChange?.(weapon.name, count)
                  : undefined
              }
              readOnly={!interactive}
            />
          ))}
        </div>
      )}
    </div>
  );
}
