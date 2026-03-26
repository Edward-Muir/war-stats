import { useState } from 'react';
import type { RawWeapon } from '../../types/data';
import { CountStepper } from './CountStepper';

interface Props {
  weapon: RawWeapon;
  /** Count mode: show +/- stepper for firing count */
  firingCount?: number;
  maxFiringCount?: number;
  onFiringCountChange?: (count: number) => void;
  /** Checkbox mode: show enable/disable checkbox */
  enabled?: boolean;
  onToggle?: () => void;
  /** Read-only mode: no interaction */
  readOnly?: boolean;
}

export function WeaponRow({
  weapon,
  firingCount,
  maxFiringCount = 0,
  onFiringCountChange,
  enabled,
  onToggle,
  readOnly,
}: Props) {
  const [expanded, setExpanded] = useState(false);

  const hasCheckbox = enabled !== undefined && onToggle;
  const hasStepper = firingCount !== undefined && onFiringCountChange;
  const showKeywords = weapon.keywords.length > 0;

  return (
    <div className={`weapon-row-v2 ${expanded ? 'expanded' : ''}`}>
      <div
        className="weapon-row-header"
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
        <span className="weapon-row-name">{weapon.name}</span>

        {hasCheckbox && !readOnly && (
          <label
            className="weapon-checkbox"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              type="checkbox"
              checked={enabled}
              onChange={onToggle}
            />
          </label>
        )}

        {hasStepper && !readOnly && (
          <CountStepper
            value={firingCount}
            min={0}
            max={maxFiringCount}
            onChange={onFiringCountChange}
          />
        )}

        <button
          type="button"
          className={`chevron-btn ${expanded ? 'chevron-open' : ''}`}
          tabIndex={-1}
          aria-label={expanded ? 'Collapse' : 'Expand'}
        >
          &#x25BE;
        </button>
      </div>

      {expanded && (
        <div className="weapon-row-details">
          <div className="weapon-stat-line">
            <span>Range: {weapon.range}</span>
            {showKeywords && (
              <span>Keywords: {weapon.keywords.join(', ')}</span>
            )}
          </div>
          <div className="weapon-stat-line">
            <span>A: {weapon.A}</span>
            <span>{weapon.type === 'ranged' ? `BS: ${weapon.BS}` : `WS: ${weapon.WS}`}</span>
            <span>S: {weapon.S}</span>
            <span>AP: {weapon.AP}</span>
            <span>D: {weapon.D}</span>
          </div>
          {showKeywords && (
            <div className="weapon-keyword-badges">
              {weapon.keywords.map((kw) => (
                <span key={kw} className="keyword-badge keyword-weapon">
                  {kw}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
