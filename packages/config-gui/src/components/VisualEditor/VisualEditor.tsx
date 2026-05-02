import { useState, useEffect, useCallback, useMemo } from 'react';
import { SchemaPropertyNode } from './ElementTree/SchemaPropertyNode.js';
import { OperationIgnoreNode } from './ElementTree/OperationIgnoreNode.js';
import { RefLinkVisualCanvas } from './RefLinkVisualCanvas.js';
import { ValidationWarnings } from './ValidationWarnings.js';
import type { SpecStructure, ResourceNode } from '../../types/index.js';
import { useKeyboardNavigation } from '../../contexts/KeyboardNavigationContext.js';
import { useAppContext } from '../../contexts/AppContext.js';
import { ValidationEngine } from '../../lib/validation-engine.js';
import { ErrorDialog } from '../ErrorDialog.js';

/**
 * Props for VisualEditor component
 */
export interface VisualEditorProps {
  structure: SpecStructure | null;
}

/**
 * VisualEditor is the main component that integrates all visual editor sub-components.
 *
 * Features:
 * - Displays spec structure in a tree view (SpecTree)
 * - Provides interactive annotation controls for fields (FieldNode)
 * - Provides interactive annotation controls for operations (OperationNode)
 * - Enables drag-and-drop ref linking (RefLinkVisualCanvas)
 * - Handles annotation deletion via visual controls
 * - Saves all changes to config file immediately
 * - Keyboard navigation with arrow keys, Enter, Space, Tab
 * - Keyboard shortcuts: I (toggle ignore), O (override), C (clear overrides)
 * - Accessibility support with ARIA labels and live regions
 *
 * The visual editor is organized into three main sections:
 * 1. Spec Structure - Tree view with inline annotation controls
 * 2. Ref Link Manager - Drag-and-drop interface for x-uigen-ref
 * 3. Help Text - Instructions for using the visual editor
 *
 * Requirements: 6.8, 6.10, 21.1, 21.2, 21.3, 21.4, 21.5, 22.1, 22.2
 *
 * Usage:
 * ```tsx
 * <VisualEditor structure={specStructure} />
 * ```
 */
export function VisualEditor({ structure }: VisualEditorProps) {
  const [activeTab, setActiveTab] = useState<'structure' | 'refs'>('structure');
  const { state: navState, actions: navActions } = useKeyboardNavigation();
  const { state: appState, actions: appActions } = useAppContext();
  const [ariaLiveMessage, setAriaLiveMessage] = useState<string>('');
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [pendingConfig, setPendingConfig] = useState<any>(null);
  
  // Initialize validation engine
  const validationEngine = useMemo(() => new ValidationEngine(), []);
  
  // Compute validation warnings
  // Requirements: 20.1, 20.2, 20.3, 20.5
  const validationWarnings = useMemo(() => {
    if (!appState.config || !appState.specStructure) {
      return [];
    }
    return validationEngine.validateConfig(appState.config, appState.specStructure);
  }, [appState.config, appState.specStructure, validationEngine]);

  // Keyboard navigation handler
  // Requirements: 21.1, 21.2, 21.3, 21.4, 21.5
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle keyboard navigation in structure tab
      if (activeTab !== 'structure') return;

      // Arrow key navigation
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        navActions.focusNext();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        navActions.focusPrevious();
      }
      // Enter key to toggle selected element (handled by individual components)
      // Space key to expand/collapse tree nodes (handled by ResourceSection)
      // Tab/Shift+Tab for interactive element navigation (browser default)
      
      // Keyboard shortcuts (only when not in an input field)
      const target = e.target as HTMLElement;
      const isInputField = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
      
      if (!isInputField && !e.ctrlKey && !e.metaKey && !e.altKey) {
        // "I" to toggle ignore on selected element
        if (e.key === 'i' || e.key === 'I') {
          e.preventDefault();
          triggerToggleOnFocused();
        }
        // "O" to override parent ignore
        else if (e.key === 'o' || e.key === 'O') {
          e.preventDefault();
          triggerOverrideOnFocused();
        }
        // "C" to clear overrides
        else if (e.key === 'c' || e.key === 'C') {
          e.preventDefault();
          triggerClearOverridesOnFocused();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, navActions, navState.focusedPath]);

  // Helper functions for keyboard shortcuts
  const triggerToggleOnFocused = useCallback(() => {
    if (!navState.focusedPath) return;
    
    // Find the element and trigger its toggle
    const element = document.querySelector(`[data-field-path="${navState.focusedPath}"], [data-operation-path="${navState.focusedPath}"]`);
    if (element) {
      const toggleButton = element.querySelector('[role="switch"]') as HTMLButtonElement;
      if (toggleButton && !toggleButton.disabled) {
        toggleButton.click();
        announceStateChange('Toggled ignore state');
      }
    }
  }, [navState.focusedPath]);

  const triggerOverrideOnFocused = useCallback(() => {
    if (!navState.focusedPath) return;
    
    // Find the element and trigger its override button
    const element = document.querySelector(`[data-field-path="${navState.focusedPath}"], [data-operation-path="${navState.focusedPath}"]`);
    if (element) {
      const overrideButton = element.querySelector('[data-testid="override-button"]') as HTMLButtonElement;
      if (overrideButton) {
        overrideButton.click();
        announceStateChange('Override applied');
      }
    }
  }, [navState.focusedPath]);

  const triggerClearOverridesOnFocused = useCallback(() => {
    if (!navState.focusedPath) return;
    
    // Find the element and trigger its clear overrides button
    const element = document.querySelector(`[data-field-path="${navState.focusedPath}"], [data-operation-path="${navState.focusedPath}"]`);
    if (element) {
      const clearButton = element.querySelector('[data-testid="clear-overrides-button"]') as HTMLButtonElement;
      if (clearButton) {
        clearButton.click();
        announceStateChange('Overrides cleared');
      }
    }
  }, [navState.focusedPath]);

  // Announce state changes to screen readers
  // Requirements: 22.2
  const announceStateChange = useCallback((message: string) => {
    setAriaLiveMessage(message);
    // Clear message after announcement
    setTimeout(() => setAriaLiveMessage(''), 1000);
  }, []);

  // Activate keyboard navigation when component mounts
  useEffect(() => {
    navActions.activate();
    return () => navActions.deactivate();
  }, [navActions]);
  
  // Handle navigation to validation warning paths
  // Requirements: 20.5
  const handleNavigateToWarning = useCallback((path: string) => {
    // Focus the element at the given path
    navActions.setFocusedPath(path);
    
    // Scroll to the element
    const element = document.querySelector(`[data-field-path="${path}"], [data-operation-path="${path}"]`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [navActions]);
  
  // Handle error dialog retry
  // Requirements: 20.4
  const handleRetry = useCallback(async () => {
    if (pendingConfig) {
      try {
        await appActions.saveConfigImmediate(pendingConfig);
        setShowErrorDialog(false);
        setPendingConfig(null);
        appActions.clearError();
      } catch (err) {
        // Error will be set by saveConfigImmediate
      }
    }
  }, [pendingConfig, appActions]);
  
  // Handle copy error to clipboard
  // Requirements: 20.4
  const handleCopyError = useCallback(() => {
    if (appState.error) {
      navigator.clipboard.writeText(appState.error);
    }
  }, [appState.error]);
  
  // Show error dialog when error occurs
  useEffect(() => {
    if (appState.error) {
      setShowErrorDialog(true);
      if (appState.config) {
        setPendingConfig(appState.config);
      }
    }
  }, [appState.error, appState.config]);

  if (!structure) {
    return (
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-8">
        <div className="text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No spec loaded</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Load a spec file to start configuring annotations visually.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="visual-editor">
      {/* Error Dialog */}
      {/* Requirements: 20.4 */}
      <ErrorDialog
        isOpen={showErrorDialog}
        title="Failed to Save Configuration"
        message={appState.error || 'An unknown error occurred'}
        onRetry={handleRetry}
        onCopyToClipboard={handleCopyError}
        onClose={() => {
          setShowErrorDialog(false);
          appActions.clearError();
        }}
      />
      
      {/* ARIA live region for state change announcements */}
      {/* Requirements: 22.2 */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {ariaLiveMessage}
      </div>

      {/* Tab Navigation */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        {/* Validation Warnings */}
        {/* Requirements: 20.1, 20.2, 20.3, 20.5 */}
        <ValidationWarnings
          warnings={validationWarnings}
          onNavigate={handleNavigateToWarning}
        />
        
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex -mb-px" aria-label="Visual editor tabs" role="tablist">
            <button
              onClick={() => setActiveTab('structure')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'structure'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
              role="tab"
              aria-selected={activeTab === 'structure'}
              aria-controls="structure-panel"
              data-testid="structure-tab"
            >
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 10h16M4 14h16M4 18h16"
                  />
                </svg>
                Spec Structure
              </div>
            </button>
            <button
              onClick={() => setActiveTab('refs')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'refs'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
              role="tab"
              aria-selected={activeTab === 'refs'}
              aria-controls="refs-panel"
              data-testid="refs-tab"
            >
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                  />
                </svg>
                Ref Links
              </div>
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'structure' && (
            <div role="tabpanel" id="structure-panel" aria-labelledby="structure-tab">
              <StructureView structure={structure} />
            </div>
          )}
          {activeTab === 'refs' && (
            <div role="tabpanel" id="refs-panel" aria-labelledby="refs-tab">
              <RefsView structure={structure} />
            </div>
          )}
        </div>
      </div>

      {/* Help Text */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4" role="complementary" aria-label="Visual editor tips">
        <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-2">
          Visual Editor Tips
        </h4>
        <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
          <li className="flex items-start gap-2">
            <span className="text-blue-600 dark:text-blue-400 mt-0.5">•</span>
            <span>
              <strong>Labels:</strong> Click on a field's label badge or "+ label" button to edit inline
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 dark:text-blue-400 mt-0.5">•</span>
            <span>
              <strong>Ignore:</strong> Toggle the switch next to a field to add/remove x-uigen-ignore
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 dark:text-blue-400 mt-0.5">•</span>
            <span>
              <strong>Login:</strong> Toggle the switch next to an operation to mark it as the login endpoint
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 dark:text-blue-400 mt-0.5">•</span>
            <span>
              <strong>Ref Links:</strong> Switch to the "Ref Links" tab to create references by dragging fields onto resources
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 dark:text-blue-400 mt-0.5">•</span>
            <span>
              <strong>Keyboard:</strong> Use arrow keys to navigate, Enter to toggle, I to ignore, O to override, C to clear overrides
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
}

/**
 * StructureView displays the spec structure with inline annotation controls
 * Requirements: 21.1, 21.2, 22.3, 22.5
 */
interface StructureViewProps {
  structure: SpecStructure;
}

function StructureView({ structure }: StructureViewProps) {
  const { actions: navActions } = useKeyboardNavigation();

  // Register all navigable paths when structure changes
  // Requirements: 21.1
  useEffect(() => {
    const paths: string[] = [];
    
    structure.resources.forEach(resource => {
      // Add operation paths
      resource.operations.forEach(operation => {
        paths.push(`${operation.method}:${operation.path}`);
      });
      
      // Add field paths
      resource.fields.forEach(field => {
        paths.push(field.path);
      });
    });
    
    navActions.setNavigablePaths(paths);
  }, [structure, navActions]);

  return (
    <div className="space-y-6" role="region" aria-label="API Resources">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          API Resources
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
          Configure annotations directly on fields and operations below. Changes are saved immediately.
        </p>
      </div>

      <div className="space-y-4">
        {structure.resources.map(resource => (
          <ResourceSection key={resource.slug} resource={resource} />
        ))}
      </div>
    </div>
  );
}

/**
 * ResourceSection displays a single resource with its operations and fields
 * Requirements: 21.3, 22.3
 */
interface ResourceSectionProps {
  resource: ResourceNode;
}

function ResourceSection({ resource }: ResourceSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  // Handle Space key to expand/collapse
  // Requirements: 21.3
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Spacebar') {
      e.preventDefault();
      setIsExpanded(!isExpanded);
    }
  };

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        onKeyDown={handleKeyDown}
        className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
        aria-expanded={isExpanded}
        aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${resource.name} resource`}
      >
        <span className="text-gray-400 dark:text-gray-500" aria-hidden="true">
          {isExpanded ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          )}
        </span>
        <span className="text-blue-600 dark:text-blue-400" aria-hidden="true">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
            />
          </svg>
        </span>
        <span className="flex-1 font-semibold text-gray-900 dark:text-white">{resource.name}</span>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {resource.operations.length} operation{resource.operations.length !== 1 ? 's' : ''}, {resource.fields.length} field{resource.fields.length !== 1 ? 's' : ''}
        </span>
      </button>

      {isExpanded && (
        <div className="p-4 space-y-6">
          {resource.description && (
            <p className="text-sm text-gray-600 dark:text-gray-300">{resource.description}</p>
          )}

          {/* Operations */}
          {resource.operations.length > 0 && (
            <div role="group" aria-labelledby={`${resource.slug}-operations-heading`}>
              <h4 id={`${resource.slug}-operations-heading`} className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Operations</h4>
              <div className="space-y-2">
                {resource.operations.map(operation => (
                  <div key={operation.id}>
                    <OperationIgnoreNode operation={operation} />
                    {/* Show request body fields if present */}
                    {operation.requestBodyFields && operation.requestBodyFields.length > 0 && (
                      <div className="ml-8 mt-1 space-y-1 border-l-2 border-gray-200 dark:border-gray-700 pl-3">
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Request Body Fields:</div>
                        {operation.requestBodyFields.map(field => (
                          <SchemaPropertyNode key={field.path} field={field} level={0} />
                        ))}
                      </div>
                    )}
                    {/* Show response fields if present */}
                    {operation.responseFields && operation.responseFields.length > 0 && (
                      <div className="ml-8 mt-1 space-y-1 border-l-2 border-green-200 dark:border-green-700 pl-3">
                        <div className="text-xs text-green-600 dark:text-green-400 mb-1">Response Fields:</div>
                        {operation.responseFields.map(field => (
                          <SchemaPropertyNode key={field.path} field={field} level={0} />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Fields */}
          {resource.fields.length > 0 && (
            <div role="group" aria-labelledby={`${resource.slug}-fields-heading`}>
              <h4 id={`${resource.slug}-fields-heading`} className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Fields</h4>
              <div className="space-y-1">
                {resource.fields.map(field => (
                  <SchemaPropertyNode key={field.path} field={field} level={0} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * RefsView displays the ref link management interface with visual canvas
 */
interface RefsViewProps {
  structure: SpecStructure;
}

function RefsView({ structure }: RefsViewProps) {
  return (
    <div className="space-y-4">
      {/* Instructions Banner */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-2">
              How to Create Reference Links
            </h3>
            <ol className="text-sm text-blue-800 dark:text-blue-300 space-y-1.5 list-decimal list-inside">
              <li><strong>Expand a resource card</strong> to see its fields</li>
              <li><strong>Drag from a field's connection port</strong> (the small circle on the right) to a target resource card</li>
              <li><strong>Configure the link</strong> by selecting which field to use as the value and which to display as the label</li>
            </ol>
            <p className="text-xs text-blue-700 dark:text-blue-400 mt-2 italic">
              💡 This turns plain text inputs into dropdowns that fetch real data from the linked resource
            </p>
          </div>
        </div>
      </div>

      {/* Visual Canvas */}
      <RefLinkVisualCanvas structure={structure} />
    </div>
  );
}
