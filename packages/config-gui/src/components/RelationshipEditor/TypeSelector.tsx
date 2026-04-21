import { useState, useId } from 'react';

/**
 * Relationship type options with metadata
 */
const TYPE_OPTIONS = [
  {
    value: 'hasMany' as const,
    label: 'Has Many',
    icon: '→*',
    description: 'Source resource has multiple target resources (one-to-many)',
  },
  {
    value: 'belongsTo' as const,
    label: 'Belongs To',
    icon: '*→',
    description: 'Source resource belongs to a single target resource (many-to-one)',
  },
  {
    value: 'manyToMany' as const,
    label: 'Many to Many',
    icon: '↔',
    description: 'Source and target resources can have multiple of each other',
  },
] as const;

export interface TypeSelectorProps {
  /** Currently selected relationship type */
  value: 'hasMany' | 'belongsTo' | 'manyToMany';
  /** Callback when type selection changes */
  onChange: (type: 'hasMany' | 'belongsTo' | 'manyToMany') => void;
  /** Recommended type based on path pattern (optional) */
  recommendedType?: 'hasMany' | 'belongsTo' | 'manyToMany';
  /** Whether the selector is disabled */
  disabled?: boolean;
}

/**
 * TypeSelector component for choosing relationship types.
 *
 * Displays three type options (Has Many, Belongs To, Many to Many) with:
 * - Icons and descriptions for each type
 * - Visual indication of recommended type
 * - Warning when selected type doesn't match recommendation
 * - Help tooltip explaining relationship types
 * - Full keyboard accessibility
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 9.3, 9.4, 9.5
 */
export function TypeSelector({
  value,
  onChange,
  recommendedType,
  disabled = false,
}: TypeSelectorProps) {
  const [showHelp, setShowHelp] = useState(false);
  const selectId = useId();
  const helpId = useId();

  const selectedOption = TYPE_OPTIONS.find((opt) => opt.value === value);
  const showWarning = recommendedType && value !== recommendedType;

  function handleKeyDown(e: React.KeyboardEvent) {
    // Handle keyboard navigation for help icon
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setShowHelp(!showHelp);
    } else if (e.key === 'Escape' && showHelp) {
      setShowHelp(false);
    }
  }

  return (
    <div className="space-y-2" data-testid="type-selector">
      {/* Label with help icon */}
      <div className="flex items-center gap-2">
        <label
          htmlFor={selectId}
          className="block text-xs font-medium text-gray-700 dark:text-gray-300"
        >
          Relationship Type <span className="text-red-500">*</span>
        </label>
        
        {/* Help icon with tooltip */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowHelp(!showHelp)}
            onKeyDown={handleKeyDown}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-full"
            aria-label="Help: Relationship types"
            aria-expanded={showHelp}
            aria-controls={helpId}
            data-testid="type-selector-help"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </button>

          {/* Help tooltip */}
          {showHelp && (
            <div
              id={helpId}
              className="absolute left-0 top-6 z-10 w-64 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg text-xs"
              data-testid="type-selector-help-tooltip"
              role="tooltip"
            >
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                Relationship Types
              </h4>
              <ul className="space-y-2">
                {TYPE_OPTIONS.map((opt) => (
                  <li key={opt.value}>
                    <span className="font-mono text-indigo-600 dark:text-indigo-400">
                      {opt.icon} {opt.label}
                    </span>
                    <p className="text-gray-600 dark:text-gray-400 mt-0.5">
                      {opt.description}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Dropdown selector */}
      <select
        id={selectId}
        value={value}
        onChange={(e) => onChange(e.target.value as 'hasMany' | 'belongsTo' | 'manyToMany')}
        disabled={disabled}
        className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        data-testid="type-selector-dropdown"
        aria-describedby={showWarning ? 'type-warning' : undefined}
      >
        {TYPE_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value} data-testid={`type-option-${opt.value}`}>
            {opt.icon} {opt.label}
            {opt.value === recommendedType ? ' (Recommended)' : ''}
          </option>
        ))}
      </select>

      {/* Description of selected type */}
      {selectedOption && (
        <p className="text-xs text-gray-500 dark:text-gray-400" data-testid="type-description">
          {selectedOption.description}
        </p>
      )}

      {/* Warning when type doesn't match recommendation */}
      {showWarning && (
        <div
          id="type-warning"
          className="flex items-start gap-2 p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded text-xs text-amber-700 dark:text-amber-300"
          role="alert"
          data-testid="type-warning"
        >
          <svg
            className="w-4 h-4 flex-shrink-0 mt-0.5"
            fill="currentColor"
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          <span>
            Selected type doesn't match path pattern. Recommended: <strong>{recommendedType}</strong>
          </span>
        </div>
      )}
    </div>
  );
}
