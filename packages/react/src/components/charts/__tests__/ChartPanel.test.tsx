import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChartPanel } from '../ChartPanel';
import type { ChartConfig, UIGenApp } from '@uigen-dev/core';
import { AppProvider } from '@/contexts/AppContext';

vi.mock('@/hooks/useApiCall', () => ({
  useApiCall: vi.fn(),
}));

const chartConfig: ChartConfig = {
  chartType: 'line',
  xAxis: 'recorded_at',
  yAxis: 'value',
  options: { title: 'Telemetry' },
  filters: [
    {
      param: 'sensor_id',
      field: 'sensor_id',
      type: 'ref',
      resource: 'sensors',
    },
  ],
};

const mockConfig: UIGenApp = {
  meta: { title: 'Test', version: '1.0.0' },
  resources: [
    {
      name: 'Sensors',
      slug: 'sensors',
      uigenId: 'sensors',
      operations: [
        {
          id: 'listSensors',
          method: 'GET',
          path: '/sensors',
          viewHint: 'list',
          parameters: [],
          responses: {
            '200': {
              schema: {
                type: 'array',
                key: 'sensors',
                label: 'Sensors',
                required: false,
                items: {
                  type: 'object',
                  key: 'Sensor',
                  label: 'Sensor',
                  required: false,
                  children: [
                    { type: 'integer', key: 'id', label: 'ID', required: true },
                    { type: 'string', key: 'name', label: 'Name', required: true },
                  ],
                },
              },
            },
          },
        },
      ],
      schema: {
        type: 'object',
        key: 'sensor',
        label: 'Sensor',
        required: false,
        children: [
          { type: 'integer', key: 'id', label: 'ID', required: true },
          { type: 'string', key: 'name', label: 'Name', required: true },
        ],
      },
      relationships: [],
    },
  ],
  auth: { schemes: [], globalRequired: false },
  dashboard: { resources: [] },
  servers: [],
};

describe('ChartPanel', () => {
  beforeEach(async () => {
    const { useApiCall } = await import('@/hooks/useApiCall');
    vi.mocked(useApiCall).mockReturnValue({
      data: [{ id: 1, name: 'Temperature' }, { id: 2, name: 'Humidity' }],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      isError: false,
      isSuccess: true,
    } as any);
  });

  it('renders filter controls and chart title', () => {
    render(
      <AppProvider config={mockConfig}>
        <ChartPanel
          chartConfig={chartConfig}
          data={[
            { recorded_at: '2026-01-01T00:00:00Z', value: 10 },
          ]}
          filterState={{}}
          onFilterChange={vi.fn()}
          onResetFilters={vi.fn()}
        />
      </AppProvider>,
    );

    expect(screen.getByTestId('chart-panel')).toBeInTheDocument();
    expect(screen.getByTestId('chart-filter-controls')).toBeInTheDocument();
    expect(screen.getByText('Telemetry')).toBeInTheDocument();
    expect(screen.getByLabelText('Sensor Id')).toBeInTheDocument();
    expect(screen.getByLabelText('X-axis range')).toBeInTheDocument();
  });

  it('calls onFilterChange when a ref filter changes', () => {
    const onFilterChange = vi.fn();

    render(
      <AppProvider config={mockConfig}>
        <ChartPanel
          chartConfig={chartConfig}
          data={[
            { recorded_at: '2026-01-01T00:00:00Z', value: 10 },
          ]}
          filterState={{}}
          onFilterChange={onFilterChange}
          onResetFilters={vi.fn()}
        />
      </AppProvider>,
    );

    fireEvent.change(screen.getByLabelText('Sensor Id'), {
      target: { value: '2' },
    });

    expect(onFilterChange).toHaveBeenCalledWith(
      expect.objectContaining({ param: 'sensor_id' }),
      '2',
    );
  });

  it('narrows the visible chart when the x-axis window changes', () => {
    render(
      <AppProvider config={mockConfig}>
        <ChartPanel
          chartConfig={chartConfig}
          itemSchema={{
            type: 'object',
            key: 'Reading',
            label: 'Reading',
            required: false,
            children: [
              { type: 'string', key: 'recorded_at', label: 'Recorded At', required: true, format: 'date-time' },
              { type: 'number', key: 'value', label: 'Value', required: true },
            ],
          }}
          data={[
            { recorded_at: '2026-01-01T00:00:00.000Z', value: 1 },
            { recorded_at: '2026-01-01T06:00:00.000Z', value: 2 },
            { recorded_at: '2026-01-01T18:00:00.000Z', value: 3 },
            { recorded_at: '2026-01-01T23:00:00.000Z', value: 4 },
          ]}
          filterState={{}}
          onFilterChange={vi.fn()}
          onResetFilters={vi.fn()}
        />
      </AppProvider>,
    );

    fireEvent.change(screen.getByLabelText('X-axis range'), {
      target: { value: '6h' },
    });

    expect(screen.getByText('Showing 2 of 4 points in selected range')).toBeInTheDocument();
  });
});
