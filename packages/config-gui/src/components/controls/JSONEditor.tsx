import { useState } from 'react';

/**
 * Props for JSONEditor component
 */
export interface JSONEditorProps {
  /** Current JSON string */
  value: string;
  /** Callback when value changes */
  onChange: (value: string) => void;
  /** Validation error */
  error: string;
  /** Placeholder text */
  placeholder?: string;
  /** Label for the editor */
  label?: string;
  /** Optional description text */
  description?: string;
  /** ID for the textarea element */
  id?: string;
}

/**
 * Example snippets for common chart options
 */
const EXAMPLE_SNIPPETS = [
  {
    title: 'Basic Title and Legend',
    json: {
      title: 'Sales Over Time',
      legend: { show: true, position: 'bottom' }
    }
  },
  {
    title: 'Tooltip Configuration',
    json: {
      tooltip: { enabled: true },
      responsive: true
    }
  },
  {
    title: 'Axis Labels',
    json: {
      xAxis: { label: 'Date', showGrid: true },
      yAxis: { label: 'Revenue', scale: 'linear' }
    }
  }
];

/**
 * JSONEditor component provides a simple JSON editor with validation.
 * 
 * Features:
 * - Textarea with monospace font
 * - Real-time JSON validation
 * - Syntax error highlighting
 * - Example snippets for common options
 * - Accessible with proper labels and ARIA attributes
 * 
 * Requirements: 5.3, 5.4, 5.5, 5.7
 */
export function JSONEditor({
  value,
  onChange,
  error,
  placeholder = '{\n  "title": "My Chart",\n  "legend": { "show": true }\n}',
  label = 'Advanced Options (JSON)',
  description,
  id = 'json-editor'
}: JSONEditorProps) {
  const [showExamples, setShowExamples] = useState(false);
  
  /**
   * Handle textarea change with validation
   */
  const handleChange = (newValue: string) => {
    onChange(newValue);
  };
  
  /**
   * Insert example snippet into editor
   */
  const handleInsertExample = (exampleJson: Record<string, unknown>) => {
    const formatted = JSON.stringify(exampleJson, null, 2);
    onChange(formatted);
    setShowExamples(false);
  };
  
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label 
          htmlFor={id} 
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          {label}
        </label>
        
        <button
          type="button"
          onClick={() => setShowExamples(!showExamples)}
          className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
          aria-label="Toggle example snippets"
        >
          {showExamples ? 'Hide Examples' : 'Show Examples'}
        </button>
      </div>
      
      {description && (
        <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
      )}
      
      {/* Example snippets */}
      {showExamples && (
        <div className="space-y-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700">
          <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
            Example Snippets:
          </p>
          {EXAMPLE_SNIPPETS.map((snippet, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleInsertExample(snippet.json)}
              className="block w-full text-left px-3 py-2 text-xs bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
            >
              <div className="font-medium">{snippet.title}</div>
              <pre className="mt-1 text-gray-600 dark:text-gray-400 overflow-x-auto">
                {JSON.stringify(snippet.json, null, 2)}
              </pre>
            </button>
          ))}
        </div>
      )}
      
      {/* JSON textarea */}
      <textarea
        id={id}
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        rows={10}
        aria-label={label}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y ${
          error ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
        }`}
        spellCheck={false}
      />
      
      {/* Error message */}
      {error && (
        <div 
          id={`${id}-error`} 
          className="p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-600 dark:text-red-400" 
          role="alert"
        >
          <span className="font-medium">Invalid JSON:</span> {error}
        </div>
      )}
      
      {/* Help text */}
      {!error && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Enter valid JSON object for advanced chart options. Leave empty to use defaults.
        </p>
      )}
    </div>
  );
}
