import { Select } from '@/components/ui/select';
import type { ChartAxisWindowKey } from '@/lib/chart-axis-window';

interface ChartAxisWindowControlsProps {
  value: ChartAxisWindowKey;
  options: Array<{ value: ChartAxisWindowKey; label: string }>;
  onChange: (value: ChartAxisWindowKey) => void;
}

export function ChartAxisWindowControls({
  value,
  options,
  onChange,
}: ChartAxisWindowControlsProps) {
  return (
    <div data-testid="chart-axis-window-controls">
      <label className="flex min-w-[180px] flex-col gap-1 text-sm">
        <span className="font-medium text-muted-foreground">X-axis range</span>
        <Select
          value={value}
          onChange={(event) => onChange(event.target.value as ChartAxisWindowKey)}
          aria-label="X-axis range"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </label>
    </div>
  );
}
