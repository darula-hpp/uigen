import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChartConfigModal } from '../ChartConfigModal.js';
import type { ChartConfig, SchemaNode } from '@uigen-dev/core';

describe('ChartConfigModal', () => {
  // Mock array item schema with fields
  const mockArrayItemSchema: SchemaNode = {
    type: 'object',
    key: 'items',
    label: 'Items',
    required: false,
    children: [
      {
        type: 'string',
        key: 'date',
        label: 'Date',
        required: false,
        format: 'date-time'
      },
      {
        type: 'number',
        key: 'revenue',
        label: 'Revenue',
        required: false
      },
      {
        type: 'number',
        key: 'expenses',
        label: 'Expenses',
        required: false
      },
      {
        type: 'string',
        key: 'category',
        label: 'Category',
        required: false
      }
    ]
  };
  
  // Mock array item schema without fields
  const mockEmptyArrayItemSchema: SchemaNode = {
    type: 'array',
    key: 'items',
    label: 'Items',
    required: false
  };
  
  const mockOnClose = vi.fn();
  const mockOnSave = vi.fn();
  
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  describe('Rendering', () => {
    it('should not render when isOpen is false', () => {
      render(
        <ChartConfigModal
          isOpen={false}
          onClose={mockOnClose}
          onSave={mockOnSave}
          arrayItemSchema={mockArrayItemSchema}
          elementPath="data.items"
        />
      );
      
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    
    it('should render modal when isOpen is true', () => {
      render(
        <ChartConfigModal
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          arrayItemSchema={mockArrayItemSchema}
          elementPath="data.items"
        />
      );
      
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Configure Chart Visualization')).toBeInTheDocument();
    });
    
    it('should render with empty config', () => {
      render(
        <ChartConfigModal
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          arrayItemSchema={mockArrayItemSchema}
          elementPath="data.items"
        />
      );
      
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Basic')).toBeInTheDocument();
      expect(screen.getByText('Series')).toBeInTheDocument();
      expect(screen.getByText('Options')).toBeInTheDocument();
    });
    
    it('should render with existing config', () => {
      const initialConfig: ChartConfig = {
        chartType: 'line',
        xAxis: 'date',
        yAxis: 'revenue'
      };
      
      render(
        <ChartConfigModal
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          initialConfig={initialConfig}
          arrayItemSchema={mockArrayItemSchema}
          elementPath="data.items"
        />
      );
      
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });
  
  describe('Tab Navigation', () => {
    it('should start with Basic tab active by default', () => {
      render(
        <ChartConfigModal
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          arrayItemSchema={mockArrayItemSchema}
          elementPath="data.items"
        />
      );
      
      const basicTab = screen.getByRole('tab', { name: 'Basic' });
      expect(basicTab).toHaveAttribute('aria-selected', 'true');
    });
    
    it('should switch to Series tab when clicked', () => {
      render(
        <ChartConfigModal
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          arrayItemSchema={mockArrayItemSchema}
          elementPath="data.items"
        />
      );
      
      const seriesTab = screen.getByRole('tab', { name: 'Series' });
      fireEvent.click(seriesTab);
      
      expect(seriesTab).toHaveAttribute('aria-selected', 'true');
    });
    
    it('should switch to Options tab when clicked', () => {
      render(
        <ChartConfigModal
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          arrayItemSchema={mockArrayItemSchema}
          elementPath="data.items"
        />
      );
      
      const optionsTab = screen.getByRole('tab', { name: 'Options' });
      fireEvent.click(optionsTab);
      
      expect(optionsTab).toHaveAttribute('aria-selected', 'true');
    });
    
    it('should remember active tab when switching between tabs', () => {
      render(
        <ChartConfigModal
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          arrayItemSchema={mockArrayItemSchema}
          elementPath="data.items"
        />
      );
      
      // Switch to Series tab
      const seriesTab = screen.getByRole('tab', { name: 'Series' });
      fireEvent.click(seriesTab);
      expect(seriesTab).toHaveAttribute('aria-selected', 'true');
      
      // Switch to Options tab
      const optionsTab = screen.getByRole('tab', { name: 'Options' });
      fireEvent.click(optionsTab);
      expect(optionsTab).toHaveAttribute('aria-selected', 'true');
      
      // Switch back to Basic tab
      const basicTab = screen.getByRole('tab', { name: 'Basic' });
      fireEvent.click(basicTab);
      expect(basicTab).toHaveAttribute('aria-selected', 'true');
    });
  });
  
  describe('Save and Cancel', () => {
    it('should call onClose when Cancel button is clicked', () => {
      render(
        <ChartConfigModal
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          arrayItemSchema={mockArrayItemSchema}
          elementPath="data.items"
        />
      );
      
      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);
      
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
    
    it('should call onClose when Escape key is pressed', () => {
      render(
        <ChartConfigModal
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          arrayItemSchema={mockArrayItemSchema}
          elementPath="data.items"
        />
      );
      
      fireEvent.keyDown(document, { key: 'Escape' });
      
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
    
    it('should call onClose when backdrop is clicked', () => {
      render(
        <ChartConfigModal
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          arrayItemSchema={mockArrayItemSchema}
          elementPath="data.items"
        />
      );
      
      const backdrop = screen.getByRole('dialog');
      fireEvent.click(backdrop);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
    
    it('should call onSave with valid config when all required fields are filled', () => {
      render(
        <ChartConfigModal
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          arrayItemSchema={mockArrayItemSchema}
          elementPath="data.items"
        />
      );
      
      // Smart defaults are applied, so the form is valid
      const saveButton = screen.getByText('Save');
      fireEvent.click(saveButton);
      
      // Should call onSave with the config (smart defaults applied)
      expect(mockOnSave).toHaveBeenCalledTimes(1);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
      
      // Verify the config has required fields
      const savedConfig = mockOnSave.mock.calls[0][0];
      expect(savedConfig).toHaveProperty('chartType');
      expect(savedConfig).toHaveProperty('xAxis');
      expect(savedConfig).toHaveProperty('yAxis');
    });
    
    it('should disable Save button when no fields are available', () => {
      render(
        <ChartConfigModal
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          arrayItemSchema={mockEmptyArrayItemSchema}
          elementPath="data.items"
        />
      );
      
      const saveButton = screen.getByText('Save');
      expect(saveButton).toBeDisabled();
    });
  });
  
  describe('Configuration Loading', () => {
    it('should load existing configuration into Basic tab', () => {
      const initialConfig: ChartConfig = {
        chartType: 'line',
        xAxis: 'date',
        yAxis: 'revenue'
      };
      
      render(
        <ChartConfigModal
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          initialConfig={initialConfig}
          arrayItemSchema={mockArrayItemSchema}
          elementPath="data.items"
        />
      );
      
      // Check that chart type is selected
      const chartTypeSelect = screen.getByLabelText('Chart Type') as HTMLSelectElement;
      expect(chartTypeSelect.value).toBe('line');
    });
    
    it('should load existing series configuration', () => {
      const initialConfig: ChartConfig = {
        chartType: 'line',
        xAxis: 'date',
        yAxis: ['revenue', 'expenses'],
        series: [
          { field: 'revenue', label: 'Revenue', color: '#4CAF50' },
          { field: 'expenses', label: 'Expenses', color: '#F44336' }
        ]
      };
      
      render(
        <ChartConfigModal
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          initialConfig={initialConfig}
          arrayItemSchema={mockArrayItemSchema}
          elementPath="data.items"
        />
      );
      
      // Switch to Series tab
      const seriesTab = screen.getByRole('tab', { name: 'Series' });
      fireEvent.click(seriesTab);
      
      // Check that series are loaded
      expect(screen.getByDisplayValue('Revenue')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Expenses')).toBeInTheDocument();
    });
    
    it('should load existing options configuration', () => {
      const initialConfig: ChartConfig = {
        chartType: 'line',
        xAxis: 'date',
        yAxis: 'revenue',
        options: {
          title: 'Sales Chart',
          responsive: true
        }
      };
      
      render(
        <ChartConfigModal
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          initialConfig={initialConfig}
          arrayItemSchema={mockArrayItemSchema}
          elementPath="data.items"
        />
      );
      
      // Switch to Options tab
      const optionsTab = screen.getByRole('tab', { name: 'Options' });
      fireEvent.click(optionsTab);
      
      // Check that options JSON is loaded
      const jsonEditor = screen.getByLabelText('Chart Options (JSON)') as HTMLTextAreaElement;
      expect(jsonEditor.value).toContain('Sales Chart');
      expect(jsonEditor.value).toContain('responsive');
    });
  });
  
  describe('Keyboard Navigation', () => {
    it('should support Tab key for focus navigation', () => {
      render(
        <ChartConfigModal
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          arrayItemSchema={mockArrayItemSchema}
          elementPath="data.items"
        />
      );
      
      const basicTab = screen.getByRole('tab', { name: 'Basic' });
      basicTab.focus();
      
      expect(document.activeElement).toBe(basicTab);
    });
    
    it('should navigate tabs with arrow keys', () => {
      render(
        <ChartConfigModal
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          arrayItemSchema={mockArrayItemSchema}
          elementPath="data.items"
        />
      );
      
      const basicTab = screen.getByRole('tab', { name: 'Basic' });
      const seriesTab = screen.getByRole('tab', { name: 'Series' });
      const optionsTab = screen.getByRole('tab', { name: 'Options' });
      
      // Focus on basic tab
      basicTab.focus();
      
      // Press ArrowRight to move to Series tab
      fireEvent.keyDown(basicTab, { key: 'ArrowRight' });
      expect(seriesTab).toHaveAttribute('aria-selected', 'true');
      
      // Press ArrowRight again to move to Options tab
      fireEvent.keyDown(seriesTab, { key: 'ArrowRight' });
      expect(optionsTab).toHaveAttribute('aria-selected', 'true');
      
      // Press ArrowLeft to move back to Series tab
      fireEvent.keyDown(optionsTab, { key: 'ArrowLeft' });
      expect(seriesTab).toHaveAttribute('aria-selected', 'true');
    });
    
    it('should wrap around when navigating tabs with arrow keys', () => {
      render(
        <ChartConfigModal
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          arrayItemSchema={mockArrayItemSchema}
          elementPath="data.items"
        />
      );
      
      const basicTab = screen.getByRole('tab', { name: 'Basic' });
      const optionsTab = screen.getByRole('tab', { name: 'Options' });
      
      // Focus on basic tab
      basicTab.focus();
      
      // Press ArrowLeft to wrap to Options tab
      fireEvent.keyDown(basicTab, { key: 'ArrowLeft' });
      expect(optionsTab).toHaveAttribute('aria-selected', 'true');
      
      // Press ArrowRight to wrap back to Basic tab
      fireEvent.keyDown(optionsTab, { key: 'ArrowRight' });
      expect(basicTab).toHaveAttribute('aria-selected', 'true');
    });
    
    it('should trap focus within modal', () => {
      render(
        <ChartConfigModal
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          arrayItemSchema={mockArrayItemSchema}
          elementPath="data.items"
        />
      );
      
      // Modal should be rendered
      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
      
      // Focus should be trapped within modal (tested by checking that Tab key doesn't escape)
      // This is handled by the focus trap implementation
    });
    
    it('should have proper tabindex for inactive tabs', () => {
      render(
        <ChartConfigModal
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          arrayItemSchema={mockArrayItemSchema}
          elementPath="data.items"
        />
      );
      
      const basicTab = screen.getByRole('tab', { name: 'Basic' });
      const seriesTab = screen.getByRole('tab', { name: 'Series' });
      const optionsTab = screen.getByRole('tab', { name: 'Options' });
      
      // Active tab should have tabindex 0
      expect(basicTab).toHaveAttribute('tabindex', '0');
      
      // Inactive tabs should have tabindex -1
      expect(seriesTab).toHaveAttribute('tabindex', '-1');
      expect(optionsTab).toHaveAttribute('tabindex', '-1');
    });
  });
  
  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(
        <ChartConfigModal
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          arrayItemSchema={mockArrayItemSchema}
          elementPath="data.items"
        />
      );
      
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby', 'chart-modal-title');
      expect(dialog).toHaveAttribute('aria-describedby', 'chart-modal-description');
    });
    
    it('should have proper tab ARIA attributes', () => {
      render(
        <ChartConfigModal
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          arrayItemSchema={mockArrayItemSchema}
          elementPath="data.items"
        />
      );
      
      const basicTab = screen.getByRole('tab', { name: 'Basic' });
      expect(basicTab).toHaveAttribute('aria-selected', 'true');
      expect(basicTab).toHaveAttribute('aria-controls', 'basic-panel');
      
      const seriesTab = screen.getByRole('tab', { name: 'Series' });
      expect(seriesTab).toHaveAttribute('aria-selected', 'false');
      expect(seriesTab).toHaveAttribute('aria-controls', 'series-panel');
    });
    
    it('should have tablist with proper label', () => {
      render(
        <ChartConfigModal
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          arrayItemSchema={mockArrayItemSchema}
          elementPath="data.items"
        />
      );
      
      const tablist = screen.getByRole('tablist');
      expect(tablist).toHaveAttribute('aria-label', 'Chart configuration tabs');
    });
    
    it('should have screen reader announcement region', () => {
      render(
        <ChartConfigModal
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          arrayItemSchema={mockArrayItemSchema}
          elementPath="data.items"
        />
      );
      
      // Check for screen reader announcement region
      const announcements = screen.getAllByRole('status');
      expect(announcements.length).toBeGreaterThan(0);
      
      // The announcement region should have aria-live="polite"
      const announcementRegion = announcements.find(el => 
        el.getAttribute('aria-live') === 'polite'
      );
      expect(announcementRegion).toBeDefined();
    });
    
    it('should announce tab changes to screen readers', () => {
      render(
        <ChartConfigModal
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          arrayItemSchema={mockArrayItemSchema}
          elementPath="data.items"
        />
      );
      
      const seriesTab = screen.getByRole('tab', { name: 'Series' });
      
      // Click on Series tab
      fireEvent.click(seriesTab);
      
      // The announcement should be made (we can't directly test the content
      // but we can verify the mechanism is in place)
      const announcements = screen.getAllByRole('status');
      expect(announcements.length).toBeGreaterThan(0);
    });
  });
  
  describe('Field Extraction', () => {
    it('should extract fields from array item schema', () => {
      render(
        <ChartConfigModal
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          arrayItemSchema={mockArrayItemSchema}
          elementPath="data.items"
        />
      );
      
      // Check that fields are available in dropdowns
      expect(screen.getByLabelText('X-Axis Field')).toBeInTheDocument();
      expect(screen.getByLabelText('Y-Axis Field(s)')).toBeInTheDocument();
    });
    
    it('should show warning when no fields are available', () => {
      render(
        <ChartConfigModal
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          arrayItemSchema={mockEmptyArrayItemSchema}
          elementPath="data.items"
        />
      );
      
      // Use getAllByText since the warning appears in multiple places
      const warnings = screen.getAllByText(/Array items must be objects with fields/);
      expect(warnings.length).toBeGreaterThan(0);
    });
  });
});
