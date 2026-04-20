import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { MultiSelectOption } from '../../lib/mime-types.js';

/**
 * Props for MultiSelect component
 */
export interface MultiSelectProps {
  /** Currently selected values */
  value: string[];
  /** Callback when selection changes */
  onChange: (value: string[]) => void;
  /** Available options with grouping */
  options: MultiSelectOption[];
  /** Placeholder text when no items selected */
  placeholder?: string;
  /** Label for the control */
  label?: string;
  /** Optional description text */
  description?: string;
  /** Whether the control is disabled */
  disabled?: boolean;
  /** ID for the input element */
  id?: string;
}

/**
 * MultiSelect component provides a dropdown with checkboxes for selecting multiple options.
 * 
 * Features:
 * - Dropdown with checkboxes for each option
 * - Selected items displayed as removable chips
 * - Search/filter functionality
 * - Options grouped by category
 * - "Select All" and "Clear All" actions
 * - Keyboard navigation (Arrow keys, Enter, Escape)
 * - Shows count of selected items
 * - Accessible with proper ARIA attributes
 * 
 * Requirements: 3.2
 */
export function MultiSelect({
  value,
  onChange,
  options,
  placeholder = 'Select items...',
  label,
  description,
  disabled = false,
  id = 'multi-select'
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Group options by category
  const groupedOptions = options.reduce((acc, option) => {
    const group = option.group || 'Other';
    if (!acc[group]) {
      acc[group] = [];
    }
    acc[group].push(option);
    return acc;
  }, {} as Record<string, MultiSelectOption[]>);
  
  // Filter options based on search query
  const filteredGroupedOptions = Object.entries(groupedOptions).reduce((acc, [group, opts]) => {
    const filtered = opts.filter(opt => 
      opt.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      opt.value.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (opt.description && opt.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );
    if (filtered.length > 0) {
      acc[group] = filtered;
    }
    return acc;
  }, {} as Record<string, MultiSelectOption[]>);
  
  // Flatten filtered options for keyboard navigation
  const flatFilteredOptions = Object.values(filteredGroupedOptions).flat();
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
          triggerRef.current && !triggerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
        setFocusedIndex(-1);
      }
    };
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);
  
  // Calculate dropdown position when opened
  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const updatePosition = () => {
        if (triggerRef.current) {
          const rect = triggerRef.current.getBoundingClientRect();
          setDropdownPosition({
            top: rect.bottom + 4,
            left: rect.left,
            width: rect.width
          });
        }
      };
      
      updatePosition();
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
      
      return () => {
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [isOpen]);
  
  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);
  
  /**
   * Toggle dropdown open/close
   */
  const toggleDropdown = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
      if (!isOpen) {
        setSearchQuery('');
        setFocusedIndex(-1);
      }
    }
  };
  
  /**
   * Toggle selection of an option
   */
  const toggleOption = (optionValue: string) => {
    if (value.includes(optionValue)) {
      onChange(value.filter(v => v !== optionValue));
    } else {
      onChange([...value, optionValue]);
    }
  };
  
  /**
   * Remove a selected item
   */
  const removeItem = (itemValue: string) => {
    onChange(value.filter(v => v !== itemValue));
  };
  
  /**
   * Select all filtered options
   */
  const selectAll = () => {
    const allValues = flatFilteredOptions.map(opt => opt.value);
    const newValue = [...new Set([...value, ...allValues])];
    onChange(newValue);
  };
  
  /**
   * Clear all selections
   */
  const clearAll = () => {
    onChange([]);
  };
  
  /**
   * Handle keyboard navigation
   */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleDropdown();
      }
      return;
    }
    
    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setSearchQuery('');
        setFocusedIndex(-1);
        break;
        
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex(prev => 
          prev < flatFilteredOptions.length - 1 ? prev + 1 : prev
        );
        break;
        
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
        
      case 'Enter':
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < flatFilteredOptions.length) {
          toggleOption(flatFilteredOptions[focusedIndex].value);
        }
        break;
    }
  };
  
  /**
   * Get label for a selected value
   */
  const getOptionLabel = (optionValue: string): string => {
    const option = options.find(opt => opt.value === optionValue);
    return option?.label || optionValue;
  };
  
  return (
    <div className="space-y-2">
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}
      
      {description && (
        <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
      )}
      
      {/* Main control */}
      <div className="relative">
        {/* Selected items display / trigger */}
        <div
          ref={triggerRef}
          id={id}
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-controls={`${id}-listbox`}
          aria-disabled={disabled}
          tabIndex={disabled ? -1 : 0}
          onKeyDown={handleKeyDown}
          onClick={toggleDropdown}
          className={`min-h-[42px] px-3 py-2 border rounded-md bg-white dark:bg-gray-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            disabled 
              ? 'opacity-50 cursor-not-allowed border-gray-200 dark:border-gray-700' 
              : 'border-gray-300 dark:border-gray-600'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 flex flex-wrap gap-1.5">
              {value.length === 0 ? (
                <span className="text-gray-400 dark:text-gray-500">{placeholder}</span>
              ) : (
                value.map(item => (
                  <span
                    key={item}
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-sm rounded"
                  >
                    <span>{getOptionLabel(item)}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeItem(item);
                      }}
                      disabled={disabled}
                      aria-label={`Remove ${getOptionLabel(item)}`}
                      className="hover:text-blue-600 dark:hover:text-blue-300 focus:outline-none"
                    >
                      ×
                    </button>
                  </span>
                ))
              )}
            </div>
            
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              {value.length > 0 && (
                <span className="font-medium">{value.length} selected</span>
              )}
              <svg
                className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>
        
        {/* Dropdown - rendered via portal */}
        {isOpen && createPortal(
          <div
            ref={dropdownRef}
            id={`${id}-listbox`}
            role="listbox"
            aria-multiselectable="true"
            style={{
              position: 'fixed',
              top: `${dropdownPosition.top}px`,
              left: `${dropdownPosition.left}px`,
              width: `${dropdownPosition.width}px`,
              zIndex: 9999
            }}
            className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-80 overflow-hidden"
          >
            {/* Search input */}
            <div className="p-2 border-b border-gray-200 dark:border-gray-700">
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search..."
                aria-label="Search options"
                className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            {/* Actions */}
            <div className="flex gap-2 p-2 border-b border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={selectAll}
                className="flex-1 px-3 py-1.5 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Select All
              </button>
              <button
                type="button"
                onClick={clearAll}
                className="flex-1 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Clear All
              </button>
            </div>
            
            {/* Options list */}
            <div className="overflow-y-auto max-h-60">
              {Object.keys(filteredGroupedOptions).length === 0 ? (
                <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                  No options found
                </div>
              ) : (
                Object.entries(filteredGroupedOptions).map(([group, opts]) => (
                  <div key={group}>
                    {/* Group header */}
                    <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 sticky top-0">
                      {group}
                    </div>
                    
                    {/* Group options */}
                    {opts.map((option, index) => {
                      const globalIndex = flatFilteredOptions.indexOf(option);
                      const isSelected = value.includes(option.value);
                      const isFocused = globalIndex === focusedIndex;
                      
                      return (
                        <div
                          key={option.value}
                          role="option"
                          aria-selected={isSelected}
                          onClick={() => toggleOption(option.value)}
                          className={`px-3 py-2 cursor-pointer flex items-start gap-2 ${
                            isFocused ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                          } ${
                            isSelected ? 'bg-blue-50 dark:bg-blue-900/30' : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                          }`}
                        >
                          {/* Checkbox */}
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}} // Handled by parent div onClick
                            tabIndex={-1}
                            aria-hidden="true"
                            className="mt-0.5 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          
                          {/* Label and description */}
                          <div className="flex-1 min-w-0">
                            <div className="text-sm text-gray-900 dark:text-white">
                              {option.label}
                            </div>
                            {option.description && (
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {option.description}
                              </div>
                            )}
                            <div className="text-xs text-gray-400 dark:text-gray-500 font-mono">
                              {option.value}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
          </div>,
          document.body
        )}
      </div>
    </div>
  );
}
