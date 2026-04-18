import React, { useState, useEffect } from 'react';
import { Eye, EyeOff } from 'lucide-react';

/**
 * ShowPrunedToggle Component
 * 
 * Provides a toggle to show/hide children of ignored parents in the Visual Editor.
 * The preference is persisted in browser local storage.
 * 
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
 */

const STORAGE_KEY = 'uigen-show-pruned-elements';

export interface ShowPrunedToggleProps {
  /** Callback when toggle state changes */
  onChange: (showPruned: boolean) => void;
  
  /** Optional initial value (defaults to true) */
  initialValue?: boolean;
}

/**
 * ShowPrunedToggle component allows users to control visibility of pruned elements.
 * 
 * Features:
 * - Toggle switch with eye icon
 * - Persists preference in local storage
 * - Default state is enabled (show pruned elements)
 * - Clear visual feedback with labels
 * - Accessible with keyboard support
 * 
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
 * 
 * Usage:
 * ```tsx
 * <ShowPrunedToggle
 *   onChange={(showPruned) => handleShowPrunedChange(showPruned)}
 * />
 * ```
 */
export function ShowPrunedToggle({
  onChange,
  initialValue = true
}: ShowPrunedToggleProps) {
  // Load initial state from local storage or use default
  const [showPruned, setShowPruned] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored !== null) {
        return stored === 'true';
      }
    } catch (error) {
      console.warn('Failed to load show pruned preference from local storage:', error);
    }
    return initialValue;
  });
  
  // Notify parent of initial state
  useEffect(() => {
    onChange(showPruned);
  }, []);
  
  // Handle toggle change
  const handleToggle = () => {
    const newValue = !showPruned;
    setShowPruned(newValue);
    
    // Persist to local storage
    try {
      localStorage.setItem(STORAGE_KEY, String(newValue));
    } catch (error) {
      console.warn('Failed to save show pruned preference to local storage:', error);
    }
    
    // Notify parent
    onChange(newValue);
  };
  
  return (
    <div
      className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700"
      data-testid="show-pruned-toggle-container"
    >
      {/* Icon */}
      <div className="text-gray-600 dark:text-gray-400">
        {showPruned ? (
          <Eye className="w-4 h-4" data-testid="eye-icon" />
        ) : (
          <EyeOff className="w-4 h-4" data-testid="eye-off-icon" />
        )}
      </div>
      
      {/* Label */}
      <span className="text-sm text-gray-700 dark:text-gray-300 select-none">
        Show Pruned Elements
      </span>
      
      {/* Toggle switch */}
      <button
        role="switch"
        aria-checked={showPruned}
        aria-label="Toggle show pruned elements"
        onClick={handleToggle}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-400 dark:focus:ring-offset-gray-800 ${
          showPruned
            ? 'bg-indigo-500 dark:bg-indigo-600'
            : 'bg-gray-300 dark:bg-gray-600'
        }`}
        title={
          showPruned
            ? 'Hide children of ignored parents'
            : 'Show children of ignored parents'
        }
        data-testid="show-pruned-toggle-switch"
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
            showPruned ? 'translate-x-4' : 'translate-x-0.5'
          }`}
        />
      </button>
      
      {/* State label */}
      <span
        className={`text-xs font-medium ${
          showPruned
            ? 'text-indigo-600 dark:text-indigo-400'
            : 'text-gray-500 dark:text-gray-400'
        }`}
        data-testid="show-pruned-toggle-label"
      >
        {showPruned ? 'On' : 'Off'}
      </span>
    </div>
  );
}
