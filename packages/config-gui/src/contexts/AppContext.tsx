import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import type { ConfigFile, AnnotationHandler } from '@uigen-dev/core';
import type { AnnotationMetadata } from '../types/index.js';
import { ConfigManager } from '../lib/config-manager.js';
import { MetadataExtractor } from '../lib/metadata-extractor.js';
import { SpecParser } from '../lib/spec-parser.js';

/**
 * Global application state for the Config GUI
 */
export interface AppState {
  /**
   * Current config file contents
   */
  config: ConfigFile | null;
  
  /**
   * All registered annotation handlers
   */
  handlers: AnnotationHandler[];
  
  /**
   * Extracted metadata for all annotations
   */
  annotations: AnnotationMetadata[];
  
  /**
   * Loading state
   */
  isLoading: boolean;
  
  /**
   * Error state
   */
  error: string | null;
  
  /**
   * Config file path
   */
  configPath: string;
  
  /**
   * Spec file path (passed from CLI)
   */
  specPath: string | null;
  
  /**
   * Parsed spec structure (passed from CLI)
   */
  specStructure: any | null;
}

/**
 * Actions for updating application state
 */
export interface AppActions {
  /**
   * Load config file from disk
   */
  loadConfig: () => Promise<void>;
  
  /**
   * Save config file to disk
   */
  saveConfig: (config: ConfigFile) => Promise<void>;
  
  /**
   * Update config in memory (without saving)
   */
  updateConfig: (config: ConfigFile) => void;
  
  /**
   * Set error message
   */
  setError: (error: string | null) => void;
  
  /**
   * Clear error message
   */
  clearError: () => void;
}

/**
 * Combined context value
 */
export interface AppContextValue {
  state: AppState;
  actions: AppActions;
}

/**
 * React Context for global application state
 */
export const AppContext = createContext<AppContextValue | undefined>(undefined);

/**
 * Props for AppProvider
 */
export interface AppProviderProps {
  children: ReactNode;
  configPath?: string;
  specPath?: string;
  specStructure?: any;
  handlers?: AnnotationHandler[];
}

/**
 * Provider component for global application state
 * 
 * Manages:
 * - Config file loading and saving
 * - Annotation metadata extraction
 * - Global error state
 * - Loading state
 * 
 * Requirements: 1.5
 */
export function AppProvider({ children, configPath = '.uigen/config.yaml', specPath, specStructure, handlers = [] }: AppProviderProps) {
  const [config, setConfig] = useState<ConfigFile | null>(null);
  const [annotations, setAnnotations] = useState<AnnotationMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadedSpecStructure, setLoadedSpecStructure] = useState<any>(specStructure || null);
  const [loadedHandlers, setLoadedHandlers] = useState<AnnotationHandler[]>(handlers);
  
  // Use refs to avoid dependency issues
  const configManagerRef = useRef(new ConfigManager({ apiBaseUrl: '' }));
  const metadataExtractorRef = useRef(new MetadataExtractor());
  const specParserRef = useRef(new SpecParser());
  const initializedRef = useRef(false);
  
  /**
   * Load config file via API
   */
  const loadConfig = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const loadedConfig = await configManagerRef.current.read();
      
      // If no config file exists, create default config
      if (!loadedConfig) {
        const defaultConfig: ConfigFile = {
          version: '1.0',
          enabled: {},
          defaults: {},
          annotations: {}
        };
        setConfig(defaultConfig);
      } else {
        setConfig(loadedConfig);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(`Failed to load config: ${errorMessage}`);
      console.error('Failed to load config:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  /**
   * Load spec structure via API
   */
  const loadSpecStructure = useCallback(async () => {
    // If spec structure was passed as prop, use it
    if (specStructure) {
      setLoadedSpecStructure(specStructure);
      return;
    }
    
    // Otherwise, load from API
    try {
      const response = await fetch('/api/spec', {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        console.warn('Failed to load spec structure from API');
        return;
      }
      
      const uigenApp = await response.json();
      
      // Parse the UIGenApp into the structure needed by VisualEditor
      const parsedStructure = specParserRef.current.parse(uigenApp);
      setLoadedSpecStructure(parsedStructure);
    } catch (err) {
      console.warn('Failed to load spec structure:', err);
    }
  }, [specStructure]);
  
  /**
   * Load annotation handlers metadata via API
   */
  const loadAnnotationHandlers = useCallback(async () => {
    // If handlers were passed as props, use them
    if (handlers.length > 0) {
      setLoadedHandlers(handlers);
      return;
    }
    
    // Otherwise, load metadata from API
    try {
      const response = await fetch('/api/annotations', {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        console.warn('Failed to load annotation handlers from API');
        return;
      }
      
      const metadata = await response.json();
      setAnnotations(metadata);
    } catch (err) {
      console.warn('Failed to load annotation handlers:', err);
    }
  }, [handlers.length]);
  
  /**
   * Load config file, spec structure, and annotation handlers on mount ONCE
   */
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    
    const initialize = async () => {
      await loadConfig();
      await loadSpecStructure();
      await loadAnnotationHandlers();
    };
    initialize();
  }, []);
  
  /**
   * Extract annotation metadata when handlers change
   */
  useEffect(() => {
    if (loadedHandlers.length > 0) {
      const metadata = metadataExtractorRef.current.extractAll(loadedHandlers);
      setAnnotations(metadata);
    }
  }, [loadedHandlers]);
  
  /**
   * Save config file via API
   */
  const saveConfig = useCallback(async (newConfig: ConfigFile) => {
    setError(null);
    
    try {
      await configManagerRef.current.write(newConfig);
      setConfig(newConfig);
      // Don't reload - just update the state
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(`Failed to save config: ${errorMessage}`);
      console.error('Failed to save config:', err);
      throw err;
    }
  }, []);
  
  /**
   * Update config in memory without saving
   */
  const updateConfig = (newConfig: ConfigFile) => {
    setConfig(newConfig);
  };
  
  /**
   * Clear error message
   */
  const clearError = () => {
    setError(null);
  };
  
  const state: AppState = {
    config,
    handlers: loadedHandlers,
    annotations,
    isLoading,
    error,
    configPath,
    specPath: specPath || null,
    specStructure: loadedSpecStructure
  };
  
  const actions: AppActions = {
    loadConfig,
    saveConfig,
    updateConfig,
    setError,
    clearError
  };
  
  const value: AppContextValue = {
    state,
    actions
  };
  
  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

/**
 * Hook to access application context
 * 
 * @returns Application context value
 * @throws Error if used outside AppProvider
 */
export function useAppContext(): AppContextValue {
  const context = useContext(AppContext);
  
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  
  return context;
}
