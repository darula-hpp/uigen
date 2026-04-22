import { useState, useEffect } from 'react';
import { useAppContext } from './contexts/AppContext.js';
import { AnnotationList } from './components/AnnotationList.js';
import { AnnotationForm } from './components/AnnotationForm.js';
import { VisualEditor } from './components/VisualEditor/index.js';
import { PreviewRenderer } from './components/Preview/PreviewRenderer.js';
import { HelpPanel } from './components/HelpPanel.js';
import { ThemeToggle } from './components/ThemeToggle.js';
import { CSSEditor } from './components/CSSEditor.js';
import { RelationshipEditor } from './components/RelationshipEditor/index.js';
import type { RelationshipConfig } from '@uigen-dev/core';

/**
 * Main application component for the Config GUI
 * 
 * Provides the layout structure with:
 * - Header with title and navigation
 * - Tab navigation between views
 * - Main content area for components
 * - Error display
 * - Loading state
 * 
 * Requirements: 1.5, 4.5, 5.4, 6.8
 */
function App() {
  const { state, actions } = useAppContext();
  const { isLoading, error, config, specPath, specStructure, annotations } = state;
  const [activeTab, setActiveTab] = useState<'annotations' | 'visual' | 'preview' | 'css' | 'relationships'>('annotations');
  const [selectedAnnotation, setSelectedAnnotation] = useState<string | null>(null);
  
  // CSS content state
  const [baseStyles, setBaseStyles] = useState<string>('');
  const [theme, setTheme] = useState<string>('');
  const [cssLoading, setCssLoading] = useState<boolean>(false);
  const [cssError, setCssError] = useState<string | null>(null);
  
  // Find the selected annotation metadata
  const selectedAnnotationMetadata = selectedAnnotation 
    ? annotations.find(a => a.name === selectedAnnotation)
    : null;
  
  /**
   * Load CSS content from API when CSS tab is opened
   * Requirements: 3.1, 3.2, 3.3, 3.4, 10.1
   */
  useEffect(() => {
    if (activeTab === 'css' && !theme && !cssLoading) {
      loadCSSContent();
    }
  }, [activeTab]);
  
  const loadCSSContent = async () => {
    setCssLoading(true);
    setCssError(null);
    
    try {
      const response = await fetch('/api/css');
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to load CSS' }));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      setBaseStyles(data.baseStyles || '');
      setTheme(data.theme || '');
    } catch (error) {
      console.error('Failed to load CSS content:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load CSS content';
      setCssError(errorMessage);
      actions.setError(errorMessage);
    } finally {
      setCssLoading(false);
    }
  };
  
  /**
   * Save CSS content to API
   * Requirements: 4.2, 10.2
   */
  const handleCssSave = async (themeContent: string) => {
    const response = await fetch('/api/css', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: themeContent })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to save CSS' }));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }
    
    // Update local state with saved theme content
    setTheme(themeContent);
  };
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                UIGen Config GUI
              </h1>
              {specPath && (
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Spec: {specPath}
                </p>
              )}
            </div>
            <div className="flex items-center gap-4">
              {config && (
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Config version: {config.version}
                </span>
              )}
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>
      
      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-400 dark:border-red-500 p-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400 dark:text-red-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700 dark:text-red-200">{error}</p>
              </div>
            </div>
            <button
              onClick={actions.clearError}
              className="text-red-400 dark:text-red-500 hover:text-red-600 dark:hover:text-red-400"
              aria-label="Dismiss error"
            >
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      )}
      
      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-gray-100"></div>
                <p className="mt-4 text-gray-500 dark:text-gray-400">Loading configuration...</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Help Panel */}
              <HelpPanel annotations={annotations} />
              
              {/* Tab Navigation */}
              <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
                <div className="border-b border-gray-200 dark:border-gray-700">
                  <nav className="flex -mb-px" aria-label="Main navigation tabs">
                    <button
                      onClick={() => setActiveTab('annotations')}
                      className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === 'annotations'
                          ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                          : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                      aria-current={activeTab === 'annotations' ? 'page' : undefined}
                      data-testid="annotations-tab"
                    >
                      Annotations
                    </button>
                    <button
                      onClick={() => setActiveTab('visual')}
                      className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === 'visual'
                          ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                          : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                      aria-current={activeTab === 'visual' ? 'page' : undefined}
                      data-testid="visual-tab"
                      disabled={!specStructure}
                    >
                      Visual Editor
                    </button>
                    <button
                      onClick={() => setActiveTab('preview')}
                      className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === 'preview'
                          ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                          : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                      aria-current={activeTab === 'preview' ? 'page' : undefined}
                      data-testid="preview-tab"
                      disabled={!specStructure}
                    >
                      Preview
                    </button>
                    <button
                      onClick={() => setActiveTab('css')}
                      className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === 'css'
                          ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                          : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                      aria-current={activeTab === 'css' ? 'page' : undefined}
                      data-testid="css-tab"
                    >
                      Theme
                    </button>
                    <button
                      onClick={() => setActiveTab('relationships')}
                      className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === 'relationships'
                          ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                          : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                      aria-current={activeTab === 'relationships' ? 'page' : undefined}
                      data-testid="relationships-tab"
                      disabled={!specStructure}
                    >
                      Relationships
                    </button>
                  </nav>
                </div>
                
                {/* Tab Content */}
                <div className={activeTab === 'relationships' ? '' : 'p-6'}>
                  {activeTab === 'annotations' && (
                    <div className="space-y-6">
                      <div>
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                          Annotation Configuration
                        </h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                          Enable or disable annotations and configure their default values. Changes are saved immediately.
                        </p>
                      </div>
                      
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div>
                          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Available Annotations</h3>
                          <AnnotationList onAnnotationSelect={setSelectedAnnotation} />
                        </div>
                        
                        {selectedAnnotation && selectedAnnotationMetadata && (
                          <div>
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Default Values</h3>
                            <AnnotationForm annotation={selectedAnnotationMetadata} />
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {activeTab === 'visual' && (
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                        Visual Editor
                      </h2>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                        Configure annotations visually on specific fields, operations, and resources.
                      </p>
                      <VisualEditor structure={specStructure} />
                    </div>
                  )}
                  
                  {activeTab === 'preview' && (
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                        UI Preview
                      </h2>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                        See how your annotation settings affect the generated UI.
                      </p>
                      <PreviewRenderer structure={specStructure} />
                    </div>
                  )}
                  
                  {activeTab === 'css' && (
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                        Theme Editor
                      </h2>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                        Customize the appearance of your generated UI with custom theme styles.
                      </p>
                      
                      {cssLoading ? (
                        <div className="flex items-center justify-center h-64">
                          <div className="text-center">
                            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100"></div>
                            <p className="mt-4 text-gray-500 dark:text-gray-400">Loading CSS content...</p>
                          </div>
                        </div>
                      ) : cssError ? (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
                          <div className="flex items-start">
                            <svg className="h-5 w-5 text-red-400 dark:text-red-500 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                            <div className="ml-3 flex-1">
                              <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                                Failed to load CSS content
                              </h3>
                              <p className="mt-1 text-sm text-red-700 dark:text-red-300">
                                {cssError}
                              </p>
                              <button
                                onClick={loadCSSContent}
                                className="mt-3 text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-500 dark:hover:text-red-300"
                              >
                                Try again
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <CSSEditor 
                          baseStyles={baseStyles}
                          theme={theme}
                          onSave={handleCssSave}
                        />
                      )}
                    </div>
                  )}
                  
                  {activeTab === 'relationships' && (
                    <div className="flex flex-col h-screen">
                      {/* Compact header strip */}
                      <div className="px-6 pt-4 pb-3 border-b border-gray-100 dark:border-gray-700 flex items-center gap-3 flex-shrink-0">
                        <h2 className="text-base font-semibold text-gray-900 dark:text-white">Relationships</h2>
                        {config?.relationships && config.relationships.length > 0 && (
                          <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded-full">
                            {config.relationships.length} declared
                          </span>
                        )}
                        <p className="text-xs text-gray-400 dark:text-gray-500 ml-1">
                          Drag the port dot on a card to draw a relationship line. Drag the card body to reposition.
                        </p>
                      </div>
                      {/* Canvas fills remaining viewport height */}
                      <div className="flex-1 min-h-0">
                        <RelationshipEditor
                          resources={(() => {
                            const filtered = specStructure?.resources.map((r: any) => {
                              const filteredOps = r.operations.filter((op: any) => {
                                // Filter out operations with x-uigen-ignore in config
                                const operationKey = `${op.method}:${op.path}`;
                                const annotation = config?.annotations?.[operationKey];
                                const shouldKeep = !annotation || annotation['x-uigen-ignore'] !== true;
                                
                                // Debug logging
                                if (op.path.includes('health')) {
                                  console.log('[RelationshipEditor Filter]', {
                                    operationKey,
                                    annotation,
                                    'x-uigen-ignore': annotation?.['x-uigen-ignore'],
                                    shouldKeep
                                  });
                                }
                                
                                return shouldKeep;
                              });
                              
                              return {
                                ...r,
                                operations: filteredOps
                              };
                            }).filter((r: any) => r.operations.length > 0) ?? null; // Filter out resources with no operations
                            
                            console.log('[RelationshipEditor] Filtered resources:', filtered?.map((r: any) => ({ name: r.name, operationCount: r.operations.length })));
                            return filtered;
                          })()}
                          relationships={config?.relationships ?? []}
                          specOperationPaths={
                            specStructure?.resources.flatMap((r: any) =>
                              r.operations.map((op: any) => op.path)
                            ) ?? []
                          }
                          onSave={async (relationships: RelationshipConfig[]) => {
                            const updated = {
                              ...(config ?? { version: '1.0', enabled: {}, defaults: {}, annotations: {} }),
                              relationships,
                            };
                            try {
                              await actions.saveConfig(updated);
                            } catch {
                              actions.setError('Failed to save relationships. Please try again.');
                            }
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
      
      {/* Footer */}
      <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-12">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-500 dark:text-gray-400">
            UIGen Config GUI - Manage annotation configurations visually
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
