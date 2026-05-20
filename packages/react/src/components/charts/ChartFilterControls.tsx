import { useMemo } from 'react';
import type { ChartFilterConfig, Operation } from '@uigen-dev/core';
import {
  ChartDateTimePresets,
  ChartFilterStateResolver,
  ListResponseExtractor,
} from '@uigen-dev/core';
import { useApp } from '@/contexts/AppContext';
import { useApiCall } from '@/hooks/useApiCall';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import {
  humanizeChartLabel,
  resolveRefDisplayFields,
  resolveRefListOperation,
} from '@/lib/chart-ref-options';

interface ChartFilterControlsProps {
  filters: ChartFilterConfig[];
  listOp?: Operation;
  filterState: Record<string, string>;
  onFilterChange: (filter: ChartFilterConfig, value: string) => void;
  onReset: () => void;
}

export function ChartFilterControls({
  filters,
  listOp,
  filterState,
  onFilterChange,
  onReset,
}: ChartFilterControlsProps) {
  const hasActiveFilters = filters.some((filter) => {
    const value = ChartFilterStateResolver.getValue(filterState, filter);
    return value !== '' && value !== filter.default;
  });

  return (
    <div className="flex flex-wrap items-end gap-4" data-testid="chart-filter-controls">
      {filters.map((filter) => (
        <ChartFilterControl
          key={`${filter.type}-${filter.param}`}
          filter={filter}
          listOp={listOp}
          value={ChartFilterStateResolver.getValue(filterState, filter)}
          onChange={(value) => onFilterChange(filter, value)}
        />
      ))}
      {hasActiveFilters && (
        <Button type="button" variant="ghost" size="sm" onClick={onReset}>
          Reset filters
        </Button>
      )}
    </div>
  );
}

interface ChartFilterControlProps {
  filter: ChartFilterConfig;
  listOp?: Operation;
  value: string;
  onChange: (value: string) => void;
}

function ChartFilterControl({ filter, listOp, value, onChange }: ChartFilterControlProps) {
  const label = humanizeChartLabel(filter.field || filter.param);

  switch (filter.type) {
    case 'ref':
      return (
        <RefChartFilter
          filter={filter}
          label={label}
          value={value}
          onChange={onChange}
        />
      );
    case 'datetime-range':
      return (
        <DateTimeRangeChartFilter
          filter={filter}
          label={label}
          value={value}
          onChange={onChange}
        />
      );
    case 'select':
      return (
        <SelectChartFilter
          filter={filter}
          listOp={listOp}
          label={label}
          value={value}
          onChange={onChange}
        />
      );
    case 'number':
      return (
        <NumberChartFilter
          label={label}
          value={value}
          onChange={onChange}
        />
      );
    default:
      return null;
  }
}

interface LabeledFilterProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

function RefChartFilter({
  filter,
  label,
  value,
  onChange,
}: LabeledFilterProps & { filter: ChartFilterConfig }) {
  const { config } = useApp();
  const refResource = config.resources.find((resource) => resource.slug === filter.resource);
  const refListOp = resolveRefListOperation(refResource);
  const { data, isLoading } = useApiCall({
    operation: refListOp,
    enabled: !!refListOp,
  });

  const options = useMemo(() => {
    if (!data || !refResource) {
      return [];
    }

    const rows = ListResponseExtractor.extract(data, {
      listResponseSchema: refListOp?.responses?.['200']?.schema,
    }) as Record<string, unknown>[];
    const { valueField, labelField } = resolveRefDisplayFields(refResource);

    return rows.map((row) => ({
      value: String(row[valueField] ?? ''),
      label: String(row[labelField] ?? row[valueField] ?? ''),
    }));
  }, [data, refListOp?.responses, refResource]);

  return (
    <label className="flex min-w-[180px] flex-col gap-1 text-sm">
      <span className="font-medium text-muted-foreground">{label}</span>
      <Select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={isLoading || !refResource}
        aria-label={label}
      >
        <option value="">All</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
    </label>
  );
}

function DateTimeRangeChartFilter({
  filter,
  label,
  value,
  onChange,
}: LabeledFilterProps & { filter: ChartFilterConfig }) {
  const presets = filter.presets?.length
    ? ChartDateTimePresets.getPresetOptions(filter.presets)
    : ChartDateTimePresets.getPresetOptions(['last_24h', 'last_7d', 'last_30d']);

  return (
    <label className="flex min-w-[180px] flex-col gap-1 text-sm">
      <span className="font-medium text-muted-foreground">{label}</span>
      <Select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={label}
      >
        <option value="">All time</option>
        {presets.map((preset) => (
          <option key={preset.value} value={preset.value}>
            {preset.label}
          </option>
        ))}
      </Select>
    </label>
  );
}

function SelectChartFilter({
  filter,
  listOp,
  label,
  value,
  onChange,
}: LabeledFilterProps & { filter: ChartFilterConfig; listOp?: Operation }) {
  const options = useMemo(() => {
    const parameter = listOp?.parameters.find(
      (entry) => entry.in === 'query' && entry.name === filter.param,
    );

    return parameter?.schema?.enumValues ?? [];
  }, [filter.param, listOp?.parameters]);

  return (
    <label className="flex min-w-[180px] flex-col gap-1 text-sm">
      <span className="font-medium text-muted-foreground">{label}</span>
      <Select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={label}
      >
        <option value="">All</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </Select>
    </label>
  );
}

function NumberChartFilter({ label, value, onChange }: LabeledFilterProps) {
  return (
    <label className="flex min-w-[180px] flex-col gap-1 text-sm">
      <span className="font-medium text-muted-foreground">{label}</span>
      <input
        type="number"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={label}
        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      />
    </label>
  );
}
