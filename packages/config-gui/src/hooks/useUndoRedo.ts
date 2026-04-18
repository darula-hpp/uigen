import { useEffect, useRef, useCallback, useState } from 'react';
import { UndoRedoManager, type IgnoreAction, type AnnotationChange } from '../lib/undo-redo-manager.js';
import { useAppContext } from './useAppContext.js';
import type { ConfigFile } from '@uigen-dev/core';

/**
 * Hook for undo/redo functionality with keyboard shortcuts
 * 
 * Provides:
 * - Undo/redo methods
 * - Keyboard shortcuts (Ctrl+Z, Ctrl+Y / Cmd+Z, Cmd+Shift+Z)
 * - Integration with config file updates
 * - Can undo/redo state
 * 
 * Requirements: 15.1, 15.2, 15.3, 15.4, 15.5
 */
export function useUndoRedo() {
  const { state: appState, actions: appActions } = useAppContext();
  const managerRef = useRef(new UndoRedoManager());
  const [canUndoState, setCanUndoState] = useState(false);
  const [canRedoState, setCanRedoState] = useState(false);

  /**
   * Apply annotation changes to config
   */
  const applyChanges = useCallback((changes: AnnotationChange[]) => {
    if (!appState.config) return;

    const newConfig: ConfigFile = {
      ...appState.config,
      annotations: {
        ...appState.config.annotations
      }
    };

    changes.forEach(change => {
      if (change.after === undefined) {
        // Remove annotation
        if (newConfig.annotations[change.path]) {
          delete newConfig.annotations[change.path]['x-uigen-ignore'];
          
          // If no other annotations exist for this path, remove the path entry
          if (Object.keys(newConfig.annotations[change.path]).length === 0) {
            delete newConfig.annotations[change.path];
          }
        }
      } else {
        // Set annotation
        if (!newConfig.annotations[change.path]) {
          newConfig.annotations[change.path] = {};
        }
        newConfig.annotations[change.path]['x-uigen-ignore'] = change.after;
      }
    });

    appActions.saveConfig(newConfig);
  }, [appState.config, appActions]);

  /**
   * Push a new action onto the undo stack
   */
  const pushAction = useCallback((action: IgnoreAction) => {
    managerRef.current.push(action);
    setCanUndoState(managerRef.current.canUndo());
    setCanRedoState(managerRef.current.canRedo());
  }, []);

  /**
   * Undo the last action
   */
  const undo = useCallback(() => {
    const changes = managerRef.current.undo();
    if (changes) {
      applyChanges(changes);
    }
    setCanUndoState(managerRef.current.canUndo());
    setCanRedoState(managerRef.current.canRedo());
  }, [applyChanges]);

  /**
   * Redo the last undone action
   */
  const redo = useCallback(() => {
    const changes = managerRef.current.redo();
    if (changes) {
      applyChanges(changes);
    }
    setCanUndoState(managerRef.current.canUndo());
    setCanRedoState(managerRef.current.canRedo());
  }, [applyChanges]);

  /**
   * Check if undo is available
   */
  const canUndo = useCallback(() => {
    return managerRef.current.canUndo();
  }, []);

  /**
   * Check if redo is available
   */
  const canRedo = useCallback(() => {
    return managerRef.current.canRedo();
  }, []);

  /**
   * Clear the undo/redo stack
   */
  const clear = useCallback(() => {
    managerRef.current.clear();
    setCanUndoState(false);
    setCanRedoState(false);
  }, []);

  /**
   * Set up keyboard shortcuts
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const isCtrlOrCmd = isMac ? e.metaKey : e.ctrlKey;

      if (isCtrlOrCmd && e.key === 'z') {
        e.preventDefault();
        
        if (e.shiftKey || (isMac && e.shiftKey)) {
          // Ctrl+Shift+Z or Cmd+Shift+Z: Redo
          redo();
        } else {
          // Ctrl+Z or Cmd+Z: Undo
          undo();
        }
      } else if (isCtrlOrCmd && e.key === 'y' && !isMac) {
        // Ctrl+Y: Redo (Windows/Linux only)
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [undo, redo]);

  return {
    pushAction,
    undo,
    redo,
    canUndo: canUndoState,
    canRedo: canRedoState,
    clear
  };
}
