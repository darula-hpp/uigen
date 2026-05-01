import type { SeriesConfig } from '@uigen-dev/core';

/**
 * Props for SeriesEditor component
 */
export interface SeriesEditorProps {
  /** Field name for this series */
  field: string;
  /** Current series configuration */
  series: SeriesConfig;
  /** Callback when series changes */
  onChange: (series: SeriesConfig) => void;
  /** Index for display */
  index: number;
}

/**
 * Default colors for series (Material Design palette)
 */
const DEFAULT_COLORS = [
  '#4CAF50', // Green
  '#2196F3', // Blue
  '#FF9800', // Orange
  '#9C27B0', // Purple
  '#F44336', // Red
  '#00BCD4', // Cyan
  '#FFEB3B', // Yellow
  '#795548', // Brown
  '#607D8B', // Blue Grey
  '#E91E63'  // Pink
];

/**
 * Get default color for series by index
 */
function getDefaultColor(index: number): string {
  return DEFAULT_COLORS[index % DEFAULT_COLORS.length];
}

/**
 * SeriesEditor component for configuring a single series.
 * 
 * Features:
 * - Field name display (read-only)
 * - Label text input with default value
 * - Color picker with default color
 * - Accessible with proper labels and ARIA attributes
 * 
 * Requirements: 4.5, 4.6, 4.7
 */
export function SeriesEditor({
  field,
  series,
  onChange,
  index
}: SeriesEditorProps) {
  const defaultColor = getDefaultColor(index);
  const currentColor = series.color || defaultColor;
  const currentLabel = series.label || field;
  
  /**
   * Handle label change
   */
  const handleLabelChange = (newLabel: string) => {
    onChange({
      ...series,
      label: newLabel
    });
  };
  
  /**
   * Handle color change
   */
  const handleColorChange = (newColor: string) => {
    onChange({
      ...series,
      color: newColor
    });
  };
  
  return (
    <div className="p-4 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-800 space-y-3">
      {/* Series header */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Series {index + 1}:
        </span>
        <span className="text-sm text-gray-600 dark:text-gray-400 font-mono">
          {field}
        </span>
      </div>
      
      {/* Label input */}
      <div className="space-y-1">
        <label 
          htmlFor={`series-${index}-label`}
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Label
        </label>
        <input
          type="text"
          id={`series-${index}-label`}
          value={currentLabel}
          onChange={(e) => handleLabelChange(e.target.value)}
          placeholder={field}
          aria-label={`Label for series ${index + 1}`}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      
      {/* Color picker */}
      <div className="space-y-1">
        <label 
          htmlFor={`series-${index}-color`}
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Color
        </label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            id={`series-${index}-color`}
            value={currentColor}
            onChange={(e) => handleColorChange(e.target.value)}
            aria-label={`Color for series ${index + 1}`}
            className="h-10 w-16 border border-gray-300 dark:border-gray-600 rounded cursor-pointer"
          />
          <input
            type="text"
            value={currentColor}
            onChange={(e) => handleColorChange(e.target.value)}
            placeholder="#4CAF50"
            aria-label={`Color hex value for series ${index + 1}`}
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
    </div>
  );
}
