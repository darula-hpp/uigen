import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';

/**
 * Keyboard navigation state
 * Requirements: 21.1, 21.2, 21.3, 21.4
 */
export interface KeyboardNavigationState {
  /** Currently focused element path */
  focusedPath: string | null;
  /** All navigable element paths in order */
  navigablePaths: string[];
  /** Whether keyboard navigation is active */
  isActive: boolean;
}

/**
 * Actions for managing keyboard navigation
 */
export interface KeyboardNavigationActions {
  /**
   * Set the focused element
   */
  setFocusedPath: (path: string | null) => void;
  
  /**
   * Register navigable elements
   */
  setNavigablePaths: (paths: string[]) => void;
  
  /**
   * Move focus to next element
   */
  focusNext: () => void;
  
  /**
   * Move focus to previous element
   */
  focusPrevious: () => void;
  
  /**
   * Activate keyboard navigation mode
   */
  activate: () => void;
  
  /**
   * Deactivate keyboard navigation mode
   */
  deactivate: () => void;
}

/**
 * Combined context value
 */
export interface KeyboardNavigationContextValue {
  state: KeyboardNavigationState;
  actions: KeyboardNavigationActions;
}

/**
 * React Context for keyboard navigation
 */
export const KeyboardNavigationContext = createContext<KeyboardNavigationContextValue | undefined>(undefined);

/**
 * Props for KeyboardNavigationProvider
 */
export interface KeyboardNavigationProviderProps {
  children: ReactNode;
}

/**
 * Provider component for keyboard navigation state
 * 
 * Manages keyboard navigation with:
 * - Arrow key navigation between elements
 * - Focus tracking
 * - Navigable element registration
 * 
 * Requirements: 21.1, 21.2, 21.3, 21.4
 */
export function KeyboardNavigationProvider({ children }: KeyboardNavigationProviderProps) {
  const [focusedPath, setFocusedPath] = useState<string | null>(null);
  const [navigablePaths, setNavigablePaths] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(false);

  /**
   * Move focus to next element
   */
  const focusNext = useCallback(() => {
    if (navigablePaths.length === 0) return;
    
    if (!focusedPath) {
      setFocusedPath(navigablePaths[0]);
      return;
    }
    
    const currentIndex = navigablePaths.indexOf(focusedPath);
    if (currentIndex === -1 || currentIndex === navigablePaths.length - 1) {
      setFocusedPath(navigablePaths[0]);
    } else {
      setFocusedPath(navigablePaths[currentIndex + 1]);
    }
  }, [focusedPath, navigablePaths]);

  /**
   * Move focus to previous element
   */
  const focusPrevious = useCallback(() => {
    if (navigablePaths.length === 0) return;
    
    if (!focusedPath) {
      setFocusedPath(navigablePaths[navigablePaths.length - 1]);
      return;
    }
    
    const currentIndex = navigablePaths.indexOf(focusedPath);
    if (currentIndex === -1 || currentIndex === 0) {
      setFocusedPath(navigablePaths[navigablePaths.length - 1]);
    } else {
      setFocusedPath(navigablePaths[currentIndex - 1]);
    }
  }, [focusedPath, navigablePaths]);

  /**
   * Activate keyboard navigation mode
   */
  const activate = useCallback(() => {
    setIsActive(true);
  }, []);

  /**
   * Deactivate keyboard navigation mode
   */
  const deactivate = useCallback(() => {
    setIsActive(false);
  }, []);

  const state: KeyboardNavigationState = {
    focusedPath,
    navigablePaths,
    isActive
  };

  const actions: KeyboardNavigationActions = {
    setFocusedPath,
    setNavigablePaths,
    focusNext,
    focusPrevious,
    activate,
    deactivate
  };

  const value: KeyboardNavigationContextValue = {
    state,
    actions
  };

  return (
    <KeyboardNavigationContext.Provider value={value}>
      {children}
    </KeyboardNavigationContext.Provider>
  );
}

/**
 * Hook to access keyboard navigation context
 * 
 * @returns Keyboard navigation context value
 * @throws Error if used outside KeyboardNavigationProvider
 */
export function useKeyboardNavigation(): KeyboardNavigationContextValue {
  const context = useContext(KeyboardNavigationContext);
  
  if (!context) {
    throw new Error('useKeyboardNavigation must be used within KeyboardNavigationProvider');
  }
  
  return context;
}
