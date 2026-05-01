import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AnnotationEditor } from '../AnnotationEditor.js';
import { AppProvider } from '../../../contexts/AppContext.js';
import type { AnnotationMetadata } from '../../../types/index.js';

/**
 * Tests for Chart annotation integration in AnnotationEditor
 * 
 * Requirements: 1.1-1.5, 2.1-2.5, 14.1-14.5
 */
describe('AnnotationEditor - Chart Integration', () => {
  const mockHandlers = {
    loadConfig: vi.fn(),
    saveConfig: vi.fn(),
    loadSpec: vi.fn(),
    loadAnnotations: vi.fn(),
    loadCss: vi.fn(),
    saveCss: vi.fn()
  };

  const chartAnnotation: AnnotationMetadata = {
    name: 'x-uigen-chart',
    description: 'Configures data visualization as charts for array fields',
    targetType: 'field',
    parameterSchema: {
      type: 'object',
      properties: {
        chartType: { type: 'string' },
        xAxis: { type: 'string' },
        yAxis: { type: 'string' }
      }
    },
    examples: [],
    applicableWhen: {
      type: 'array'
    }
  };

  const mockFieldNode = {
    type: 'array',
    key: 'dataPoints',
    label: 'Data Points',
    children: [
      {
        type: 'object',
        key: 'item',
        label: 'Item',
        children: [
          {
            type: 'string',
            key: 'date',
            label: 'Date',
            format: 'date-time'
          },
          {
            type: 'number',
            key: 'value',
            label: 'Value'
          },
          {
            type: 'string',
            key: 'category',
            label: 'Category'
          }
        ]
      }
    ]
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show Chart option in dropdown for array fields', async () => {
    const onAnnotationsChange = vi.fn();

    render(
      <AppProvider
        config={{ annotations: {} }}
        spec={{ resources: [] }}
        annotations={[chartAnnotation]}
        handlers={mockHandlers}
      >
        <AnnotationEditor
          elementPath="dataPoints"
          elementType="field"
          currentAnnotations={{}}
          onAnnotationsChange={onAnnotationsChange}
          fieldInfo={{ type: 'array' }}
          fieldNode={mockFieldNode}
        />
      </AppProvider>
    );

    // Click "+ Add" button
    const addButton = screen.getByRole('button', { name: /add annotation/i });
    fireEvent.click(addButton);

    // Wait for dropdown to appear
    await waitFor(() => {
      expect(screen.getByText('Chart')).toBeInTheDocument();
    });

    // Check description
    expect(screen.getByText(/configures data visualization as charts/i)).toBeInTheDocument();
  });

  it('should open ChartConfigModal when Chart option is selected', async () => {
    const onAnnotationsChange = vi.fn();

    render(
      <AppProvider
        config={{ annotations: {} }}
        spec={{ resources: [] }}
        annotations={[chartAnnotation]}
        handlers={mockHandlers}
      >
        <AnnotationEditor
          elementPath="dataPoints"
          elementType="field"
          currentAnnotations={{}}
          onAnnotationsChange={onAnnotationsChange}
          fieldInfo={{ type: 'array' }}
          fieldNode={mockFieldNode}
        />
      </AppProvider>
    );

    // Click "+ Add" button
    const addButton = screen.getByRole('button', { name: /add annotation/i });
    fireEvent.click(addButton);

    // Wait for dropdown and click Chart option
    await waitFor(() => {
      expect(screen.getByText('Chart')).toBeInTheDocument();
    });

    const chartOption = screen.getByText('Chart').closest('button');
    fireEvent.click(chartOption!);

    // Check that modal opened
    await waitFor(() => {
      expect(screen.getByText('Configure Chart Visualization')).toBeInTheDocument();
    });
  });

  it('should display purple Chart badge when x-uigen-chart is configured', () => {
    const onAnnotationsChange = vi.fn();
    const chartConfig = {
      chartType: 'line' as const,
      xAxis: 'date',
      yAxis: 'value'
    };

    render(
      <AppProvider
        config={{ annotations: {} }}
        spec={{ resources: [] }}
        annotations={[chartAnnotation]}
        handlers={mockHandlers}
      >
        <AnnotationEditor
          elementPath="dataPoints"
          elementType="field"
          currentAnnotations={{ 'x-uigen-chart': chartConfig }}
          onAnnotationsChange={onAnnotationsChange}
          fieldInfo={{ type: 'array' }}
          fieldNode={mockFieldNode}
        />
      </AppProvider>
    );

    // Check badge is displayed
    const badge = screen.getByRole('button', { name: /edit chart configuration/i });
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('Chart: configured');
    
    // Check badge has purple styling
    expect(badge).toHaveClass('bg-purple-100');
  });

  it('should open ChartConfigModal when Chart badge is clicked', async () => {
    const onAnnotationsChange = vi.fn();
    const chartConfig = {
      chartType: 'line' as const,
      xAxis: 'date',
      yAxis: 'value'
    };

    render(
      <AppProvider
        config={{ annotations: {} }}
        spec={{ resources: [] }}
        annotations={[chartAnnotation]}
        handlers={mockHandlers}
      >
        <AnnotationEditor
          elementPath="dataPoints"
          elementType="field"
          currentAnnotations={{ 'x-uigen-chart': chartConfig }}
          onAnnotationsChange={onAnnotationsChange}
          fieldInfo={{ type: 'array' }}
          fieldNode={mockFieldNode}
        />
      </AppProvider>
    );

    // Click badge
    const badge = screen.getByRole('button', { name: /edit chart configuration/i });
    fireEvent.click(badge);

    // Check that modal opened with existing config
    await waitFor(() => {
      expect(screen.getByText('Configure Chart Visualization')).toBeInTheDocument();
    });
  });

  it('should save chart configuration when modal Save is clicked', async () => {
    const onAnnotationsChange = vi.fn();

    render(
      <AppProvider
        config={{ annotations: {} }}
        spec={{ resources: [] }}
        annotations={[chartAnnotation]}
        handlers={mockHandlers}
      >
        <AnnotationEditor
          elementPath="dataPoints"
          elementType="field"
          currentAnnotations={{}}
          onAnnotationsChange={onAnnotationsChange}
          fieldInfo={{ type: 'array' }}
          fieldNode={mockFieldNode}
        />
      </AppProvider>
    );

    // Open modal via "+ Add"
    const addButton = screen.getByRole('button', { name: /add annotation/i });
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByText('Chart')).toBeInTheDocument();
    });

    const chartOption = screen.getByText('Chart').closest('button');
    fireEvent.click(chartOption!);

    // Wait for modal
    await waitFor(() => {
      expect(screen.getByText('Configure Chart Visualization')).toBeInTheDocument();
    });

    // The modal should have fields populated with smart defaults
    // Click Save button
    const saveButton = screen.getByRole('button', { name: /^save$/i });
    fireEvent.click(saveButton);

    // Check that onAnnotationsChange was called with chart config
    await waitFor(() => {
      expect(onAnnotationsChange).toHaveBeenCalledWith(
        expect.objectContaining({
          'x-uigen-chart': expect.objectContaining({
            chartType: expect.any(String),
            xAxis: expect.any(String),
            yAxis: expect.any(String)
          })
        })
      );
    });
  });

  it('should show error when trying to configure chart on non-array field', async () => {
    const onAnnotationsChange = vi.fn();

    render(
      <AppProvider
        config={{ annotations: {} }}
        spec={{ resources: [] }}
        annotations={[chartAnnotation]}
        handlers={mockHandlers}
      >
        <AnnotationEditor
          elementPath="title"
          elementType="field"
          currentAnnotations={{}}
          onAnnotationsChange={onAnnotationsChange}
          fieldInfo={{ type: 'string' }}
          fieldNode={{ type: 'string', key: 'title', label: 'Title' }}
        />
      </AppProvider>
    );

    // Chart option should not appear for non-array fields
    const addButton = screen.getByRole('button', { name: /add annotation/i });
    fireEvent.click(addButton);

    await waitFor(() => {
      // Dropdown should be open but Chart should not be in the list
      const dropdown = screen.queryByText('Chart');
      expect(dropdown).not.toBeInTheDocument();
    });
  });

  it('should not show Chart option when x-uigen-chart is already configured', async () => {
    const onAnnotationsChange = vi.fn();
    const chartConfig = {
      chartType: 'line' as const,
      xAxis: 'date',
      yAxis: 'value'
    };

    render(
      <AppProvider
        config={{ annotations: {} }}
        spec={{ resources: [] }}
        annotations={[chartAnnotation]}
        handlers={mockHandlers}
      >
        <AnnotationEditor
          elementPath="dataPoints"
          elementType="field"
          currentAnnotations={{ 'x-uigen-chart': chartConfig }}
          onAnnotationsChange={onAnnotationsChange}
          fieldInfo={{ type: 'array' }}
          fieldNode={mockFieldNode}
        />
      </AppProvider>
    );

    // Click "+ Add" button
    const addButton = screen.getByRole('button', { name: /add annotation/i });
    fireEvent.click(addButton);

    // Chart option should not appear since it's already configured
    await waitFor(() => {
      const chartOption = screen.queryByText('Chart');
      expect(chartOption).not.toBeInTheDocument();
    });
  });
});
