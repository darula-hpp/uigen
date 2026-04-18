import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

/**
 * Selection state for multi-select functionality
 * Requirements: 16.1
 */
export interface SelectionState {
  selectedPaths: Set<string>;
  lastSelectedPath: string | null;
}

/**
 * Actions for managing selection
 */
export interface SelectionActions {
  /**
   * Toggle selection for a single element
   * Supports Ctrl+Click (Cmd+Click on Mac) for individual selection
   */
  toggleSelection: (path: string, isCtrlKey: boolean) => void;
  
  /**
   * Add range of elements to selection
   * Supports Shift+Click for range selection
   */
  selectRange: (fromPath: string, toPath: string, allPaths: string[]) => void;
  
  /**
   * Clear all selections
   */
  clearSelection: () => void;
  
  /**
   * Check if a path is selected
   */
  isSelected: (path: string) => boolean;
  
  /**
   * Get all selected paths as array
   */
  getSelectedPaths: () => string[];
  
  /**
   * Get count of selected elements
   */
  getSelectionCount: () => number;
}

/**
 * Combined context value
 */
export interface SelectionContextValue {
  state: SelectionState;
  actions: SelectionActions;
}

/**
 * React Context for selection state
 */
export const SelectionContext = createContext<SelectionContextValue | undefined>(undefined);

/**
 * Props for SelectionProvider
 */
export interface SelectionProviderProps {
  children: ReactNode;
}

/**
 * Provider component for selection state
 * 
 * Manages multi-select functionality with:
 * - Ctrl+Click (Cmd+Click) for individual selection
 * - Shift+Click for range selection
 * - Visual indicators for selected elements
 * 
 * Requirements: 16.1
 */
export function SelectionProvider({ children }: SelectionProviderProps) {
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
  const [lastSelectedPath, setLastSelectedPath] = useState<string | null>(null);

  /**
   * Toggle selection for a single element
   */
  const toggleSelection = useCallback((path: string, isCtrlKey: boolean) => {
    setSelectedPaths(prev => {
      const newSelection = new Set(prev);
      
      if (isCtrlKey) {
        // Ctrl+Click: toggle individual selection
        if (newSelection.has(path)) {
          newSelection.delete(path);
        } else {
          newSelection.add(path);
        }
      } else {
        // Regular click: select only this element
        newSelection.clear();
        newSelection.add(path);
      }
      
      return newSelection;
    });
    
    setLastSelectedPath(path);
  }, []);

  /**
   * Add range of elements to selection
   */
  const selectRange = useCallback((fromPath: string, toPath: string, allPaths: string[]) => {
    const fromIndex = allPaths.indexOf(fromPath);
    const toIndex = allPaths.indexOf(toPath);
    
    if (fromIndex === -1 || toIndex === -1) {
      return;
    }
    
    const startIndex = Math.min(fromIndex, toIndex);
    const endIndex = Math.max(fromIndex, toIndex);
    
    setSelectedPaths(prev => {
      const newSelection = new Set(prev);
      
      for (let i = startIndex; i <= endIndex; i++) {
        newSelection.add(allPaths[i]);
      }
      
      return newSelection;
    });
    
    setLastSelectedPath(toPath);
  }, []);

  /**
   * Clear all selections
   */
  const clearSelection = useCallback(() => {
    setSelectedPaths(new Set());
    setLastSelectedPath(null);
  }, []);

  /**
   * Check if a path is selected
   */
  const isSelected = useCallback((path: string) => {
    return selectedPaths.has(path);
  }, [selectedPaths]);

  /**
   * Get all selected paths as array
   */
  const getSelectedPaths = useCallback(() => {
    return Array.from(selectedPaths);
  }, [selectedPaths]);

  /**
   * Get count of selected elements
   */
  const getSelectionCount = useCallback(() => {
    return selectedPaths.size;
  }, [selectedPaths]);

  const state: SelectionState = {
    selectedPaths,
    lastSelectedPath
  };

  const actions: SelectionActions = {
    toggleSelection,
    selectRange,
    clearSelection,
    isSelected,
    getSelectedPaths,
    getSelectionCount
  };

  const value: SelectionContextValue = {
    state,
    actions
  };

  return (
    <SelectionContext.Provider value={value}>
      {children}
    </SelectionContext.Provider>
  );
}

/**
 * Hook to access selection context
 * 
 * @returns Selection context value
 * @throws Error if used outside SelectionProvider
 */
export function useSelection(): SelectionContextValue {
  const context = useContext(SelectionContext);
  
  if (!context) {
    throw new Error('useSelection must be used within SelectionProvider');
  }
  
  return context;
}
