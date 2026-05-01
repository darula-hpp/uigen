import { useState, useEffect, useRef } from 'react';
import type { ChartConfig, ChartType, SeriesConfig, SchemaNode } from '@uigen-dev/core';
import { BasicTab } from './BasicTab.js';
import { SeriesTab } from './SeriesTab.js';
import { OptionsTab } from './OptionsTab.js';
import { extractFields, validateChartConfig, serializeChartConfig, parseOptionsJson, validateOptionsJson } from '../../lib/chart-utils.js';

/**
 * Props for ChartConfigModal component
 */
export interface ChartConfigModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  
  /** Callback to close the modal */
  onClose: () => void;
  
  /** Callback when configuration is saved */
  onSave: (config: ChartConfig) => void;
  
  /** Existing configuration (for editing) */
  initialConfig?: ChartConfig;
  
  /** Array item schema for field extraction */
  arrayItemSchema: SchemaNode;
  
  /** Element path for error messages */
  elementPath: string;
}

type TabType = 'basic' | 'series' | 'options';

/**
 * ChartConfigModal component provides a modal interface for configuring chart visualizations.
 * 
 * Features:
 * - Modal structure with backdrop and container
 * - Tab navigation (Basic, Series, Options)
 * - Manages modal state (activeTab, config, errors)
 * - Field extraction from arrayItemSchema
 * - Save and Cancel buttons
 * - Validation on save
 * - Keyboard shortcuts (Escape to close, Enter to save)
 * - Focus trap and focus management
 * - Constructs final ChartConfig on save
 * 
 * Requirements: 3.1-3.8, 4.1-4.8, 5.1-5.7, 6.1-6.5, 7.1-7.5, 8.1-8.5, 9.1-9.8, 10.1-10.5, 11.1-11.5, 12.1-12.5, 13.1-13.5, 15.1-15.5
 */
export function ChartConfigModal({
  isOpen,
  onClose,
  onSave,
  initialConfig,
  arrayItemSchema,
  elementPath
}: ChartConfigModalProps) {
  // Extract fields from array item schema
  const fields = extractFields(arrayItemSchema);
  const hasFields = fields.length > 0;
  
  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>('basic');
  
  // Basic tab state
  const [chartType, setChartType] = useState<ChartType>(initialConfig?.chartType || 'line');
  const [xAxis, setXAxis] = useState<string>(initialConfig?.xAxis || '');
  const [yAxis, setYAxis] = useState<string | string[]>(initialConfig?.yAxis || '');
  
  // Series tab state
  const [series, setSeries] = useState<SeriesConfig[]>(initialConfig?.series || []);
  const [seriesCustomized, setSeriesCustomized] = useState(false);
  
  // Options tab state
  const [optionsJson, setOptionsJson] = useState<string>(
    initialConfig?.options ? JSON.stringify(initialConfig.options, null, 2) : ''
  );
  const [optionsError, setOptionsError] = useState<string>('');
  
  // Validation state
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Loading state for save operation
  const [isSaving, setIsSaving] = useState(false);
  
  // Refs for focus management
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const firstFocusableRef = useRef<HTMLElement | null>(null);
  const lastFocusableRef = useRef<HTMLElement | null>(null);
  
  // Track if this is initial mount for smart defaults
  const [isInitialMount, setIsInitialMount] = useState(true);
  
  // Ref for screen reader announcements
  const announcementRef = useRef<HTMLDivElement>(null);
  
  // Store previous focus element when modal opens and set up focus trap
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      setIsInitialMount(!initialConfig);
      
      // Set up focus trap after modal renders
      setTimeout(() => {
        if (modalRef.current) {
          const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          );
          
          if (focusableElements.length > 0) {
            firstFocusableRef.current = focusableElements[0];
            lastFocusableRef.current = focusableElements[focusableElements.length - 1];
            
            // Focus first element
            firstFocusableRef.current?.focus();
          }
        }
      }, 0);
    } else {
      setIsInitialMount(true);
    }
  }, [isOpen, initialConfig]);
  
  // Return focus when modal closes
  useEffect(() => {
    if (!isOpen && previousFocusRef.current) {
      previousFocusRef.current.focus();
    }
  }, [isOpen]);
  
  // Handle keyboard navigation (Escape, Tab trap, Arrow keys for tabs)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;
      
      // Escape key closes modal
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      
      // Tab key for focus trap
      if (event.key === 'Tab') {
        if (!firstFocusableRef.current || !lastFocusableRef.current) return;
        
        if (event.shiftKey) {
          // Shift+Tab: if on first element, wrap to last
          if (document.activeElement === firstFocusableRef.current) {
            event.preventDefault();
            lastFocusableRef.current.focus();
          }
        } else {
          // Tab: if on last element, wrap to first
          if (document.activeElement === lastFocusableRef.current) {
            event.preventDefault();
            firstFocusableRef.current.focus();
          }
        }
      }
      
      // Arrow key navigation for tabs (when focus is on a tab button)
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        const target = event.target as HTMLElement;
        if (target.getAttribute('role') === 'tab') {
          event.preventDefault();
          
          const tabs: TabType[] = ['basic', 'series', 'options'];
          const currentIndex = tabs.indexOf(activeTab);
          
          let newIndex: number;
          if (event.key === 'ArrowLeft') {
            newIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1;
          } else {
            newIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0;
          }
          
          const newTab = tabs[newIndex];
          setActiveTab(newTab);
          
          // Announce tab change to screen readers
          announceToScreenReader(`${getTabLabel(newTab)} tab selected`);
          
          // Focus the new tab button
          setTimeout(() => {
            const tabButton = document.getElementById(`${newTab}-tab`);
            tabButton?.focus();
          }, 0);
        }
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, activeTab]);
  
  // Validate options JSON when it changes
  useEffect(() => {
    const validation = validateOptionsJson(optionsJson);
    setOptionsError(validation.error || '');
  }, [optionsJson]);
  
  /**
   * Get human-readable label for tab
   */
  const getTabLabel = (tab: TabType): string => {
    switch (tab) {
      case 'basic':
        return 'Basic';
      case 'series':
        return 'Series';
      case 'options':
        return 'Options';
      default:
        return tab;
    }
  };
  
  /**
   * Announce message to screen readers
   */
  const announceToScreenReader = (message: string) => {
    if (announcementRef.current) {
      announcementRef.current.textContent = message;
      
      // Clear after announcement
      setTimeout(() => {
        if (announcementRef.current) {
          announcementRef.current.textContent = '';
        }
      }, 1000);
    }
  };
  
  /**
   * Handle tab change with screen reader announcement
   */
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    announceToScreenReader(`${getTabLabel(tab)} tab selected`);
  };
  
  // Handle series changes
  const handleSeriesChange = (newSeries: SeriesConfig[], customized: boolean) => {
    setSeries(newSeries);
    setSeriesCustomized(customized);
  };
  
  // Handle backdrop click
  const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };
  
  // Handle save
  const handleSave = () => {
    setIsSaving(true);
    
    // Validate configuration
    const config: Partial<ChartConfig> = {
      chartType,
      xAxis,
      yAxis
    };
    
    const validation = validateChartConfig(config, fields);
    
    if (!validation.valid) {
      setErrors(validation.errors);
      setIsSaving(false);
      return;
    }
    
    // Check options JSON is valid
    if (optionsJson.trim() && optionsError) {
      setActiveTab('options');
      setIsSaving(false);
      return;
    }
    
    // Construct final config
    const finalConfig: ChartConfig = {
      chartType,
      xAxis,
      yAxis
    };
    
    // Parse and include options if provided
    const parsedOptions = parseOptionsJson(optionsJson);
    if (parsedOptions) {
      finalConfig.options = parsedOptions;
    }
    
    // Serialize config (omits series if not customized, omits options if empty)
    const serializedConfig = serializeChartConfig(finalConfig, seriesCustomized);
    
    // Include series if customized
    if (seriesCustomized && series.length > 0) {
      serializedConfig.series = series;
    }
    
    // Call onSave and close
    onSave(serializedConfig);
    setIsSaving(false);
    onClose();
  };
  
  // Handle cancel
  const handleCancel = () => {
    onClose();
  };
  
  // Don't render if not open
  if (!isOpen) {
    return null;
  }
  
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="chart-modal-title"
      aria-describedby="chart-modal-description"
    >
      {/* Screen reader announcements */}
      <div
        ref={announcementRef}
        className="sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      />
      
      <div
        ref={modalRef}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-[600px] mx-4 max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 
            id="chart-modal-title" 
            className="text-xl font-semibold text-gray-900 dark:text-white"
          >
            Configure Chart Visualization
          </h2>
          <p 
            id="chart-modal-description" 
            className="mt-1 text-sm text-gray-500 dark:text-gray-400"
          >
            Configure chart settings for {elementPath}
          </p>
        </div>
        
        {/* Tab Navigation */}
        <div 
          className="px-6 border-b border-gray-200 dark:border-gray-700"
          role="tablist"
          aria-label="Chart configuration tabs"
        >
          <div className="flex space-x-4">
            <button
              role="tab"
              aria-selected={activeTab === 'basic'}
              aria-controls="basic-panel"
              id="basic-tab"
              tabIndex={activeTab === 'basic' ? 0 : -1}
              onClick={() => handleTabChange('basic')}
              className={`py-3 px-1 border-b-2 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                activeTab === 'basic'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              Basic
            </button>
            
            <button
              role="tab"
              aria-selected={activeTab === 'series'}
              aria-controls="series-panel"
              id="series-tab"
              tabIndex={activeTab === 'series' ? 0 : -1}
              onClick={() => handleTabChange('series')}
              className={`py-3 px-1 border-b-2 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                activeTab === 'series'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              Series
            </button>
            
            <button
              role="tab"
              aria-selected={activeTab === 'options'}
              aria-controls="options-panel"
              id="options-tab"
              tabIndex={activeTab === 'options' ? 0 : -1}
              onClick={() => handleTabChange('options')}
              className={`py-3 px-1 border-b-2 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                activeTab === 'options'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              Options
            </button>
          </div>
        </div>
        
        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* Basic Tab */}
          <div
            role="tabpanel"
            aria-labelledby="basic-tab"
            id="basic-panel"
            hidden={activeTab !== 'basic'}
          >
            {activeTab === 'basic' && (
              <BasicTab
                fields={fields}
                chartType={chartType}
                xAxis={xAxis}
                yAxis={yAxis}
                onChartTypeChange={setChartType}
                onXAxisChange={setXAxis}
                onYAxisChange={setYAxis}
                errors={errors}
                isInitialMount={isInitialMount}
              />
            )}
          </div>
          
          {/* Series Tab */}
          <div
            role="tabpanel"
            aria-labelledby="series-tab"
            id="series-panel"
            hidden={activeTab !== 'series'}
          >
            {activeTab === 'series' && (
              <SeriesTab
                yAxis={yAxis}
                series={series}
                onSeriesChange={handleSeriesChange}
                fields={fields}
              />
            )}
          </div>
          
          {/* Options Tab */}
          <div
            role="tabpanel"
            aria-labelledby="options-tab"
            id="options-panel"
            hidden={activeTab !== 'options'}
          >
            {activeTab === 'options' && (
              <OptionsTab
                optionsJson={optionsJson}
                onOptionsChange={setOptionsJson}
                error={optionsError}
              />
            )}
          </div>
        </div>
        
        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
          <button
            type="button"
            onClick={handleCancel}
            disabled={isSaving}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          
          <button
            type="button"
            onClick={handleSave}
            disabled={!hasFields || isSaving}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSaving && (
              <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
