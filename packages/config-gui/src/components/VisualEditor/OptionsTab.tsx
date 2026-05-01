import { JSONEditor } from '../controls/JSONEditor.js';

/**
 * Props for OptionsTab component
 */
export interface OptionsTabProps {
  /** Current options JSON string */
  optionsJson: string;
  
  /** Callback when options change */
  onOptionsChange: (json: string) => void;
  
  /** JSON parsing error */
  error: string;
}

/**
 * OptionsTab component for advanced chart options configuration.
 * 
 * Features:
 * - Integrates JSONEditor component
 * - Displays example snippets
 * - Handles JSON validation errors
 * - Updates parent state on valid JSON changes
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7
 */
export function OptionsTab({
  optionsJson,
  onOptionsChange,
  error
}: OptionsTabProps) {
  return (
    <div className="space-y-4">
      {/* Info message */}
      <div className="p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md">
        <p className="text-sm text-gray-700 dark:text-gray-300">
          Configure advanced chart options using JSON. This is optional - leave empty to use default settings.
        </p>
      </div>
      
      {/* JSON Editor */}
      <JSONEditor
        id="chart-options"
        value={optionsJson}
        onChange={onOptionsChange}
        error={error}
        label="Chart Options (JSON)"
        description="Enter a JSON object with advanced chart configuration options"
        placeholder='{\n  "title": "My Chart",\n  "legend": { "show": true, "position": "bottom" },\n  "tooltip": { "enabled": true },\n  "responsive": true\n}'
      />
      
      {/* Common options reference */}
      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
        <p className="text-xs font-medium text-blue-800 dark:text-blue-200 mb-2">
          Common Options:
        </p>
        <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1 list-disc list-inside">
          <li><code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">title</code> - Chart title text</li>
          <li><code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">legend</code> - Legend configuration (show, position)</li>
          <li><code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">tooltip</code> - Tooltip settings (enabled, format)</li>
          <li><code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">responsive</code> - Enable responsive sizing</li>
          <li><code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">xAxis</code> - X-axis configuration (label, showGrid)</li>
          <li><code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">yAxis</code> - Y-axis configuration (label, scale)</li>
        </ul>
      </div>
    </div>
  );
}
