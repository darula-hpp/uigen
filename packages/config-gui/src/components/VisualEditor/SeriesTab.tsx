import { useEffect, useState } from 'react';
import type { SeriesConfig } from '@uigen-dev/core';
import { SeriesEditor } from '../controls/SeriesEditor.js';
import type { FieldOption } from '../../lib/chart-utils.js';
import { generateDefaultSeries } from '../../lib/chart-utils.js';

/**
 * Props for SeriesTab component
 */
export interface SeriesTabProps {
  /** Current yAxis configuration */
  yAxis: string | string[];
  
  /** Current series configuration */
  series: SeriesConfig[];
  
  /** Callback when series changes */
  onSeriesChange: (series: SeriesConfig[], customized: boolean) => void;
  
  /** Available fields for reference */
  fields: FieldOption[];
}

/**
 * SeriesTab component for customizing series labels and colors.
 * 
 * Features:
 * - Renders single SeriesEditor when yAxis is string
 * - Renders multiple SeriesEditors when yAxis is array
 * - Tracks series customization state
 * - Handles series changes and updates parent state
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8
 */
export function SeriesTab({
  yAxis,
  series,
  onSeriesChange,
  fields
}: SeriesTabProps) {
  // Track whether series have been customized by the user
  const [isCustomized, setIsCustomized] = useState(false);
  
  // Convert yAxis to array for consistent handling
  const yAxisFields = Array.isArray(yAxis) ? yAxis : [yAxis];
  
  // Initialize series if not provided or if yAxis changed
  useEffect(() => {
    // If series is empty or doesn't match yAxis fields, generate defaults
    const seriesFields = series.map(s => s.field);
    const yAxisFieldsSet = new Set(yAxisFields);
    const seriesFieldsSet = new Set(seriesFields);
    
    // Check if series fields match yAxis fields
    const fieldsMatch = 
      seriesFields.length === yAxisFields.length &&
      yAxisFields.every(field => seriesFieldsSet.has(field));
    
    if (!fieldsMatch) {
      // Generate default series from yAxis fields
      const defaultSeries = generateDefaultSeries(yAxisFields, fields);
      onSeriesChange(defaultSeries, false);
      setIsCustomized(false);
    }
  }, [yAxis, fields]); // Only run when yAxis or fields change
  
  /**
   * Handle series change for a specific index
   */
  const handleSeriesChange = (index: number, updatedSeries: SeriesConfig) => {
    const newSeries = [...series];
    newSeries[index] = updatedSeries;
    
    // Mark as customized when user makes changes
    setIsCustomized(true);
    onSeriesChange(newSeries, true);
  };
  
  // If no yAxis is selected, show a message
  if (!yAxis || yAxisFields.length === 0) {
    return (
      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          ℹ️ Select Y-axis field(s) in the Basic tab to customize series labels and colors.
        </p>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Info message */}
      <div className="p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md">
        <p className="text-sm text-gray-700 dark:text-gray-300">
          Customize the appearance of your chart series. If you don't customize, default labels and colors will be generated automatically.
        </p>
      </div>
      
      {/* Series editors */}
      <div className="space-y-4">
        {yAxisFields.map((field, index) => {
          // Find the series config for this field
          const seriesConfig = series.find(s => s.field === field) || {
            field,
            label: fields.find(f => f.value === field)?.label || field
          };
          
          return (
            <SeriesEditor
              key={field}
              field={field}
              series={seriesConfig}
              onChange={(updatedSeries) => handleSeriesChange(index, updatedSeries)}
              index={index}
            />
          );
        })}
      </div>
      
      {/* Customization status */}
      {isCustomized && (
        <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
          <p className="text-sm text-green-800 dark:text-green-200">
            ✓ Series customized. These settings will be saved with your chart configuration.
          </p>
        </div>
      )}
    </div>
  );
}
