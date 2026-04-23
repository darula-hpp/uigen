import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook for managing state synchronized with URL query parameters
 * 
 * @param key - The URL query parameter key
 * @param defaultValue - The default value if no URL parameter exists
 * @param validValues - Optional array of valid values for validation
 * @returns A tuple of [value, setValue] similar to useState
 * 
 * @example
 * const [activeTab, setActiveTab] = useUrlState('tab', 'annotations', ['annotations', 'visual', 'preview']);
 */
export function useUrlState<T extends string>(
  key: string,
  defaultValue: T,
  validValues?: readonly T[]
): [T, (newValue: T) => void] {
  const getInitialValue = useCallback((): T => {
    const params = new URLSearchParams(window.location.search);
    const value = params.get(key) as T | null;
    
    // Validate against allowed values if provided
    if (value && validValues && !validValues.includes(value)) {
      return defaultValue;
    }
    
    return value || defaultValue;
  }, [key, defaultValue, validValues]);

  const [value, setValue] = useState<T>(getInitialValue());

  const updateValue = useCallback((newValue: T) => {
    setValue(newValue);
    
    const params = new URLSearchParams(window.location.search);
    params.set(key, newValue);
    
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.pushState({}, '', newUrl);
  }, [key]);

  useEffect(() => {
    const handlePopState = () => {
      setValue(getInitialValue());
    };
    
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [getInitialValue]);

  return [value, updateValue];
}
