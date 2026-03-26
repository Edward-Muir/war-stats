import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';
import type { UnitDatasheet } from '../../types/data';
import type { ConfiguredModel, WargearSlot, WeaponFiringConfig } from '../../types/config';
import { getGroupWeapons } from '../../logic/wargear-slots';
import { CountStepper } from './CountStepper';
import { WeaponRow } from './WeaponRow';

interface Props {
  group: ConfiguredModel;
  allModels: ConfiguredModel[];
  datasheet: UnitDatasheet;
  slots: WargearSlot[];
  firingConfig: WeaponFiringConfig[];
  interactive: boolean;
  attackMode?: 'ranged' | 'melee';
  maxCount: number;
  onCountChange?: (count: number) => void;
  onWeaponCountChange?: (weaponName: string, count: number) => void;
  onSlotSelect?: (slotId: string, optionKey: string | null) => void;
  onVariableSlotChange?: (slotId: string, optionKey: string, count: number) => void;
}

export function ModelGroup({
  group,
  allModels,
  datasheet,
  slots,
  firingConfig,
  interactive,
  attackMode,
  maxCount,
  onCountChange,
  onWeaponCountChange,
  onSlotSelect,
  onVariableSlotChange,
}: Props) {
  const [expanded, setExpanded] = useState(group.isBase && group.count > 0);

  const def = datasheet.model_definitions.find((d) => d.name === group.definitionName);
  if (!def) return null;

  const isFixedSingleModel = def.min_models === def.max_models && def.max_models === 1;

  const allWeapons = getGroupWeapons(datasheet, def, group.slotSelections, slots);
  const weapons = attackMode ? allWeapons.filter((w) => w.type === attackMode) : allWeapons;

  const defSlots = slots.filter(
    (s) => s.definitionName === group.definitionName && s.scope.kind === 'single_model',
  );

  const variableSlots = slots.filter(
    (s) => s.definitionName === group.definitionName && s.scope.kind === 'variable_count',
  );

  const allOrNothingSlots = slots.filter(
    (s) => s.definitionName === group.definitionName && s.scope.kind === 'all_or_nothing',
  );

  const getFiringCount = (weaponName: string) =>
    firingConfig.find((fc) => fc.groupId === group.groupId && fc.weaponName === weaponName)
      ?.firingModelCount ?? group.count;

  if (group.count === 0 && !group.isBase) return null;

  return (
    <Collapsible open={expanded} onOpenChange={setExpanded}>
      <Card className={cn('mb-2 overflow-hidden', !group.isBase && 'border-l-[3px] border-l-input')}>
        <CollapsibleTrigger className="flex w-full cursor-pointer items-center gap-2 px-3 py-2.5 min-h-11 text-left">
          <span className="flex-1 text-sm font-semibold text-foreground">
            {group.definitionName}
          </span>

          {isFixedSingleModel && group.isBase ? (
            <span className="text-sm font-semibold text-muted-foreground tabular-nums">
              {group.count}
            </span>
          ) : interactive && onCountChange ? (
            <CountStepper value={group.count} min={0} max={maxCount} onChange={onCountChange} />
          ) : (
            <span className="text-sm font-semibold text-muted-foreground tabular-nums">
              {group.count}
            </span>
          )}

          <ChevronDown
            className={cn(
              'h-4 w-4 text-muted-foreground transition-transform',
              expanded && 'rotate-180',
            )}
          />
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-3 pb-3 space-y-2">
            {interactive && group.isBase && defSlots.length > 0 && (
              <div className="space-y-2">
                {defSlots.map((slot) => {
                  const currentSel = group.slotSelections.find((s) => s.slotId === slot.slotId);
                  return (
                    <div key={slot.slotId} className="space-y-1">
                      <span className="text-xs text-muted-foreground" title={slot.raw}>
                        {slot.type === 'replace'
                          ? `Replace ${slot.replaces.join(', ')}`
                          : 'Add'}
                      </span>
                      <Select
                        value={currentSel?.optionKey ?? ''}
                        onValueChange={(v) => onSlotSelect?.(slot.slotId, v || null)}
                      >
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue
                            placeholder={
                              slot.type === 'replace'
                                ? `Keep ${slot.replaces.join(', ')}`
                                : 'None'
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {slot.options.map((opt) => {
                            const key = `${opt.optionIndex}:${opt.choiceIndex}`;
                            return (
                              <SelectItem key={key} value={key}>
                                {opt.label}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                  );
                })}
              </div>
            )}

            {/* all_or_nothing slot dropdowns */}
            {interactive && group.isBase && allOrNothingSlots.length > 0 && (
              <div className="space-y-2">
                {allOrNothingSlots.map((slot) => {
                  const currentSel = group.slotSelections.find((s) => s.slotId === slot.slotId);
                  return (
                    <div key={slot.slotId} className="space-y-1">
                      <span className="text-xs text-muted-foreground" title={slot.raw}>
                        {slot.type === 'replace'
                          ? `Replace ${slot.replaces.join(', ')} (all models)`
                          : 'Add (all models)'}
                      </span>
                      <Select
                        value={currentSel?.optionKey ?? ''}
                        onValueChange={(v) => onSlotSelect?.(slot.slotId, v || null)}
                      >
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue
                            placeholder={
                              slot.type === 'replace'
                                ? `Keep ${slot.replaces.join(', ')}`
                                : 'None'
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {slot.options.map((opt) => {
                            const key = `${opt.optionIndex}:${opt.choiceIndex}`;
                            return (
                              <SelectItem key={key} value={key}>
                                {opt.label}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                  );
                })}
              </div>
            )}

            {/* variable_count slot steppers */}
            {interactive && group.isBase && variableSlots.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">Wargear Options</span>
                {variableSlots.map((slot) => {
                  const slotMaxCount = slot.scope.kind === 'variable_count' ? slot.scope.maxCount : 0;
                  // Find existing variant group for this slot
                  const variantGroup = allModels.find(
                    (m) => !m.isBase && m.slotSelections.some((s) => s.slotId === slot.slotId)
                  );
                  const currentCount = variantGroup?.count ?? 0;

                  if (slot.options.length === 1) {
                    // Single choice: label + stepper
                    const opt = slot.options[0];
                    const optionKey = `${opt.optionIndex}:${opt.choiceIndex}`;
                    return (
                      <div key={slot.slotId} className="flex items-center gap-2">
                        <span className="flex-1 text-xs text-foreground truncate" title={slot.raw}>
                          {opt.label}
                        </span>
                        <CountStepper
                          value={currentCount}
                          min={0}
                          max={slotMaxCount}
                          onChange={(count) => onVariableSlotChange?.(slot.slotId, optionKey, count)}
                        />
                      </div>
                    );
                  }

                  // Multiple choices: dropdown + stepper
                  const selectedOptKey = variantGroup?.slotSelections.find(
                    (s) => s.slotId === slot.slotId
                  )?.optionKey;

                  return (
                    <div key={slot.slotId} className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Select
                          value={selectedOptKey ?? ''}
                          onValueChange={(v) => {
                            if (v && currentCount > 0) {
                              onVariableSlotChange?.(slot.slotId, v, currentCount);
                            } else if (v) {
                              onVariableSlotChange?.(slot.slotId, v, 1);
                            }
                          }}
                        >
                          <SelectTrigger className="h-8 text-xs flex-1">
                            <SelectValue placeholder={`Choose (max ${slotMaxCount})`} />
                          </SelectTrigger>
                          <SelectContent>
                            {slot.options.map((opt) => {
                              const key = `${opt.optionIndex}:${opt.choiceIndex}`;
                              return (
                                <SelectItem key={key} value={key}>
                                  {opt.label}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                        <CountStepper
                          value={currentCount}
                          min={0}
                          max={slotMaxCount}
                          onChange={(count) => {
                            const key = selectedOptKey ?? `${slot.options[0].optionIndex}:${slot.options[0].choiceIndex}`;
                            onVariableSlotChange?.(slot.slotId, key, count);
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

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
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
