import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Detachment } from '../../types/data';

interface Props {
  detachments: Detachment[];
  value: string | null;
  onChange: (name: string) => void;
}

export function DetachmentPicker({ detachments, value, onChange }: Props) {
  if (detachments.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Detachment
      </label>
      <Select value={value ?? ''} onValueChange={(v) => { if (v) onChange(v); }}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select Detachment" />
        </SelectTrigger>
        <SelectContent>
          {detachments.map((d) => (
            <SelectItem key={d.name} value={d.name}>
              {d.name} ({d.stratagems.length} stratagems)
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
